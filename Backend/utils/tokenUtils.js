const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT token for an authenticated user
 * @param {Object} user - User document
 * @returns {string} JWT Token
 */
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'streamcloud_jwt_secret_key_secure_2026_super_safe';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    secret,
    { expiresIn }
  );
};

module.exports = {
  generateToken,
};
