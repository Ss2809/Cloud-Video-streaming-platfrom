import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import VideoCard from './VideoCard';

export default function VideoSection({
  title,
  subtitle,
  icon: Icon,
  videos = [],
  onPlayVideo,
  viewAllLink = '#',
}) {
  const scrollContainerRef = useRef(null);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="py-8 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-end justify-between mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              {Icon && (
                <div className="p-1.5 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <Icon className="w-5 h-5" />
                </div>
              )}
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
                {title}
              </h2>
            </div>
            {subtitle && (
              <p className="text-xs sm:text-sm text-zinc-400 font-normal">
                {subtitle}
              </p>
            )}
          </div>

          {/* Controls: Prev/Next Buttons */}
          <div className="flex items-center gap-2">
            <a
              href={viewAllLink}
              className="text-xs sm:text-sm font-semibold text-purple-400 hover:text-purple-300 mr-2 transition-colors hidden sm:inline-block"
            >
              See All
            </a>
            <button
              onClick={() => scroll('left')}
              className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-purple-500/40 transition-all cursor-pointer shadow-sm active:scale-95"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-purple-500/40 transition-all cursor-pointer shadow-sm active:scale-95"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Cards Horizontal Scroll Container */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-5 sm:gap-6 overflow-x-auto no-scrollbar py-2 px-1 scroll-smooth"
        >
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onPlay={onPlayVideo}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
