require('dotenv').config();
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:5000/api/videos';

function generateToken(id, role = 'admin') {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'streamcloud_jwt_secret_key_secure_2026_super_safe',
    { expiresIn: '7d' }
  );
}

async function testVideoManagementIntegration() {
  console.log('=== [StreamCloud] Video Management Backend Integration Test ===\n');

  try {
    // 1. Fetch catalog to obtain an existing video and admin creator
    console.log('--- 1. Testing GET /api/videos (Public & Admin Catalog) ---');
    const catalogRes = await fetch(`${BASE_URL}?limit=10`);
    const catalogData = await catalogRes.json();

    if (!catalogRes.ok || !catalogData.success || !catalogData.videos.length) {
      throw new Error(`Failed to fetch catalog: ${JSON.stringify(catalogData)}`);
    }

    const testVideo = catalogData.videos[0];
    const videoId = testVideo._id || testVideo.id;
    const adminId = testVideo.creatorId?._id || testVideo.creatorId || '6ac7a5e7c2ea780df4fa1841';

    console.log(`✓ Retrieved active video: "${testVideo.title}" (ID: ${videoId})`);
    console.log(`✓ Total videos available: ${catalogData.total}, Page: ${catalogData.currentPage}/${catalogData.totalPages}`);

    const adminToken = generateToken(adminId, 'admin');
    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    };

    // Real regular user token for testing authorization guard
    const userToken = generateToken('6aa45c25bb5953158dd8ba38', 'user');
    const userHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    };

    // 2. Test GET /api/videos/:id
    console.log('\n--- 2. Testing GET /api/videos/:id ---');
    const detailsRes = await fetch(`${BASE_URL}/${videoId}`, { headers: adminHeaders });
    const detailsData = await detailsRes.json();
    if (!detailsRes.ok || !detailsData.success || !detailsData.video) {
      throw new Error(`Failed to fetch video details: ${JSON.stringify(detailsData)}`);
    }
    console.log(`✓ Successfully fetched details for: "${detailsData.video.title}"`);
    console.log(`  Status: ${detailsData.video.status}, Visibility: ${detailsData.video.visibility}, Views: ${detailsData.video.views}`);

    // 3. Test Admin-Only Protection on PUT: regular user should get 403 Forbidden
    console.log('\n--- 3. Testing PUT /api/videos/:id Authorization Guard (User Role) ---');
    const userPutRes = await fetch(`${BASE_URL}/${videoId}`, {
      method: 'PUT',
      headers: userHeaders,
      body: JSON.stringify({ title: 'Hacked Title' }),
    });
    console.log('Status:', userPutRes.status, '(Expected 403 Forbidden)');
    if (userPutRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for non-admin user, got ${userPutRes.status}`);
    }
    console.log('✓ Successfully blocked non-admin user from updating video.');

    // 4. Test PUT /api/videos/:id with Admin Token (Edit title, category, visibility)
    console.log('\n--- 4. Testing PUT /api/videos/:id (Edit Metadata & Visibility) ---');
    const originalTitle = testVideo.title;
    const updatedTitle = `${originalTitle} (Updated Edit)`;

    const putRes = await fetch(`${BASE_URL}/${videoId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        title: updatedTitle,
        categoryId: 'Action',
        visibility: 'private',
      }),
    });
    const putData = await putRes.json();
    console.log('Status:', putRes.status, 'Success:', putData.success, 'Msg:', putData.message);
    if (!putRes.ok || !putData.success || putData.video.title !== updatedTitle || putData.video.visibility !== 'private') {
      throw new Error(`PUT update failed: ${JSON.stringify(putData)}`);
    }
    console.log(`✓ Successfully updated title to: "${putData.video.title}"`);
    console.log(`✓ Successfully updated visibility to: "${putData.video.visibility}"`);

    // 5. Test Toggle Visibility back to public
    console.log('\n--- 5. Testing PUT /api/videos/:id (Toggle Visibility Back to Public) ---');
    const toggleRes = await fetch(`${BASE_URL}/${videoId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        title: originalTitle,
        visibility: 'public',
      }),
    });
    const toggleData = await toggleRes.json();
    if (!toggleRes.ok || toggleData.video.visibility !== 'public') {
      throw new Error(`Toggle visibility failed: ${JSON.stringify(toggleData)}`);
    }
    console.log(`✓ Reverted visibility back to: "${toggleData.video.visibility}" and restored title.`);

    // 6. Test Create temporary video then Delete it
    console.log('\n--- 6. Testing Temporary Video Creation for Delete Test ---');
    const createRes = await fetch(BASE_URL, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        title: 'Temporary Video for Delete Verification',
        description: 'Will be deleted in automated test',
        categoryId: 'Action',
        status: 'READY',
        visibility: 'private',
      }),
    });
    const createData = await createRes.json();
    if (!createRes.ok || !createData.success || !createData.video) {
      throw new Error(`Failed to create temp video: ${JSON.stringify(createData)}`);
    }
    const tempVideoId = createData.video._id;
    console.log(`✓ Created temporary video ID: ${tempVideoId}`);

    // 7. Test Admin-Only Protection on DELETE: regular user should get 403 Forbidden
    console.log('\n--- 7. Testing DELETE /api/videos/:id Authorization Guard (User Role) ---');
    const userDelRes = await fetch(`${BASE_URL}/${tempVideoId}`, {
      method: 'DELETE',
      headers: userHeaders,
    });
    console.log('Status:', userDelRes.status, '(Expected 403 Forbidden)');
    if (userDelRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for non-admin user on DELETE, got ${userDelRes.status}`);
    }
    console.log('✓ Successfully blocked non-admin user from deleting video.');

    // 8. Test DELETE /api/videos/:id with Admin Token
    console.log('\n--- 8. Testing DELETE /api/videos/:id with Admin Token ---');
    const adminDelRes = await fetch(`${BASE_URL}/${tempVideoId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    const adminDelData = await adminDelRes.json();
    console.log('Status:', adminDelRes.status, 'Success:', adminDelData.success, 'Msg:', adminDelData.message);
    if (!adminDelRes.ok || !adminDelData.success) {
      throw new Error(`Delete video failed: ${JSON.stringify(adminDelData)}`);
    }
    console.log('✓ Successfully deleted temporary video with Admin privileges.');

    // 9. Confirm video is gone (GET /api/videos/:id -> 404)
    console.log('\n--- 9. Verifying Deleted Video is Removed (GET /api/videos/:id) ---');
    const checkDeletedRes = await fetch(`${BASE_URL}/${tempVideoId}`, { headers: adminHeaders });
    console.log('Status:', checkDeletedRes.status, '(Expected 404 Not Found)');
    if (checkDeletedRes.status !== 404) {
      throw new Error(`Expected 404 Not Found for deleted video, got ${checkDeletedRes.status}`);
    }
    console.log('✓ Confirmed video no longer exists in database.');

    console.log('\n🎉 ALL 9 VIDEO MANAGEMENT INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('\n❌ Test Error:', err.message);
    process.exitCode = 1;
  }
}

testVideoManagementIntegration();
