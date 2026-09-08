import React from 'react';

export default function VideoCardSkeleton() {
  return (
    <div className="w-full rounded-2xl bg-zinc-900/90 border border-zinc-800/80 overflow-hidden animate-pulse">
      {/* 16:9 Thumbnail Skeleton */}
      <div className="relative aspect-video w-full bg-zinc-800/70">
        {/* Placeholder Duration Badge */}
        <div className="absolute bottom-2.5 right-2.5 w-12 h-4 bg-zinc-900/80 rounded-md" />
        {/* Placeholder Category Tag */}
        <div className="absolute top-2.5 left-2.5 w-16 h-4 bg-zinc-900/80 rounded-full" />
      </div>

      {/* Info Section Skeleton */}
      <div className="p-4 space-y-2.5">
        {/* Title Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="h-4 bg-zinc-800/80 rounded w-4/5" />
          <div className="w-5 h-5 bg-zinc-800/70 rounded-full flex-shrink-0" />
        </div>

        {/* Creator Name Bar */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-zinc-800/80 flex-shrink-0" />
          <div className="h-3 bg-zinc-800/60 rounded w-1/3" />
        </div>

        {/* Views & Metrics */}
        <div className="flex items-center justify-between pt-1">
          <div className="h-3 bg-zinc-800/60 rounded w-1/4" />
          <div className="h-3 bg-zinc-800/60 rounded w-1/5" />
        </div>
      </div>
    </div>
  );
}
