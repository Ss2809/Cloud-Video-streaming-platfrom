import React, { useState } from 'react';
import {
  LayoutDashboard,
  Film,
  UploadCloud,
  Users,
  Grid,
  BarChart3,
  Settings,
  LogOut,
  Search,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  ArrowUpRight,
  TrendingUp,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Play,
  Menu,
  X,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Radio,
  Sparkles,
} from 'lucide-react';

const RECENT_UPLOADS = [
  {
    id: 'rec-up-1',
    title: 'CyberPulse: Nexus 2088 - Premiere',
    category: 'Action',
    uploadDate: 'Sep 03, 2026',
    status: 'ready',
    views: '2.8M',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'rec-up-2',
    title: 'The Quantum Frontier: Deep Space',
    category: 'Documentary',
    uploadDate: 'Sep 02, 2026',
    status: 'processing',
    views: '1.4M',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'rec-up-3',
    title: 'Speedshift: Tokyo Driftway',
    category: 'Sports',
    uploadDate: 'Sep 01, 2026',
    status: 'ready',
    views: '3.1M',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'rec-up-4',
    title: 'Echoes of the Midnight Symphony',
    category: 'Music',
    uploadDate: 'Aug 30, 2026',
    status: 'ready',
    views: '950K',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'rec-up-5',
    title: 'Lost Caverns of Titan (Corrupt Ingest)',
    category: 'Adventure',
    uploadDate: 'Aug 29, 2026',
    status: 'failed',
    views: '0',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
  },
];

const TOP_VIDEOS = [
  {
    rank: 1,
    title: 'Champions League: Road to Glory',
    category: 'Sports',
    views: '5.6M',
    watchHours: '1.2M hrs',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop',
  },
  {
    rank: 2,
    title: 'Rogue Pilot: Beyond Stratosphere',
    category: 'Action',
    views: '4.2M',
    watchHours: '980K hrs',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
  },
  {
    rank: 3,
    title: 'Wild Serengeti: Untamed Earth',
    category: 'Documentary',
    views: '3.7M',
    watchHours: '740K hrs',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1534177616072-ef7dc120449d?q=80&w=800&auto=format&fit=crop',
  },
  {
    rank: 4,
    title: 'Vanguard Cyber Operative',
    category: 'Action',
    views: '3.4M',
    watchHours: '690K hrs',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop',
  },
];

const WEEKLY_VIEWS_DATA = [
  { day: 'Mon', views: 4.8, height: '48%' },
  { day: 'Tue', views: 5.6, height: '56%' },
  { day: 'Wed', views: 6.2, height: '62%' },
  { day: 'Thu', views: 7.4, height: '74%' },
  { day: 'Fri', views: 9.1, height: '91%' },
  { day: 'Sat', views: 10.0, height: '100%' },
  { day: 'Sun', views: 8.5, height: '85%' },
];

