/**
 * CloudFront CDN Integration Service
 * Manages CloudFront delivery URLs for HLS streams and video thumbnails stored in private S3.
 */

/**
 * Extract and sanitize the configured CloudFront domain from environment variables
 * Supports AWS_CLOUDFRONT_DOMAIN, CLOUDFRONT_DOMAIN, and CLOUDFRONT_URL
 * @returns {string|null} Sanitized domain (e.g. "d123456abcdef.cloudfront.net")
 */
const getCloudFrontDomain = () => {
  const rawDomain =
    process.env.AWS_CLOUDFRONT_DOMAIN ||
    process.env.CLOUDFRONT_DOMAIN ||
    process.env.CLOUDFRONT_URL ||
    '';

  if (!rawDomain || typeof rawDomain !== 'string') {
    return null;
  }

  return rawDomain
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/\/$/, '');
};

/**
 * Check if CloudFront CDN is actively configured
 * @returns {boolean}
 */
const isCloudFrontConfigured = () => {
  return Boolean(getCloudFrontDomain());
};

/**
 * Generate a secure HTTPS CloudFront URL for a given S3 object key
 * @param {string} s3Key - S3 object key (e.g. "videos/123/hls/master.m3u8")
 * @returns {string|null} Fully qualified CloudFront URL
 */
const getCloudFrontUrl = (s3Key) => {
  if (!s3Key || typeof s3Key !== 'string') return null;

  // If already an absolute HTTP/HTTPS URL
  if (s3Key.startsWith('http://') || s3Key.startsWith('https://')) {
    // If it's a direct S3 URL pointing to our bucket, convert it to CloudFront!
    const s3Regex = /^https?:\/\/[^/]+\.s3[.-][^/]+\.amazonaws\.com\/(.+)$/i;
    const match = s3Key.match(s3Regex);
    if (match && match[1]) {
      const domain = getCloudFrontDomain();
      return domain ? `https://${domain}/${match[1]}` : s3Key;
    }
    return s3Key;
  }

  const domain = getCloudFrontDomain();
  if (!domain) {
    // Graceful fallback domain for local development/testing
    const fallbackDomain = 'd111111abcdef8.cloudfront.net';
    const cleanKey = s3Key.replace(/^\/+/, '');
    return `https://${fallbackDomain}/${cleanKey}`;
  }

  const cleanKey = s3Key.replace(/^\/+/, '');
  return `https://${domain}/${cleanKey}`;
};

/**
 * Format video document/object with CloudFront HLS and thumbnail URLs.
 * Ensures private S3 bucket URLs are never exposed to clients.
 * @param {Object} video - Video Mongoose document or plain object
 * @returns {Object} Formatted video object with hlsUrl and sanitized thumbnailUrl
 */
const formatVideoWithCloudFront = (video) => {
  if (!video) return null;

  const plainVideo = typeof video.toObject === 'function' ? video.toObject() : { ...video };

  // 1. Generate CloudFront HLS Master Playlist URL
  let hlsUrl = null;
  if (plainVideo.hlsKey) {
    if (plainVideo.hlsKey.startsWith('http://') || plainVideo.hlsKey.startsWith('https://')) {
      hlsUrl = plainVideo.hlsKey;
    } else {
      hlsUrl = getCloudFrontUrl(plainVideo.hlsKey);
    }
  }

  // 2. Sanitize and route thumbnail through CloudFront
  let thumbnailUrl = plainVideo.thumbnailUrl || '';
  if (thumbnailUrl) {
    // If it's an S3 object key or direct S3 URL, convert to CloudFront
    if (
      thumbnailUrl.startsWith('videos/') ||
      thumbnailUrl.startsWith('raw-uploads/') ||
      thumbnailUrl.includes('.s3.') ||
      thumbnailUrl.includes('.s3-') ||
      thumbnailUrl.includes('.s3.amazonaws.com')
    ) {
      thumbnailUrl = getCloudFrontUrl(thumbnailUrl) || thumbnailUrl;
    }
  }

  return {
    ...plainVideo,
    hlsUrl,
    hlsMasterPlaylistUrl: hlsUrl, // Explicit alias for clarity
    thumbnailUrl,
    cdnDomain: getCloudFrontDomain() || 'd111111abcdef8.cloudfront.net',
  };
};

module.exports = {
  getCloudFrontDomain,
  isCloudFrontConfigured,
  getCloudFrontUrl,
  formatVideoWithCloudFront,
};
