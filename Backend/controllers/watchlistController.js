const mongoose = require('mongoose');
const Watchlist = require('../models/Watchlist');
const Video = require('../models/Video');

/**
 * Fetch authenticated user's watchlist
 * GET /api/watchlist
 */
const getWatchlist = async (req, res, next) => {
  try {
    const watchlistRecords = await Watchlist.find({ userId: req.user._id })
      .sort({ addedAt: -1 })
      .populate({
        path: 'videoId',
        populate: [
          { path: 'categoryId', select: 'name' },
          { path: 'creatorId', select: 'name email' },
        ],
      });

    // Filter out records where referenced video was removed
    const validWatchlist = watchlistRecords.filter((record) => record.videoId != null);

    res.status(200).json({
      success: true,
      count: validWatchlist.length,
      watchlist: validWatchlist,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a video to user's watchlist
 * POST /api/watchlist/:videoId
 */
const addToWatchlist = async (req, res, next) => {
  try {
    const videoId = req.params.videoId || req.body.videoId;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: 'videoId is required to add to watchlist.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid video ID format.',
      });
    }

    const videoExists = await Video.findById(videoId);
    if (!videoExists) {
      return res.status(404).json({
        success: false,
        message: 'Video not found.',
      });
    }

    const item = await Watchlist.findOneAndUpdate(
      { userId: req.user._id, videoId },
      {
        $setOnInsert: {
          userId: req.user._id,
          videoId,
          addedAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    ).populate({
      path: 'videoId',
      populate: [
        { path: 'categoryId', select: 'name' },
        { path: 'creatorId', select: 'name email' },
      ],
    });

    res.status(200).json({
      success: true,
      message: 'Video added to watchlist.',
      item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a video from user's watchlist
 * DELETE /api/watchlist/:videoId
 */
const removeFromWatchlist = async (req, res, next) => {
  try {
    const { videoId } = req.params;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: 'Video ID parameter is required.',
      });
    }

    const filter = mongoose.Types.ObjectId.isValid(videoId)
      ? {
          userId: req.user._id,
          $or: [{ videoId }, { _id: videoId }],
        }
      : { userId: req.user._id, videoId };

    const deleted = await Watchlist.findOneAndDelete(filter);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Video not found in your watchlist.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Video removed from watchlist.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if a specific video is in user's watchlist
 * GET /api/watchlist/check/:videoId
 */
const checkWatchlistStatus = async (req, res, next) => {
  try {
    const { videoId } = req.params;

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(200).json({
        success: true,
        inWatchlist: false,
      });
    }

    const exists = await Watchlist.exists({
      userId: req.user._id,
      videoId,
    });

    res.status(200).json({
      success: true,
      inWatchlist: Boolean(exists),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear all videos from user's watchlist
 * DELETE /api/watchlist
 */
const clearWatchlist = async (req, res, next) => {
  try {
    const result = await Watchlist.deleteMany({ userId: req.user._id });

    res.status(200).json({
      success: true,
      message: 'Watchlist cleared successfully.',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  checkWatchlistStatus,
  clearWatchlist,
};
