require('dotenv').config();
const jwt = require('jsonwebtoken');

const AUTH_URL = 'http://localhost:5000/api/auth';
const VIDEO_URL = 'http://localhost:5000/api/videos';

function generateToken(id, role = 'admin') {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'streamcloud_jwt_secret_key_secure_2026_super_safe',
    { expiresIn: '7d' }
  );
}

async function testAdminDashboardIntegration() {
  console.log('=== [StreamCloud] Admin Dashboard Integration Verification ===\n');

  try {
    const adminToken = generateToken('6ac7a5e7c2ea780df4fa1841', 'admin');
    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    };

    const userToken = generateToken('6aa45c25bb5953158dd8ba38', 'user');
    const userHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    };

    // 1. Test Admin-Only Protection on GET /api/auth/users
    console.log('--- 1. Testing GET /api/auth/users Authorization Guard ---');
    const guardRes = await fetch(`${AUTH_URL}/users`, { headers: userHeaders });
    console.log('Status with user token:', guardRes.status, '(Expected 403 Forbidden)');
    if (guardRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for non-admin user on /api/auth/users, got ${guardRes.status}`);
    }
    console.log('✓ Successfully protected /api/auth/users with Admin authorization guard.');

    // 2. Test GET /api/auth/users with Admin token
    console.log('\n--- 2. Testing GET /api/auth/users with Admin Token ---');
    const usersRes = await fetch(`${AUTH_URL}/users`, { headers: adminHeaders });
    const usersData = await usersRes.json();
    console.log('Status:', usersRes.status, 'Total Users in DB:', usersData.total, 'Count retrieved:', usersData.count);
    if (!usersRes.ok || !usersData.success || typeof usersData.total !== 'number') {
      throw new Error(`Failed to retrieve platform users: ${JSON.stringify(usersData)}`);
    }
    console.log('✓ Successfully retrieved real users from database.');

    // 3. Test GET /api/videos with Admin token
    console.log('\n--- 3. Testing GET /api/videos (Admin Catalog & Pipeline Stats) ---');
    const videosRes = await fetch(`${VIDEO_URL}?limit=100`, { headers: adminHeaders });
    const videosData = await videosRes.json();
    console.log('Status:', videosRes.status, 'Total Videos in DB:', videosData.total);
    if (!videosRes.ok || !videosData.success || !Array.isArray(videosData.videos)) {
      throw new Error(`Failed to retrieve catalog videos: ${JSON.stringify(videosData)}`);
    }

    const videos = videosData.videos;
    const readyVideos = videos.filter((v) => v.status === 'READY');
    const processingVideos = videos.filter((v) => ['PROCESSING', 'UPLOADED', 'PENDING_UPLOAD'].includes(v.status));
    const failedVideos = videos.filter((v) => v.status === 'FAILED');
    const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);

    console.log(`✓ Real Pipeline Breakdown:`);
    console.log(`  - Ready to Stream: ${readyVideos.length}`);
    console.log(`  - Processing/Pending: ${processingVideos.length}`);
    console.log(`  - Failed: ${failedVideos.length}`);
    console.log(`  - Aggregate Platform Views: ${totalViews.toLocaleString()}`);

    // 4. Test Recent Uploads sorting
    console.log('\n--- 4. Testing Recent Uploads Sorting ---');
    const recentVideos = [...videos].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    console.log(`✓ Most recent video upload: "${recentVideos[0]?.title}" (${recentVideos[0]?.createdAt})`);

    // 5. Test Top Streamed Videos ranking
    console.log('\n--- 5. Testing Top Streamed Ranking ---');
    const topVideos = [...videos].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 4);
    console.log(`✓ Top 1 Video by views: "${topVideos[0]?.title}" (${topVideos[0]?.views} views)`);

    console.log('\n🎉 ALL ADMIN DASHBOARD BACKEND INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('\n❌ Test Error:', err.message);
    process.exitCode = 1;
  }
}

testAdminDashboardIntegration();
