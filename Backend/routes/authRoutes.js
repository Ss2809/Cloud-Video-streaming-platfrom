const express = require('express');
const router = express.Router();
const {
  register,
  login,
  sendOtp,
  verifyOtp,
  getMe,
  getUsers,
} = require('../controllers/authController');
const { protect, authorizeAdmin } = require('../middleware/authMiddleware');

// Public Authentication Endpoints
router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

// Protected User Route
router.get('/me', protect, getMe);

// Protected Admin-Only Routes
router.get('/users', protect, authorizeAdmin, getUsers);
router.get('/admin-check', protect, authorizeAdmin, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access granted. Admin authorization verified.',
    admin: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

module.exports = router;
