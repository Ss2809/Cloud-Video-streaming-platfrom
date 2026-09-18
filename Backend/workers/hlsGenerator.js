const fs = require('fs');
const path = require('path');
const { ffmpeg } = require('../config/ffmpeg');

// Multi-quality resolution and bitrate profiles
const RENDITIONS = [
  {
    name: '360p',
    width: 640,
    height: 360,
    videoBitrate: '800k',
    audioBitrate: '96k',
    bandwidth: 896000,
  },
  {
    name: '480p',
    width: 854,
    height: 480,
    videoBitrate: '1400k',
    audioBitrate: '128k',
    bandwidth: 1528000,
  },
  {
    name: '720p',
    width: 1280,
    height: 720,
    videoBitrate: '2800k',
    audioBitrate: '128k',
    bandwidth: 2928000,
  },
  {
    name: '1080p',
    width: 1920,
    height: 1080,
    videoBitrate: '5000k',
    audioBitrate: '192k',
    bandwidth: 5192000,
  },
];

/**
 * Format duration in seconds into human-readable format (e.g. '1h 24m' or '45m')
 * @param {number} seconds
 * @returns {string}
 */
const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
};

/**
 * Probe video metadata using ffprobe
 * @param {string} inputPath
 * @returns {Promise<{durationSec: number, formattedDuration: string, width: number, height: number, format: string}>}
 */
const probeVideo = (inputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        return reject(new Error(`FFprobe failed to inspect source: ${err.message}`));
      }

      const durationSec = metadata.format?.duration || 0;
      const videoStream = (metadata.streams || []).find((s) => s.codec_type === 'video');

      resolve({
        durationSec,
        formattedDuration: formatDuration(durationSec),
        width: videoStream?.width || 1920,
        height: videoStream?.height || 1080,
        format: metadata.format?.format_name || 'mp4',
        codec: videoStream?.codec_name || 'h264',
      });
    });
  });
};

/**
 * Extract 16:9 thumbnail poster frame from video
 * @param {string} inputPath
 * @param {string} outputPath
 * @returns {Promise<string>}
 */
const generateThumbnail = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(outputPath);
    const filename = path.basename(outputPath);
    fs.mkdirSync(dir, { recursive: true });

    ffmpeg(inputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(new Error(`Failed to extract thumbnail: ${err.message}`)))
      .screenshots({
        timestamps: [1],
        filename,
        folder: dir,
        size: '1280x720',
      });
  });
};

/**
 * Transcode single rendition into HLS (.ts segments + index.m3u8)
 * @param {string} inputPath - Original video
 * @param {string} outputHlsDir - Base directory for HLS output
 * @param {Object} rendition - { name, width, height, videoBitrate, audioBitrate }
 * @returns {Promise<string>} Path to generated index.m3u8
 */
const transcodeRendition = (inputPath, outputHlsDir, rendition) => {
  return new Promise((resolve, reject) => {
    const renditionDir = path.join(outputHlsDir, rendition.name);
    fs.mkdirSync(renditionDir, { recursive: true });

    const playlistPath = path.join(renditionDir, 'index.m3u8');
    const segmentPattern = path.join(renditionDir, 'segment%03d.ts');

    console.log(`[FFmpeg] Transcoding rendition ${rendition.name} (${rendition.width}x${rendition.height} @ ${rendition.videoBitrate})...`);

    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',
        '-preset veryfast',
        '-crf 22',
        `-vf scale=w=${rendition.width}:h=${rendition.height}:force_original_aspect_ratio=decrease,pad=${rendition.width}:${rendition.height}:(ow-iw)/2:(oh-ih)/2`,
        `-b:v ${rendition.videoBitrate}`,
        '-c:a aac',
        `-b:a ${rendition.audioBitrate}`,
        '-ar 48000',
        '-hls_time 6',
        '-hls_playlist_type vod',
        `-hls_segment_filename ${segmentPattern}`,
      ])
      .output(playlistPath)
      .on('end', () => {
        console.log(`✓ Completed rendition: ${rendition.name}`);
        resolve(playlistPath);
      })
      .on('error', (err) => {
        console.error(`✗ Error transcoding rendition ${rendition.name}: ${err.message}`);
        reject(err);
      })
      .run();
  });
};

/**
 * Generate HLS Master Playlist referencing all renditions
 * @param {string} outputHlsDir - Base HLS directory
 * @param {Array<Object>} renditions - Array of completed renditions
 * @returns {string} Absolute path to master.m3u8
 */
const generateMasterPlaylist = (outputHlsDir, renditions = RENDITIONS) => {
  const masterPath = path.join(outputHlsDir, 'master.m3u8');

  let content = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

  renditions.forEach((r) => {
    content += `#EXT-X-STREAM-INF:BANDWIDTH=${r.bandwidth},RESOLUTION=${r.width}x${r.height}\n`;
    content += `${r.name}/index.m3u8\n\n`;
  });

  fs.writeFileSync(masterPath, content.trim(), 'utf8');
  console.log(`✓ Master playlist generated at ${masterPath}`);
  return masterPath;
};

module.exports = {
  RENDITIONS,
  formatDuration,
  probeVideo,
  generateThumbnail,
  transcodeRendition,
  generateMasterPlaylist,
};
