import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import VideoPlayer from '../components/VideoPlayer';
import AuthModal from '../components/AuthModal';
import { videoService, formatViews } from '../services/videoService';
import {
  Bookmark,
  Check,
  Share2,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Eye,
  Clock,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RotateCcw,
  Compass,
} from 'lucide-react';

function VideoDetailsSkeleton() {
  return (
    <div className="w-full space-y-8 animate-pulse">
      {/* Player Skeleton */}
      <div className="w-full aspect-video bg-zinc-900/90 rounded-2xl md:rounded-3xl border border-zinc-800/80 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-zinc-800/80" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="h-6 w-20 bg-zinc-800 rounded-full" />
              <div className="h-6 w-24 bg-zinc-800 rounded" />
              <div className="h-6 w-16 bg-zinc-800 rounded" />
            </div>
            <div className="h-8 w-3/4 bg-zinc-800 rounded-xl" />
            <div className="h-4 w-1/2 bg-zinc-800/60 rounded" />
          </div>

          <div className="flex gap-3 py-4 border-y border-zinc-800/80">
            <div className="h-10 w-36 bg-zinc-800 rounded-xl" />
            <div className="h-10 w-24 bg-zinc-800 rounded-xl" />
            <div className="h-10 w-28 bg-zinc-800 rounded-xl" />
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-zinc-800" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-40 bg-zinc-800 rounded" />
              <div className="h-3 w-28 bg-zinc-800/60 rounded" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
            <div className="h-4 w-32 bg-zinc-800 rounded" />
            <div className="h-3 w-full bg-zinc-800/60 rounded" />
            <div className="h-3 w-5/6 bg-zinc-800/60 rounded" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="h-6 w-44 bg-zinc-800 rounded" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800/80 flex gap-3.5 items-center"
            >
              <div className="aspect-video w-32 rounded-xl bg-zinc-800 flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-3.5 w-full bg-zinc-800 rounded" />
                <div className="h-3 w-24 bg-zinc-800/60 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VideoDetailsError({ errorMessage, onRetry, onBrowse }) {
  return (
    <div className="py-20 px-4 text-center rounded-3xl bg-zinc-900/60 border border-zinc-800/80 space-y-5 max-w-2xl mx-auto shadow-2xl">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center shadow-lg shadow-rose-950/40">
        <AlertCircle className="w-8 h-8" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl sm:text-2xl font-bold text-white">Unable to Load Stream</h3>
        <p className="text-sm text-zinc-400 max-w-md mx-auto">
          {errorMessage || 'The requested video metadata could not be fetched from the streaming catalog.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
        <button
          onClick={onBrowse}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 transition-all cursor-pointer"
        >
          <Compass className="w-4 h-4 text-purple-400" />
          <span>Browse All Titles</span>
        </button>
      </div>
    </div>
  );
}

export default function VideoDetails({ initialVideoId = null }) {
  const [currentVideo, setCurrentVideo] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // User interactive actions
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [likeCount, setLikeCount] = useState(142500);
  const [isLiked, setIsLiked] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [activeAlert, setActiveAlert] = useState(null);

  // Ref guard so view is recorded only once per viewing session
  const hasRecordedViewRef = useRef(false);

  // Auth State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('streamcloud_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signin');

  const handleOpenAuth = (mode = 'signin') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (userData, actionType) => {
    setCurrentUser(userData);
    try {
      localStorage.setItem('streamcloud_user', JSON.stringify(userData));
    } catch (e) {
      console.error('Storage error', e);
    }
    const msg =
      actionType === 'created'
        ? `Account created! Welcome to StreamCloud, ${userData.name}! 🎉`
        : `Welcome back, ${userData.name}! 🎬`;
    setActiveAlert(msg);
    setTimeout(() => setActiveAlert(null), 5000);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('streamcloud_user');
    } catch (e) {
      console.error('Storage error', e);
    }
    setActiveAlert('Signed out successfully.');
    setTimeout(() => setActiveAlert(null), 3500);
  };

  // Resolve target video ID from hash parameters or props
  const resolveTargetId = useCallback(() => {
    try {
      const hash = window.location.hash;
      if (hash.includes('?')) {
        const query = hash.split('?')[1];
        const params = new URLSearchParams(query);
        const hashId = params.get('id');
        if (hashId) return hashId;
      }
      const searchParams = new URLSearchParams(window.location.search);
      const searchId = searchParams.get('id');
      if (searchId) return searchId;

      if (initialVideoId && initialVideoId !== 'hero-1') return initialVideoId;

      const cachedId = localStorage.getItem('streamcloud_active_video_id');
      if (cachedId) return cachedId;
    } catch (e) {
      console.warn('Error resolving target ID:', e);
    }
    return null;
  }, [initialVideoId]);

  // Load Video Metadata & HLS details from backend
  const loadVideo = useCallback(async (targetId) => {
    setIsLoading(true);
    setFetchError(null);
    hasRecordedViewRef.current = false; // Reset view guard for new stream

    try {
      let videoData = null;
      if (targetId) {
        try {
          const res = await videoService.getVideoById(targetId);
          if (res?.success && res.video) {
            videoData = res.video;
          }
        } catch (err) {
          console.warn('[VideoDetails] Specified video not found by ID, falling back to catalog:', err.message);
        }
      }

      // If specific ID was not found or not provided, fetch the latest catalog video
      if (!videoData) {
        const catalogRes = await videoService.getVideos({ limit: 1 });
        if (catalogRes?.videos && catalogRes.videos.length > 0) {
          videoData = catalogRes.videos[0];
        }
      }

      if (!videoData) {
        throw new Error('No videos available in the catalog. Please ensure the backend server is running.');
      }

      setCurrentVideo(videoData);
      try {
        localStorage.setItem('streamcloud_active_video_id', videoData.id);
      } catch {}

      // Fetch real recommendations from catalog
      try {
        const recRes = await videoService.getVideos({
          limit: 8,
          category: videoData.category && videoData.category !== 'Featured' ? videoData.category : undefined,
        });
        const recList = (recRes.videos || []).filter((v) => v.id !== videoData.id).slice(0, 6);
        setRecommendations(recList);
      } catch (err) {
        console.warn('[VideoDetails] Recommendations fetch failed:', err.message);
      }
    } catch (err) {
      setFetchError(err.message || 'Failed to load video metadata.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch initial video on mount or hash change
  useEffect(() => {
    const targetId = resolveTargetId();
    loadVideo(targetId);

    const handleHashChange = () => {
      const newTargetId = resolveTargetId();
      if (newTargetId && newTargetId !== currentVideo?.id) {
        loadVideo(newTargetId);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [resolveTargetId, loadVideo]);

  // Record a view atomically when the user starts video playback
  const handleRecordView = async () => {
    if (!currentVideo?.id || hasRecordedViewRef.current) return;
    hasRecordedViewRef.current = true;
    try {
      const result = await videoService.recordView(currentVideo.id);
      if (result && typeof result.views === 'number') {
        setCurrentVideo((prev) => ({
          ...prev,
          viewsCount: result.views,
          views: formatViews(result.views),
        }));
      }
    } catch (err) {
      console.warn('[VideoDetails] Could not record view:', err.message);
    }
  };

  // Watchlist action
  const toggleWatchlist = () => {
    setInWatchlist(!inWatchlist);
    setActiveAlert(
      !inWatchlist
        ? `"${currentVideo.title}" added to your Watchlist.`
        : `"${currentVideo.title}" removed from Watchlist.`
    );
    setTimeout(() => setActiveAlert(null), 3500);
  };

  // Share action with Clipboard copy
  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setActiveAlert('Video stream link copied to clipboard! 📋');
        setTimeout(() => setActiveAlert(null), 3500);
      });
    } else {
      setActiveAlert('Video link ready to share!');
      setTimeout(() => setActiveAlert(null), 3500);
    }
  };

  // Like action
  const toggleLike = () => {
    if (isLiked) {
      setIsLiked(false);
      setLikeCount((prev) => prev - 1);
    } else {
      setIsLiked(true);
      setLikeCount((prev) => prev + 1);
    }
  };

  // Subscribe action
  const toggleSubscribe = () => {
    setIsSubscribed(!isSubscribed);
    setActiveAlert(
      !isSubscribed
        ? `Subscribed to ${currentVideo.creator || 'Creator'}! Notifications active 🔔`
        : `Unsubscribed from ${currentVideo.creator || 'Creator'}.`
    );
    setTimeout(() => setActiveAlert(null), 3500);
  };

  // Select another video from recommendations
  const handleSelectRecommendedVideo = (recVideo) => {
    window.location.hash = `#watch?id=${recVideo.id}`;
    loadVideo(recVideo.id);
    setInWatchlist(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col selection:bg-purple-600 selection:text-white">
      {/* Toast Alert Feedback */}
      {activeAlert && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-zinc-900/95 border border-purple-500/50 text-purple-100 shadow-2xl shadow-purple-900/40 backdrop-blur-md animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
          <span className="text-sm font-semibold">{activeAlert}</span>
        </div>
      )}

      {/* Navbar */}
      <Navbar
        currentPage="browse"
        user={currentUser}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-grow pt-24 md:pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {isLoading ? (
            <VideoDetailsSkeleton />
          ) : fetchError || !currentVideo ? (
            <VideoDetailsError
              errorMessage={fetchError}
              onRetry={() => loadVideo(resolveTargetId())}
              onBrowse={() => {
                window.location.hash = '#browse';
              }}
            />
          ) : (
            <>
              {/* 1. Large Responsive Video Player with HLS information */}
              <div className="w-full">
                <VideoPlayer
                  videoSource={currentVideo.videoSource}
                  posterUrl={currentVideo.thumbnailUrl}
                  title={currentVideo.title}
                  autoPlay={false}
                  onPlay={handleRecordView}
                />
              </div>

              {/* 2. Grid Layout: Left Details Column + Right Recommended Column */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Left 2 Columns: Video Metadata, Actions, Creator, Description */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Title & Key Badges */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-600/20 text-purple-300 border border-purple-500/40 backdrop-blur-sm">
                        {currentVideo.category}
                      </span>
                      <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-zinc-800/90 text-zinc-300 border border-zinc-700/60">
                        4K Ultra HD
                      </span>
                      <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-zinc-800/90 text-zinc-300 border border-zinc-700/60">
                        5.1 Audio
                      </span>
                      <div className="flex items-center gap-1 text-amber-400 text-xs font-semibold ml-1">
                        <span>★</span>
                        <span>{currentVideo.rating || '4.9'}</span>
                      </div>
                    </div>

                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                      {currentVideo.title}
                    </h1>

                    {/* Metrics Row: Views, Upload Date, Duration */}
                    <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-zinc-400 font-normal">
                      <div className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-purple-400" />
                        <span>{currentVideo.views} views</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                        <span>{currentVideo.uploadedAt || 'Recent'}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-zinc-500" />
                        <span>{currentVideo.duration}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons: Watchlist, Share, Like */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 border-y border-zinc-800/80 py-4">
                    {/* Watchlist Button */}
                    <button
                      onClick={toggleWatchlist}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                        inWatchlist
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                          : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/70 hover:border-purple-500/40'
                      }`}
                    >
                      {inWatchlist ? (
                        <>
                          <Check className="w-4 h-4 text-white" />
                          <span>In Watchlist</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-4 h-4 text-purple-400" />
                          <span>Add to Watchlist</span>
                        </>
                      )}
                    </button>

                    {/* Share Button */}
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/70 hover:border-purple-500/40 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 text-purple-400" />
                      <span>Share</span>
                    </button>

                    {/* Like Button */}
                    <div className="flex items-center rounded-xl bg-zinc-900 border border-zinc-700/70 overflow-hidden">
                      <button
                        onClick={toggleLike}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                          isLiked ? 'text-purple-300 bg-purple-950/40' : 'text-zinc-200 hover:text-white'
                        }`}
                      >
                        <ThumbsUp className={`w-4 h-4 ${isLiked ? 'text-purple-400 fill-current' : ''}`} />
                        <span>{likeCount.toLocaleString()}</span>
                      </button>
                      <div className="w-px h-5 bg-zinc-800" />
                      <button
                        onClick={() => setActiveAlert('Feedback noted! 👍')}
                        className="p-2.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        aria-label="Dislike"
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 3. Creator Information Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 shadow-lg">
                    <div className="flex items-center gap-3.5">
                      {/* Creator Avatar */}
                      <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-600/25 ring-2 ring-purple-500/40">
                        {(currentVideo.creator || 'C').charAt(0).toUpperCase()}
                      </div>

                      {/* Creator Details */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-base text-white">
                            {currentVideo.creator || 'StreamCloud Studios'}
                          </h3>
                          <ShieldCheck className="w-4 h-4 text-purple-400 fill-current" />
                        </div>
                        <p className="text-xs text-zinc-400 font-medium">
                          StreamCloud Verified Creator • 1.2M Subscribers
                        </p>
                      </div>
                    </div>

                    {/* Subscribe Button */}
                    <button
                      onClick={toggleSubscribe}
                      className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                        isSubscribed
                          ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30'
                      }`}
                    >
                      {isSubscribed ? 'Subscribed' : 'Subscribe'}
                    </button>
                  </div>

                  {/* 4. Video Description Section (Expandable) */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                        About this Stream
                      </h4>
                      <button
                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                        className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                      >
                        {isDescriptionExpanded ? (
                          <>
                            <span>Show Less</span>
                            <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <span>Show More</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>

                    <p
                      className={`text-sm text-zinc-300 leading-relaxed ${
                        !isDescriptionExpanded ? 'line-clamp-3' : ''
                      }`}
                    >
                      {currentVideo.description}
                    </p>

                    {/* Expanded Details */}
                    {isDescriptionExpanded && (
                      <div className="pt-4 border-t border-zinc-800/80 space-y-3 animate-fadeIn text-xs">
                        {/* Tags */}
                        {currentVideo.tags && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {currentVideo.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2.5 py-1 rounded-lg bg-zinc-800/80 text-purple-300 font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Technical Specifications */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 text-zinc-400">
                          <div>
                            <span className="block text-zinc-500 text-[10px] uppercase font-bold">
                              Stream Protocol
                            </span>
                            <span className="text-zinc-200 font-mono">HLS / MPEG-TS</span>
                          </div>
                          <div>
                            <span className="block text-zinc-500 text-[10px] uppercase font-bold">
                              Resolution
                            </span>
                            <span className="text-zinc-200 font-mono">3840 x 2160 (4K UHD)</span>
                          </div>
                          <div>
                            <span className="block text-zinc-500 text-[10px] uppercase font-bold">
                              Audio Format
                            </span>
                            <span className="text-zinc-200 font-mono">Dolby 5.1 / AAC</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: "Recommended Videos" Sidebar from real catalog */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                      Recommended For You
                    </h2>
                  </div>

                  {/* Recommended Video Cards List */}
                  <div className="space-y-4">
                    {recommendations.length > 0 ? (
                      recommendations.map((rec) => (
                        <div
                          key={rec.id}
                          onClick={() => handleSelectRecommendedVideo(rec)}
                          className="cursor-pointer group rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/80 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-950/30 transition-all p-3 flex gap-3.5 items-center"
                        >
                          {/* Compact 16:9 Thumbnail */}
                          <div className="relative aspect-video w-32 sm:w-36 flex-shrink-0 rounded-xl overflow-hidden bg-zinc-950">
                            <img
                              src={rec.thumbnailUrl}
                              alt={rec.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-zinc-200">
                              {rec.duration}
                            </span>
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <h4 className="text-xs sm:text-sm font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-2">
                              {rec.title}
                            </h4>
                            <p className="text-[11px] text-zinc-400 truncate">
                              {rec.creator || 'Creator'}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                              <span>{rec.views} views</span>
                              <span>•</span>
                              <span className="text-purple-400">{rec.category}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 text-center text-xs text-zinc-400">
                        No additional recommendations available.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Reusable Footer */}
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
