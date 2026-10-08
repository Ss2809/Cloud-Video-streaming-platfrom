import React, { useState, useEffect } from 'react';
import Home from './pages/Home';
import Browse from './pages/Browse';
import VideoDetails from './pages/VideoDetails';
import AdminUpload from './pages/AdminUpload';
import VideoManagement from './pages/VideoManagement';
import WatchlistHistory from './pages/WatchlistHistory';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  const [currentRoute, setCurrentRoute] = useState(() => {
    const hash = window.location.hash;
    const path = window.location.pathname;
    if (hash.startsWith('#browse') || path.startsWith('/browse')) return 'browse';
    if (hash.startsWith('#watch') || path.startsWith('/watch')) return 'watch';
    if (hash.startsWith('#admin-upload') || path.startsWith('/admin/upload')) return 'admin-upload';
    if (hash.startsWith('#video-management') || path.startsWith('/admin/videos')) return 'video-management';
    if (hash.startsWith('#admin-dashboard') || path.startsWith('/admin/dashboard') || path === '/admin')
      return 'admin-dashboard';
    if (hash.startsWith('#watchlist') || hash.startsWith('#history') || path.startsWith('/library')) return 'watchlist';
    return 'home';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;
      if (hash.startsWith('#browse') || path.startsWith('/browse')) {
        setCurrentRoute('browse');
      } else if (hash.startsWith('#watch') || path.startsWith('/watch')) {
        setCurrentRoute('watch');
      } else if (hash.startsWith('#admin-upload') || path.startsWith('/admin/upload')) {
        setCurrentRoute('admin-upload');
      } else if (hash.startsWith('#video-management') || path.startsWith('/admin/videos')) {
        setCurrentRoute('video-management');
      } else if (hash.startsWith('#admin-dashboard') || path.startsWith('/admin/dashboard') || path === '/admin') {
        setCurrentRoute('admin-dashboard');
      } else if (hash.startsWith('#watchlist') || hash.startsWith('#history') || path.startsWith('/library')) {
        setCurrentRoute('watchlist');
      } else if (hash === '#home' || hash === '') {
        setCurrentRoute('home');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (route) => {
    window.location.hash = route === 'home' ? '#home' : `#${route}`;
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      {/* Quick Page Switcher floating pill for reviewing */}
      <div className="fixed bottom-4 left-4 z-50 flex items-center p-1 rounded-full bg-zinc-950/95 border border-zinc-800 backdrop-blur-md shadow-2xl shadow-purple-950/50 text-xs font-semibold max-w-[95vw] overflow-x-auto no-scrollbar">
        <button
          onClick={() => navigateTo('home')}
          className={`px-3 py-1.5 rounded-full transition-all flex-shrink-0 cursor-pointer ${
            currentRoute === 'home'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Home
        </button>
        <button
          onClick={() => navigateTo('browse')}
          className={`px-3 py-1.5 rounded-full transition-all flex-shrink-0 cursor-pointer ${
            currentRoute === 'browse'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Browse
        </button>
        <button
          onClick={() => navigateTo('watch')}
          className={`px-3 py-1.5 rounded-full transition-all flex-shrink-0 cursor-pointer ${
            currentRoute === 'watch'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Watch Player
        </button>
        <button
          onClick={() => navigateTo('watchlist')}
          className={`px-3 py-1.5 rounded-full transition-all flex-shrink-0 cursor-pointer ${
            currentRoute === 'watchlist'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Library ⏱️
        </button>
        <button
          onClick={() => navigateTo('admin-dashboard')}
          className={`px-3 py-1.5 rounded-full transition-all flex-shrink-0 cursor-pointer ${
            currentRoute === 'admin-dashboard'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-purple-400 hover:text-white'
          }`}
        >
          Admin Dashboard 📊
        </button>
        <button
          onClick={() => navigateTo('admin-upload')}
          className={`px-3 py-1.5 rounded-full transition-all flex-shrink-0 cursor-pointer ${
            currentRoute === 'admin-upload'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-purple-400 hover:text-white'
          }`}
        >
          Admin Upload 🛡️
        </button>
        <button
          onClick={() => navigateTo('video-management')}
          className={`px-3 py-1.5 rounded-full transition-all flex-shrink-0 cursor-pointer ${
            currentRoute === 'video-management'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-purple-400 hover:text-white'
          }`}
        >
          Manage Videos ⚙️
        </button>
      </div>

      {/* Render Active View */}
      {currentRoute === 'browse' ? (
        <Browse />
      ) : currentRoute === 'watch' ? (
        <VideoDetails />
      ) : currentRoute === 'watchlist' ? (
        <WatchlistHistory
          onNavigateToWatch={() => navigateTo('watch')}
          onNavigateToBrowse={() => navigateTo('browse')}
        />
      ) : currentRoute === 'admin-dashboard' ? (
        <AdminDashboard
          onNavigateToUpload={() => navigateTo('admin-upload')}
          onNavigateToManagement={() => navigateTo('video-management')}
          onNavigateToHome={() => navigateTo('home')}
        />
      ) : currentRoute === 'admin-upload' ? (
        <AdminUpload onNavigateToWatch={() => navigateTo('watch')} />
      ) : currentRoute === 'video-management' ? (
        <VideoManagement
          onNavigateToUpload={() => navigateTo('admin-upload')}
          onNavigateToWatch={() => navigateTo('watch')}
        />
      ) : (
        <Home />
      )}
    </div>
  );
}

export default App;