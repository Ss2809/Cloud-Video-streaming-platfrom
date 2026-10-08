import React, { useState, useMemo, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import VideoCard from '../components/VideoCard';
import VideoSection from '../components/VideoSection';
import CategoryCard from '../components/CategoryCard';
import Footer from '../components/Footer';
import AuthModal from '../components/AuthModal';
import {
  heroMovie,
  categories,
  trendingVideos,
  recommendedVideos,
} from '../data/mockData';
import { Flame, Sparkles, LayoutGrid, Filter, CheckCircle, ShieldCheck } from 'lucide-react';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);

  // Authentication states
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('streamcloud_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signin'); // 'signin' or 'signup'

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

  const handleSelectCategory = (categoryName) => {
    setSelectedCategory((prev) => (prev === categoryName ? null : categoryName));
  };

  const handlePlayVideo = (video) => {
    try {
      localStorage.setItem('streamcloud_active_video_id', video.id || video._id);
    } catch {}
    window.location.hash = `#watch?id=${video.id || video._id}`;
  };

  // Filter trending videos based on search and selected category
  const filteredTrending = useMemo(() => {
    return trendingVideos.filter((video) => {
      const matchesSearch =
        searchQuery === '' ||
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        !selectedCategory || video.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  // Filter recommended videos based on search and selected category
  const filteredRecommended = useMemo(() => {
    return recommendedVideos.filter((video) => {
      const matchesSearch =
        searchQuery === '' ||
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        !selectedCategory || video.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col selection:bg-purple-600 selection:text-white">
      {/* Dynamic Toast / Feedback Alert */}
      {activeAlert && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-zinc-900/95 border border-purple-500/50 text-purple-100 shadow-2xl shadow-purple-900/40 backdrop-blur-md animate-bounce">
          <ShieldCheck className="w-5 h-5 text-purple-400 flex-shrink-0" />
          <span className="text-sm font-semibold">{activeAlert}</span>
        </div>
      )}

      {/* 1. Responsive Navbar */}
      <Navbar
        onSearchChange={setSearchQuery}
        activeCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        user={currentUser}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-grow space-y-4 md:space-y-8">
        {/* 2. Hero Section */}
        <Hero movie={heroMovie} />

        {/* Search / Filter notification status if filtering is active */}
        {(searchQuery || selectedCategory) && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/40">
              <div className="flex items-center gap-2 text-sm text-purple-200">
                <Filter className="w-4 h-4 text-purple-400" />
                <span>
                  Filtering by:
                  {selectedCategory && (
                    <strong className="ml-1 text-white underline decoration-purple-400">
                      Category: {selectedCategory}
                    </strong>
                  )}
                  {searchQuery && (
                    <strong className="ml-2 text-white">
                      Search: &ldquo;{searchQuery}&rdquo;
                    </strong>
                  )}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setSearchQuery('');
                }}
                className="text-xs text-purple-400 hover:text-purple-300 underline cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}

        {/* 3. "Trending Now" Section */}
        <div id="trending">
          <VideoSection
            title="Trending Now"
            subtitle="Most watched titles across the global network this week"
            icon={Flame}
            videos={filteredTrending.length > 0 ? filteredTrending : trendingVideos}
            onPlayVideo={handlePlayVideo}
          />
        </div>

        {/* 4. "Categories" Section */}
        <section id="categories" className="py-8 sm:py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
                    Explore Categories
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-zinc-400 font-normal">
                  Find stories by your preferred streaming genre
                </p>
              </div>

              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs sm:text-sm font-medium text-purple-400 hover:text-purple-300"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* Category Grid (Responsive: 2 cols on mobile, 3-4 on tablet, 7 on desktop) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  isSelected={selectedCategory === cat.name}
                  onSelect={handleSelectCategory}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 5. "Recommended for You" Section */}
        <div id="browse">
          <VideoSection
            title="Recommended for You"
            subtitle="Curated by intelligent recommendation engines based on trending popularity"
            icon={Sparkles}
            videos={filteredRecommended.length > 0 ? filteredRecommended : recommendedVideos}
            onPlayVideo={handlePlayVideo}
          />
        </div>
      </main>

      {/* Reusable Footer */}
      <Footer />

      {/* Passwordless OTP Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
