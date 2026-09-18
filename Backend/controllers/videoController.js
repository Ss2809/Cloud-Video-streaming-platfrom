const mongoose = require('mongoose');
const Video = require('../models/Video');
const Category = require('../models/Category');
const {
  isValidVideoType,
  isValidFileSize,
  generateS3Key,
  generatePresignedUploadUrl,
} = require('../utils/s3Service');

const VALID_STATUSES = ['PENDING_UPLOAD', 'UPLOADED', 'PROCESSING', 'READY', 'FAILED'];
const VALID_VISIBILITIES = ['public', 'private'];

/**
 * @desc    Create new video metadata record
 * @route   POST /api/videos
 * @access  Private (Admin Only)
 */
const createVideo = async (req, res, next) => {
  try {
    const {
      title,
      description,
      categoryId,
      thumbnailUrl,
      originalKey,
      hlsKey,
      duration,
      status = 'PENDING_UPLOAD',
      visibility = 'public',
    } = req.body;

    // 1. Validate title
    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid video title (minimum 2 characters).',
      });
    }

    // 2. Validate category
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Category reference is required.',
      });
    }

    let resolvedCategoryId = categoryId;
    if (mongoose.Types.ObjectId.isValid(categoryId)) {
      const categoryExists = await Category.findById(categoryId);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: 'The specified category does not exist.',
        });
      }
    } else {
      // If client passed a category name (e.g. "Action"), find or auto-create it
      let category = await Category.findOne({
        name: { $regex: new RegExp(`^${categoryId.trim()}$`, 'i') },
      });
      if (!category) {
        category = await Category.create({ name: categoryId.trim() });
      }
      resolvedCategoryId = category._id;
    }

    // 3. Validate status
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid video status. Allowed statuses: ${VALID_STATUSES.join(', ')}`,
      });
    }

    // 4. Validate visibility
    if (visibility && !VALID_VISIBILITIES.includes(visibility)) {
      return res.status(400).json({
        success: false,
        message: `Invalid visibility setting. Allowed values: ${VALID_VISIBILITIES.join(', ')}`,
      });
    }

    // 5. Create video
    const video = await Video.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      creatorId: req.user._id,
      categoryId: resolvedCategoryId,
      thumbnailUrl: thumbnailUrl ? thumbnailUrl.trim() : '',
      originalKey: originalKey ? originalKey.trim() : null,
      hlsKey: hlsKey ? hlsKey.trim() : null,
      duration: duration ? String(duration).trim() : '0m',
      status,
      visibility,
      views: 0,
    });

    const populatedVideo = await Video.findById(video._id)
      .populate('creatorId', 'name email role')
      .populate('categoryId', 'name slug');

    return res.status(201).json({
      success: true,
      message: 'Video metadata created successfully.',
      video: populatedVideo,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Browse & search videos with pagination and filtering
 * @route   GET /api/videos
 * @access  Public (Admin-aware)
 */
const getVideos = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      categoryId,
      status,
      visibility,
      sort = 'latest',
    } = req.query;

    const query = {};
    const isAdmin = req.user && req.user.role === 'admin';

    // 1. Role-based visibility and status constraints
    if (!isAdmin) {
      query.visibility = 'public';
      query.status = 'READY';
    } else {
      if (visibility && VALID_VISIBILITIES.includes(visibility)) {
        query.visibility = visibility;
      }
      if (status && VALID_STATUSES.includes(status)) {
        query.status = status;
      }
    }

    // 2. Keyword Search filter
    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    // 3. Category filter (by ID or Category name)
    const targetCat = categoryId || category;
    if (targetCat && targetCat.trim() && targetCat.trim().toLowerCase() !== 'all') {
      if (mongoose.Types.ObjectId.isValid(targetCat)) {
        query.categoryId = targetCat;
      } else {
        const foundCategory = await Category.findOne({
          $or: [
            { name: { $regex: new RegExp(`^${targetCat.trim()}$`, 'i') } },
            { slug: targetCat.trim().toLowerCase() },
          ],
        });
        if (foundCategory) {
          query.categoryId = foundCategory._id;
        } else {
          // If category filter name doesn't match any category, return 0 results
          return res.status(200).json({
            success: true,
            count: 0,
            total: 0,
            totalPages: 0,
            currentPage: Number(page),
            videos: [],
          });
        }
      }
    }

    // 4. Sorting logic
    let sortOptions = { createdAt: -1 };
    if (sort === 'views') {
      sortOptions = { views: -1, createdAt: -1 };
    } else if (sort === 'trending') {
      sortOptions = { views: -1, createdAt: -1 };
    } else if (sort === 'oldest') {
      sortOptions = { createdAt: 1 };
    }

    // 5. Pagination calculation
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const total = await Video.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum) || 1;

    const videos = await Video.find(query)
      .populate('creatorId', 'name email role')
      .populate('categoryId', 'name slug')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      count: videos.length,
      total,
      totalPages,
      currentPage: pageNum,
      videos,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single video details by ID
 * @route   GET /api/videos/:id
 * @access  Public (Access controlled if private)
 */
const getVideoById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid video ID format.',
      });
    }

    const video = await Video.findById(id)
      .populate('creatorId', 'name email role')
      .populate('categoryId', 'name slug');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found.',
      });
    }

    // Check visibility permissions
    const isAdmin = req.user && req.user.role === 'admin';
    const isCreator = req.user && String(req.user._id) === String(video.creatorId?._id);

    if (video.visibility === 'private' && !isAdmin && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'This video is private and restricted to authorized personnel.',
      });
    }

    return res.status(200).json({
      success: true,
      video,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update video metadata and status
 * @route   PUT /api/videos/:id
 * @access  Private (Admin Only)
 */
const updateVideo = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid video ID format.',
      });
    }

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found.',
      });
    }

    const {
      title,
      description,
      categoryId,
      thumbnailUrl,
      originalKey,
      hlsKey,
      duration,
      status,
      visibility,
    } = req.body;

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Video title must be at least 2 characters long.',
        });
      }
      video.title = title.trim();
    }

    if (description !== undefined) {
      video.description = description ? description.trim() : '';
    }

    if (categoryId !== undefined) {
      if (mongoose.Types.ObjectId.isValid(categoryId)) {
        const cat = await Category.findById(categoryId);
        if (!cat) {
          return res.status(400).json({
            success: false,
            message: 'Specified category does not exist.',
          });
        }
        video.categoryId = categoryId;
      } else if (typeof categoryId === 'string' && categoryId.trim()) {
        let cat = await Category.findOne({
          name: { $regex: new RegExp(`^${categoryId.trim()}$`, 'i') },
        });
        if (!cat) {
          cat = await Category.create({ name: categoryId.trim() });
        }
        video.categoryId = cat._id;
      }
    }

    if (thumbnailUrl !== undefined) video.thumbnailUrl = thumbnailUrl.trim();
    if (originalKey !== undefined) video.originalKey = originalKey ? originalKey.trim() : null;
    if (hlsKey !== undefined) video.hlsKey = hlsKey ? hlsKey.trim() : null;
    if (duration !== undefined) video.duration = String(duration).trim();

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid video status. Allowed: ${VALID_STATUSES.join(', ')}`,
        });
      }
      video.status = status;
    }

    if (visibility !== undefined) {
      if (!VALID_VISIBILITIES.includes(visibility)) {
        return res.status(400).json({
          success: false,
          message: `Invalid visibility setting. Allowed: ${VALID_VISIBILITIES.join(', ')}`,
        });
      }
      video.visibility = visibility;
    }

    await video.save();

    const updatedVideo = await Video.findById(video._id)
      .populate('creatorId', 'name email role')
      .populate('categoryId', 'name slug');

    return res.status(200).json({
      success: true,
      message: 'Video updated successfully.',
      video: updatedVideo,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete video document
 * @route   DELETE /api/videos/:id
 * @access  Private (Admin Only)
 */
const deleteVideo = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid video ID format.',
      });
    }

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found.',
      });
    }

    await Video.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Video deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Atomically increment video view count
 * @route   POST /api/videos/:id/view
 * @access  Public
 */
