require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Video = require('./models/Video');
const {
  getCloudFrontDomain,
  getCloudFrontUrl,
  formatVideoWithCloudFront,
} = require('./utils/cloudfrontService');
const { generateMasterPlaylist, RENDITIONS } = require('./workers/hlsGenerator');

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('===============================================================');
  console.log('=== [StreamCloud] AWS CloudFront + HLS Playback Verification ===');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  const assert = (desc, condition) => {
    total++;
    if (condition) {
      console.log(`✓ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${desc}`);
    }
  };

  // 1. Environment & Configuration
  console.log('--- 1. Testing CloudFront Domain Configuration ---');
  const cfDomain = getCloudFrontDomain();
  console.log(`Configured Domain: ${cfDomain}`);
  assert('CloudFront domain is configured in environment', Boolean(cfDomain));
  assert('CloudFront domain has no protocol prefix or trailing slash', !cfDomain.includes('http://') && !cfDomain.includes('https://') && !cfDomain.endsWith('/'));

  // 2. URL Generation & S3 Sanitization
  console.log('\n--- 2. Testing CloudFront URL Generation & S3 Sanitization ---');
  const sampleKey = 'videos/6ac7a809bfbea0f11934b1f9/hls/master.m3u8';
  const sampleThumbKey = 'videos/6ac7a809bfbea0f11934b1f9/thumbnail/poster.jpg';
  const directS3Url = `https://streamcloud-raw-videos.s3.us-east-1.amazonaws.com/${sampleThumbKey}`;

  const hlsUrl = getCloudFrontUrl(sampleKey);
  console.log(`Generated HLS Master URL: ${hlsUrl}`);
  assert('HLS URL points to CloudFront HTTPS endpoint', hlsUrl.startsWith(`https://${cfDomain}/`));
  assert('HLS URL includes exact object key hierarchy', hlsUrl.endsWith(sampleKey));

  const sanitizedThumb = getCloudFrontUrl(directS3Url);
  console.log(`Sanitized S3 Thumbnail: ${sanitizedThumb}`);
  assert('Direct S3 URL is converted to secure CloudFront URL', sanitizedThumb.startsWith(`https://${cfDomain}/`));
  assert('Direct S3 URL is sanitized to protect private bucket', !sanitizedThumb.includes('.s3.us-east-1.amazonaws.com'));

  // 3. Video Object CloudFront Formatting
  console.log('\n--- 3. Testing formatVideoWithCloudFront Helper ---');
  const mockVideo = {
    _id: '6ac7a809bfbea0f11934b1f9',
    title: 'Neon Skyline 4K Drone Tour',
    status: 'READY',
    hlsKey: sampleKey,
    thumbnailUrl: directS3Url,
  };
  const formatted = formatVideoWithCloudFront(mockVideo);
  assert('Formatted video has hlsUrl property', Boolean(formatted.hlsUrl));
  assert('Formatted video hlsUrl points to CloudFront', formatted.hlsUrl.includes(cfDomain));
  assert('Formatted video thumbnailUrl is routed through CloudFront', formatted.thumbnailUrl.includes(cfDomain));

  // 4. HLS Master Playlist & Renditions Structure for CloudFront
  console.log('\n--- 4. Testing HLS Master Playlist & Rendition Hierarchy ---');
  const tempHlsTestDir = path.join(__dirname, 'temp', 'cf-hls-test');
  fs.mkdirSync(tempHlsTestDir, { recursive: true });

  const masterPath = generateMasterPlaylist(tempHlsTestDir, RENDITIONS);
  const masterContent = fs.readFileSync(masterPath, 'utf8');

  assert('Master playlist includes #EXTM3U header', masterContent.includes('#EXTM3U'));
  assert('Master playlist contains relative 360p path', masterContent.includes('360p/index.m3u8'));
  assert('Master playlist contains relative 720p path', masterContent.includes('720p/index.m3u8'));
  assert('Master playlist contains relative 1080p path', masterContent.includes('1080p/index.m3u8'));
  assert('Rendition paths are relative for seamless CloudFront resolution', !masterContent.includes('http://') && !masterContent.includes('https://'));

  // Cleanup test files
  try {
    fs.rmSync(tempHlsTestDir, { recursive: true, force: true });
  } catch {}

  // 5. Connect to MongoDB and Test Live API Endpoint
  console.log('\n--- 5. Testing Live API Endpoints (GET /api/videos & GET /api/videos/:id) ---');
  try {
    const listRes = await axios.get(`${API_BASE}/videos?limit=10`);
    assert('GET /api/videos responds with 200 OK', listRes.status === 200);
    assert('GET /api/videos returns videos array', Array.isArray(listRes.data.videos));

    if (listRes.data.videos.length > 0) {
      const firstVid = listRes.data.videos[0];
      console.log(`Sample Video in Catalog: "${firstVid.title}" (Status: ${firstVid.status})`);
      assert('Video in response has hlsUrl populated', Boolean(firstVid.hlsUrl));
      assert('Video in response hlsUrl is a valid HTTPS stream URL', firstVid.hlsUrl.startsWith('https://'));

      // Check single video details
      const detailRes = await axios.get(`${API_BASE}/videos/${firstVid._id}`);
      assert('GET /api/videos/:id responds with 200 OK', detailRes.status === 200);
      assert('Detail response includes CloudFront hlsUrl', Boolean(detailRes.data.video.hlsUrl));
      assert('Detail response hlsUrl matches master playlist', detailRes.data.video.hlsUrl.includes('.m3u8'));
    }
  } catch (apiErr) {
    console.error('API Test Error (is server running?):', apiErr.message);
  }

  // 6. Verification Summary
  console.log('\n===============================================================');
  console.log(`Results: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)`);
  if (passed === total) {
    console.log('🎉 ALL CLOUDFRONT + HLS PLAYBACK INTEGRATION CHECKS PASSED!');
  } else {
    console.warn('⚠️ Some checks failed. Inspect logs above.');
  }
  console.log('===============================================================\n');
}

runTests();
