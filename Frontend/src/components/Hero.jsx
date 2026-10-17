import React from 'react';
import { Play, Info, Star, Clock, Sparkles } from 'lucide-react';

export default function Hero({ movie, onPlayVideo, onMoreInfo }) {
  if (!movie) return null;

  const handleWatch = () => {
    if (onPlayVideo) {
      onPlayVideo(movie);
    } else {
      const vidId = movie.id || movie._id || '6ac7a809bfbea0f11934b1f9';
      try {
        localStorage.setItem('streamcloud_active_video_id', vidId);
      } catch {}
      window.location.hash = `#watch?id=${vidId}`;
    }
  };

  const handleInfo = () => {
    if (onMoreInfo) {
      onMoreInfo(movie);
    } else {
      const vidId = movie.id || movie._id || '6ac7a809bfbea0f11934b1f9';
      try {
        localStorage.setItem('streamcloud_active_video_id', vidId);
      } catch {}
      window.location.hash = `#watch?id=${vidId}`;
    }
  };

  return (
    <section id="home" className="relative w-full min-h-[80vh] lg:min-h-[88vh] flex items-end pb-16 pt-28 overflow-hidden">
      {/* Background Poster Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={movie.backdropUrl}
          alt={movie.title}
          className="w-full h-full object-cover object-center transform scale-105 filter brightness-90 animate-pulse duration-[8000ms]"
        />

        {/* Multi-layered cinematic gradient overlays */}
        {/* Bottom fade into platform background */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
        
        {/* Left side fade for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/60 to-transparent" />
        
        {/* Top vignette for navbar integration */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-transparent to-transparent" />
        
        {/* Subtle purple radial ambient glow */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      </div>

      {/* Hero Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-2xl space-y-4 md:space-y-6">
          {/* Badges & Tags */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-600/30 text-purple-300 border border-purple-500/40 backdrop-blur-md shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              {movie.badge || "Featured Premiere"}
            </span>
            <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
              {movie.ageRating || "16+"}
            </span>
            <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
              4K Ultra HD
            </span>
            <div className="flex items-center gap-1 text-amber-400 text-xs font-medium">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{movie.rating || "4.9"}</span>
            </div>
            <div className="flex items-center gap-1 text-zinc-400 text-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>{movie.videoDuration || "2h 24m"}</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white drop-shadow-md leading-[1.1]">
            {movie.title}
          </h1>

          {/* Genres */}
          {movie.genres && (
            <div className="flex items-center gap-2 text-xs md:text-sm text-purple-300/90 font-medium">
              {movie.genres.join(" • ")}
            </div>
          )}

          {/* Description */}
          <p className="text-sm sm:text-base text-zinc-300/95 leading-relaxed line-clamp-3 md:line-clamp-4 max-w-xl font-normal drop-shadow">
            {movie.description}
          </p>

          {/* Buttons: Watch Now & More Info */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleWatch}
              className="flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 rounded-xl font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-xl shadow-purple-600/30 hover:shadow-purple-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current ml-0.5" />
              <span>Watch Now</span>
            </button>

            <button
              onClick={handleInfo}
              className="flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 rounded-xl font-medium text-sm sm:text-base text-zinc-200 bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-700/70 hover:border-purple-500/50 backdrop-blur-md hover:text-white transition-all duration-200 cursor-pointer"
            >
              <Info className="w-5 h-5 text-purple-400" />
              <span>More Info</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