export default function AdminDashboard({
  onNavigateToUpload,
  onNavigateToManagement,
  onNavigateToHome,
}) {
  // Admin Session State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('streamcloud_user');
      return saved
        ? JSON.parse(saved)
        : {
            name: 'Admin Overseer',
            email: 'admin@streamcloud.io',
            role: 'admin',
            avatar: 'A',
          };
    } catch {
      return {
        name: 'Admin Overseer',
        email: 'admin@streamcloud.io',
        role: 'admin',
        avatar: 'A',
      };
    }
  });

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard'); // 'dashboard' | 'users' | 'categories' | 'analytics' | 'settings'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAlert, setActiveAlert] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Switch to admin session demo helper
  const switchToAdminDemo = () => {
    const adminUser = {
      name: 'Cloud Administrator',
      email: 'admin@streamcloud.io',
      role: 'admin',
      avatar: 'A',
    };
    setCurrentUser(adminUser);
    localStorage.setItem('streamcloud_user', JSON.stringify(adminUser));
    setActiveAlert('Authenticated as Administrator (Full Console Access) 🛡️');
    setTimeout(() => setActiveAlert(null), 3500);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('streamcloud_user');
    if (onNavigateToHome) onNavigateToHome();
    else window.location.hash = '#home';
  };

  // 1. Admin-Only Guard Check
  const isAdmin = currentUser && currentUser.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-950 border border-rose-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl shadow-rose-950/20">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Access Denied</h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              The Admin Dashboard is strictly restricted to
              <strong> Administrator</strong> accounts.
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
      </div>
    );
  }

  // Sidebar navigation links definition
  const sidebarItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      action: () => setActiveNav('dashboard'),
    },
    {
      id: 'videoManagement',
      label: 'Video Management',
      icon: Film,
      action: () => {
        if (onNavigateToManagement) onNavigateToManagement();
        else window.location.hash = '#video-management';
      },
    },
    {
      id: 'uploadVideo',
      label: 'Upload Video',
      icon: UploadCloud,
      action: () => {
        if (onNavigateToUpload) onNavigateToUpload();
        else window.location.hash = '#admin-upload';
      },
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      badge: '24.8K',
      action: () => {
        setActiveNav('users');
        setActiveAlert('Loaded Platform Users roster.');
        setTimeout(() => setActiveAlert(null), 3000);
      },
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: Grid,
      badge: '7',
      action: () => {
        setActiveNav('categories');
        setActiveAlert('Viewing 7 Streaming Genres.');
        setTimeout(() => setActiveAlert(null), 3000);
      },
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      action: () => {
        setActiveNav('analytics');
        setActiveAlert('Viewing Ingest & CloudFront metrics.');
        setTimeout(() => setActiveAlert(null), 3000);
      },
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      action: () => {
        setActiveNav('settings');
        setActiveAlert('Viewing AWS S3 / CloudFront configurations.');
        setTimeout(() => setActiveAlert(null), 3000);
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex selection:bg-purple-600 selection:text-white">
      {/* Toast Alert Feedback */}
      {activeAlert && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-zinc-900/95 border border-purple-500/50 text-purple-100 shadow-2xl shadow-purple-950/50 backdrop-blur-md animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
          <span className="text-sm font-semibold">{activeAlert}</span>
        </div>
      )}

      {/* 2 & 9. Desktop Sidebar Navigation */}
      <aside className="hidden lg:flex flex-col w-64 bg-zinc-950 border-r border-zinc-800/80 p-5 sticky top-0 h-screen z-30 justify-between flex-shrink-0">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-600/30">
              <Play className="w-5 h-5 text-white fill-current ml-0.5" />
            </div>
            <div>
              <div className="font-bold text-lg text-white tracking-tight leading-none">
                Stream<span className="text-purple-400">Cloud</span>
              </div>
              <span className="text-[10px] text-purple-400 font-semibold tracking-wider uppercase">
                Admin Console
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-bold'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Session Info & Logout */}
        <div className="pt-4 border-t border-zinc-800/80 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">
              {currentUser?.avatar || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {currentUser?.name || 'Administrator'}
              </p>
              <p className="text-[10px] text-zinc-500 truncate">
                {currentUser?.email}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-64 bg-zinc-950 border-r border-zinc-800 p-5 flex flex-col justify-between z-10 animate-fadeIn">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow">
                    <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                  </div>
                  <span className="font-bold text-white text-base">Admin Console</span>
                </div>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        item.action();
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
                        isActive
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 3. Top Navbar */}
        <header className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Admin Global Search */}
            <div className="relative flex items-center w-full">
              <Search className="absolute left-3.5 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search videos, users, transcoding jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900/90 border border-zinc-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3 sm:gap-4 relative">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors relative cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              </button>

              {/* Notifications Popover */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl shadow-purple-950/40 p-3 z-50 animate-fadeIn space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="font-bold text-white">Cloud Ingest Alerts</span>
                    <span className="text-[10px] text-purple-400 font-semibold">3 New</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="p-2 rounded-lg bg-zinc-900/80">
                      <p className="font-semibold text-white">
                        HLS Encoding Complete
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        &quot;CyberPulse: Nexus 2088&quot; is live on CDN.
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-900/80">
                      <p className="font-semibold text-amber-400">
                        High Bandwidth Spike
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        US-East edge nodes reached 42 Gbps.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Profile Pill */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-zinc-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
                {currentUser?.avatar || 'A'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-white leading-tight">
                  {currentUser?.name || 'Administrator'}
                </p>
                <span className="text-[10px] text-purple-400 font-medium">
                  Superadmin
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content Container */}
        <main className="p-4 sm:p-8 space-y-8 flex-1">
          {/* Welcome Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-purple-950/40 via-zinc-900/80 to-zinc-950 border border-zinc-800/80 shadow-xl">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-600/20 text-purple-300 border border-purple-500/30">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>StreamCloud Operations Center</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome back, {currentUser?.name?.split(' ')[0] || 'Admin'}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                Here is a summary of platform traffic, active HLS transcoding jobs, and recent uploads.
              </p>
            </div>

            {/* Primary Action */}
            <div className="flex items-center gap-3">
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

          {/* 4. Dashboard Statistics Cards (5 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: Total Users */}
            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 space-y-2 hover:border-purple-500/40 transition-colors">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-semibold">Total Users</span>
                <div className="p-2 rounded-xl bg-purple-600/10 text-purple-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">24,850</p>
              <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>+12.4% this month</span>
              </p>
            </div>

            {/* Card 2: Total Videos */}
            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 space-y-2 hover:border-purple-500/40 transition-colors">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-semibold">Total Videos</span>
                <div className="p-2 rounded-xl bg-purple-600/10 text-purple-400">
                  <Film className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">1,420</p>
              <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>+28 new this week</span>
              </p>
            </div>

            {/* Card 3: Total Views */}
            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 space-y-2 hover:border-purple-500/40 transition-colors">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-semibold">Total Views</span>
                <div className="p-2 rounded-xl bg-purple-600/10 text-purple-400">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">48.6M</p>
              <p className="text-[11px] text-purple-300 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>+18.2% streaming hrs</span>
              </p>
            </div>

            {/* Card 4: Processing Videos */}
            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 space-y-2 hover:border-purple-500/40 transition-colors">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-semibold">Processing</span>
                <div className="p-2 rounded-xl bg-purple-600/10 text-purple-400 animate-pulse">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-purple-300">7</p>
              <p className="text-[11px] text-zinc-400 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Active HLS jobs</span>
              </p>
            </div>

            {/* Card 5: Failed Videos */}
            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 space-y-2 hover:border-rose-500/40 transition-colors">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-semibold">Failed</span>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-rose-400">2</p>
              <p className="text-[11px] text-rose-400/90 font-medium">
                Requires inspect / retry
              </p>
            </div>
          </div>

          {/* 6. Video Processing Status Section */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-purple-400" />
                  Cloud Transcoding Pipeline Health
                </h3>
                <p className="text-xs text-zinc-400">
                  Real-time AWS Elemental MediaConvert & FFmpeg worker status
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
                  Workers Optimal (98.4% Cache Hit)
                </span>
              </div>
            </div>

            {/* Pipeline Distribution Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Ingest Stages (Total 1,420 Videos)</span>
                <span className="font-mono text-zinc-300">99.1% Ready</span>
              </div>

              <div className="h-3 w-full bg-zinc-950 rounded-full overflow-hidden flex gap-1 p-0.5 border border-zinc-800">
                <div style={{ width: '99.1%' }} className="h-full bg-emerald-500 rounded-l-full" title="Ready: 1,408" />
                <div style={{ width: '0.6%' }} className="h-full bg-purple-500 animate-pulse" title="Processing: 7" />
                <div style={{ width: '0.2%' }} className="h-full bg-amber-500" title="Pending: 3" />
                <div style={{ width: '0.1%' }} className="h-full bg-rose-500 rounded-r-full" title="Failed: 2" />
              </div>

              {/* Stage Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                  <span className="text-[11px] text-emerald-400 font-semibold block">
                    ● Ready (Streaming)
                  </span>
                  <p className="text-lg font-bold text-white mt-0.5">1,408</p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                  <span className="text-[11px] text-purple-400 font-semibold block">
                    ● Processing (HLS)
                  </span>
                  <p className="text-lg font-bold text-white mt-0.5">7</p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                  <span className="text-[11px] text-amber-400 font-semibold block">
                    ● Pending Ingest
                  </span>
                  <p className="text-lg font-bold text-white mt-0.5">3</p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                  <span className="text-[11px] text-rose-400 font-semibold block">
                    ● Failed Ingest
                  </span>
                  <p className="text-lg font-bold text-white mt-0.5">2</p>
                </div>
              </div>
            </div>
          </div>

          {/* 7. Analytics Section: Charts & Top Videos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 7-Day Video Views Bar Chart (Left 2 cols) */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                    Weekly Video Views (Millions)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Aggregated daily streams across all client platforms
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-purple-300">
                  Total: 51.6M
                </span>
              </div>

              {/* Bar Chart Visual */}
              <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2 border-b border-zinc-800/80">
                {WEEKLY_VIEWS_DATA.map((item) => (
                  <div
                    key={item.day}
                    className="flex-1 flex flex-col items-center gap-2 h-full justify-end group"
                  >
                    <span className="text-[10px] font-mono text-purple-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.views}M
                    </span>
                    <div
                      style={{ height: item.height }}
                      className="w-full max-w-[42px] bg-gradient-to-t from-purple-700 via-purple-600 to-indigo-500 rounded-t-xl group-hover:brightness-125 transition-all shadow-lg shadow-purple-600/20"
                    />
                    <span className="text-xs text-zinc-400 font-semibold">
                      {item.day}
                    </span>
                  </div>
                ))}
              </div>

              {/* User Growth Quick Stat Banner */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">
                      User Growth Acceleration
                    </span>
                    <span className="text-zinc-400">
                      +820 new verified accounts created today
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  +18.4% WoW
                </span>
              </div>
            </div>

            {/* Top Performing Videos Leaderboard (Right 1 col) */}
            <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Top Streamed Titles
                </h3>
                <span className="text-xs text-zinc-400 font-medium">This Month</span>
              </div>

              <div className="space-y-3">
                {TOP_VIDEOS.map((video) => (
                  <div
                    key={video.rank}
                    className="flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 transition-colors"
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        video.rank === 1
                          ? 'bg-amber-500 text-zinc-950'
                          : video.rank === 2
                          ? 'bg-zinc-300 text-zinc-950'
                          : video.rank === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      #{video.rank}
                    </span>

                    <div className="relative aspect-video w-16 rounded-lg overflow-hidden bg-black flex-shrink-0">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs text-white truncate">
                        {video.title}
                      </h4>
                      <p className="text-[10px] text-zinc-400">
                        {video.views} views • {video.watchHours}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Recent Uploads Section */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-purple-400" />
                  Recent Ingest Uploads
                </h3>
                <p className="text-xs text-zinc-400">
                  Latest video uploads through cloud transcoding pipeline
                </p>
              </div>

              <button
                onClick={() => {
                  if (onNavigateToManagement) onNavigateToManagement();
                  else window.location.hash = '#video-management';
                }}
                className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
              >
                <span>View Full Video Management</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Recent Uploads Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-zinc-800/80 text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                    <th className="py-3 px-3">Title</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Upload Date</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Views</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-xs text-zinc-300">
                  {RECENT_UPLOADS.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="relative aspect-video w-16 rounded-lg overflow-hidden bg-black flex-shrink-0">
                            <img
                              src={item.thumbnailUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="font-bold text-white truncate max-w-xs">
                            {item.title}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-purple-300">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-zinc-400">{item.uploadDate}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.status === 'ready'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : item.status === 'processing'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30 animate-pulse'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === 'ready'
                                ? 'bg-emerald-400'
                                : item.status === 'processing'
                                ? 'bg-purple-400'
                                : 'bg-rose-400'
                            }`}
                          />
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-white">{item.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 8. Quick Actions Bar */}
          <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800/80 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Quick Operations
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => {
                  if (onNavigateToUpload) onNavigateToUpload();
                  else window.location.hash = '#admin-upload';
                }}
                className="p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-purple-500/50 flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-white">Upload Video</span>
                <span className="text-[10px] text-zinc-500">Ingest to S3/HLS</span>
              </button>

              <button
                onClick={() => {
                  if (onNavigateToManagement) onNavigateToManagement();
                  else window.location.hash = '#video-management';
                }}
                className="p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-purple-500/50 flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Film className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-white">Manage Videos</span>
                <span className="text-[10px] text-zinc-500">Edit / Delete Assets</span>
              </button>

              <button
                onClick={() => {
                  setActiveAlert('Opening User Management directory.');
                  setTimeout(() => setActiveAlert(null), 3000);
                }}
                className="p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-purple-500/50 flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-white">Manage Users</span>
                <span className="text-[10px] text-zinc-500">View 24.8K Accounts</span>
              </button>

              <button
                onClick={() => {
                  setActiveAlert('Exporting CloudWatch & CloudFront metrics.');
                  setTimeout(() => setActiveAlert(null), 3000);
                }}
                className="p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-purple-500/50 flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-white">View Analytics</span>
                <span className="text-[10px] text-zinc-500">Real-time Stream Telemetry</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
