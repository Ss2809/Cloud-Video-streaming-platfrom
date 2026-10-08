const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { pipeline } = require('stream/promises');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, bucketName, region } = require('../config/s3');

// Allowed video MIME types
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime', // .mov
  'video/x-matroska', // .mkv
  'video/webm',
  'video/avi',
  'video/x-msvideo',
];

// Maximum allowed file size: 5 GB (in bytes)
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;

const isValidVideoType = (mimeType) => {
  if (!mimeType || typeof mimeType !== 'string') return false;
  return ALLOWED_VIDEO_TYPES.includes(mimeType.toLowerCase().trim());
};

const isValidFileSize = (sizeInBytes) => {
  const size = Number(sizeInBytes);
  return !isNaN(size) && size > 0 && size <= MAX_FILE_SIZE;
};

const generateS3Key = (originalFileName) => {
  const extension = path.extname(originalFileName || '').toLowerCase() || '.mp4';
  const timestamp = Date.now();
  const uuid = crypto.randomUUID();
  return `raw-uploads/${timestamp}-${uuid}${extension}`;
};

const hasLiveCredentials = () => {
  return (
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_ACCESS_KEY_ID !== 'your_aws_access_key_id'
  );
};

/**
 * Generate a short-lived S3 pre-signed upload URL for direct-to-S3 client uploads
 */
const generatePresignedUploadUrl = async ({ s3Key, fileType, fileSize }) => {
  if (hasLiveCredentials()) {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      ContentType: fileType,
      ...(fileSize && { ContentLength: Number(fileSize) }),
    });

    return await getSignedUrl(s3Client, command, { expiresIn: 900 });
  }

  // Graceful fallback for local offline testing/development without AWS account configured
  const mockParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `MOCK_ACCESS_KEY/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${region}/s3/aws4_request`,
    'X-Amz-Date': new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''),
    'X-Amz-Expires': '900',
    'X-Amz-SignedHeaders': 'content-type;host',
    'X-Amz-Signature': crypto.randomBytes(32).toString('hex'),
  });

  return `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}?${mockParams.toString()}`;
};

/**
 * Download a file from S3 into local filesystem
 * @param {string} s3Key - S3 object key
 * @param {string} destinationPath - Absolute local file destination
 */
const downloadFromS3 = async (s3Key, destinationPath) => {
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });

  if (hasLiveCredentials()) {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    });

    const response = await s3Client.send(command);
    const writeStream = fs.createWriteStream(destinationPath);
    await pipeline(response.Body, writeStream);
    return destinationPath;
  }

  // If local file already exists at destinationPath or fallback location, return it
  if (fs.existsSync(destinationPath) && fs.statSync(destinationPath).size > 0) {
    return destinationPath;
  }

  // Simulation fallback: Generate a short synthetic MP4 asset via FFmpeg for local pipeline execution
  try {
    const { ffmpeg } = require('../config/ffmpeg');
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input('testsrc=duration=2:size=640x360:rate=24')
        .inputFormat('lavfi')
        .input('sine=frequency=1000:duration=2')
        .inputFormat('lavfi')
        .outputOptions([
          '-c:v libx264',
          '-preset ultrafast',
          '-pix_fmt yuv420p',
          '-c:a aac',
          '-b:a 64k',
        ])
        .output(destinationPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
  } catch (err) {
    console.warn('[s3Service] Could not generate synthetic source video:', err.message);
  }

  return destinationPath;
};

/**
 * Upload a single local file to S3
 * @param {string} localFilePath - Local file path
 * @param {string} s3Key - S3 destination key
 * @param {string} contentType - MIME type
 */
const uploadFileToS3 = async (localFilePath, s3Key, contentType = 'application/octet-stream') => {
  if (hasLiveCredentials()) {
    const fileStream = fs.createReadStream(localFilePath);
    const fileStats = fs.statSync(localFilePath);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: fileStream,
      ContentType: contentType,
      ContentLength: fileStats.size,
    });

    await s3Client.send(command);
    return `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
  }

  // In simulated local mode, return the structured URL
  return `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
};

/**
 * Upload an entire directory (playlists, segments, images) recursively to S3
 * @param {string} localDirPath - Local root directory
 * @param {string} s3Prefix - S3 key prefix (e.g. videos/{videoId}/hls)
 */
const uploadDirectoryToS3 = async (localDirPath, s3Prefix) => {
  const uploadedFiles = [];

  const walkDir = async (currentDir, relativePath = '') => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        await walkDir(fullPath, relPath);
      } else if (entry.isFile()) {
        const s3Key = `${s3Prefix}/${relPath}`;
        let contentType = 'application/octet-stream';

        if (entry.name.endsWith('.m3u8')) {
          contentType = 'application/vnd.apple.mpegurl';
        } else if (entry.name.endsWith('.ts')) {
          contentType = 'video/MP2T';
        } else if (entry.name.endsWith('.jpg') || entry.name.endsWith('.jpeg')) {
          contentType = 'image/jpeg';
        } else if (entry.name.endsWith('.png')) {
          contentType = 'image/png';
        } else if (entry.name.endsWith('.mp4')) {
          contentType = 'video/mp4';
        }

        await uploadFileToS3(fullPath, s3Key, contentType);
        uploadedFiles.push({ localPath: fullPath, s3Key, contentType });
      }
    }
  };

  if (fs.existsSync(localDirPath)) {
    await walkDir(localDirPath);
  }

  return uploadedFiles;
};

module.exports = {
  ALLOWED_VIDEO_TYPES,
  MAX_FILE_SIZE,
  isValidVideoType,
  isValidFileSize,
  generateS3Key,
  generatePresignedUploadUrl,
  downloadFromS3,
  uploadFileToS3,
  uploadDirectoryToS3,
};
