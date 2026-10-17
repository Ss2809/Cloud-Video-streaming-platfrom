const mongoose = require('mongoose');
const History = require('../models/History');
const Video = require('../models/Video');

/**
 * Fetch authenticated user's watch history
 * GET /api/history
 */
const getHistory = async (req, res, next) => {
  try {
    const historyRecords = await History.find({ userId: req.user._id })
      .sort({ lastWatched: -1 })
      .populate({
        path: 'videoId',
        populate: [
          { path: 'categoryId', select: 'name' },
          { path: 'creatorId', select: 'name email' },
        ],
      });

    // Filter out records where referenced video may have been deleted
    const validHistory = historyRecords.filter((record) => record.videoId != null);

    res.status(200).json({
      success: true,
      count: validHistory.length,
      history: validHistory,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upsert video playback progress into user's watch history
 * POST /api/history
 * Body: { videoId, progressPercent, watchedDuration }
 */
const saveHistory = async (req, res, next) => {
  try {
    const { videoId, progressPercent = 0, watchedDuration = '0m' } = req.body;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: 'videoId is required to save watch history.',
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
        message: 'Referenced video does not exist.',
      });
    }

    const clampedPercent = Math.min(Math.max(Number(progressPercent) || 0, 0), 100);

    const record = await History.findOneAndUpdate(
      { userId: req.user._id, videoId },
      {
        $set: {
          progressPercent: Math.round(clampedPercent),
          watchedDuration: String(watchedDuration || '0m'),
          lastWatched: new Date(),
        },
        $setOnInsert: {
          userId: req.user._id,
          videoId,
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
      message: 'Watch progress saved successfully.',
      history: record,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a specific video from user's watch history
 * DELETE /api/history/:videoId
 */
const deleteHistoryItem = async (req, res, next) => {
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

    const deleted = await History.findOneAndDelete(filter);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'History record not found for this video.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Removed from watch history.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear all watch history records for authenticated user
 * DELETE /api/history
 */
const clearHistory = async (req, res, next) => {
  try {
    const result = await History.deleteMany({ userId: req.user._id });

    res.status(200).json({
      success: true,
      message: 'All watch history cleared successfully.',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHistory,
  saveHistory,
  deleteHistoryItem,
  clearHistory,
};
