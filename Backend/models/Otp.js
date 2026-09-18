const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required for OTP generation'],
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: [true, 'Hashed OTP is required'],
    },
    type: {
      type: String,
      enum: ['register', 'login'],
      required: [true, 'OTP type is required (register or login)'],
    },
    name: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 300, // MongoDB TTL index: automatically deletes document after 300 seconds (5 minutes)
    },
  },
  {
    versionKey: false,
  }
);

// Compound index for efficient lookup
otpSchema.index({ email: 1, type: 1, createdAt: -1 });

const Otp = mongoose.model('Otp', otpSchema);

module.exports = Otp;
