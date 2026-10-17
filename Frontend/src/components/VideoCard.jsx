import React, { useState } from 'react';
import { Play, Eye, Clock, Star, Plus, Check } from 'lucide-react';
import { videoService } from '../services/videoService';

export default function VideoCard({ video, onPlay, layout = 'carousel', className = '' }) {
  const [inWatchlist, setInWatchlist] = useState(false);

  if (!video) return null;

  const widthClass = layout === 'grid' ? 'w-full' : 'flex-shrink-0 w-64 sm:w-72 lg:w-80';

  return (
    <div
      className={`group relative cursor-pointer select-none ${widthClass} ${className}`}
      onClick={() => (onPlay ? onPlay(video) : alert(`Playing: ${video.title}`))}
    >
      {/* Card Container */}
      <div className="relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800/80 transition-all duration-300 group-hover:border-purple-500/50 group-hover:shadow-2xl group-hover:shadow-purple-950/40 group-hover:-translate-y-1">
        {/* Thumbnail Wrapper (16:9 ratio) */}
        <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />

          {/* Dark gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

          {/* Hover Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-12 h-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg shadow-purple-600/50 backdrop-blur-sm group-hover:scale-110 transition-transform duration-200">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
          </div>

          {/* Duration Badge */}
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[11px] font-medium text-zinc-200 border border-white/10">
            <Clock className="w-3 h-3 text-purple-400" />
            <span>{video.duration}</span>
          </div>

          {/* Category Tag (top left) */}
          <div className="absolute top-2.5 left-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-900/80 text-purple-200 border border-purple-500/30 backdrop-blur-md shadow-sm">
              {video.category}
            </span>
          </div>

          {/* New Tag (if applicable) */}
          {video.isNew && (
            <div className="absolute top-2.5 right-2.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/90 text-zinc-950 uppercase tracking-wide">
                NEW
              </span>
            </div>
          )}
        </div>

        {/* Video Info Section */}
        <div className="p-4 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm sm:text-base text-white line-clamp-1 group-hover:text-purple-300 transition-colors">
              {video.title}
            </h3>
            
            {/* Quick Watchlist action */}
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const nextState = !inWatchlist;
                setInWatchlist(nextState);
                const vidId = video.id || video._id;
                if (vidId && typeof vidId === 'string' && vidId.length === 24) {
                  try {
                    const token = localStorage.getItem('streamcloud_token');
                    if (token) {
                      if (nextState) {
                        await videoService.addToWatchlist(vidId);
                      } else {
                        await videoService.removeFromWatchlist(vidId);
                      }
                    }
                  } catch (err) {
                    console.warn('Watchlist toggle error:', err.message);
                  }
                }
              }}
              title={inWatchlist ? "Remove from List" : "Add to List"}
              className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer flex-shrink-0"
            >
              {inWatchlist ? (
                <Check className="w-4 h-4 text-purple-400" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Creator Name */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
            <span className="truncate hover:text-purple-300 transition-colors font-medium">
              {video.creator || 'StreamCloud Originals'}
            </span>
          </div>

          {/* Views, Year, Rating */}
          <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-zinc-500" />
              <span>{video.views} views</span>
            </div>

            <div className="flex items-center gap-2">
              {video.year && <span>{video.year}</span>}
              {video.rating && (
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="w-3 h-3 fill-current" />
                  <span className="font-medium text-zinc-300">{video.rating}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
