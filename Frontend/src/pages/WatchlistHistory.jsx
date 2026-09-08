import React, { useState, useMemo } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AuthModal from '../components/AuthModal';
import VideoCardSkeleton from '../components/VideoCardSkeleton';
import { browseVideos, recommendedVideos } from '../data/mockData';
import {
  Clock,
  Bookmark,
  Play,
  Trash2,
  Search,
  X,
  Eye,
  CheckCircle2,
  Film,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Compass,
} from 'lucide-react';

const INITIAL_HISTORY = [
  {
    id: 'hist-1',
    title: 'CyberPulse: Nexus 2088',
    creator: 'CyberPulse Studios',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800&auto=format&fit=crop',
    category: 'Action',
    duration: '2h 24m',
    watchedDuration: '1h 38m',
    progressPercent: 68,
    lastWatched: '2 hours ago',
  },
  {
    id: 'hist-2',
    title: 'The Quantum Frontier: Deep Space',
    creator: 'Nova Cosmos',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop',
    category: 'Documentary',
    duration: '52m',
    watchedDuration: '24m',
    progressPercent: 46,
    lastWatched: 'Yesterday',
  },
  {
    id: 'hist-3',
    title: 'Speedshift: Tokyo Driftway',
    creator: 'Redline Motorsport',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=800&auto=format&fit=crop',
    category: 'Sports',
    duration: '1h 35m',
    watchedDuration: '1h 22m',
    progressPercent: 86,
    lastWatched: '3 days ago',
  },
  {
    id: 'hist-4',
    title: 'Neural Dreams: Consciousness in Code',
    creator: 'Deep AI Academy',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
    category: 'Education',
    duration: '45m',
    watchedDuration: '15m',
    progressPercent: 33,
    lastWatched: '5 days ago',
  },
];

const INITIAL_WATCHLIST = [
  {
    id: 'wl-1',
    title: 'Shadows of the Neon Abyss',
    creator: 'CyberPulse Studios',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop',
    category: 'Action',
    duration: '1h 48m',
    views: '2.8M',
    rating: '4.8',
    addedAt: 'Aug 26, 2026',
  },
  {
    id: 'wl-2',
    title: 'Wild Serengeti: Untamed Earth',
    creator: 'NatGeo Earth',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1534177616072-ef7dc120449d?q=80&w=800&auto=format&fit=crop',
    category: 'Documentary',
    duration: '1h 40m',
    views: '3.7M',
    rating: '4.9',
    addedAt: 'Aug 22, 2026',
  },
  {
    id: 'wl-3',
    title: 'Electronic Odyssey Live Festival',
    creator: 'Harmonic Waves',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop',
    category: 'Music',
    duration: '2h 45m',
    views: '1.9M',
    rating: '4.7',
    addedAt: 'Aug 28, 2026',
  },
  {
    id: 'wl-4',
    title: 'Champions League: Road to Glory',
    creator: 'Championship Arena',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop',
    category: 'Sports',
    duration: '1h 55m',
    views: '5.6M',
    rating: '4.8',
    addedAt: 'Aug 19, 2026',
  },
  {
    id: 'wl-5',
    title: 'The Laugh Protocol: Stand-up Special',
    creator: 'Laugh Riot Originals',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1514306191717-452ec28c7814?q=80&w=800&auto=format&fit=crop',
    category: 'Comedy',
    duration: '1h 22m',
    views: '2.1M',
    rating: '4.5',
    addedAt: 'Aug 29, 2026',
  },
  {
    id: 'wl-6',
    title: 'Quantum Computing Explained Simply',
    creator: 'Tech Odyssey',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=800&auto=format&fit=crop',
    category: 'Education',
    duration: '38m',
    views: '1.1M',
    rating: '4.9',
    addedAt: 'Aug 30, 2026',
  },
];

