const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Video title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters long'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator reference is required'],
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category reference is required'],
      index: true,
    },
    thumbnailUrl: {
      type: String,
      default: '',
      trim: true,
    },
    originalKey: {
      type: String,
      default: null,
      trim: true,
    },
    hlsKey: {
      type: String,
      default: null,
      trim: true,
    },
    duration: {
      type: String,
      default: '0m',
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING_UPLOAD', 'UPLOADED', 'PROCESSING', 'READY', 'FAILED'],
        message: '{VALUE} is not a valid video status. Allowed: PENDING_UPLOAD, UPLOADED, PROCESSING, READY, FAILED',
      },
      default: 'PENDING_UPLOAD',
      index: true,
    },
    visibility: {
      type: String,
      enum: {
        values: ['public', 'private'],
        message: '{VALUE} is not a valid visibility. Allowed: public, private',
      },
      default: 'public',
      index: true,
    },
    views: {
      type: Number,
      default: 0,
      min: [0, 'Views count cannot be negative'],
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
  }
);

// Text index on title & description for search queries
videoSchema.index({ title: 'text', description: 'text' });

const Video = mongoose.model('Video', videoSchema);

module.exports = Video;
