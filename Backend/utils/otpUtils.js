const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 * @returns {string} 6-digit numeric string
 */
const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Hash plaintext OTP using bcrypt
 * @param {string} otp
 * @returns {Promise<string>}
 */
const hashOtp = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
};

/**
 * Verify plaintext OTP against hashed OTP
 * @param {string} candidateOtp
 * @param {string} hashedOtp
 * @returns {Promise<boolean>}
 */
const compareOtp = async (candidateOtp, hashedOtp) => {
  if (!candidateOtp || !hashedOtp) return false;
  return bcrypt.compare(candidateOtp, hashedOtp);
};

module.exports = {
  generateOtp,
  hashOtp,
  compareOtp,
};