export default function WatchlistHistory({ onNavigateToWatch, onNavigateToBrowse }) {
  const [activeTab, setActiveTab] = useState('continueWatching'); // 'continueWatching' | 'watchlist'
  const [historyList, setHistoryList] = useState(INITIAL_HISTORY);
  const [watchlist, setWatchlist] = useState(INITIAL_WATCHLIST);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(false);
  const [activeAlert, setActiveAlert] = useState(null);

  // Auth state
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

  const handleAuthSuccess = (userData) => {
    setCurrentUser(userData);
    localStorage.setItem('streamcloud_user', JSON.stringify(userData));
    setActiveAlert(`Signed in as ${userData.name}!`);
    setTimeout(() => setActiveAlert(null), 3500);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('streamcloud_user');
    setActiveAlert('Signed out successfully.');
    setTimeout(() => setActiveAlert(null), 3500);
  };

  // Tab switch with simulated skeleton loader
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setSelectedCategory('All');
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 240);
  };

  // Remove from History
  const handleRemoveFromHistory = (id, title) => {
    setHistoryList((prev) => prev.filter((item) => item.id !== id));
    setActiveAlert(`Removed "${title}" from Watch History.`);
    setTimeout(() => setActiveAlert(null), 3500);
  };

  // Clear Entire History
  const handleClearHistory = () => {
    setHistoryList([]);
    setActiveAlert('All watch history has been cleared.');
    setTimeout(() => setActiveAlert(null), 3500);
  };

  // Remove from Watchlist
  const handleRemoveFromWatchlist = (id, title) => {
    setWatchlist((prev) => prev.filter((item) => item.id !== id));
    setActiveAlert(`Removed "${title}" from Watchlist.`);
    setTimeout(() => setActiveAlert(null), 3500);
  };

  // Clear Entire Watchlist
  const handleClearWatchlist = () => {
    setWatchlist([]);
    setActiveAlert('All watchlist items have been cleared.');
    setTimeout(() => setActiveAlert(null), 3500);
  };

  // Continue Watching / Watch Now action
  const handleWatchVideo = (video) => {
    if (onNavigateToWatch) {
      onNavigateToWatch(video.id);
    } else {
      window.location.hash = '#watch';
    }
  };

  // Filtering for Continue Watching
  const filteredHistory = useMemo(() => {
    return historyList.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.creator.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === 'All' ||
        item.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCat;
    });
  }, [historyList, searchQuery, selectedCategory]);

  // Filtering for Watchlist
  const filteredWatchlist = useMemo(() => {
    return watchlist.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.creator.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === 'All' ||
        item.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCat;
    });
  }, [watchlist, searchQuery, selectedCategory]);

  const categoriesList = [
    'All',
    'Action',
    'Adventure',
    'Comedy',
    'Documentary',
    'Education',
    'Music',
    'Sports',
  ];

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
        currentPage="watchlist"
        user={currentUser}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-grow pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-purple-950/40 via-zinc-900/80 to-zinc-950 border border-zinc-800/80 shadow-2xl shadow-purple-950/20">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-600/20 text-purple-300 border border-purple-500/30">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Personal Streaming Vault</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                My Library
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-xl">
                Pick up where you left off or dive into movies, series, and documentaries saved to your watchlist.
              </p>
            </div>

            {/* Clear List Button */}
            <div className="flex items-center gap-3">
              {activeTab === 'continueWatching' && historyList.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear History</span>
                </button>
              )}
              {activeTab === 'watchlist' && watchlist.length > 0 && (
                <button
                  onClick={handleClearWatchlist}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Watchlist</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. Dual Tabs: Continue Watching vs My Watchlist */}
          <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-px">
            <button
              onClick={() => handleTabSwitch('continueWatching')}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'continueWatching'
                  ? 'border-purple-500 text-white shadow-sm'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Continue Watching</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-purple-300 font-semibold">
                {historyList.length}
              </span>
            </button>

            <button
              onClick={() => handleTabSwitch('watchlist')}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'watchlist'
                  ? 'border-purple-500 text-white shadow-sm'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Bookmark className="w-4 h-4 text-purple-400" />
              <span>My Watchlist</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-purple-300 font-semibold">
                {watchlist.length}
              </span>
            </button>
          </div>

          {/* 5. Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80">
            {/* Search Input */}
            <div className="relative flex items-center w-full sm:w-80">
              <Search className="absolute left-3.5 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder={
                  activeTab === 'continueWatching'
                    ? 'Search in history...'
                    : 'Search in watchlist...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2 bg-zinc-950 border border-zinc-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/25 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Dropdown Filter */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <span className="text-xs text-zinc-400 whitespace-nowrap">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 bg-zinc-950 border border-zinc-700/80 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat} className="bg-zinc-950">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 7. Loading Skeleton State */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <VideoCardSkeleton key={i} />
              ))}
            </div>
          ) : activeTab === 'continueWatching' ? (
            /* 3. Continue Watching Section */
            filteredHistory.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
                {filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className="group relative flex flex-col rounded-2xl bg-zinc-900 border border-zinc-800/80 overflow-hidden hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-950/40 transition-all duration-300"
                  >
                    {/* Thumbnail Wrapper */}
                    <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Dark overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-70 group-hover:opacity-90 transition-opacity" />

                      {/* Play Button Overlay */}
                      <div
                        onClick={() => handleWatchVideo(item)}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg shadow-purple-600/50 backdrop-blur-sm group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>

                      {/* Category Pill */}
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-900/80 text-purple-200 border border-purple-500/30">
                        {item.category}
                      </span>

                      {/* Last Watched Tag */}
                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-black/75 text-[10px] font-medium text-zinc-300">
                        {item.lastWatched}
                      </span>

                      {/* Watched Progress Bar (Bottom of Thumbnail) */}
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-800">
                        <div
                          style={{ width: `${item.progressPercent}%` }}
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3 className="font-semibold text-sm sm:text-base text-white line-clamp-1 group-hover:text-purple-300 transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1 truncate">
                          {item.creator}
                        </p>
                      </div>

                      {/* Watched Time / Total Duration + Percentage */}
                      <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-zinc-800/60">
                        <div className="flex items-center gap-1.5 font-mono">
                          <Clock className="w-3.5 h-3.5 text-purple-400" />
                          <span>
                            {item.watchedDuration} / {item.duration}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-purple-300">
                          {item.progressPercent}%
                        </span>
                      </div>

                      {/* Action Buttons: Continue Watching + Remove */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleWatchVideo(item)}
                          className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/25 transition-colors cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Continue</span>
                        </button>

                        <button
                          onClick={() => handleRemoveFromHistory(item.id, item.title)}
                          title="Remove from History"
                          className="p-2 rounded-xl bg-zinc-800/80 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-zinc-700/60 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* 6. Empty State for Continue Watching */
              <div className="py-16 text-center rounded-3xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-purple-950/50 border border-purple-800/40 text-purple-400 mx-auto flex items-center justify-center">
                  <Clock className="w-8 h-8" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-lg font-bold text-white">No Watch History Found</h3>
                  <p className="text-xs text-zinc-400">
                    {searchQuery
                      ? `No history items matching "${searchQuery}".`
                      : 'You have not started watching any streams yet. Browse the catalog to begin your journey.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (onNavigateToBrowse) onNavigateToBrowse();
                    else window.location.hash = '#browse';
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-colors cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>Browse Catalog</span>
                </button>
              </div>
            )
          ) : (
            /* 4. My Watchlist Section */
            filteredWatchlist.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
                {filteredWatchlist.map((item) => (
                  <div
                    key={item.id}
                    className="group relative flex flex-col rounded-2xl bg-zinc-900 border border-zinc-800/80 overflow-hidden hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-950/40 transition-all duration-300"
                  >
                    {/* Thumbnail Wrapper */}
                    <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-70 group-hover:opacity-90 transition-opacity" />

                      {/* Play Button Overlay */}
                      <div
                        onClick={() => handleWatchVideo(item)}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg shadow-purple-600/50 backdrop-blur-sm group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>

                      {/* Category Tag */}
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-900/80 text-purple-200 border border-purple-500/30">
                        {item.category}
                      </span>

                      {/* Duration Badge */}
                      <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 text-[10px] font-medium text-zinc-200">
                        {item.duration}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3 className="font-semibold text-sm sm:text-base text-white line-clamp-1 group-hover:text-purple-300 transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1 truncate">
                          {item.creator}
                        </p>
                      </div>

                      {/* Views & Duration */}
                      <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-zinc-800/60">
                        <div className="flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{item.views} views</span>
                        </div>
                        <span className="text-[11px] text-zinc-500">{item.addedAt}</span>
                      </div>

                      {/* Actions: Watch Now + Remove from Watchlist */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleWatchVideo(item)}
                          className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/25 transition-colors cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Watch Now</span>
                        </button>

                        <button
                          onClick={() => handleRemoveFromWatchlist(item.id, item.title)}
                          title="Remove from Watchlist"
                          className="p-2 rounded-xl bg-zinc-800/80 hover:bg-rose-500/20 text-purple-400 hover:text-rose-400 border border-zinc-700/60 transition-colors cursor-pointer"
                        >
                          <Bookmark className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* 6. Empty State for Watchlist */
              <div className="py-16 text-center rounded-3xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-purple-950/50 border border-purple-800/40 text-purple-400 mx-auto flex items-center justify-center">
                  <Bookmark className="w-8 h-8" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-lg font-bold text-white">Your Watchlist is Empty</h3>
                  <p className="text-xs text-zinc-400">
                    {searchQuery
                      ? `No watchlist items matching "${searchQuery}".`
                      : 'Bookmark your favorite titles to watch them anytime on any device.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (onNavigateToBrowse) onNavigateToBrowse();
                    else window.location.hash = '#browse';
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-colors cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>Explore Movies & Shows</span>
                </button>
              </div>
            )
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
