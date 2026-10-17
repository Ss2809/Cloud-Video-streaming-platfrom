import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  User,
  Menu,
  X,
  Play,
  ChevronDown,
  LogOut,
  Bookmark,
  LayoutDashboard,
  UploadCloud,
  Film,
  Sparkles,
  CheckCheck,
} from 'lucide-react';

export default function Navbar({
  onSearchChange,
  activeCategory,
  onSelectCategory,
  user,
  onOpenAuth,
  onLogout,
  currentPage = 'home',
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const [currentHash, setCurrentHash] = useState(() => window.location.hash || '#home');

  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  // Notifications sample list
  const notifications = [
    {
      id: 1,
      title: 'New 4K Release',
      message: 'Cyberpunk 2099 is now streaming in 4K HDR with Dolby Atmos.',
      time: '10m ago',
      unread: true,
      icon: '🎬',
    },
    {
      id: 2,
      title: 'Transcoding Complete',
      message: 'Your uploaded video "Neon Skyline Drone Tour" has finished HLS processing and is READY.',
      time: '1h ago',
      unread: true,
      icon: '⚡',
    },
    {
      id: 3,
      title: 'Recommended For You',
      message: 'Based on your interest in Sci-Fi, check out "Interstellar Odyssey".',
      time: '3h ago',
      unread: true,
      icon: '✨',
    },
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync current hash for active pill styling
  useEffect(() => {
    const handleHash = () => {
      setCurrentHash(window.location.hash || '#home');
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      try {
        localStorage.setItem('streamcloud_browse_search', searchQuery.trim());
      } catch {}
      window.location.hash = `#browse?search=${encodeURIComponent(searchQuery.trim())}`;
      if (currentPage !== 'browse') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setMobileMenuOpen(false);
    }
  };

  const handleLogoClick = (e) => {
    e.preventDefault();
    window.location.hash = '#home';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (e, link) => {
    e.preventDefault();
    if (link.href === '#home') {
      window.location.hash = '#home';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (link.href === '#browse') {
      window.location.hash = '#browse';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (link.href === '#categories') {
      if (currentPage === 'home') {
        const el = document.getElementById('categories');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.location.hash = '#categories';
        }
      } else {
        window.location.hash = '#categories';
      }
    } else if (link.href === '#trending') {
      if (currentPage === 'home') {
        const el = document.getElementById('trending');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.location.hash = '#trending';
        }
      } else {
        window.location.hash = '#trending';
      }
    }
  };

  const handleMobileNavClick = (e, link) => {
    setMobileMenuOpen(false);
    handleNavClick(e, link);
  };

  const navLinks = [
    {
      name: 'Home',
      href: '#home',
      active: currentPage === 'home' && (!currentHash || currentHash === '#home'),
    },
    {
      name: 'Browse',
      href: '#browse',
      active: currentPage === 'browse' || (currentHash && currentHash.startsWith('#browse')),
    },
    {
      name: 'Categories',
      href: '#categories',
      active: currentPage === 'home' && currentHash === '#categories',
    },
    {
      name: 'Trending',
      href: '#trending',
      active: currentPage === 'home' && currentHash === '#trending',
    },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-zinc-950/85 backdrop-blur-md border-b border-zinc-800/60 shadow-xl shadow-purple-950/10'
          : 'bg-gradient-to-b from-zinc-950/90 via-zinc-950/40 to-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo & Main Nav */}
          <div className="flex items-center gap-8">
            <a
              href="#home"
              onClick={handleLogoClick}
              className="flex items-center gap-2.5 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:scale-105 group-hover:shadow-purple-500/40 transition-all duration-300">
                <Play className="w-5 h-5 text-white fill-current ml-0.5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center font-bold text-xl tracking-tight text-white">
                  <span>Stream</span>
                  <span className="text-purple-400">Cloud</span>
                </div>
                <span className="text-[10px] text-zinc-400 tracking-wider font-medium uppercase -mt-1">
                  Video Platform
                </span>
              </div>
            </a>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    link.active
                      ? 'text-white bg-purple-500/10 border border-purple-500/20 text-purple-300'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>

          {/* Search, Notifications, Profile (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            {/* Search Bar */}
            <div
              className={`relative flex items-center transition-all duration-300 ${
                searchExpanded ? 'w-72' : 'w-56'
              }`}
            >
              <Search className="absolute left-3.5 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search titles, genres, creators..."
                value={searchQuery}
                onChange={handleSearch}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setSearchExpanded(true)}
                onBlur={() => setSearchExpanded(false)}
                className="w-full pl-10 pr-8 py-2 text-sm bg-zinc-900/90 border border-zinc-700/60 rounded-full text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    if (onSearchChange) onSearchChange('');
                  }}
                  className="absolute right-3 text-zinc-400 hover:text-white text-xs cursor-pointer p-0.5"
                  title="Clear Search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Notification Bell with interactive dropdown */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label="Notifications"
                className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800/60 relative transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-500 rounded-full ring-2 ring-zinc-950 animate-pulse" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl shadow-purple-950/40 py-3 z-50 animate-fadeIn">
                  <div className="flex items-center justify-between px-4 pb-2.5 border-b border-zinc-800/80">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-600/30 text-purple-300 border border-purple-500/30">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => setUnreadCount(0)}
                        className="text-xs text-purple-400 hover:text-purple-300 font-medium cursor-pointer flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Mark all as read</span>
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-zinc-800/50 max-h-80 overflow-y-auto no-scrollbar">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          setNotificationsOpen(false);
                          window.location.hash = '#browse';
                        }}
                        className={`p-3.5 hover:bg-zinc-900/80 transition-colors cursor-pointer flex items-start gap-3 ${
                          unreadCount > 0 && n.unread ? 'bg-purple-950/15' : ''
                        }`}
                      >
                        <span className="text-xl flex-shrink-0">{n.icon}</span>
                        <div className="flex-1 space-y-0.5">
                          <p className="text-xs font-semibold text-zinc-200">{n.title}</p>
                          <p className="text-[11px] text-zinc-400 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-zinc-500 pt-0.5">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Login / Profile CTA */}
            <div className="flex items-center gap-3 pl-2 border-l border-zinc-800 relative" ref={dropdownRef}>
              {user ? (
                /* Authenticated User Dropdown */
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/70 hover:border-purple-500/50 transition-all cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                      {user.avatar || user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm font-medium max-w-[100px] truncate">
                      {user.name || 'Member'}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-zinc-400 group-hover:text-purple-400 transition-transform ${
                        userDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl shadow-purple-950/40 py-2 z-50 animate-fadeIn">
                      <div className="px-4 py-3 border-b border-zinc-800/80">
                        <p className="text-sm font-semibold text-white truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">
                          {user.email}
                        </p>
                        {user.role === 'admin' ? (
                          <span className="inline-block mt-1.5 text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full">
                            🛡️ Administrator
                          </span>
                        ) : (
                          <span className="inline-block mt-1.5 text-[10px] font-semibold text-purple-400 bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded-full">
                            🎬 Member
                          </span>
                        )}
                      </div>

                      {/* Admin Controls Section - Strictly visible only to Admins */}
                      {user.role === 'admin' && (
                        <div className="py-1 border-b border-zinc-800/80 bg-purple-950/20">
                          <p className="px-4 py-1 text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                            Admin Controls
                          </p>
                          <a
                            href="#admin-dashboard"
                            onClick={() => setUserDropdownOpen(false)}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-purple-200 hover:text-white hover:bg-purple-900/40 transition-colors"
                          >
                            <LayoutDashboard className="w-4 h-4 text-purple-400" />
                            Admin Dashboard
                          </a>
                          <a
                            href="#admin-upload"
                            onClick={() => setUserDropdownOpen(false)}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-purple-200 hover:text-white hover:bg-purple-900/40 transition-colors"
                          >
                            <UploadCloud className="w-4 h-4 text-purple-400" />
                            Upload Video
                          </a>
                          <a
                            href="#video-management"
                            onClick={() => setUserDropdownOpen(false)}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-purple-200 hover:text-white hover:bg-purple-900/40 transition-colors"
                          >
                            <Film className="w-4 h-4 text-purple-400" />
                            Manage Videos
                          </a>
                        </div>
                      )}

                      <div className="py-1">
                        <a
                          href="#watchlist"
                          onClick={() => setUserDropdownOpen(false)}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors text-left cursor-pointer"
                        >
                          <Bookmark className="w-4 h-4 text-purple-400" />
                          My Watchlist & Library
                        </a>
                      </div>

                      <div className="pt-1 border-t border-zinc-800/80">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            if (onLogout) onLogout();
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Unauthenticated View */
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => onOpenAuth && onOpenAuth('signup')}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 hover:border-purple-500/40 text-xs font-medium transition-all cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-purple-400" />
                    <span>Create Account</span>
                  </button>

                  <button
                    onClick={() => onOpenAuth && onOpenAuth('signin')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 transition-all duration-200 cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-800/80 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-zinc-950/95 border-b border-zinc-800 px-4 pt-3 pb-6 space-y-4 backdrop-blur-xl animate-fadeIn">
          {/* Mobile Search */}
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search titles, actors, genres..."
              value={searchQuery}
              onChange={handleSearch}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-900 border border-zinc-700/70 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Mobile Nav Links */}
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleMobileNavClick(e, link)}
                className={`px-3 py-2.5 rounded-lg text-base font-medium transition-colors cursor-pointer ${
                  link.active
                    ? 'text-white bg-purple-600/20 text-purple-300 font-semibold'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Mobile Account Actions */}
          <div className="pt-3 border-t border-zinc-800 flex flex-col gap-2">
            {user ? (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-sm font-bold text-white">
                    {user.avatar || user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                    <p className="text-xs text-zinc-400 truncate">{user.email}</p>
                    {user.role === 'admin' ? (
                      <span className="inline-block mt-1 text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full">
                        🛡️ Administrator
                      </span>
                    ) : (
                      <span className="inline-block mt-1 text-[10px] font-semibold text-purple-400 bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded-full">
                        🎬 Member
                      </span>
                    )}
                  </div>
                </div>

                {user.role === 'admin' && (
                  <div className="p-2 rounded-xl bg-purple-950/20 border border-purple-900/50 space-y-1">
                    <p className="px-2 py-1 text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                      Admin Controls
                    </p>
                    <a
                      href="#admin-dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-purple-200 hover:text-white rounded-lg hover:bg-purple-900/40"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-purple-400" />
                      Admin Dashboard
                    </a>
                    <a
                      href="#admin-upload"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-purple-200 hover:text-white rounded-lg hover:bg-purple-900/40"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-purple-400" />
                      Admin Upload
                    </a>
                    <a
                      href="#video-management"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-purple-200 hover:text-white rounded-lg hover:bg-purple-900/40"
                    >
                      <Film className="w-3.5 h-3.5 text-purple-400" />
                      Manage Videos
                    </a>
                  </div>
                )}

                <a
                  href="#watchlist"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white rounded-lg bg-zinc-900 hover:bg-zinc-800"
                >
                  <Bookmark className="w-3.5 h-3.5 text-purple-400" />
                  My Watchlist & Library
                </a>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 font-medium text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onOpenAuth) onOpenAuth('signup');
                  }}
                  className="w-full py-2.5 rounded-lg bg-zinc-900 text-zinc-200 font-medium text-sm flex items-center justify-center gap-2 border border-zinc-700 cursor-pointer"
                >
                  <User className="w-4 h-4 text-purple-400" />
                  Create Account
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onOpenAuth) onOpenAuth('signin');
                  }}
                  className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm shadow-lg shadow-purple-600/25 cursor-pointer"
                >
                  Sign In
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
