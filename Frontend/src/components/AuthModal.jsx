import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  User,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Play,
  Sparkles,
} from 'lucide-react';
import OtpInput from './OtpInput';
import authService from '../services/authService';

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'signin', // 'signin' (existing user) or 'signup' (first-time user)
  onSuccess,
}) {
  const [mode, setMode] = useState(initialMode); // 'signin' or 'signup'
  const [step, setStep] = useState('input'); // 'input' or 'otp'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Sync mode whenever initialMode changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setStep('input');
      setOtp('');
      setDevOtp('');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, initialMode]);

  // Countdown timer for Resend OTP
  useEffect(() => {
    let timer;
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  if (!isOpen) return null;

  const validateEmail = (val) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  // Step 1: Send OTP handler (Connected to Express backend: /api/auth/register or /api/auth/login)
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (mode === 'signup' && (!fullName.trim() || fullName.trim().length < 2)) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }

    if (!email.trim() || !validateEmail(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const res = await authService.register(fullName.trim(), email.trim());
        if (res.previewOtp) setDevOtp(res.previewOtp);
        setSuccessMsg(res.message || `Verification code sent to ${email.trim()}`);
      } else {
        const res = await authService.login(email.trim());
        if (res.previewOtp) setDevOtp(res.previewOtp);
        setSuccessMsg(res.message || `Login code sent to ${email.trim()}`);
      }

      setStep('otp');
      setCountdown(30);
      setCanResend(false);
      setOtp('');
    } catch (err) {
      const serverMessage =
        err.response?.data?.message ||
        err.message ||
        'Unable to dispatch verification code. Please try again.';
      setErrorMsg(serverMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP & Authenticate (Connected to Express backend: /api/auth/verify-otp)
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (otp.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit code.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await authService.verifyOtp(
        email.trim(),
        otp.trim(),
        mode === 'signup' ? 'register' : 'login'
      );

      // Successful authentication with JWT
      const userData = {
        _id: res.user._id,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role,
        avatar: res.user.name ? res.user.name.charAt(0).toUpperCase() : 'U',
        createdAt: res.user.createdAt,
      };

      // Redirect authenticated users to Home
      window.location.hash = '#home';

      if (onSuccess) {
        onSuccess(userData, mode === 'signup' ? 'created' : 'loggedin');
      }

      onClose();
    } catch (err) {
      const serverMessage =
        err.response?.data?.message ||
        err.message ||
        'Invalid or expired verification code. Please check and try again.';
      setErrorMsg(serverMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP handler (Connected to Express backend: /api/auth/send-otp)
  const handleResendOtp = async () => {
    if (!canResend || isLoading) return;

    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await authService.sendOtp(
        email.trim(),
        mode === 'signup' ? 'register' : 'login',
        fullName.trim()
      );

      if (res.previewOtp) setDevOtp(res.previewOtp);
      setCountdown(30);
      setCanResend(false);
      setOtp('');
      setSuccessMsg(res.message || `A new 6-digit code has been sent to ${email.trim()}`);
    } catch (err) {
      const serverMessage =
        err.response?.data?.message ||
        err.message ||
        'Failed to resend code. Please try again.';
      setErrorMsg(serverMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Dark blur backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md my-8 bg-zinc-950 border border-zinc-800/90 rounded-3xl shadow-2xl shadow-purple-950/40 overflow-hidden z-10 animate-fadeIn">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-purple-600/25 rounded-full blur-[80px] pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Card Header */}
        <div className="p-6 sm:p-8 pb-4">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-600/30">
              <Play className="w-4 h-4 text-white fill-current ml-0.5" />
            </div>
            <span className="font-bold text-lg text-white tracking-tight">
              Stream<span className="text-purple-400">Cloud</span>
            </span>
            <span className="ml-auto text-[11px] px-2.5 py-0.5 rounded-full bg-purple-900/40 border border-purple-500/30 text-purple-300 font-medium">
              Passwordless Auth
            </span>
          </div>

          {/* Mode Switcher Tabs (Only visible when entering details) */}
          {step === 'input' && (
            <div className="flex items-center p-1 bg-zinc-900/90 border border-zinc-800 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 ${
                  mode === 'signin'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 ${
                  mode === 'signup'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Heading */}
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {step === 'input'
                ? mode === 'signup'
                  ? 'Create your account'
                  : 'Welcome back'
                : 'Enter verification code'}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              {step === 'input'
                ? mode === 'signup'
                  ? 'Join StreamCloud with instant, password-free login.'
                  : 'Enter your email to receive a secure 6-digit login OTP.'
                : `We sent a 6-digit verification code to:`}
            </p>
            {step === 'otp' && (
              <div className="flex items-center justify-between mt-1.5 p-2 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-xs font-semibold text-purple-300 truncate">
                  {email}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStep('input');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white font-medium ml-2 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="px-6 sm:px-8 pb-8 pt-2">
          {/* Alerts / Feedback */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs mb-4 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs mb-4">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* STEP 1: Enter details & Send OTP */}
          {step === 'input' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              {/* Full Name field (First-Time User / Sign Up Only) */}
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Full Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. Sushil Kumar"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      autoFocus
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/25 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Email Address field */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus={mode === 'signin'}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/25 transition-all"
                  />
                </div>
              </div>

              {/* Submit / Send OTP Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <span>Send OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Switch mode footer */}
              <div className="text-center pt-2">
                <p className="text-xs text-zinc-400">
                  {mode === 'signin' ? (
                    <>
                      New to StreamCloud?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signup');
                          setErrorMsg('');
                          setSuccessMsg('');
                        }}
                        className="text-purple-400 hover:text-purple-300 font-semibold underline underline-offset-2 ml-1"
                      >
                        Create an account
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signin');
                          setErrorMsg('');
                          setSuccessMsg('');
                        }}
                        className="text-purple-400 hover:text-purple-300 font-semibold underline underline-offset-2 ml-1"
                      >
                        Sign In
                      </button>
                    </>
                  )}
                </p>
              </div>
            </form>
          ) : (
            /* STEP 2: Enter 6-digit OTP & Verify */
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              {/* 6-Digit Box Input */}
              <div className="py-2">
                <OtpInput
                  length={6}
                  value={otp}
                  onChange={(val) => {
                    setOtp(val);
                    if (errorMsg) setErrorMsg('');
                  }}
                  disabled={isLoading}
                />
              </div>

              {/* Resend OTP & Countdown */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Didn&apos;t get the code?</span>
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 font-semibold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Resend OTP
                  </button>
                ) : (
                  <span className="text-zinc-500 font-medium">
                    Resend in{' '}
                    <strong className="text-zinc-300 font-mono">
                      00:{countdown < 10 ? `0${countdown}` : countdown}
                    </strong>
                  </span>
                )}
              </div>

              {/* Verify & Proceed Button */}
              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {mode === 'signup'
                        ? 'Verify & Create Account'
                        : 'Verify & Sign In'}
                    </span>
                  </>
                )}
              </button>

              {/* Code Autofill Helper if available */}
              {devOtp && (
                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/60 text-center animate-fadeIn">
                  <p className="text-[11px] text-purple-200">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 inline mr-1" />
                    Dev Code from Server: Click{' '}
                    <button
                      type="button"
                      onClick={() => setOtp(devOtp)}
                      className="text-purple-300 underline font-mono font-bold tracking-wider hover:text-white cursor-pointer"
                    >
                      {devOtp}
                    </button>{' '}
                    to autofill.
                  </p>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
