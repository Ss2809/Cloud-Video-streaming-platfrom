import React from 'react';
import { Play, Globe, Heart } from 'lucide-react';

export default function Footer() {
  const footerLinks = {
    Platform: [
      { name: 'Browse Library', href: '#browse' },
      { name: 'Trending Now', href: '#trending' },
      { name: 'Featured Premieres', href: '#home' },
      { name: 'Categories', href: '#categories' },
    ],
    SupportedDevices: [
      { name: 'Smart TV App', href: '#' },
      { name: 'Mobile (iOS & Android)', href: '#' },
      { name: 'Tablet & iPad', href: '#' },
      { name: 'Desktop Web App', href: '#' },
    ],
    Resources: [
      { name: 'Help Center & FAQ', href: '#' },
      { name: 'Supported Formats', href: '#' },
      { name: 'API Documentation', href: '#' },
      { name: 'Speed Test', href: '#' },
    ],
    Legal: [
      { name: 'Privacy Policy', href: '#' },
      { name: 'Terms of Service', href: '#' },
      { name: 'Cookie Preferences', href: '#' },
      { name: 'Content License', href: '#' },
    ],
  };

  return (
    <footer className="bg-zinc-950 border-t border-zinc-800/80 pt-16 pb-12 mt-16 text-zinc-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-zinc-800/60">
          {/* Brand Info Column */}
          <div className="col-span-2 space-y-4">
            <a href="#home" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-600/30">
                <Play className="w-4 h-4 text-white fill-current ml-0.5" />
              </div>
              <span className="font-bold text-xl text-white tracking-tight">
                Stream<span className="text-purple-400">Cloud</span>
              </span>
            </a>
            
            <p className="text-sm text-zinc-400 max-w-sm leading-relaxed">
              High-performance cloud-native video streaming platform delivering 4K ultra-low-latency entertainment, documentaries, sports, and educational series to any device worldwide.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://x.com"
                aria-label="X / Twitter"
                className="w-9 h-9 rounded-lg bg-zinc-900 hover:bg-purple-600/20 hover:text-purple-400 border border-zinc-800 flex items-center justify-center transition-colors text-zinc-400"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a
                href="https://github.com"
                aria-label="GitHub"
                className="w-9 h-9 rounded-lg bg-zinc-900 hover:bg-purple-600/20 hover:text-purple-400 border border-zinc-800 flex items-center justify-center transition-colors text-zinc-400"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
              </a>
              <a
                href="https://youtube.com"
                aria-label="YouTube"
                className="w-9 h-9 rounded-lg bg-zinc-900 hover:bg-purple-600/20 hover:text-purple-400 border border-zinc-800 flex items-center justify-center transition-colors text-zinc-400"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a
                href="https://instagram.com"
                aria-label="Instagram"
                className="w-9 h-9 rounded-lg bg-zinc-900 hover:bg-purple-600/20 hover:text-purple-400 border border-zinc-800 flex items-center justify-center transition-colors text-zinc-400"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Links Column 1: Platform */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase mb-3">
              Explore
            </h4>
            <ul className="space-y-2 text-sm">
              {footerLinks.Platform.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="hover:text-purple-400 transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Column 2: Resources */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase mb-3">
              Resources
            </h4>
            <ul className="space-y-2 text-sm">
              {footerLinks.Resources.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="hover:text-purple-400 transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Column 3: Legal */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase mb-3">
              Legal
            </h4>
            <ul className="space-y-2 text-sm">
              {footerLinks.Legal.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="hover:text-purple-400 transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-purple-400" />
            <span>English (United States)</span>
            <span className="mx-2">•</span>
            <span>Server Region: US-East (Global CDN)</span>
          </div>

          <div className="flex items-center gap-1">
            <span>© {new Date().getFullYear()} StreamCloud Video Platform. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
