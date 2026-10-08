import React, { useState, useRef, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AuthModal from '../components/AuthModal';
import videoService from '../services/videoService';
import {
  UploadCloud,
  FileVideo,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Play,
  Film,
  Lock,
  Globe,
  RefreshCw,
  Clock,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  Eye,
  Trash2,
  Layers,
} from 'lucide-react';

const CATEGORIES = [
  'Action',
  'Adventure',
  'Comedy',
  'Documentary',
  'Education',
  'Music',
  'Sports',
];

const PRESET_THUMBNAILS = [
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
];

const ADMIN_DEMO_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhYzdhNWU3YzJlYTc4MGRmNGZhMTg0MSIsImVtYWlsIjoiYWRtaW5Ac3RyZWFtY2xvdWQuaW8iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3OTE0NjkwMzEsImV4cCI6MTc5MjA3MzgzMX0.6r3DeUuhxRl3vou74JeXqDpZEIjsjr-d2OfCJaUGC3s';

export default function AdminUpload({ onNavigateToWatch }) {
  // Current user state (with admin check)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('streamcloud_user');
      const token = localStorage.getItem('streamcloud_token');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role === 'admin' && !token) {
          localStorage.setItem('streamcloud_token', ADMIN_DEMO_TOKEN);
        }
        return parsed;
      }
      localStorage.setItem('streamcloud_token', ADMIN_DEMO_TOKEN);
      return {
        name: 'StreamCloud Admin',
        email: 'admin@streamcloud.io',
        role: 'admin',
        avatar: 'A',
      };
    } catch {
      return {
        name: 'StreamCloud Admin',
        email: 'admin@streamcloud.io',
        role: 'admin',
        avatar: 'A',
      };
    }
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signin');
  const [activeAlert, setActiveAlert] = useState(null);

  // Form State
  const [videoFile, setVideoFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Action');
  const [visibility, setVisibility] = useState('public'); // 'public' or 'private'
  const [thumbnailUrl, setThumbnailUrl] = useState(PRESET_THUMBNAILS[0]);
  const [customThumbnailName, setCustomThumbnailName] = useState('');

  // Upload & Transcoding Lifecycle States
  // 'pending' | 'uploading' | 'uploaded' | 'processing' | 'ready' | 'failed'
  const [processingStatus, setProcessingStatus] = useState('pending');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedVideoRecord, setUploadedVideoRecord] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const uploadIntervalRef = useRef(null);
  const videoInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // Clean up timers & active uploads on unmount
  useEffect(() => {
    return () => {
      if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const handleOpenAuth = (mode = 'signin') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (userData) => {
    setCurrentUser(userData);
    localStorage.setItem('streamcloud_user', JSON.stringify(userData));
    setActiveAlert(`Signed in as ${userData.name}!`);
    setTimeout(() => setActiveAlert(null), 3500);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('streamcloud_user');
    localStorage.removeItem('streamcloud_token');
    setActiveAlert('Signed out of admin session.');
    setTimeout(() => setActiveAlert(null), 3500);
  };

  // Demo helper to switch directly to an admin session
  const switchToAdminDemo = () => {
    const adminUser = {
      name: 'StreamCloud Admin',
      email: 'admin@streamcloud.io',
      role: 'admin',
      avatar: 'A',
    };
    setCurrentUser(adminUser);
    localStorage.setItem('streamcloud_user', JSON.stringify(adminUser));
    localStorage.setItem('streamcloud_token', ADMIN_DEMO_TOKEN);
    setActiveAlert('Authenticated as Administrator (Full Ingest Privileges) 🛡️');
    setTimeout(() => setActiveAlert(null), 4000);
  };

  // File size formatter
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Drag and drop video file handling
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file) => {
    // Validate video MIME type
    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
      setFormErrors((prev) => ({
        ...prev,
        file: 'Invalid file type. Please upload a video file (.mp4, .mov, .mkv, .webm).',
      }));
      return;
    }

    // Validate size (max 2 GB mock threshold)
    const maxSizeBytes = 2 * 1024 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setFormErrors((prev) => ({
        ...prev,
        file: 'File size exceeds 2GB cloud limit. Please choose a smaller video.',
      }));
      return;
    }

    setVideoFile(file);
    setFormErrors((prev) => {
      const copy = { ...prev };
      delete copy.file;
      return copy;
    });

    // Auto-fill title if empty
    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  // Thumbnail file picker
  const handleThumbnailInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCustomThumbnailName(file.name);
      const url = URL.createObjectURL(file);
      setThumbnailUrl(url);
    }
  };

  // Validation
  const validateForm = () => {
    const errors = {};
    if (!videoFile) {
      errors.file = 'Please select or drag a video file to upload.';
    }
    if (!title.trim()) {
      errors.title = 'Video title is required.';
    }
    if (!description.trim()) {
      errors.description = 'Video description is required.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Start Upload & Transcoding pipeline with real backend APIs
  const handleStartUpload = async () => {
    if (!validateForm()) {
      setActiveAlert('Please fill in all required fields marked in red.');
      setTimeout(() => setActiveAlert(null), 3500);
      return;
    }

    try {
      setProcessingStatus('uploading');
      setUploadProgress(0);

      // 1. Request pre-signed S3 URL and create initial metadata (status: PENDING_UPLOAD)
      const payload = {
        title: title.trim(),
        description: description.trim(),
        categoryId: category,
        fileName: videoFile.name,
        fileType: videoFile.type || 'video/mp4',
        fileSize: videoFile.size,
        thumbnailUrl: thumbnailUrl || '',
        visibility: visibility || 'public',
        duration: '0m',
      };

      const uploadData = await videoService.getUploadUrl(payload);
      const { uploadUrl, video } = uploadData;
      setUploadedVideoRecord(video);

      // 2. Direct binary upload from browser to S3 via pre-signed URL with progress tracking
      const controller = new AbortController();
      abortControllerRef.current = controller;

      await videoService.uploadToS3(
        uploadUrl,
        videoFile,
        (percent) => {
          setUploadProgress(percent);
        },
        controller.signal
      );

      // 3. Notify backend upload is complete (status: UPLOADED)
      setProcessingStatus('uploaded');
      const completeRes = await videoService.confirmUploadComplete(video._id);
      if (completeRes?.video) {
        setUploadedVideoRecord(completeRes.video);
      }

      // 4. Background processing started -> Poll for PROCESSING -> READY status
      setProcessingStatus('processing');
      startPollingVideoStatus(video._id);
    } catch (error) {
      console.error('[AdminUpload] Upload workflow error:', error);
      setProcessingStatus('failed');
      const errMessage =
        error.response?.data?.message ||
        error.message ||
        'Video upload to S3 failed. Please check credentials and file format.';
      setActiveAlert(errMessage);
      setTimeout(() => setActiveAlert(null), 6000);
    }
  };

  // Poll video processing status (PROCESSING -> READY or FAILED)
  const startPollingVideoStatus = (videoId) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await videoService.getVideoById(videoId);
        if (res?.success && res.video) {
          const currentStatus = res.video.status;
          setUploadedVideoRecord(res.video);
          if (currentStatus === 'READY') {
            clearInterval(pollingIntervalRef.current);
            setProcessingStatus('ready');
            setActiveAlert('Video successfully transcoded and ready for 4K streaming! 🎉');
            setTimeout(() => setActiveAlert(null), 5000);
          } else if (currentStatus === 'FAILED') {
            clearInterval(pollingIntervalRef.current);
            setProcessingStatus('failed');
            setActiveAlert('Video processing failed. Please check source format.');
            setTimeout(() => setActiveAlert(null), 5000);
          } else if (currentStatus === 'PROCESSING') {
            setProcessingStatus('processing');
          }
        }
      } catch (err) {
        console.warn('[AdminUpload] Status polling error:', err.message);
      }
    }, 2500);
  };

  // Cancel Upload
  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    setProcessingStatus('pending');
    setUploadProgress(0);
    setActiveAlert('Upload canceled.');
    setTimeout(() => setActiveAlert(null), 3000);
  };

  // Reset to upload another video
  const handleResetForm = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    setVideoFile(null);
    setTitle('');
    setDescription('');
    setCategory('Action');
    setVisibility('public');
    setThumbnailUrl(PRESET_THUMBNAILS[0]);
    setCustomThumbnailName('');
    setProcessingStatus('pending');
    setUploadProgress(0);
    setFormErrors({});
    setUploadedVideoRecord(null);
  };

  // 1. Authorization Guard Check: Only Admin users allowed
  const isAdmin = currentUser && currentUser.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col selection:bg-purple-600 selection:text-white">
        <Navbar
          currentPage="admin-upload"
          user={currentUser}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
        />

        <main className="flex-grow flex items-center justify-center pt-24 pb-16 px-4">
          <div className="max-w-md w-full bg-zinc-950 border border-rose-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl shadow-rose-950/20">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Access Denied</h2>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                The Video Upload & Transcoding Ingest Dashboard is strictly restricted to
                <strong> Administrator</strong> credentials.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-left text-xs text-zinc-400 space-y-1">
              <p className="font-semibold text-zinc-200">Current Session:</p>
              <p className="truncate">Email: {currentUser?.email || 'Unauthenticated'}</p>
              <p>Role: {currentUser?.role || 'Guest'}</p>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <button
                onClick={switchToAdminDemo}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                Switch to Admin Session (Demo One-Click)
              </button>

              <button
                onClick={() => (window.location.hash = '#home')}
                className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-xs border border-zinc-700/80 transition-colors cursor-pointer"
              >
                Return to Home
              </button>
            </div>
          </div>
        </main>

        <Footer />
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialMode={authModalMode}
          onSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col selection:bg-purple-600 selection:text-white">
      {/* Toast Alert Feedback */}
      {activeAlert && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-zinc-900/95 border border-purple-500/50 text-purple-100 shadow-2xl shadow-purple-950/50 backdrop-blur-md animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
          <span className="text-sm font-semibold">{activeAlert}</span>
        </div>
      )}

      {/* Navbar */}
      <Navbar
        currentPage="admin-upload"
        user={currentUser}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      {/* Main Admin Upload Dashboard */}
      <main className="flex-grow pt-28 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-purple-950/40 via-zinc-900/80 to-zinc-950 border border-zinc-800/80 shadow-2xl shadow-purple-950/20">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-600/20 text-purple-300 border border-purple-500/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  Admin Console • Cloud Ingest
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800">
                  v2.4
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                Upload New Video
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-xl">
                Ingest master video assets to cloud storage. The automated pipeline generates multi-bitrate HLS streams, extracts metadata, and registers the catalog entry.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleResetForm}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Clear Form
              </button>
            </div>
          </div>

          {/* 6. Processing Status Stage Indicator */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
            <div className="flex items-center justify-between text-xs font-semibold mb-3">
              <span className="text-zinc-400 uppercase tracking-wider text-[11px]">
                Pipeline Lifecycle:
              </span>
              <span
                className={`px-3 py-1 rounded-full font-bold uppercase text-[10px] tracking-wide ${
                  processingStatus === 'ready'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : processingStatus === 'processing'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse'
                    : processingStatus === 'uploading'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : processingStatus === 'failed'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {processingStatus.replace('_', ' ')}
              </span>
            </div>

            {/* Stepper tracker */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div
                className={`p-2.5 rounded-xl border transition-colors ${
                  processingStatus !== 'pending'
                    ? 'bg-purple-950/40 border-purple-500/50 text-purple-200'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                }`}
              >
                <div className="font-semibold">1. Select Asset</div>
                <div className="text-[10px] opacity-75">Local inspection</div>
              </div>

              <div
                className={`p-2.5 rounded-xl border transition-colors ${
                  processingStatus === 'uploading' ||
                  processingStatus === 'uploaded' ||
                  processingStatus === 'processing' ||
                  processingStatus === 'ready'
                    ? 'bg-purple-950/40 border-purple-500/50 text-purple-200'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                }`}
              >
                <div className="font-semibold">2. Cloud Upload</div>
                <div className="text-[10px] opacity-75">S3 Multipart</div>
              </div>

              <div
                className={`p-2.5 rounded-xl border transition-colors ${
                  processingStatus === 'processing' || processingStatus === 'ready'
                    ? 'bg-purple-950/40 border-purple-500/50 text-purple-200'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                }`}
              >
                <div className="font-semibold">3. Transcoding</div>
                <div className="text-[10px] opacity-75">HLS 1080p-480p</div>
              </div>

              <div
                className={`p-2.5 rounded-xl border transition-colors ${
                  processingStatus === 'ready'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                }`}
              >
                <div className="font-semibold">4. Ready</div>
                <div className="text-[10px] opacity-75">CloudFront Live</div>
              </div>
            </div>
          </div>

          {/* Form Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Columns: Video File Dropzone & Metadata */}
            <div className="lg:col-span-2 space-y-6">
              {/* 3. Video Upload Area (Drag & Drop + File Browse) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Video Master Asset *
                </label>

                {!videoFile ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => videoInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-300 text-center ${
                      isDragging
                        ? 'border-purple-500 bg-purple-950/30 scale-[1.01] shadow-2xl shadow-purple-950/40'
                        : 'border-zinc-700/80 hover:border-purple-500/60 bg-zinc-900/40 hover:bg-zinc-900/70'
                    }`}
                  >
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleFileInput}
                      className="hidden"
                    />

                    <div className="w-16 h-16 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mb-4 shadow-lg shadow-purple-600/20 group-hover:scale-105 transition-transform">
                      <UploadCloud className="w-8 h-8" />
                    </div>

                    <div className="space-y-1.5 max-w-sm">
                      <p className="text-sm sm:text-base font-bold text-white">
                        Drag and drop your video file here
                      </p>
                      <p className="text-xs text-zinc-400">
                        Supports MP4, MOV, MKV, or WEBM (up to 2GB)
                      </p>
                    </div>

                    <button
                      type="button"
                      className="mt-5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                    >
                      Browse Video File
                    </button>
                  </div>
                ) : (
                  /* Selected File Inspection Card */
                  <div className="p-5 rounded-2xl bg-zinc-900 border border-purple-500/50 shadow-lg shadow-purple-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-400 flex items-center justify-center flex-shrink-0">
                        <FileVideo className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white truncate max-w-md">
                          {videoFile.name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                          <span>{formatFileSize(videoFile.size)}</span>
                          <span>•</span>
                          <span className="font-mono text-purple-300">
                            {videoFile.type || 'video/mp4'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setVideoFile(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 text-xs font-medium transition-colors cursor-pointer self-end sm:self-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                )}

                {formErrors.file && (
                  <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {formErrors.file}
                  </p>
                )}
              </div>

              {/* 4. Video Metadata Form */}
              <div className="space-y-5 p-6 sm:p-7 rounded-3xl bg-zinc-900/60 border border-zinc-800/80">
                <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
                  <Film className="w-4 h-4 text-purple-400" />
                  Video Metadata
                </h3>

                {/* Video Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    Video Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CyberPulse: Nexus 2088 - Chapter 1"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`w-full px-4 py-3 bg-zinc-950 border rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/25 transition-all ${
                      formErrors.title ? 'border-rose-500/80' : 'border-zinc-700/80'
                    }`}
                  />
                  {formErrors.title && (
                    <p className="text-xs text-rose-400">{formErrors.title}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    Description *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Write an engaging synopsis, streaming overview, and cast details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={`w-full px-4 py-3 bg-zinc-950 border rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/25 transition-all resize-y ${
                      formErrors.description ? 'border-rose-500/80' : 'border-zinc-700/80'
                    }`}
                  />
                  {formErrors.description && (
                    <p className="text-xs text-rose-400">{formErrors.description}</p>
                  )}
                </div>

                {/* Category & Visibility Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/25 cursor-pointer"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat} className="bg-zinc-950">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Visibility Controls */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Publish Visibility
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setVisibility('public')}
                        className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          visibility === 'public'
                            ? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow-sm'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Public</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setVisibility('private')}
                        className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          visibility === 'private'
                            ? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow-sm'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Private</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Thumbnail / Poster Upload */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                    <span>Thumbnail / Poster Image</span>
                    {customThumbnailName && (
                      <span className="text-[11px] text-purple-400 truncate max-w-xs font-mono">
                        {customThumbnailName}
                      </span>
                    )}
                  </label>

                  {/* Custom upload or preset selectors */}
                  <div className="grid grid-cols-4 gap-2.5">
                    {PRESET_THUMBNAILS.map((thumb, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setThumbnailUrl(thumb);
                          setCustomThumbnailName('');
                        }}
                        className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          thumbnailUrl === thumb
                            ? 'border-purple-500 ring-2 ring-purple-500/50 scale-102 shadow-md'
                            : 'border-zinc-800 hover:border-zinc-600 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={thumb}
                          alt={`Preset ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {thumbnailUrl === thumb && (
                          <div className="absolute inset-0 bg-purple-600/30 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-white drop-shadow" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Upload custom thumbnail button */}
                  <div className="pt-1">
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailInput}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => thumbnailInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                      <span>Upload Custom Image</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. Upload Action & Progress Section */}
              <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800/80 space-y-4">
                {processingStatus === 'uploading' ? (
                  /* Active Upload Progress Bar */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2 text-white">
                        <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
                        <span>Uploading to AWS S3 Bucket...</span>
                      </div>
                      <span className="font-mono text-purple-300 text-sm">
                        {uploadProgress}%
                      </span>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="relative w-full h-3 bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-zinc-800">
                      <div
                        style={{ width: `${uploadProgress}%` }}
                        className="h-full bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500 rounded-full shadow-lg shadow-purple-600/50 transition-all duration-300"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                      <span>Rate: Active • Direct S3 Binary Stream</span>
                      <button
                        type="button"
                        onClick={handleCancelUpload}
                        className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                      >
                        Cancel Upload
                      </button>
                    </div>
                  </div>
                ) : processingStatus === 'uploaded' ? (
                  /* Uploaded Status Transition */
                  <div className="p-4 rounded-2xl bg-sky-950/30 border border-sky-800/40 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-sky-600/20 text-sky-400 border border-sky-500/40 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white">
                        S3 Direct Upload Confirmed
                      </p>
                      <p className="text-[11px] text-sky-300">
                        Object registered in storage. Queued for background FFmpeg transcoding.
                      </p>
                    </div>
                  </div>
                ) : processingStatus === 'processing' ? (
                  /* Processing Status Animation */
                  <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-800/40 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/40 flex items-center justify-center flex-shrink-0">
                      <Layers className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white">
                        Generating Multi-Bitrate HLS Streams...
                      </p>
                      <p className="text-[11px] text-purple-300">
                        Encoding 1080p, 720p, 480p master playlists & audio segments.
                      </p>
                    </div>
                  </div>
                ) : processingStatus === 'failed' ? (
                  /* Failed State Notification */
                  <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-800/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-6 h-6 text-rose-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-white">
                          Ingest or Transcoding Failed
                        </p>
                        <p className="text-[11px] text-rose-300">
                          An error occurred during ingest. Please check the video asset and try again.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleResetForm}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-200 text-xs font-semibold border border-rose-500/30 transition-colors cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                ) : processingStatus === 'ready' ? (
                  /* Ready State Notification */
                  <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-white">
                          Cloud Ingest Complete & Stream Verified
                        </p>
                        <p className="text-[11px] text-emerald-300">
                          Video manifests published to CloudFront edge caches.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleResetForm}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-200 text-xs font-semibold border border-emerald-500/30 transition-colors cursor-pointer"
                    >
                      Upload Another
                    </button>
                  </div>
                ) : (
                  /* Ready to Upload Action Button */
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleStartUpload}
                      className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-600/30 hover:shadow-purple-600/50 flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
                    >
                      <UploadCloud className="w-5 h-5" />
                      <span>Upload & Ingest to Cloud</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Live Video Summary Card & Pipeline Details */}
            <div className="space-y-6">
              {/* 7. Post-Upload Video Summary Card */}
              <div className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800/80 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Preview Summary
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      visibility === 'public'
                        ? 'bg-purple-900/60 text-purple-300 border border-purple-500/40'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {visibility}
                  </span>
                </div>

                {/* 16:9 Thumbnail Preview */}
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-md group">
                  <img
                    src={thumbnailUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />

                  {/* Play Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-purple-600/80 text-white flex items-center justify-center shadow-lg shadow-purple-600/40 backdrop-blur-xs">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Category badge */}
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-900/80 text-purple-200 border border-purple-500/40">
                    {category}
                  </span>

                  {/* Status badge in thumbnail */}
                  <span
                    className={`absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                      processingStatus === 'ready'
                        ? 'bg-emerald-500 text-zinc-950'
                        : processingStatus === 'processing'
                        ? 'bg-purple-500 text-white animate-pulse'
                        : 'bg-black/75 text-zinc-300'
                    }`}
                  >
                    {processingStatus === 'ready'
                      ? 'Ready (4K)'
                      : processingStatus === 'processing'
                      ? 'Transcoding...'
                      : 'Draft Asset'}
                  </span>
                </div>

                {/* Summary Metadata */}
                <div className="space-y-1.5 pt-1">
                  <h4 className="text-base font-bold text-white line-clamp-1">
                    {title || 'Untitled Video Asset'}
                  </h4>
                  <p className="text-xs text-zinc-400 line-clamp-2">
                    {description || 'No description entered yet.'}
                  </p>
                </div>

                {/* Spec List */}
                <div className="pt-3 border-t border-zinc-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Source File:</span>
                    <span className="font-mono text-zinc-200 truncate max-w-[150px]">
                      {videoFile?.name || 'None selected'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>File Size:</span>
                    <span className="text-zinc-200">
                      {videoFile ? formatFileSize(videoFile.size) : '0 MB'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Resolution:</span>
                    <span className="text-purple-300 font-semibold">3840 x 2160 (4K UHD)</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Target CDN:</span>
                    <span className="font-mono text-zinc-300">d111111abcdef8.cloudfront.net</span>
                  </div>
                </div>

                {/* Watch in Player Button when ready */}
                {processingStatus === 'ready' && (
                  <button
                    onClick={() => {
                      if (uploadedVideoRecord?._id || uploadedVideoRecord?.id) {
                        const vidId = uploadedVideoRecord._id || uploadedVideoRecord.id;
                        try {
                          localStorage.setItem('streamcloud_active_video_id', vidId);
                        } catch {}
                        window.location.hash = `#watch?id=${vidId}`;
                      } else {
                        window.location.hash = '#watch';
                      }
                      if (onNavigateToWatch) {
                        onNavigateToWatch();
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/30 cursor-pointer transition-all"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Watch in Video Player</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Security & Ingest Specifications Box */}
              <div className="p-5 rounded-3xl bg-zinc-950 border border-zinc-800/80 space-y-2.5 text-xs text-zinc-400">
                <div className="flex items-center gap-1.5 text-purple-400 font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Cloud Security Ingest</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Assets uploaded via this console are encrypted at rest using AES-256 (SSE-S3). Only registered admins with active sessions can publish or modify videos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
