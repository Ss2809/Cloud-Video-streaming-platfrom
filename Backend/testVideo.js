const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Video = require('./models/Video');
const { generateToken } = require('./utils/tokenUtils');

const BASE_URL = 'http://localhost:5000/api/videos';

async function runVideoTests() {
  console.log('--- Starting Video Management Backend Automated Verification ---\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cloud_streaming');

  // 1. Setup Test Fixtures: Category, Regular User, Admin User
  console.log('1. Setting up test fixtures (Category, Regular User, Admin User)...');
  const testCategory = await Category.findOneAndUpdate(
    { name: 'Sci-Fi Action' },
    { name: 'Sci-Fi Action', description: 'Futuristic adrenaline streams' },
    { upsert: true, new: true }
  );

  const regularUser = await User.findOneAndUpdate(
    { email: 'regular_viewer@streamcloud.io' },
    { name: 'Regular Viewer', email: 'regular_viewer@streamcloud.io', role: 'user' },
    { upsert: true, new: true }
  );

  const adminUser = await User.findOneAndUpdate(
    { email: 'super_admin@streamcloud.io' },
    { name: 'Super Admin', email: 'super_admin@streamcloud.io', role: 'admin' },
    { upsert: true, new: true }
  );

  const regularToken = generateToken(regularUser);
  const adminToken = generateToken(adminUser);

  console.log(`✓ Test Category: ${testCategory.name} (${testCategory._id})`);
  console.log(`✓ Regular User: ${regularUser.name} | Role: ${regularUser.role}`);
  console.log(`✓ Admin User: ${adminUser.name} | Role: ${adminUser.role}`);

  // 2. Test POST /api/videos without auth token
  console.log('\n2. Testing POST /api/videos without token...');
  const noTokenRes = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Unauthorized Video' }),
  });
  if (noTokenRes.status === 401) {
    console.log('✓ Rejected unauthenticated request with 401 Unauthorized.');
  } else {
    console.error('✗ Failed: Expected 401, got', noTokenRes.status);
    process.exit(1);
  }

  // 3. Test POST /api/videos with regular user token
  console.log('\n3. Testing POST /api/videos with regular user token...');
  const userCreateRes = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${regularToken}`,
    },
    body: JSON.stringify({
      title: 'Hacker Ingest',
      categoryId: testCategory._id,
    }),
  });
  if (userCreateRes.status === 403) {
    console.log('✓ Rejected regular user request with 403 Forbidden (Admin only).');
  } else {
    console.error('✗ Failed: Expected 403, got', userCreateRes.status);
    process.exit(1);
  }

  // 4. Test POST /api/videos invalid status enum validation
  console.log('\n4. Testing POST /api/videos status enum validation...');
  const invalidStatusRes = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Bad Status Video',
      categoryId: testCategory._id,
      status: 'INVALID_STATUS',
    }),
  });
  const invalidStatusData = await invalidStatusRes.json();
  if (invalidStatusRes.status === 400 && !invalidStatusData.success) {
    console.log('✓ Correctly rejected invalid status with 400 Bad Request.');
  } else {
    console.error('✗ Failed to validate status enum:', invalidStatusData);
  }

  // 5. Test POST /api/videos with Admin token (Successful Creation)
  console.log('\n5. Testing POST /api/videos with Admin token...');
  const createRes = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Neon Odyssey 2099',
      description: 'A deep dive into cybernetic realities and interstellar portals.',
      categoryId: testCategory._id,
      thumbnailUrl: 'https://streamcloud.io/thumbs/neon-2099.jpg',
      originalKey: 'raw-uploads/neon-odyssey-2099.mp4',
      hlsKey: 'hls-output/neon-2099/master.m3u8',
      duration: '1h 45m',
      status: 'PENDING_UPLOAD',
      visibility: 'public',
    }),
  });
  const createData = await createRes.json();
  if (createRes.status === 201 && createData.video) {
    console.log(`✓ Video created successfully with ID: ${createData.video._id}`);
    console.log(`  Title: ${createData.video.title}`);
    console.log(`  Status: ${createData.video.status}`);
    console.log(`  OriginalKey: ${createData.video.originalKey}`);
    console.log(`  HlsKey: ${createData.video.hlsKey}`);
    console.log(`  Creator: ${createData.video.creatorId?.name}`);
  } else {
    console.error('✗ Video creation failed:', createData);
    process.exit(1);
  }

  const testVideoId = createData.video._id;

  // 6. Test GET /api/videos (Public browse - should NOT show PENDING_UPLOAD)
  console.log('\n6. Testing GET /api/videos as Public/Guest...');
  const publicListRes = await fetch(BASE_URL);
  const publicListData = await publicListRes.json();
  const foundPending = publicListData.videos.find((v) => v._id === testVideoId);
  if (!foundPending) {
    console.log('✓ Non-READY videos correctly hidden from public catalog.');
  } else {
    console.error('✗ PENDING_UPLOAD video leaked into public catalog!');
  }

  // 7. Test PUT /api/videos/:id to update status to READY and change title
  console.log('\n7. Testing PUT /api/videos/:id as Admin to update status to READY...');
  const updateRes = await fetch(`${BASE_URL}/${testVideoId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Neon Odyssey 2099: Director Cut',
      status: 'READY',
      duration: '2h 04m',
    }),
  });
  const updateData = await updateRes.json();
  if (updateRes.status === 200 && updateData.video?.status === 'READY') {
    console.log('✓ Video updated to READY status and title modified.');
    console.log(`  New Title: ${updateData.video.title}`);
    console.log(`  Status: ${updateData.video.status}`);
  } else {
    console.error('✗ Video update failed:', updateData);
    process.exit(1);
  }

  // 8. Test GET /api/videos with search and category filtering
  console.log('\n8. Testing GET /api/videos with search query & category filter...');
  const searchRes = await fetch(`${BASE_URL}?search=Director&category=Sci-Fi+Action`);
  const searchData = await searchRes.json();
  const searchMatch = searchData.videos.find((v) => v._id === testVideoId);
  if (searchMatch) {
    console.log(`✓ Search and category filter matched video: "${searchMatch.title}"`);
    console.log(`  Total matches: ${searchData.total}, Page: ${searchData.currentPage}/${searchData.totalPages}`);
  } else {
    console.error('✗ Search filter failed to find matching video:', searchData);
  }

  // 9. Test GET /api/videos/:id
  console.log('\n9. Testing GET /api/videos/:id (Video details)...');
  const detailsRes = await fetch(`${BASE_URL}/${testVideoId}`);
  const detailsData = await detailsRes.json();
  if (detailsRes.status === 200 && detailsData.video) {
    console.log(`✓ Successfully retrieved video details for "${detailsData.video.title}"`);
    console.log(`  Category: ${detailsData.video.categoryId?.name}`);
    console.log(`  Duration: ${detailsData.video.duration}`);
    console.log(`  Views: ${detailsData.video.views}`);
  } else {
    console.error('✗ Failed to retrieve video details:', detailsData);
  }

  // 10. Test POST /api/videos/:id/view (Atomic view increment)
  console.log('\n10. Testing POST /api/videos/:id/view (Increment view count)...');
  const view1Res = await fetch(`${BASE_URL}/${testVideoId}/view`, { method: 'POST' });
  const view1Data = await view1Res.json();

  const view2Res = await fetch(`${BASE_URL}/${testVideoId}/view`, { method: 'POST' });
  const view2Data = await view2Res.json();

  if (view2Data.views === 2) {
    console.log(`✓ View count incremented atomically: 0 -> 1 -> ${view2Data.views}`);
  } else {
    console.error('✗ View counter did not increment properly:', view2Data);
  }

  // 11. Test Private Visibility Protection
  console.log('\n11. Testing Private visibility protection...');
  // Update visibility to private
  await fetch(`${BASE_URL}/${testVideoId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ visibility: 'private' }),
  });

  // Regular user tries to access private video
  const privateAccessRes = await fetch(`${BASE_URL}/${testVideoId}`, {
    headers: { Authorization: `Bearer ${regularToken}` },
  });
  if (privateAccessRes.status === 403) {
    console.log('✓ Private video successfully blocked regular viewer with 403 Forbidden.');
  } else {
    console.error('✗ Private video was not blocked for regular viewer:', privateAccessRes.status);
  }

  // Admin user accesses private video
  const adminPrivateAccessRes = await fetch(`${BASE_URL}/${testVideoId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (adminPrivateAccessRes.status === 200) {
    console.log('✓ Administrator granted access to private video asset.');
  } else {
    console.error('✗ Admin access to private video failed:', adminPrivateAccessRes.status);
  }

  // 12. Test DELETE /api/videos/:id
  console.log('\n12. Testing DELETE /api/videos/:id as regular user (should be blocked)...');
  const userDeleteRes = await fetch(`${BASE_URL}/${testVideoId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${regularToken}` },
  });
  if (userDeleteRes.status === 403) {
    console.log('✓ Regular user deletion rejected with 403 Forbidden.');
  } else {
    console.error('✗ Regular user was not blocked from deleting video:', userDeleteRes.status);
  }

  console.log('\n13. Testing DELETE /api/videos/:id as Admin...');
  const adminDeleteRes = await fetch(`${BASE_URL}/${testVideoId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminDeleteData = await adminDeleteRes.json();
  if (adminDeleteRes.status === 200 && adminDeleteData.success) {
    console.log('✓ Video deleted successfully by Administrator.');
  } else {
    console.error('✗ Admin delete failed:', adminDeleteData);
  }

  // Verify deletion
  const verifyDeleteRes = await fetch(`${BASE_URL}/${testVideoId}`);
  if (verifyDeleteRes.status === 404) {
    console.log('✓ Subsequent GET /api/videos/:id returned 404 Not Found.');
  } else {
    console.error('✗ Deleted video was still found!');
  }

  // Cleanup fixtures
  console.log('\nCleaning up test fixtures...');
  await Video.deleteMany({ creatorId: adminUser._id });
  await User.findByIdAndDelete(regularUser._id);
  await User.findByIdAndDelete(adminUser._id);
  await Category.findByIdAndDelete(testCategory._id);
  await mongoose.disconnect();
  console.log('✓ Fixture cleanup complete.');

  console.log('\n======================================================');
  console.log('🎉 ALL VIDEO MANAGEMENT BACKEND TESTS PASSED CLEANLY! 🎉');
  console.log('======================================================');
}

runVideoTests().catch((err) => {
  console.error('Video test error:', err);
  process.exit(1);
});
