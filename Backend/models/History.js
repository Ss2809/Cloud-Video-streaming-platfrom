const mongoose = require('mongoose');

const historySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: [true, 'Video reference is required'],
      index: true,
    },
    progressPercent: {
      type: Number,
      default: 0,
      min: [0, 'Progress percent cannot be less than 0'],
      max: [100, 'Progress percent cannot exceed 100'],
    },
    watchedDuration: {
      type: String,
      default: '0m',
      trim: true,
    },
    lastWatched: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
  }
);

// Compound unique index ensuring one history record per user and video
historySchema.index({ userId: 1, videoId: 1 }, { unique: true });

const History = mongoose.model('History', historySchema);

module.exports = History;
