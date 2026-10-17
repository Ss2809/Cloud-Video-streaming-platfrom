require('dotenv').config();
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:5000/api';

function generateToken(id) {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'streamcloud_jwt_secret_key_secure_2026_super_safe',
    { expiresIn: '7d' }
  );
}

async function testHistoryAndWatchlist() {
  console.log('=== [StreamCloud] History & Watchlist Integration Test ===\n');

  try {
    // 1. Get an existing user by querying /api/auth/login or seeding
    // First, let's login or send OTP or use an admin token
    // We can fetch videos from /api/videos to get creator/video IDs
    const videosRes = await fetch(`${BASE_URL}/videos?limit=5`);
    const videosData = await videosRes.json();

    if (!videosData.success || !videosData.videos.length) {
      throw new Error('No videos found in catalog. Run seedVideos.js first.');
    }

    const testVideo = videosData.videos[0];
    const videoId = testVideo._id || testVideo.id;
    console.log(`✓ Retrieved catalog video: "${testVideo.title}" (ID: ${videoId})`);

    // Let's obtain a valid user token via /api/auth/register or /api/auth/login or direct token
    // In our seed, admin user is admin@streamcloud.io. Or we can register/login with OTP
    // Let's send OTP for admin@streamcloud.io
    const otpRes = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'historytest@streamcloud.io', purpose: 'login' }),
    });
    // In dev mode, console logs OTP or verifyOtp
    // Alternatively, we can register user:
    let token = '';
    const regSendOtp = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'historyuser@streamcloud.io', purpose: 'register' }),
    });
    const regSendOtpData = await regSendOtp.json();
    console.log('Send OTP response:', regSendOtpData.message);

    // If test environment or otp logged, or we can use admin creatorId if creatorId is populated
    const creatorId = testVideo.creatorId?._id || testVideo.creatorId || testVideo.creator;
    // Generate valid JWT directly using JWT_SECRET
    token = generateToken(creatorId);

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // Verify /api/auth/me works with this token
    const meRes = await fetch(`${BASE_URL}/auth/me`, { headers: authHeaders });
    const meData = await meRes.json();
    console.log(`✓ Authenticated as user: "${meData.user?.name}" (${meData.user?._id})`);

    // --- 1. POST /api/history ---
    console.log('\n--- 1. Testing POST /api/history ---');
    const postHistRes = await fetch(`${BASE_URL}/history`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        videoId: videoId,
        progressPercent: 72,
        watchedDuration: '1h 45m',
      }),
    });
    const postHistData = await postHistRes.json();
    console.log('Status:', postHistRes.status, 'Success:', postHistData.success);
    console.log('Saved History Record:', {
      videoId: postHistData.history?.videoId?._id || postHistData.history?.videoId,
      progressPercent: postHistData.history?.progressPercent,
      watchedDuration: postHistData.history?.watchedDuration,
    });
    if (!postHistData.success || postHistData.history?.progressPercent !== 72) {
      throw new Error('Failed to save history playback progress');
    }

    // --- 2. GET /api/history ---
    console.log('\n--- 2. Testing GET /api/history ---');
    const getHistRes = await fetch(`${BASE_URL}/history`, { headers: authHeaders });
    const getHistData = await getHistRes.json();
    console.log('Status:', getHistRes.status, 'Count:', getHistData.count);
    const histItem = getHistData.history.find(h => (h.videoId?._id || h.videoId?.id) === videoId);
    if (!histItem) {
      throw new Error('History list did not include the saved video');
    }
    console.log('✓ Found item in history:', histItem.videoId?.title, `(${histItem.progressPercent}%)`);

    // --- 3. POST /api/watchlist/:videoId ---
    console.log('\n--- 3. Testing POST /api/watchlist/:videoId ---');
    const addWlRes = await fetch(`${BASE_URL}/watchlist/${videoId}`, {
      method: 'POST',
      headers: authHeaders,
    });
    const addWlData = await addWlRes.json();
    console.log('Status:', addWlRes.status, 'Success:', addWlData.success, 'Msg:', addWlData.message);
    if (!addWlData.success) {
      throw new Error('Failed to add video to watchlist');
    }

    // --- 4. GET /api/watchlist ---
    console.log('\n--- 4. Testing GET /api/watchlist ---');
    const getWlRes = await fetch(`${BASE_URL}/watchlist`, { headers: authHeaders });
    const getWlData = await getWlRes.json();
    console.log('Status:', getWlRes.status, 'Count:', getWlData.count);
    const wlFound = getWlData.watchlist.find(w => (w.videoId?._id || w.videoId?.id) === videoId);
    if (!wlFound) {
      throw new Error('Watchlist did not include the added video');
    }
    console.log('✓ Found item in watchlist:', wlFound.videoId?.title);

    // --- 5. GET /api/watchlist/check/:videoId ---
    console.log('\n--- 5. Testing GET /api/watchlist/check/:videoId ---');
    const checkWlRes = await fetch(`${BASE_URL}/watchlist/check/${videoId}`, { headers: authHeaders });
    const checkWlData = await checkWlRes.json();
    console.log('Status:', checkWlRes.status, 'inWatchlist:', checkWlData.inWatchlist);
    if (!checkWlData.success || checkWlData.inWatchlist !== true) {
      throw new Error('Check watchlist returned false for existing item');
    }

    // --- 6. DELETE /api/watchlist/:videoId ---
    console.log('\n--- 6. Testing DELETE /api/watchlist/:videoId ---');
    const delWlRes = await fetch(`${BASE_URL}/watchlist/${videoId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const delWlData = await delWlRes.json();
    console.log('Status:', delWlRes.status, 'Success:', delWlData.success, 'Msg:', delWlData.message);
    if (!delWlData.success) {
      throw new Error('Failed to remove video from watchlist');
    }

    // Check again
    const checkAfterDel = await fetch(`${BASE_URL}/watchlist/check/${videoId}`, { headers: authHeaders });
    const checkAfterDelData = await checkAfterDel.json();
    console.log('After delete inWatchlist:', checkAfterDelData.inWatchlist);
    if (checkAfterDelData.inWatchlist !== false) {
      throw new Error('Video still reported in watchlist after deletion');
    }

    // --- 7. DELETE /api/history/:videoId ---
    console.log('\n--- 7. Testing DELETE /api/history/:videoId ---');
    const delHistRes = await fetch(`${BASE_URL}/history/${videoId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const delHistData = await delHistRes.json();
    console.log('Status:', delHistRes.status, 'Success:', delHistData.success, 'Msg:', delHistData.message);
    if (!delHistData.success) {
      throw new Error('Failed to remove video from history');
    }

    console.log('\n🎉 ALL 7 INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('\n❌ Test Error:', err.message);
    process.exitCode = 1;
  }
}

testHistoryAndWatchlist();
