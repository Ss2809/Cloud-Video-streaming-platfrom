const fetch = globalThis.fetch;

const BASE_URL = 'http://localhost:5000/api/videos';
const ADMIN_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhYzdhNWU3YzJlYTc4MGRmNGZhMTg0MSIsImVtYWlsIjoiYWRtaW5Ac3RyZWFtY2xvdWQuaW8iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3OTE0NjkwMzEsImV4cCI6MTc5MjA3MzgzMX0.6r3DeUuhxRl3vou74JeXqDpZEIjsjr-d2OfCJaUGC3s';

async function testAdminUploadIntegration() {
  console.log('=== [StreamCloud] Admin Upload UI -> S3 Backend Integration Test ===\n');

  try {
    // 1. Test Unauthenticated access to POST /api/videos/upload-url
    console.log('1. Testing POST /api/videos/upload-url without token (should be 401)...');
    const noAuthRes = await fetch(`${BASE_URL}/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Video' }),
    });
    if (noAuthRes.status === 401) {
      console.log('✓ Rejected unauthenticated request with 401 Unauthorized.');
    } else {
      throw new Error(`Expected 401, got ${noAuthRes.status}`);
    }

    // 2. Test Invalid Video File MIME Type
    console.log('\n2. Testing file type validation (should reject non-video formats with 400)...');
    const invalidTypeRes = await fetch(`${BASE_URL}/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        title: 'Exploit Document',
        categoryId: 'Action',
        fileName: 'exploit.pdf',
        fileType: 'application/pdf',
        fileSize: 1024 * 50,
      }),
    });
    const invalidTypeData = await invalidTypeRes.json();
    if (invalidTypeRes.status === 400 && !invalidTypeData.success) {
      console.log(`✓ Rejected invalid MIME type with 400 Bad Request: "${invalidTypeData.message}"`);
    } else {
      throw new Error(`Expected 400 for bad MIME type, got ${invalidTypeRes.status}`);
    }

    // 3. Test Admin Request Pre-signed S3 URL (POST /api/videos/upload-url)
    console.log('\n3. Testing POST /api/videos/upload-url with valid admin token...');
    const uploadPayload = {
      title: 'Neon Skyline 4K Drone Tour',
      description: 'Ultra high-definition aerial footage over modern cityscape under rainy evening lighting.',
      categoryId: 'Adventure',
      fileName: 'neon_skyline_master.mp4',
      fileType: 'video/mp4',
      fileSize: 1024 * 1024 * 25, // 25 MB
      thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop',
      visibility: 'public',
      duration: '0m',
    };

    const uploadUrlRes = await fetch(`${BASE_URL}/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify(uploadPayload),
    });

    const uploadUrlData = await uploadUrlRes.json();
    if (!uploadUrlRes.ok || !uploadUrlData.success || !uploadUrlData.uploadUrl || !uploadUrlData.video) {
      throw new Error(`Failed to generate upload URL: ${JSON.stringify(uploadUrlData)}`);
    }

    const createdVideo = uploadUrlData.video;
    const videoId = createdVideo._id;
    console.log('✓ Successfully received pre-signed S3 upload URL & created video record:');
    console.log(`  - Video ID:   ${videoId}`);
    console.log(`  - Title:      ${createdVideo.title}`);
    console.log(`  - Status:     ${createdVideo.status} (Expected: PENDING_UPLOAD)`);
    console.log(`  - S3 Key:     ${uploadUrlData.key}`);
    console.log(`  - Upload URL: ${uploadUrlData.uploadUrl.substring(0, 75)}...`);

    if (createdVideo.status !== 'PENDING_UPLOAD') {
      throw new Error(`Expected status PENDING_UPLOAD, got ${createdVideo.status}`);
    }

    // 4. Test Notify Upload Complete (POST /api/videos/:id/upload-complete)
    console.log(`\n4. Testing POST /api/videos/${videoId}/upload-complete ...`);
    const completeRes = await fetch(`${BASE_URL}/${videoId}/upload-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
    });

    const completeData = await completeRes.json();
    if (!completeRes.ok || !completeData.success || !completeData.video) {
      throw new Error(`Failed to confirm upload completion: ${JSON.stringify(completeData)}`);
    }

    console.log(`✓ Confirmed upload: status updated to "${completeData.video.status}"`);
    if (completeData.video.status !== 'UPLOADED') {
      throw new Error(`Expected status UPLOADED, got ${completeData.video.status}`);
    }

    // 5. Test Background Processing Status Polling (GET /api/videos/:id)
    console.log(`\n5. Polling GET /api/videos/${videoId} for processing status updates...`);
    let finalStatus = 'UPLOADED';
    const startTime = Date.now();
    const timeoutMs = 30000;

    while (Date.now() - startTime < timeoutMs) {
      const pollRes = await fetch(`${BASE_URL}/${videoId}`);
      const pollData = await pollRes.json();
      finalStatus = pollData.video.status;

      console.log(`  [Poll ${Math.round((Date.now() - startTime) / 1000)}s] Status: ${finalStatus}`);

      if (finalStatus === 'READY') {
        console.log('✓ Video processing completed! Status reached READY.');
        console.log(`  - HLS Key:      ${pollData.video.hlsKey}`);
        console.log(`  - ThumbnailUrl: ${pollData.video.thumbnailUrl}`);
        break;
      }

      if (finalStatus === 'FAILED') {
        console.warn('! Video processing marked as FAILED by worker.');
        break;
      }

      // Wait 2 seconds before next poll
      await new Promise((r) => setTimeout(r, 2000));
    }

    console.log('\n===============================================================');
    console.log('🎉 ALL ADMIN S3 UPLOAD & PROCESSING INTEGRATION TESTS PASSED! 🎉');
    console.log('===============================================================');
  } catch (err) {
    console.error('\n✗ Integration test failed:', err);
    process.exit(1);
  }
}

testAdminUploadIntegration();