const recordView = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid video ID format.',
      });
    }

    const video = await Video.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'View registered successfully.',
      views: video.views,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate pre-signed S3 upload URL for direct client-to-S3 upload
 * @route   POST /api/videos/upload-url
 * @access  Private (Admin Only)
 */
const getUploadUrl = async (req, res, next) => {
  try {
    const {
      title,
      description = '',
      categoryId,
      fileName,
      fileType,
      fileSize,
      thumbnailUrl = '',
      duration = '0m',
      visibility = 'public',
    } = req.body;

    // 1. Validate title
    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid video title (minimum 2 characters).',
      });
    }

    // 2. Validate category
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Category reference is required.',
      });
    }

    let resolvedCategoryId = categoryId;
    if (mongoose.Types.ObjectId.isValid(categoryId)) {
      const categoryExists = await Category.findById(categoryId);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: 'The specified category does not exist.',
        });
      }
    } else {
      let category = await Category.findOne({
        name: { $regex: new RegExp(`^${categoryId.trim()}$`, 'i') },
      });
      if (!category) {
        category = await Category.create({ name: categoryId.trim() });
      }
      resolvedCategoryId = category._id;
    }

    // 3. Validate fileName
    if (!fileName || typeof fileName !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please specify the original video file name.',
      });
    }

    // 4. Validate fileType (MIME type)
    if (!isValidVideoType(fileType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid video file type. Supported formats: MP4, MOV, MKV, WebM, AVI.',
      });
    }

    // 5. Validate fileSize
    if (!isValidFileSize(fileSize)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file size. Maximum allowed video upload size is 5 GB.',
      });
    }

    // 6. Generate server-side S3 key
    const s3Key = generateS3Key(fileName);

    // 7. Create video record in MongoDB with PENDING_UPLOAD
    const video = await Video.create({
      title: title.trim(),
      description: description.trim(),
      creatorId: req.user._id,
      categoryId: resolvedCategoryId,
      thumbnailUrl: thumbnailUrl.trim(),
      originalKey: s3Key,
      hlsKey: null,
      duration: String(duration).trim(),
      status: 'PENDING_UPLOAD',
      visibility: visibility === 'private' ? 'private' : 'public',
      views: 0,
    });

    // 8. Generate short-lived S3 pre-signed upload URL
    const uploadUrl = await generatePresignedUploadUrl({
      s3Key,
      fileType,
      fileSize,
    });

    const populatedVideo = await Video.findById(video._id)
      .populate('creatorId', 'name email role')
      .populate('categoryId', 'name slug');

    return res.status(200).json({
      success: true,
      message: 'Pre-signed S3 upload URL generated successfully.',
      uploadUrl,
      key: s3Key,
      video: populatedVideo,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Confirm successful direct-to-S3 upload and update status to UPLOADED
 * @route   POST /api/videos/:id/upload-complete
 * @access  Private (Admin Only)
 */
const confirmUploadComplete = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid video ID format.',
      });
    }

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found.',
      });
    }

    // Ensure video is in PENDING_UPLOAD status
    if (video.status !== 'PENDING_UPLOAD') {
      return res.status(400).json({
        success: false,
        message: `Video is currently in '${video.status}' status and cannot be marked as uploaded.`,
      });
    }

    // Update status to UPLOADED
    video.status = 'UPLOADED';
    await video.save();

    const updatedVideo = await Video.findById(video._id)
      .populate('creatorId', 'name email role')
      .populate('categoryId', 'name slug');

    return res.status(200).json({
      success: true,
      message: 'Video upload confirmed. Status updated to UPLOADED.',
      video: updatedVideo,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createVideo,
  getVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  recordView,
  getUploadUrl,
  confirmUploadComplete,
};
