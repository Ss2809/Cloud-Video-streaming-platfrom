import React, { useState, useMemo, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import VideoCard from '../components/VideoCard';
import VideoCardSkeleton from '../components/VideoCardSkeleton';
import AuthModal from '../components/AuthModal';
import { browseVideos } from '../data/mockData';
import {
  Search,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  RotateCcw,
  Film,
  Sparkles,
  TrendingUp,
  Clock,
  Eye,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'Action',
  'Adventure',
  'Comedy',
  'Documentary',
  'Education',
  'Music',
  'Sports',
];

const SORT_OPTIONS = [
  { id: 'latest', label: 'Latest', icon: Clock },
  { id: 'mostViewed', label: 'Most Viewed', icon: Eye },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
];

const ITEMS_PER_PAGE = 8;

export default function Browse() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('latest');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeAlert, setActiveAlert] = useState(null);

  // Authentication State Integration
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

  const handlePlayVideo = (video) => {
    try {
      localStorage.setItem('streamcloud_active_video_id', video.id || video._id);
    } catch {}
    window.location.hash = `#watch?id=${video.id || video._id}`;
  };

  // Trigger brief simulated loading skeleton when category or sort changes
  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    setVisibleCount(ITEMS_PER_PAGE);
    simulateLoading();
  };

  const handleSortChange = (sortId) => {
    setSortBy(sortId);
    simulateLoading();
  };

  const simulateLoading = () => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 280);
    return () => clearTimeout(timer);
  };

  // Reset all filters and search query
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSortBy('latest');
    setVisibleCount(ITEMS_PER_PAGE);
    simulateLoading();
  };

  // Client-side filtering & sorting (ready for MERN API query mapping: /api/videos?category=&search=&sort=)
  const filteredAndSortedVideos = useMemo(() => {
    let result = [...browseVideos];

    // 1. Keyword / Title Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q) ||
          (v.creator && v.creator.toLowerCase().includes(q))
      );
    }

    // 2. Category Filter
    if (selectedCategory !== 'All') {
      result = result.filter(
        (v) => v.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // 3. Sorting Filter
    result.sort((a, b) => {
      if (sortBy === 'latest') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (sortBy === 'mostViewed') {
        return (b.viewsCount || 0) - (a.viewsCount || 0);
      }
      if (sortBy === 'trending') {
        return (b.trendingScore || 0) - (a.trendingScore || 0);
      }
      return 0;
    });

    return result;
  }, [searchQuery, selectedCategory, sortBy]);

  // Paginated subset
  const displayedVideos = filteredAndSortedVideos.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAndSortedVideos.length;

  // Handle Load More
  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
      setIsLoadingMore(false);
    }, 350);
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

      {/* Responsive Navbar */}
      <Navbar
        currentPage="browse"
        onSearchChange={setSearchQuery}
        user={currentUser}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      {/* Main Browse Content */}
      <main className="flex-grow pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* 1. Top Section: Page Header & Prominent Search */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950/40 via-zinc-900/80 to-zinc-950 border border-zinc-800/80 p-6 sm:p-10 shadow-2xl shadow-purple-950/20">
            {/* Ambient background glow */}
            <div className="absolute -top-12 -right-12 w-80 h-80 bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-600/20 text-purple-300 border border-purple-500/30 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Unlimited Cloud Catalog</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
                Browse Videos
              </h1>

              <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl font-normal">
                Explore thousands of high-definition cinematic releases, educational deep-dives, live festivals, and trending original content across all genres.
              </p>

              {/* Large Prominent Search Bar */}
              <div className="pt-2">
                <div className="relative flex items-center w-full max-w-2xl">
                  <Search className="absolute left-4.5 w-5 h-5 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by video title, creator, or keyword..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setVisibleCount(ITEMS_PER_PAGE);
                    }}
                    className="w-full pl-12 pr-11 py-3.5 sm:py-4 bg-zinc-950/90 border border-zinc-700/80 hover:border-zinc-600 rounded-2xl text-sm sm:text-base text-white placeholder-zinc-500 shadow-inner focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search input"
                      className="absolute right-3.5 p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Category Filter Chips */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400">
                Filter By Category
              </span>
              {selectedCategory !== 'All' && (
                <button
                  onClick={() => handleCategoryChange('All')}
                  className="text-xs text-purple-400 hover:text-purple-300 font-medium cursor-pointer"
                >
                  Reset Category
                </button>
              )}
            </div>

            {/* Horizontal Scrollable Category Chips */}
            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex-shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 scale-[1.02] border border-purple-400/30'
                        : 'bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 hover:border-purple-500/40'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Filter / Sort Controls Bar & Result Metrics */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80">
            {/* Results Count & Current Filter Indicator */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-300">
              <Film className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <span>
                Showing{' '}
                <strong className="text-white font-semibold">
                  {displayedVideos.length}
                </strong>{' '}
                of{' '}
                <strong className="text-white font-semibold">
                  {filteredAndSortedVideos.length}
                </strong>{' '}
                videos
                {selectedCategory !== 'All' && (
                  <span className="text-purple-400 ml-1">in {selectedCategory}</span>
                )}
                {searchQuery && (
                  <span className="text-zinc-400 ml-1">
                    for &ldquo;<span className="text-purple-300">{searchQuery}</span>&rdquo;
                  </span>
                )}
              </span>
            </div>

            {/* Sort Buttons */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-xs text-zinc-400 mr-1 hidden lg:inline-flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                Sort:
              </span>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950 border border-zinc-800/80 w-full sm:w-auto">
                {SORT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = sortBy === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSortChange(opt.id)}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Responsive Video Grid / Skeleton / Empty State */}
          {isLoading ? (
            /* Skeleton Loading State */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
              {Array.from({ length: 8 }).map((_, idx) => (
                <VideoCardSkeleton key={idx} />
              ))}
            </div>
          ) : displayedVideos.length > 0 ? (
            /* Populated Video Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
              {displayedVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  layout="grid"
                  onPlay={handlePlayVideo}
                />
              ))}
            </div>
          ) : (
            /* 5. Empty State UI */
            <div className="py-16 sm:py-20 px-4 text-center rounded-3xl bg-zinc-900/40 border border-zinc-800/80 space-y-4 animate-fadeIn">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-purple-950/50 border border-purple-800/40 text-purple-400 mx-auto flex items-center justify-center shadow-lg shadow-purple-950/40">
                <Search className="w-8 h-8" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-xl font-bold text-white">
                  No matching videos found
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400">
                  We couldn&apos;t find any titles matching &ldquo;
                  <span className="text-purple-300 font-semibold">{searchQuery}</span>
                  &rdquo; in the{' '}
                  <span className="text-zinc-300 font-medium">
                    {selectedCategory === 'All' ? 'entire catalog' : selectedCategory}
                  </span>
                  .
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset All Filters</span>
                </button>
              </div>
            </div>
          )}

          {/* 6. Pagination / Load More UI */}
          {!isLoading && hasMore && (
            <div className="pt-8 flex flex-col items-center justify-center space-y-3">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-8 py-3.5 rounded-xl text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-950/40 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2.5"
              >
                {isLoadingMore ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
                    <span>Loading more titles...</span>
                  </>
                ) : (
                  <>
                    <span>Load More Videos</span>
                    <ChevronDown className="w-4 h-4 text-purple-400" />
                  </>
                )}
              </button>

              <p className="text-xs text-zinc-500">
                Displaying {displayedVideos.length} of {filteredAndSortedVideos.length} titles
              </p>
            </div>
          )}
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
