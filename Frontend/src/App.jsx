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

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('streamcloud_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isDockMinimized, setIsDockMinimized] = useState(false);

  // Sync user state on storage changes or route navigation
  useEffect(() => {
    const syncUser = () => {
      try {
        const saved = localStorage.getItem('streamcloud_user');
        setCurrentUser(saved ? JSON.parse(saved) : null);
      } catch {
        setCurrentUser(null);
      }
    };

    window.addEventListener('storage', syncUser);
    window.addEventListener('hashchange', syncUser);
    const interval = setInterval(syncUser, 1000);

    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('hashchange', syncUser);
      clearInterval(interval);
    };
  }, []);

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
      } else if (
        hash === '#home' ||
        hash === '' ||
        hash.startsWith('#categories') ||
        hash.startsWith('#trending')
      ) {
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

  const isAdmin = currentUser && currentUser.role === 'admin';

  return (
    <div className="relative">
      {/* Quick Page Switcher floating pill */}
      {isDockMinimized ? (
        <button
          onClick={() => setIsDockMinimized(false)}
          className="fixed bottom-4 left-4 z-50 px-3 py-1.5 rounded-full bg-zinc-950/90 border border-zinc-800 text-xs text-zinc-300 hover:text-white shadow-xl backdrop-blur-md cursor-pointer flex items-center gap-1.5 transition-all"
          title="Open Quick Navigation Dock"
        >
          <span>🧭 Quick Nav</span>
        </button>
      ) : (
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

          {/* Admin Exclusive Links - Hidden for non-admins */}
          {isAdmin && (
            <>
              <span className="w-px h-4 bg-zinc-800 mx-1 flex-shrink-0" />
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
            </>
          )}

          {/* Minimize / Close Dock Button */}
          <button
            onClick={() => setIsDockMinimized(true)}
            className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-zinc-200 ml-1 rounded-full transition-colors flex-shrink-0 cursor-pointer"
            title="Minimize Dock"
            aria-label="Minimize"
          >
            ✕
          </button>
        </div>
      )}

      {/* Render Active View */}
      {currentRoute === 'browse' ? (
        <Browse />
      ) : currentRoute === 'watch' ? (
        <VideoDetails />
      ) : currentRoute === 'watchlist' ? (
        <WatchlistHistory
          onNavigateToWatch={(id) => {
            if (id) {
              try {
                localStorage.setItem('streamcloud_active_video_id', id);
              } catch {}
              window.location.hash = `#watch?id=${id}`;
            }
            navigateTo('watch');
          }}
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
          onNavigateToWatch={(id) => {
            if (id) {
              try {
                localStorage.setItem('streamcloud_active_video_id', id);
              } catch {}
              window.location.hash = `#watch?id=${id}`;
            }
            navigateTo('watch');
          }}
        />
      ) : (
        <Home />
      )}
    </div>
  );
}

export default App;