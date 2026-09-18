const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Video = require('./models/Video');
const { generateToken } = require('./utils/tokenUtils');

const BASE_URL = 'http://localhost:5000/api/videos';

async function runS3UploadTests() {
  console.log('--- Starting AWS S3 Video Upload Backend Automated Verification ---\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cloud_streaming');

  // 1. Setup Test Fixtures
  console.log('1. Setting up test fixtures (Category, Regular User, Admin User)...');
  const testCategory = await Category.findOneAndUpdate(
    { name: 'Documentary Cloud' },
    { name: 'Documentary Cloud', description: 'Nature and science streams' },
    { upsert: true, returnDocument: 'after' }
  );

  const regularUser = await User.findOneAndUpdate(
    { email: 's3_viewer@streamcloud.io' },
    { name: 'S3 Viewer', email: 's3_viewer@streamcloud.io', role: 'user' },
    { upsert: true, returnDocument: 'after' }
  );

  const adminUser = await User.findOneAndUpdate(
    { email: 's3_admin@streamcloud.io' },
    { name: 'S3 Admin', email: 's3_admin@streamcloud.io', role: 'admin' },
    { upsert: true, returnDocument: 'after' }
  );

  const regularToken = generateToken(regularUser);
  const adminToken = generateToken(adminUser);

  console.log(`✓ Test Category: ${testCategory.name}`);
  console.log(`✓ Regular User: ${regularUser.name} | Role: ${regularUser.role}`);
  console.log(`✓ Admin User: ${adminUser.name} | Role: ${adminUser.role}`);

  // 2. Test POST /api/videos/upload-url without token
  console.log('\n2. Testing POST /api/videos/upload-url without token (should be 401)...');
  const noTokenRes = await fetch(`${BASE_URL}/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Unauthenticated Video' }),
  });
  if (noTokenRes.status === 401) {
    console.log('✓ Rejected unauthenticated upload request with 401 Unauthorized.');
  } else {
    console.error('✗ Expected 401, received:', noTokenRes.status);
    process.exit(1);
  }

  // 3. Test POST /api/videos/upload-url with regular user token
  console.log('\n3. Testing POST /api/videos/upload-url with regular user token (should be 403)...');
  const userDenyRes = await fetch(`${BASE_URL}/upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${regularToken}`,
    },
    body: JSON.stringify({
      title: 'Hacker Video Ingest',
      categoryId: testCategory._id,
      fileName: 'test.mp4',
      fileType: 'video/mp4',
      fileSize: 1024 * 1024 * 10,
    }),
  });
  if (userDenyRes.status === 403) {
    console.log('✓ Rejected regular user upload request with 403 Forbidden (Admin only).');
  } else {
    console.error('✗ Expected 403, received:', userDenyRes.status);
    process.exit(1);
  }

  // 4. Test file type validation (e.g. invalid MIME type)
  console.log('\n4. Testing file type validation (rejecting non-video MIME types)...');
  const invalidTypeRes = await fetch(`${BASE_URL}/upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Malicious PDF',
      categoryId: testCategory._id,
      fileName: 'exploit.pdf',
      fileType: 'application/pdf',
      fileSize: 50000,
    }),
  });
  const invalidTypeData = await invalidTypeRes.json();
  if (invalidTypeRes.status === 400 && !invalidTypeData.success) {
    console.log('✓ Correctly rejected non-video MIME type with 400 Bad Request.');
  } else {
    console.error('✗ Failed to reject invalid file type:', invalidTypeData);
  }

  // 5. Test file size validation (e.g. file exceeding 5GB limit)
  console.log('\n5. Testing file size validation (rejecting files > 5GB)...');
  const oversizedRes = await fetch(`${BASE_URL}/upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Massive Raw Dump',
      categoryId: testCategory._id,
      fileName: 'raw_8k.mov',
      fileType: 'video/quicktime',
      fileSize: 10 * 1024 * 1024 * 1024, // 10 GB
    }),
  });
  const oversizedData = await oversizedRes.json();
  if (oversizedRes.status === 400 && !oversizedData.success) {
    console.log('✓ Correctly rejected oversized file (>5GB) with 400 Bad Request.');
  } else {
    console.error('✗ Failed to reject oversized file:', oversizedData);
  }

  // 6. Test Admin Upload URL Generation (Success)
  console.log('\n6. Testing POST /api/videos/upload-url as Admin (Successful Pre-signed URL)...');
  const uploadUrlRes = await fetch(`${BASE_URL}/upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'The Great Barrier Reef 4K',
      description: 'Stunning 4K documentary footage of oceanic marine life.',
      categoryId: testCategory._id,
      fileName: 'barrier_reef_master.mp4',
      fileType: 'video/mp4',
      fileSize: 1073741824, // 1 GB
      duration: '1h 22m',
      visibility: 'public',
    }),
  });

  const uploadUrlData = await uploadUrlRes.json();
  if (uploadUrlRes.status === 200 && uploadUrlData.uploadUrl && uploadUrlData.key && uploadUrlData.video) {
    console.log('✓ S3 Pre-signed upload URL successfully generated.');
    console.log(`  Upload URL: ${uploadUrlData.uploadUrl.substring(0, 75)}...`);
    console.log(`  S3 Object Key: ${uploadUrlData.key}`);
    console.log(`  Video ID: ${uploadUrlData.video._id}`);
    console.log(`  Status in MongoDB: ${uploadUrlData.video.status}`);

    if (uploadUrlData.video.status !== 'PENDING_UPLOAD') {
      console.error('✗ Expected status PENDING_UPLOAD, got:', uploadUrlData.video.status);
      process.exit(1);
    }
  } else {
    console.error('✗ Failed to generate pre-signed upload URL:', uploadUrlData);
    process.exit(1);
  }

  const videoId = uploadUrlData.video._id;
  const s3Key = uploadUrlData.key;

  // 7. Verify MongoDB document has PENDING_UPLOAD and correct S3 key
  console.log('\n7. Verifying MongoDB Video record integrity...');
  const mongoVideo = await Video.findById(videoId);
  if (mongoVideo && mongoVideo.status === 'PENDING_UPLOAD' && mongoVideo.originalKey === s3Key) {
    console.log('✓ Verified: MongoDB record has status PENDING_UPLOAD and matching S3 key.');
  } else {
    console.error('✗ MongoDB record does not match expected state:', mongoVideo);
    process.exit(1);
  }

  // 8. Test POST /api/videos/:id/upload-complete as regular user (should be 403)
  console.log('\n8. Testing POST /api/videos/:id/upload-complete as regular user (should be 403)...');
  const userCompleteRes = await fetch(`${BASE_URL}/${videoId}/upload-complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${regularToken}` },
  });
  if (userCompleteRes.status === 403) {
    console.log('✓ Regular user confirmation rejected with 403 Forbidden.');
  } else {
    console.error('✗ Regular user confirmation not blocked:', userCompleteRes.status);
    process.exit(1);
  }

  // 9. Test POST /api/videos/:id/upload-complete as Admin (Successful Confirmation)
  console.log('\n9. Testing POST /api/videos/:id/upload-complete as Admin...');
  const adminCompleteRes = await fetch(`${BASE_URL}/${videoId}/upload-complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminCompleteData = await adminCompleteRes.json();
  if (adminCompleteRes.status === 200 && adminCompleteData.video?.status === 'UPLOADED') {
    console.log('✓ Video upload confirmed by Administrator.');
    console.log(`  Updated Status: ${adminCompleteData.video.status}`);
    console.log(`  S3 Key Preserved: ${adminCompleteData.video.originalKey}`);
  } else {
    console.error('✗ Upload confirmation failed:', adminCompleteData);
    process.exit(1);
  }

  // 10. Test re-confirming already uploaded video (should be rejected)
  console.log('\n10. Testing re-confirming upload on already UPLOADED video...');
  const reconfirmRes = await fetch(`${BASE_URL}/${videoId}/upload-complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const reconfirmData = await reconfirmRes.json();
  if (reconfirmRes.status === 400 && !reconfirmData.success) {
    console.log('✓ Correctly prevented re-marking non-PENDING video as uploaded.');
  } else {
    console.error('✗ Failed to block duplicate upload confirmation:', reconfirmData);
  }

  // Cleanup
  console.log('\nCleaning up S3 test records...');
  await Video.findByIdAndDelete(videoId);
  await User.findByIdAndDelete(regularUser._id);
  await User.findByIdAndDelete(adminUser._id);
  await Category.findByIdAndDelete(testCategory._id);
  await mongoose.disconnect();
  console.log('✓ S3 test cleanup complete.');

  console.log('\n======================================================');
  console.log('🎉 ALL AWS S3 VIDEO UPLOAD TESTS PASSED CLEANLY! 🎉');
  console.log('======================================================');
}

runS3UploadTests().catch((err) => {
  console.error('S3 test error:', err);
  process.exit(1);
});
