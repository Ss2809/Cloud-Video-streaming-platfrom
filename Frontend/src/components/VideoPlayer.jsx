import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  Settings,
  RotateCcw,
  AlertCircle,
  Check,
  Sparkles,
} from 'lucide-react';

const QUALITY_OPTIONS = [
  { id: '1080p', label: '1080p 60fps (HD)', bitrate: '6.5 Mbps' },
  { id: '720p', label: '720p (HD)', bitrate: '3.2 Mbps' },
  { id: '480p', label: '480p (SD)', bitrate: '1.4 Mbps' },
  { id: 'auto', label: 'Auto (Recommended)', bitrate: 'Adaptive' },
];

export default function VideoPlayer({
  videoSource = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  posterUrl = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1920&auto=format&fit=crop',
  title = 'Video Stream',
  autoPlay = false,
  onQualityChange,
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const progressRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('auto');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);

  /*
   * -------------------------------------------------------------
   * Future HLS.js Architecture Hook:
   * -------------------------------------------------------------
   * In production with AWS Elemental MediaConvert / CloudFront HLS:
   * 
   * import Hls from 'hls.js';
   * useEffect(() => {
   *   if (Hls.isSupported() && videoSource.endsWith('.m3u8')) {
   *     const hls = new Hls({ autoStartLoad: true, enableWorker: true });
   *     hls.loadSource(videoSource);
   *     hls.attachMedia(videoRef.current);
   *     hls.on(Hls.Events.MANIFEST_PARSED, () => {
   *       if (autoPlay) videoRef.current.play();
   *     });
   *     return () => hls.destroy();
   *   }
   * }, [videoSource]);
   * -------------------------------------------------------------
   */

  // Synchronize initial volume & state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Track Fullscreen state changes (e.g. user pressing ESC key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-hide controls after 3 seconds of inactivity while playing
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying && !showSettings && !isScrubbing) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3200);
    }
  }, [isPlaying, showSettings, isScrubbing]);

  const handleMouseMove = () => {
    resetControlsTimer();
  };

  // Play / Pause Toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused || videoRef.current.ended) {
      videoRef.current.play().catch(() => {
        // Autoplay restrictions or media error
      });
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    resetControlsTimer();
  };

  // Time Updates
  const handleTimeUpdate = () => {
    if (videoRef.current && !isScrubbing) {
      setCurrentTime(videoRef.current.currentTime);

      // Compute buffer progress
      if (videoRef.current.buffered.length > 0) {
        const bufferedEnd = videoRef.current.buffered.end(
          videoRef.current.buffered.length - 1
        );
        const totalDuration = videoRef.current.duration || 1;
        setBufferedPercent(Math.min((bufferedEnd / totalDuration) * 100, 100));
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
      setHasError(false);
    }
  };

  // Interactive Progress Scrubber Click & Drag
  const handleScrub = (e) => {
    if (!progressRef.current || !videoRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pos * duration;
    setCurrentTime(newTime);
    videoRef.current.currentTime = newTime;
  };

  // Volume & Mute Controls
  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.volume = volume > 0 ? volume : 0.5;
      }
    } else {
      setIsMuted(true);
      if (videoRef.current) {
        videoRef.current.muted = true;
      }
    }
  };

  // Fullscreen API toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Quality Level Selection
  const handleSelectQuality = (qualityId) => {
    setSelectedQuality(qualityId);
    setShowSettings(false);
    if (onQualityChange) {
      onQualityChange(qualityId);
    }
    // Simulated quality switch indicator
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 300);
  };

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full aspect-video bg-black rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl shadow-purple-950/30 select-none group border border-zinc-800/80"
    >
      {/* Native HTML5 Video Element with Mock HLS Source */}
      <video
        ref={videoRef}
        src={videoSource}
        poster={posterUrl}
        playsInline
        preload="metadata"
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
        }}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        className="w-full h-full object-contain cursor-pointer bg-black"
      />

      {/* Loading & Buffering Spinner Overlay */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs pointer-events-none">
          <div className="w-14 h-14 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin shadow-lg shadow-purple-500/30" />
          <span className="text-xs font-semibold text-purple-300 mt-3 tracking-wider uppercase">
            Buffering 4K Stream
          </span>
        </div>
      )}

      {/* Playback Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 z-25 flex flex-col items-center justify-center bg-zinc-950/90 p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-lg font-bold text-white">Stream Playback Error</h3>
            <p className="text-xs text-zinc-400">
              The media could not be loaded or the HLS manifest is temporarily unreachable.
            </p>
          </div>
          <button
            onClick={() => {
              setHasError(false);
              setIsLoading(true);
              if (videoRef.current) {
                videoRef.current.load();
                videoRef.current.play().catch(() => {});
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 cursor-pointer transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Playback</span>
          </button>
        </div>
      )}

      {/* Center Big Play Button (Visible when paused and not loading/error) */}
      {!isPlaying && !isLoading && !hasError && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-[2px] cursor-pointer"
        >
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-purple-600/60 hover:scale-110 active:scale-95 transition-all duration-200">
            <Play className="w-8 h-8 fill-current ml-1" />
          </div>
        </div>
      )}

      {/* Top Overlay Vignette (Title & Quality Indicator) */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 p-4 sm:p-6 bg-gradient-to-b from-black/80 via-black/30 to-transparent transition-opacity duration-300 pointer-events-none ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-semibold text-white drop-shadow-md truncate max-w-lg">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-900/60 text-purple-200 border border-purple-500/40 backdrop-blur-md">
              HLS • {selectedQuality.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Control Bar Container */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 px-3 sm:px-6 pb-3 sm:pb-4 pt-10 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Interactive Progress / Scrubber Bar */}
        <div
          ref={progressRef}
          onClick={handleScrub}
          className="relative w-full h-2 sm:h-2.5 bg-white/20 hover:h-3.5 rounded-full cursor-pointer transition-all duration-150 group/bar mb-3 sm:mb-4 flex items-center"
        >
          {/* Buffered Progress */}
          <div
            style={{ width: `${bufferedPercent}%` }}
            className="absolute left-0 top-0 bottom-0 bg-white/30 rounded-full transition-all duration-300"
          />

          {/* Played Progress (Purple Gradient) */}
          <div
            style={{ width: `${progressPercent}%` }}
            className="relative h-full bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500 rounded-full shadow-sm shadow-purple-500"
          >
            {/* Scrubber Knob */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-white rounded-full shadow-md shadow-black scale-0 group-hover/bar:scale-100 transition-transform duration-150 ring-2 ring-purple-600" />
          </div>
        </div>

        {/* Control Buttons & Indicators Row */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 text-white">
          {/* Left Controls: Play/Pause, Volume, Time */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-white/15 text-white hover:text-purple-300 transition-colors cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current" />
              )}
            </button>

            {/* Volume & Mute */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-white/15 text-white hover:text-purple-300 transition-colors cursor-pointer"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-rose-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              {/* Volume Slider (Expands on hover) */}
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                aria-label="Volume level slider"
                className="w-16 sm:w-20 h-1.5 bg-zinc-700 accent-purple-500 rounded-lg cursor-pointer transition-all"
              />
            </div>

            {/* Time Display */}
            <div className="text-xs sm:text-sm font-mono text-zinc-300 pl-1">
              <span>{formatTime(currentTime)}</span>
              <span className="text-zinc-500 mx-1">/</span>
              <span className="text-zinc-400">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Quality Selector & Fullscreen */}
          <div className="flex items-center gap-1.5 sm:gap-3 relative">
            {/* Quality Selector Button */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                aria-label="Stream Quality Settings"
                className={`flex items-center gap-1 p-1.5 sm:p-2 rounded-lg hover:bg-white/15 transition-colors cursor-pointer ${
                  showSettings ? 'text-purple-400 bg-white/10' : 'text-zinc-300 hover:text-white'
                }`}
              >
                <Settings className="w-5 h-5" />
                <span className="text-xs font-semibold hidden md:inline uppercase">
                  {selectedQuality}
                </span>
              </button>

              {/* Quality Popover Menu */}
              {showSettings && (
                <div className="absolute right-0 bottom-full mb-3 w-56 bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl shadow-purple-950/50 p-2 z-30 backdrop-blur-xl animate-fadeIn">
                  <div className="px-3 py-2 border-b border-zinc-800/80 mb-1">
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      Stream Quality
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      Adaptive bitrate streaming
                    </p>
                  </div>

                  <div className="space-y-1">
                    {QUALITY_OPTIONS.map((opt) => {
                      const isSelected = selectedQuality === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleSelectQuality(opt.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40'
                              : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                          }`}
                        >
                          <div>
                            <p className="font-semibold">{opt.label}</p>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {opt.bitrate}
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-white/15 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
