const fetch = globalThis.fetch;

const BASE_URL = 'http://localhost:5000/api/videos';

async function testVideoDetailsIntegration() {
  console.log('=== [StreamCloud] Video Details + Player Integration Verification ===\n');

  try {
    // 1. Fetch catalog to get an existing video
    console.log('1. Fetching catalog list from GET /api/videos ...');
    const catalogRes = await fetch(`${BASE_URL}?limit=5`);
    const catalogData = await catalogRes.json();

    if (!catalogRes.ok || !catalogData.success || !catalogData.videos.length) {
      throw new Error(`Failed to fetch catalog list: ${JSON.stringify(catalogData)}`);
    }

    const testVideo = catalogData.videos[0];
    const videoId = testVideo._id;
    console.log(`✓ Fetched active video from catalog: "${testVideo.title}" (ID: ${videoId})`);

    // 2. Test GET /api/videos/:id
    console.log(`\n2. Testing GET /api/videos/${videoId} ...`);
    const detailsRes = await fetch(`${BASE_URL}/${videoId}`);
    const detailsData = await detailsRes.json();

    if (!detailsRes.ok || !detailsData.success || !detailsData.video) {
      throw new Error(`Failed to fetch video details: ${JSON.stringify(detailsData)}`);
    }

    const video = detailsData.video;
    console.log('✓ Successfully retrieved real video metadata:');
    console.log(`  - Title:       ${video.title}`);
    console.log(`  - Description: ${video.description.substring(0, 60)}...`);
    console.log(`  - Creator:     ${video.creatorId?.name} (${video.creatorId?.email})`);
    console.log(`  - Views:       ${video.views}`);
    console.log(`  - Duration:    ${video.duration}`);
    console.log(`  - Thumbnail:   ${video.thumbnailUrl}`);
    console.log(`  - Category:    ${video.categoryId?.name}`);
    console.log(`  - HLS Key:     ${video.hlsKey}`);
    console.log(`  - Status:      ${video.status}`);
    console.log(`  - Visibility:  ${video.visibility}`);

    if (!video.title || !video.creatorId || !video.thumbnailUrl || !video.duration) {
      throw new Error('Missing required fields in video metadata response');
    }

    // 3. Test POST /api/videos/:id/view (View Recording)
    console.log(`\n3. Testing POST /api/videos/${videoId}/view (View count increment) ...`);
    const initialViews = video.views;

    const view1Res = await fetch(`${BASE_URL}/${videoId}/view`, { method: 'POST' });
    const view1Data = await view1Res.json();

    if (!view1Res.ok || !view1Data.success || view1Data.views !== initialViews + 1) {
      throw new Error(`First view increment failed: expected ${initialViews + 1}, got ${view1Data.views}`);
    }
    console.log(`✓ View recorded: ${initialViews} -> ${view1Data.views}`);

    const view2Res = await fetch(`${BASE_URL}/${videoId}/view`, { method: 'POST' });
    const view2Data = await view2Res.json();

    if (!view2Res.ok || !view2Data.success || view2Data.views !== initialViews + 2) {
      throw new Error(`Second view increment failed: expected ${initialViews + 2}, got ${view2Data.views}`);
    }
    console.log(`✓ Second view recorded: ${view1Data.views} -> ${view2Data.views}`);

    // Verify persisted view count via fresh GET
    const verifyGetRes = await fetch(`${BASE_URL}/${videoId}`);
    const verifyGetData = await verifyGetRes.json();
    if (verifyGetData.video.views !== initialViews + 2) {
      throw new Error(`Persisted view verification failed: expected ${initialViews + 2}, got ${verifyGetData.video.views}`);
    }
    console.log(`✓ Verified persisted view count in database: ${verifyGetData.video.views}`);

    // 4. Test Error Handling: Invalid ID Format
    console.log('\n4. Testing GET /api/videos/invalid-id (Invalid ObjectId format) ...');
    const invalidIdRes = await fetch(`${BASE_URL}/invalid-format-id`);
    const invalidIdData = await invalidIdRes.json();

    if (invalidIdRes.status === 400 && !invalidIdData.success) {
      console.log(`✓ Correctly rejected invalid ID with 400 Bad Request: "${invalidIdData.message}"`);
    } else {
      throw new Error(`Expected 400 for invalid ID, got ${invalidIdRes.status}`);
    }

    // 5. Test Error Handling: Non-existent ObjectId
    console.log('\n5. Testing GET /api/videos/000000000000000000000000 (Non-existent ID) ...');
    const notFoundRes = await fetch(`${BASE_URL}/000000000000000000000000`);
    const notFoundData = await notFoundRes.json();

    if (notFoundRes.status === 404 && !notFoundData.success) {
      console.log(`✓ Correctly returned 404 Not Found for non-existent video: "${notFoundData.message}"`);
    } else {
      throw new Error(`Expected 404 for non-existent ID, got ${notFoundRes.status}`);
    }

    console.log('\n===============================================================');
    console.log('🎉 ALL VIDEO DETAILS & PLAYER INTEGRATION TESTS PASSED CLEANLY! 🎉');
    console.log('===============================================================');
  } catch (err) {
    console.error('\n✗ Integration test failed:', err);
    process.exit(1);
  }
}

testVideoDetailsIntegration();
