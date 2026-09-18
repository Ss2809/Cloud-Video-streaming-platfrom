const express = require('express');
const router = express.Router();
const {
  createVideo,
  getVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  recordView,
  getUploadUrl,
  confirmUploadComplete,
} = require('../controllers/videoController');
const {
  protect,
  authorizeAdmin,
  optionalProtect,
} = require('../middleware/authMiddleware');

// S3 Direct Upload Routes (Admin-Only)
router.post('/upload-url', protect, authorizeAdmin, getUploadUrl);
router.post('/:id/upload-complete', protect, authorizeAdmin, confirmUploadComplete);

// Public / Admin-aware query routes
router.get('/', optionalProtect, getVideos);
router.get('/:id', optionalProtect, getVideoById);
router.post('/:id/view', recordView);

// Admin-Only Mutation Routes
router.post('/', protect, authorizeAdmin, createVideo);
router.put('/:id', protect, authorizeAdmin, updateVideo);
router.delete('/:id', protect, authorizeAdmin, deleteVideo);

module.exports = router;
