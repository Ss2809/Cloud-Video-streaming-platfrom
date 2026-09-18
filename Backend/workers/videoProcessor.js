const fs = require('fs');
const path = require('path');
const Video = require('../models/Video');
const {
  RENDITIONS,
  probeVideo,
  generateThumbnail,
  transcodeRendition,
  generateMasterPlaylist,
} = require('./hlsGenerator');
const {
  downloadFromS3,
  uploadFileToS3,
  uploadDirectoryToS3,
} = require('../utils/s3Service');

/**
 * Process a single video through the FFmpeg + HLS pipeline
 * @param {string} videoId - MongoDB Video document ID
 * @param {Object} options - Optional overrides (e.g. { localSourceOverride })
 * @returns {Promise<Object>} Updated Video document
 */
const processVideo = async (videoId, options = {}) => {
  const video = await Video.findById(videoId);

  if (!video) {
    throw new Error(`Video with ID ${videoId} not found.`);
  }

  console.log(`\n======================================================`);
  console.log(`[VideoProcessor] Starting pipeline for video: "${video.title}"`);
  console.log(`ID:           ${video._id}`);
  console.log(`Current State:${video.status}`);
  console.log(`Original Key: ${video.originalKey}`);
  console.log(`======================================================\n`);

  // 1. Transition status to PROCESSING
  video.status = 'PROCESSING';
  await video.save();

  // Define workspace directories
  const tempBase = path.join(__dirname, '..', 'temp', String(video._id));
  const tempSourcePath = path.join(tempBase, 'source.mp4');
  const tempThumbPath = path.join(tempBase, 'thumbnail', 'poster.jpg');
  const tempHlsDir = path.join(tempBase, 'hls');

  fs.mkdirSync(tempBase, { recursive: true });
  fs.mkdirSync(path.join(tempBase, 'thumbnail'), { recursive: true });
  fs.mkdirSync(tempHlsDir, { recursive: true });

  try {
    // 2. Fetch / Acquire Source Video
    let sourcePath = tempSourcePath;

    if (options.localSourceOverride && fs.existsSync(options.localSourceOverride)) {
      console.log(`[VideoProcessor] Using local source override: ${options.localSourceOverride}`);
      fs.copyFileSync(options.localSourceOverride, tempSourcePath);
    } else {
      console.log(`[VideoProcessor] Fetching original video from S3: ${video.originalKey}...`);
      await downloadFromS3(video.originalKey, tempSourcePath);
    }

    if (!fs.existsSync(tempSourcePath) || fs.statSync(tempSourcePath).size === 0) {
      throw new Error(`Failed to acquire valid source video asset from ${video.originalKey}`);
    }

    // 3. Validate source using ffprobe
    console.log(`[VideoProcessor] Probing video source properties...`);
    const probeData = await probeVideo(tempSourcePath);
    console.log(`✓ Probe complete: ${probeData.width}x${probeData.height}, Duration: ${probeData.formattedDuration}`);

    // 4. Generate Thumbnail (poster.jpg)
    console.log(`[VideoProcessor] Generating poster thumbnail...`);
    await generateThumbnail(tempSourcePath, tempThumbPath);
    console.log(`✓ Thumbnail extracted: ${tempThumbPath}`);

    // 5. Transcode all target renditions (360p, 480p, 720p, 1080p)
    console.log(`[VideoProcessor] Transcoding multi-bitrate HLS streams...`);
    for (const rendition of RENDITIONS) {
      await transcodeRendition(tempSourcePath, tempHlsDir, rendition);
    }

    // 6. Generate Master Playlist (master.m3u8)
    console.log(`[VideoProcessor] Generating master.m3u8 playlist...`);
    generateMasterPlaylist(tempHlsDir, RENDITIONS);

    // 7. Upload generated files to S3 matching expected hierarchy
    // videos/{videoId}/original/source.mp4
    // videos/{videoId}/thumbnail/poster.jpg
    // videos/{videoId}/hls/master.m3u8, 360p/..., etc.
    const s3VideoPrefix = `videos/${video._id}`;
    const s3HlsPrefix = `${s3VideoPrefix}/hls`;
    const s3ThumbKey = `${s3VideoPrefix}/thumbnail/poster.jpg`;
    const s3MasterKey = `${s3HlsPrefix}/master.m3u8`;

    console.log(`[VideoProcessor] Uploading HLS directory to S3 (${s3HlsPrefix})...`);
    await uploadDirectoryToS3(tempHlsDir, s3HlsPrefix);

    console.log(`[VideoProcessor] Uploading thumbnail to S3 (${s3ThumbKey})...`);
    await uploadFileToS3(tempThumbPath, s3ThumbKey, 'image/jpeg');

    // 8. Update MongoDB Video document to READY
    video.status = 'READY';
    video.hlsKey = s3MasterKey;
    video.thumbnailUrl = `https://${process.env.AWS_S3_BUCKET || 'streamcloud-raw-videos'}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3ThumbKey}`;
    video.duration = probeData.formattedDuration;
    await video.save();

    console.log(`\n======================================================`);
    console.log(`✓ [VideoProcessor] Pipeline completed successfully!`);
    console.log(`Video ID:     ${video._id}`);
    console.log(`Status:       ${video.status}`);
    console.log(`Master HLS:   ${video.hlsKey}`);
    console.log(`Thumbnail:    ${video.thumbnailUrl}`);
    console.log(`Duration:     ${video.duration}`);
    console.log(`======================================================\n`);

    return video;
  } catch (error) {
    console.error(`\n[VideoProcessor] ERROR during pipeline: ${error.message}`);
    video.status = 'FAILED';
    await video.save();
    throw error;
  } finally {
    // 9. Cleanup local workspace directory
    try {
      if (fs.existsSync(tempBase)) {
        fs.rmSync(tempBase, { recursive: true, force: true });
        console.log(`[VideoProcessor] Cleaned up temporary workspace: ${tempBase}`);
      }
    } catch (cleanupErr) {
      console.warn(`[VideoProcessor] Failed to clean temp dir: ${cleanupErr.message}`);
    }
  }
};

module.exports = {
  processVideo,
};
