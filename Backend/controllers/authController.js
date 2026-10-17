const User = require('../models/User');
const Otp = require('../models/Otp');
const { generateOtp, hashOtp, compareOtp } = require('../utils/otpUtils');
const { generateToken } = require('../utils/tokenUtils');
const { sendOtpEmail } = require('../utils/emailService');

// Email regex pattern
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @desc    Initiate User Registration - sends 6-digit OTP
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    // 1. Validate inputs
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid full name (minimum 2 characters).',
      });
    }

    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists. Please log in instead.',
      });
    }

    // 3. Remove any previous pending registration OTPs for this email
    await Otp.deleteMany({ email: cleanEmail, type: 'register' });

    // 4. Generate & hash 6-digit OTP
    const plainOtp = generateOtp();
    const hashedOtp = await hashOtp(plainOtp);

    // 5. Store hashed OTP in database
    await Otp.create({
      email: cleanEmail,
      otp: hashedOtp,
      type: 'register',
      name: cleanName,
    });

    // 6. Send OTP to email
    await sendOtpEmail({
      to: cleanEmail,
      otp: plainOtp,
      type: 'register',
      name: cleanName,
    });

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${cleanEmail}`,
      email: cleanEmail,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Initiate User Login - sends 6-digit OTP
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email } = req.body;

    // 1. Validate input
    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 2. Check if user exists
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email. Please register first.',
      });
    }

    // 3. Remove any previous pending login OTPs for this email
    await Otp.deleteMany({ email: cleanEmail, type: 'login' });

    // 4. Generate & hash 6-digit OTP
    const plainOtp = generateOtp();
    const hashedOtp = await hashOtp(plainOtp);

    // 5. Store hashed OTP in database
    await Otp.create({
      email: cleanEmail,
      otp: hashedOtp,
      type: 'login',
      name: user.name,
    });

    // 6. Send OTP to email
    await sendOtpEmail({
      to: cleanEmail,
      otp: plainOtp,
      type: 'login',
      name: user.name,
    });

    return res.status(200).json({
      success: true,
      message: `Login code sent to ${cleanEmail}`,
      email: cleanEmail,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend OTP functionality
 * @route   POST /api/auth/send-otp
 * @access  Public
 */
const sendOtp = async (req, res, next) => {
  try {
    const { email, type = 'login', name } = req.body;

    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const otpType = type === 'register' ? 'register' : 'login';

    let recipientName = name ? name.trim() : 'Viewer';

    // Validation based on type
    if (otpType === 'login') {
      const user = await User.findOne({ email: cleanEmail });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User account not found. Please register first.',
        });
      }
      recipientName = user.name;
    } else {
      const user = await User.findOne({ email: cleanEmail });
      if (user) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email already exists. Please log in instead.',
        });
      }
    }

    // Invalidate old OTPs of this type
    await Otp.deleteMany({ email: cleanEmail, type: otpType });

    // Generate & hash new OTP
    const plainOtp = generateOtp();
    const hashedOtp = await hashOtp(plainOtp);

    await Otp.create({
      email: cleanEmail,
      otp: hashedOtp,
      type: otpType,
      name: recipientName,
    });

    await sendOtpEmail({
      to: cleanEmail,
      otp: plainOtp,
      type: otpType,
      name: recipientName,
    });

    return res.status(200).json({
      success: true,
      message: `New verification code sent to ${cleanEmail}`,
      email: cleanEmail,
      type: otpType,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify 6-digit OTP, create user account (if register) or sign in, and return JWT
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp, type } = req.body;

    // 1. Validate email
    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    // 2. Validate OTP format (exactly 6 digits)
    if (!otp || !/^\d{6}$/.test(String(otp).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 6-digit verification code.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();
    const otpType = type === 'register' ? 'register' : 'login';

    // 3. Find the latest OTP record for this email and type
    const otpRecord = await Otp.findOne({
      email: cleanEmail,
      type: otpType,
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired or was not requested. Please request a new code.',
      });
    }

    // 4. Verify candidate OTP against hashed OTP
    const isMatch = await compareOtp(cleanOtp, otpRecord.otp);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect verification code. Please check and try again.',
      });
    }

    // 5. Delete the consumed OTP record to prevent replay
    await Otp.deleteMany({ email: cleanEmail, type: otpType });

    let user;

    if (otpType === 'register') {
      // Check if user was already created
      user = await User.findOne({ email: cleanEmail });
      if (!user) {
        user = await User.create({
          name: otpRecord.name || req.body.name || 'Viewer',
          email: cleanEmail,
          role: 'user',
        });
      }
    } else {
      user = await User.findOne({ email: cleanEmail });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User account not found. Please register first.',
        });
      }
    }

    // 6. Generate signed JWT token
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: otpType === 'register' ? 'Account created successfully.' : 'Logged in successfully.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get currently authenticated user's profile
 * @route   GET /api/auth/me
 * @access  Private (Protected by JWT)
 */
const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all registered users count and roster (Admin Only)
 * @route   GET /api/auth/users
 * @access  Private (Admin Only)
 */
const getUsers = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const users = await User.find().select('-__v').sort({ createdAt: -1 }).limit(100);
    return res.status(200).json({
      success: true,
      total: totalUsers,
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  sendOtp,
  verifyOtp,
  getMe,
  getUsers,
};
