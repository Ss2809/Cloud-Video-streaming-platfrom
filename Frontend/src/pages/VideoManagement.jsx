import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AuthModal from '../components/AuthModal';
import { videoService } from '../services/videoService';
import {
  Search,
  X,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Globe,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Film,
  Sparkles,
  Layers,
  Check,
  RotateCcw,
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

const ADMIN_DEMO_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhYzdhNWU3YzJlYTc4MGRmNGZhMTg0MSIsImVtYWlsIjoiYWRtaW5Ac3RyZWFtY2xvdWQuaW8iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3OTE0NjkwMzEsImV4cCI6MTc5MjA3MzgzMX0.6r3DeUuhxRl3vou74JeXqDpZEIjsjr-d2OfCJaUGC3s';

const ITEMS_PER_PAGE = 6;

export default function VideoManagement({ onNavigateToUpload, onNavigateToWatch }) {
  // Admin Session State
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

  // Video Management State
  const [videos, setVideos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Ready' | 'Processing' | 'Failed' | 'Public' | 'Private'
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Modal States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [videoToEdit, setVideoToEdit] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('Action');
  const [editVisibility, setEditVisibility] = useState('public');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [videoToPreview, setVideoToPreview] = useState(null);

  // Load Real Videos from Backend API
  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await videoService.getVideos({ limit: 100 });
      if (res && Array.isArray(res.videos)) {
        setVideos(res.videos);
      }
    } catch (err) {
      console.error('[VideoManagement] Fetch error:', err);
      setFetchError(err.response?.data?.message || 'Failed to fetch catalog videos from server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch videos on mount and when admin user changes
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchVideos();
    } else {
      setIsLoading(false);
    }
  }, [fetchVideos, currentUser]);

  // Switch to admin session demo helper
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
    setActiveAlert('Authenticated as Administrator (Management Privileges) 🛡️');
    setTimeout(() => setActiveAlert(null), 3500);
    fetchVideos();
  };

  const handleOpenAuth = (mode = 'signin') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (userData) => {
    setCurrentUser(userData);
    localStorage.setItem('streamcloud_user', JSON.stringify(userData));
    setActiveAlert(`Signed in as ${userData.name}!`);
    setTimeout(() => setActiveAlert(null), 3500);
    if (userData.role === 'admin') {
      fetchVideos();
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('streamcloud_user');
    localStorage.removeItem('streamcloud_token');
    setActiveAlert('Signed out of admin session.');
    setTimeout(() => setActiveAlert(null), 3500);
  };

  const handleFilterChange = (filter) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  // Filtering Logic
  const filteredVideos = useMemo(() => {
    let result = [...videos];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.title?.toLowerCase().includes(q) ||
          v.category?.toLowerCase().includes(q) ||
          (v.creator && v.creator.toLowerCase().includes(q))
      );
    }

    // Status / Visibility Filter
    if (statusFilter === 'Ready') {
      result = result.filter((v) => v.status === 'ready' || v.rawStatus === 'READY');
    } else if (statusFilter === 'Processing') {
      result = result.filter((v) =>
        ['processing', 'pending_upload', 'uploaded'].includes((v.status || '').toLowerCase()) ||
        ['PROCESSING', 'PENDING_UPLOAD', 'UPLOADED'].includes(v.rawStatus)
      );
    } else if (statusFilter === 'Failed') {
      result = result.filter((v) => v.status === 'failed' || v.rawStatus === 'FAILED');
    } else if (statusFilter === 'Public') {
      result = result.filter((v) => v.visibility === 'public');
    } else if (statusFilter === 'Private') {
      result = result.filter((v) => v.visibility === 'private');
    }

    return result;
  }, [videos, searchQuery, statusFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredVideos.length / ITEMS_PER_PAGE) || 1;
  const paginatedVideos = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredVideos.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredVideos, currentPage]);

  // Toggle Visibility action (Public <-> Private) with backend persistence
  const handleToggleVisibility = async (videoId) => {
    const video = videos.find((v) => v.id === videoId);
    if (!video) return;

    const nextVis = video.visibility === 'public' ? 'private' : 'public';

    // Optimistic UI update
    setVideos((prev) =>
      prev.map((v) => (v.id === videoId ? { ...v, visibility: nextVis } : v))
    );
    setActiveAlert(`Updated visibility of "${video.title}" to ${nextVis.toUpperCase()}.`);
    setTimeout(() => setActiveAlert(null), 3500);

    try {
      await videoService.updateVideo(videoId, { visibility: nextVis });
    } catch (err) {
      console.error('[VideoManagement] Visibility update error:', err);
      // Revert state on failure
      setVideos((prev) =>
        prev.map((v) => (v.id === videoId ? { ...v, visibility: video.visibility } : v))
      );
      setActiveAlert(err.response?.data?.message || 'Failed to update visibility.');
      setTimeout(() => setActiveAlert(null), 3500);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (video) => {
    setVideoToEdit(video);
    setEditTitle(video.title || '');
    setEditCategory(video.category || 'Action');
    setEditVisibility(video.visibility || 'public');
    setEditModalOpen(true);
  };

  // Save Edit Changes with backend persistence
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !videoToEdit) return;

    setIsSubmittingEdit(true);
    try {
      const result = await videoService.updateVideo(videoToEdit.id, {
        title: editTitle.trim(),
        categoryId: editCategory,
        visibility: editVisibility,
      });

      setVideos((prev) =>
        prev.map((v) => {
          if (v.id === videoToEdit.id) {
            return {
              ...v,
              title: editTitle.trim(),
              category: editCategory,
              visibility: editVisibility,
              ...(result?.video || {}),
            };
          }
          return v;
        })
      );

      setEditModalOpen(false);
      setActiveAlert(`Saved changes for "${editTitle.trim()}".`);
      setTimeout(() => setActiveAlert(null), 3500);
    } catch (err) {
      console.error('[VideoManagement] Edit error:', err);
      setActiveAlert(err.response?.data?.message || 'Failed to update video metadata.');
      setTimeout(() => setActiveAlert(null), 3500);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Open Delete Confirmation Modal
  const handleOpenDeleteModal = (video) => {
    setVideoToDelete(video);
    setDeleteModalOpen(true);
  };

  // Confirm Delete with backend persistence
  const handleConfirmDelete = async () => {
    if (!videoToDelete) return;

    setIsDeleting(true);
    try {
      await videoService.deleteVideo(videoToDelete.id);
      setVideos((prev) => prev.filter((v) => v.id !== videoToDelete.id));
      setDeleteModalOpen(false);
      setActiveAlert(`Permanently deleted "${videoToDelete.title}". 🗑️`);
      setTimeout(() => setActiveAlert(null), 3500);
      setVideoToDelete(null);
    } catch (err) {
      console.error('[VideoManagement] Delete error:', err);
      setActiveAlert(err.response?.data?.message || 'Failed to delete video.');
      setTimeout(() => setActiveAlert(null), 3500);
    } finally {
      setIsDeleting(false);
    }
  };

  // Preview Action
  const handleOpenPreview = (video) => {
    setVideoToPreview(video);
    setPreviewModalOpen(true);
  };

  const handlePreviewWatch = () => {
    if (!videoToPreview) return;
    const targetId = videoToPreview.id;
    setPreviewModalOpen(false);
    try {
      localStorage.setItem('streamcloud_active_video_id', targetId);
    } catch {}
    window.location.hash = `#watch?id=${targetId}`;
    if (onNavigateToWatch) {
      onNavigateToWatch(targetId);
    }
  };

  // 1. Admin Authorization Guard
  const isAdmin = currentUser && currentUser.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col selection:bg-purple-600 selection:text-white">
        <Navbar
          currentPage="admin-videos"
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
                The Video Management dashboard is restricted to
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

  // Aggregate stats
  const totalCount = videos.length;
  const readyCount = videos.filter((v) => v.status === 'ready' || v.rawStatus === 'READY').length;
  const processingCount = videos.filter(
    (v) =>
      ['processing', 'pending_upload', 'uploaded'].includes((v.status || '').toLowerCase()) ||
      ['PROCESSING', 'PENDING_UPLOAD', 'UPLOADED'].includes(v.rawStatus)
  ).length;
  const failedCount = videos.filter((v) => v.status === 'failed' || v.rawStatus === 'FAILED').length;

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
        currentPage="admin-videos"
        user={currentUser}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-grow pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* 2. Header & Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-purple-950/40 via-zinc-900/80 to-zinc-950 border border-zinc-800/80 shadow-2xl shadow-purple-950/20">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-600/20 text-purple-300 border border-purple-500/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  Admin Console
                </span>
                <span className="text-xs text-zinc-400">• Master Video Library</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                Video Management
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-xl">
                Monitor cloud transcoding status, publish visibility, edit metadata, and manage the platform catalog in real time.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchVideos}
                title="Refresh Catalog"
                className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
              </button>
              <button
                onClick={() => {
                  if (onNavigateToUpload) onNavigateToUpload();
                  else window.location.hash = '#admin-upload';
                }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Upload New Video</span>
              </button>
            </div>
          </div>

          {/* Metrics Quick Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 space-y-1">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Total Titles
              </span>
              <p className="text-xl sm:text-2xl font-bold text-white">{totalCount}</p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 space-y-1">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                Ready to Stream
              </span>
              <p className="text-xl sm:text-2xl font-bold text-emerald-300">{readyCount}</p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 space-y-1">
              <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">
                Processing HLS
              </span>
              <p className="text-xl sm:text-2xl font-bold text-purple-300">{processingCount}</p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 space-y-1">
              <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
                Failed Ingest
              </span>
              <p className="text-xl sm:text-2xl font-bold text-rose-300">{failedCount}</p>
            </div>
          </div>

          {/* Error Banner if API failed */}
          {fetchError && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{fetchError}</span>
              </div>
              <button
                onClick={fetchVideos}
                className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* 3 & 4. Search and Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80">
            {/* Search Input */}
            <div className="relative flex items-center w-full md:w-80">
              <Search className="absolute left-3.5 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search videos by title or category..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-9 py-2 bg-zinc-950 border border-zinc-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/25 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute right-3 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {['All', 'Ready', 'Processing', 'Failed', 'Public', 'Private'].map((filter) => {
                const isActive = statusFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => handleFilterChange(filter)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex-shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800 hover:border-purple-500/30'
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5, 6, 7. Video List / Responsive Table */}
          {isLoading ? (
            /* Skeleton Loading Rows */
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-2xl bg-zinc-900/60 border border-zinc-800 animate-pulse"
                />
              ))}
            </div>
          ) : paginatedVideos.length > 0 ? (
            <div className="space-y-4">
              {/* Desktop / Tablet Table */}
              <div className="hidden md:block overflow-hidden rounded-3xl bg-zinc-900/70 border border-zinc-800/80 shadow-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800/80 bg-zinc-950/60 text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                      <th className="py-3.5 px-4">Video Asset</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Views & Duration</th>
                      <th className="py-3.5 px-4">Upload Date</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Visibility</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-xs text-zinc-300">
                    {paginatedVideos.map((video) => {
                      const isReady = video.status === 'ready' || video.rawStatus === 'READY';
                      const isFailed = video.status === 'failed' || video.rawStatus === 'FAILED';
                      const displayStatus = video.rawStatus || video.status;

                      return (
                        <tr
                          key={video.id}
                          className="hover:bg-zinc-800/40 transition-colors group"
                        >
                          {/* Video Thumbnail + Title */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative aspect-video w-20 sm:w-24 rounded-lg overflow-hidden bg-black flex-shrink-0 border border-zinc-800">
                                <img
                                  src={video.thumbnailUrl}
                                  alt={video.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                              <div className="min-w-0 max-w-xs">
                                <p className="font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                                  {video.title}
                                </p>
                                <p className="text-[11px] text-zinc-500 font-mono">
                                  ID: {video.id}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-zinc-800 text-purple-300 border border-zinc-700">
                              {video.category}
                            </span>
                          </td>

                          {/* Views & Duration */}
                          <td className="py-3 px-4">
                            <p className="font-semibold text-white">{video.views} views</p>
                            <p className="text-zinc-500 text-[11px]">{video.duration}</p>
                          </td>

                          {/* Upload Date */}
                          <td className="py-3 px-4 text-zinc-400">
                            {video.uploadDate || video.uploadedAt}
                          </td>

                          {/* Processing Status Badge */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isReady
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : isFailed
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                  : 'bg-purple-500/10 text-purple-400 border border-purple-500/30 animate-pulse'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isReady
                                    ? 'bg-emerald-400'
                                    : isFailed
                                    ? 'bg-rose-400'
                                    : 'bg-purple-400'
                                }`}
                              />
                              {displayStatus}
                            </span>
                          </td>

                          {/* Visibility Badge */}
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleToggleVisibility(video.id)}
                              title="Click to toggle visibility"
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                                video.visibility === 'public'
                                  ? 'bg-purple-900/40 text-purple-300 border border-purple-500/30 hover:bg-purple-900/60'
                                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
                              }`}
                            >
                              {video.visibility === 'public' ? (
                                <Globe className="w-3 h-3 text-purple-400" />
                              ) : (
                                <Lock className="w-3 h-3 text-zinc-400" />
                              )}
                              <span className="capitalize">{video.visibility}</span>
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Action */}
                              <button
                                onClick={() => handleOpenPreview(video)}
                                title="Preview Video"
                                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Edit Action */}
                              <button
                                onClick={() => handleOpenEditModal(video)}
                                title="Edit Metadata"
                                className="p-1.5 text-zinc-400 hover:text-purple-300 rounded-lg hover:bg-purple-600/20 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Delete Action */}
                              <button
                                onClick={() => handleOpenDeleteModal(video)}
                                title="Delete Video"
                                className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/20 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden space-y-3">
                {paginatedVideos.map((video) => {
                  const isReady = video.status === 'ready' || video.rawStatus === 'READY';
                  const isFailed = video.status === 'failed' || video.rawStatus === 'FAILED';
                  const displayStatus = video.rawStatus || video.status;

                  return (
                    <div
                      key={video.id}
                      className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative aspect-video w-24 rounded-lg overflow-hidden bg-black flex-shrink-0">
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-white line-clamp-1">
                            {video.title}
                          </h4>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {video.category} • {video.views} views
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800/80">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isReady
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : isFailed
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-purple-500/20 text-purple-300'
                          }`}
                        >
                          {displayStatus}
                        </span>

                        <button
                          onClick={() => handleToggleVisibility(video.id)}
                          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white capitalize"
                        >
                          {video.visibility === 'public' ? (
                            <Globe className="w-3.5 h-3.5 text-purple-400" />
                          ) : (
                            <Lock className="w-3.5 h-3.5" />
                          )}
                          <span className="capitalize">{video.visibility}</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenPreview(video)}
                            className="p-1.5 text-zinc-400 hover:text-white"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(video)}
                            className="p-1.5 text-purple-400"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(video)}
                            className="p-1.5 text-rose-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 10. Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 px-2">
                <p className="text-xs text-zinc-400">
                  Showing{' '}
                  <strong className="text-white">
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                  </strong>{' '}
                  to{' '}
                  <strong className="text-white">
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredVideos.length)}
                  </strong>{' '}
                  of <strong className="text-white">{filteredVideos.length}</strong> videos
                </p>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* 9. Empty State */
            <div className="py-16 text-center rounded-3xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-950/50 border border-purple-800/40 text-purple-400 mx-auto flex items-center justify-center">
                <Film className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-lg font-bold text-white">No videos found</h3>
                <p className="text-xs text-zinc-400">
                  No video records matched your filter criteria or search query.
                </p>
              </div>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
                  setCurrentPage(1);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Filters</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* 8. Confirmation Modal Before Delete */}
      {deleteModalOpen && videoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !isDeleting && setDeleteModalOpen(false)}
          />

          <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-5 z-10 shadow-2xl animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-white">Delete Video Asset?</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Are you sure you want to delete{' '}
                <strong className="text-white">&ldquo;{videoToDelete.title}&rdquo;</strong>?
                This action will permanently purge the source master file and all HLS transcode streams from cloud storage.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-zinc-300 text-xs font-semibold border border-zinc-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeleting ? 'Deleting...' : 'Delete Video'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Edit Metadata Modal */}
      {editModalOpen && videoToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !isSubmittingEdit && setEditModalOpen(false)}
          />

          <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-5 z-10 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-purple-400" />
                Edit Video Details
              </h3>
              <button
                disabled={isSubmittingEdit}
                onClick={() => setEditModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Video Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-zinc-900">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Visibility */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Visibility
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditVisibility('public')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                      editVisibility === 'public'
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditVisibility('private')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                      editVisibility === 'private'
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    Private
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  disabled={isSubmittingEdit}
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-zinc-300 text-xs font-semibold border border-zinc-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSubmittingEdit && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmittingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewModalOpen && videoToPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewModalOpen(false)}
          />

          <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4 z-10 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white truncate max-w-sm">
                {videoToPreview.title}
              </h3>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-zinc-800">
              <img
                src={videoToPreview.thumbnailUrl}
                alt={videoToPreview.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-black/80 text-[10px] text-zinc-200">
                {videoToPreview.duration}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Category: {videoToPreview.category}</span>
              <span className="uppercase">Status: {videoToPreview.rawStatus || videoToPreview.status}</span>
              <span className="capitalize">Visibility: {videoToPreview.visibility}</span>
            </div>

            <button
              onClick={handlePreviewWatch}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Open in 4K Player
            </button>
          </div>
        </div>
      )}

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
