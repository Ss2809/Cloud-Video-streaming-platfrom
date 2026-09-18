const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes: verify JWT Bearer token and attach authenticated user to req.user
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token missing. Please log in to continue.',
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'streamcloud_jwt_secret_key_secure_2026_super_safe'
    );

    const user = await User.findById(decoded.id).select('-__v');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The account associated with this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization token.',
    });
  }
};

/**
 * Authorize only users with the 'admin' role
 */
const authorizeAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges required.',
    });
  }
  next();
};
/**
 * Optional protection: inspects Bearer token if provided, but does not block requests if omitted or invalid
 */
const optionalProtect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'streamcloud_jwt_secret_key_secure_2026_super_safe'
    );

    const user = await User.findById(decoded.id).select('-__v');
    if (user) {
      req.user = user;
    }
  } catch {
    // If token invalid/expired, continue without user
  }

  next();
};

module.exports = {
  protect,
  authorizeAdmin,
  optionalProtect,
};
