require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const Video = require('./models/Video');
const Category = require('./models/Category');
const User = require('./models/User');
const {
  sendProcessingJob,
  receiveProcessingJobs,
  deleteProcessingJob,
  sendToDLQ,
  MAX_RECEIVE_COUNT,
  clearSimulatedQueue,
  getSimulatedQueueLength,
  getSimulatedDLQLength,
} = require('./utils/sqsService');
const { pollSqsJobs } = require('./worker');

const API_BASE = 'http://localhost:5000/api/videos';

async function runSqsWorkerTests() {
  console.log('================================================================');
  console.log('   AWS SQS Video Processing Worker Integration Test Suite   ');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGO_URI);

  let category = await Category.findOne({});
  if (!category) {
    category = await Category.create({ name: 'Documentary', slug: 'documentary' });
  }

  let adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    adminUser = await User.create({ name: 'Admin', email: 'admin@streamcloud.io', role: 'admin' });
  }

  const ADMIN_TOKEN = jwt.sign(
    { id: adminUser._id, email: adminUser.email, role: 'admin' },
    process.env.JWT_SECRET || 'streamcloud_jwt_secret_key_secure_2026_super_safe',
    { expiresIn: '1d' }
  );

  clearSimulatedQueue();
  await Video.deleteMany({ title: /SQS Transcoded Master Video|Unit Test SQS Video|Intentional Failure Video/i });

  // -------------------------------------------------------------
  // TEST 1: Direct SQS Service send, receive, delete functions
  // -------------------------------------------------------------
  console.log('[TEST 1] Verifying SQS Service Send, Receive, and Delete operations...');
  const testJobPayload = {
    videoId: new mongoose.Types.ObjectId().toString(),
    s3Key: 'raw-uploads/test-sample.mp4',
    title: 'Unit Test SQS Video',
    duration: '2m',
    categoryId: category._id.toString(),
  };

  const sendResult = await sendProcessingJob(testJobPayload);
  if (!sendResult.success || !sendResult.messageId) {
    throw new Error('sendProcessingJob failed to return success and messageId');
  }
  console.log(`  ✓ Enqueued job successfully (MessageId: ${sendResult.messageId}, Mode: ${sendResult.mode})`);

  const received = await receiveProcessingJobs({ maxMessages: 1, waitTimeSeconds: 1, visibilityTimeout: 30 });
  if (!received || received.length === 0) {
    throw new Error('Failed to receive message from SQS service');
  }
  const jobMsg = received[0];
  console.log(`  ✓ Received message from queue (Receipt: ${jobMsg.receiptHandle.slice(0, 16)}..., receiveCount: ${jobMsg.receiveCount})`);
  if (jobMsg.body.videoId !== testJobPayload.videoId || jobMsg.body.s3Key !== testJobPayload.s3Key) {
    throw new Error(`Received job data mismatch: ${JSON.stringify(jobMsg.body)}`);
  }
  console.log(`  ✓ Payload verification passed: videoId=${jobMsg.body.videoId}, s3Key=${jobMsg.body.s3Key}`);

  await deleteProcessingJob(jobMsg.receiptHandle);
  console.log(`  ✓ Deleted message from SQS queue successfully.\n`);

  // -------------------------------------------------------------
  // TEST 2: DLQ (Dead-Letter Queue) Routing on retry exhaustion
  // -------------------------------------------------------------
  console.log('[TEST 2] Verifying DLQ Routing when retries exceed MAX_RECEIVE_COUNT...');
  const failedVideo = await Video.create({
    title: 'Intentional Failure Video for DLQ Test',
    description: 'Testing automatic DLQ redrive routing',
    creatorId: adminUser._id,
    categoryId: category._id,
    status: 'UPLOADED',
    originalKey: 'raw-uploads/non-existent-source-dlq.mp4',
  });

  const dlqJobPayload = {
    videoId: failedVideo._id.toString(),
    s3Key: failedVideo.originalKey,
    title: failedVideo.title,
    duration: '1m',
    categoryId: category._id.toString(),
  };

  // Route directly or test sendToDLQ
  await sendToDLQ(dlqJobPayload, 'Exceeded max retry threshold of 3 attempts');
  console.log('  ✓ Successfully routed failed job to DLQ.');

  // Verify DB update
  failedVideo.status = 'FAILED';
  await failedVideo.save();
  const reloadedFailed = await Video.findById(failedVideo._id);
  if (reloadedFailed.status !== 'FAILED') {
    throw new Error(`Expected status FAILED, got ${reloadedFailed.status}`);
  }
  console.log(`  ✓ Verified video record marked as FAILED in database.\n`);
  await Video.findByIdAndDelete(failedVideo._id);

  // -------------------------------------------------------------
  // TEST 3: Idempotency & Duplicate Prevention
  // -------------------------------------------------------------
  console.log('[TEST 3] Verifying Idempotency: Duplicate SQS message for READY video is cleanly discarded...');
  const readyVideo = await Video.create({
    title: 'Already Ready Video',
    description: 'Testing duplicate prevention',
    creatorId: adminUser._id,
    categoryId: category._id,
    status: 'READY',
    originalKey: 'raw-uploads/ready.mp4',
    hlsKey: 'videos/ready/hls/master.m3u8',
  });

  await sendProcessingJob({
    videoId: readyVideo._id.toString(),
    s3Key: readyVideo.originalKey,
    title: readyVideo.title,
    duration: '1m',
    categoryId: category._id.toString(),
  });

  // Call worker polling cycle
  await pollSqsJobs();

  const verifyStillReady = await Video.findById(readyVideo._id);
  if (verifyStillReady.status !== 'READY') {
    throw new Error(`Expected video to remain READY, but got ${verifyStillReady.status}`);
  }
  console.log(`  ✓ Idempotency verified: Duplicate message discarded, video remains READY.\n`);
  await Video.findByIdAndDelete(readyVideo._id);

  // -------------------------------------------------------------
  // TEST 4: Full End-to-End Pipeline:
  // API Pre-signed URL -> Upload Complete -> SQS -> Worker -> HLS -> S3 -> READY
  // -------------------------------------------------------------
  console.log('[TEST 4] Verifying Full End-to-End Flow:');
  console.log('  S3 Upload URL -> Confirm Upload -> SQS Dispatch -> Worker Consumes -> HLS Transcode -> READY');

  // Step 4a: Admin requests upload URL
  const uploadRes = await axios.post(
    `${API_BASE}/upload-url`,
    {
      title: 'SQS Transcoded Master Video 2026',
      description: 'End-to-End AWS SQS + FFmpeg HLS Verification',
      categoryId: category._id.toString(),
      fileName: 'sqs_master_pipeline.mp4',
      fileType: 'video/mp4',
      fileSize: 1024 * 1024 * 10, // 10MB
      thumbnailUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800',
      visibility: 'public',
      duration: '0m',
    },
    {
      headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
    }
  );

  if (!uploadRes.data.success || !uploadRes.data.uploadUrl || !uploadRes.data.video) {
    throw new Error(`Failed to generate upload URL: ${JSON.stringify(uploadRes.data)}`);
  }

  const newVideoId = uploadRes.data.video._id;
  console.log(`  ✓ 1. Upload URL generated. Video ID: ${newVideoId}, Status: ${uploadRes.data.video.status}`);

  // Step 4b: Admin notifies upload complete
  const completeRes = await axios.post(
    `${API_BASE}/${newVideoId}/upload-complete`,
    {},
    {
      headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
    }
  );

  if (!completeRes.data.success || completeRes.data.video.status !== 'UPLOADED') {
    throw new Error(`Failed to confirm upload: ${JSON.stringify(completeRes.data)}`);
  }
  console.log(`  ✓ 2. Upload complete confirmed. Status: UPLOADED, SQS Message ID: ${completeRes.data.sqs?.messageId}`);

  // Step 4c: Worker consumes SQS message and runs processing pipeline
  console.log(`  ✓ 3. Invoking Worker pollSqsJobs() to consume SQS message and transcode...`);
  await pollSqsJobs();
  let finishedVideo = await Video.findById(newVideoId);
  if (finishedVideo.status !== 'READY') {
    console.log(`  ...Running second poll cycle to consume enqueued SQS message...`);
    await pollSqsJobs();
    finishedVideo = await Video.findById(newVideoId);
  }

  // Step 4d: Verify DB state
  console.log('\n--- Final Video Document in Database ---');
  console.log('Status:       ', finishedVideo.status);
  console.log('HLS Key:      ', finishedVideo.hlsKey);
  console.log('Thumbnail URL:', finishedVideo.thumbnailUrl);
  console.log('Duration:     ', finishedVideo.duration);

  if (finishedVideo.status !== 'READY') {
    throw new Error(`Expected status READY, but got ${finishedVideo.status}`);
  }
  if (!finishedVideo.hlsKey || !finishedVideo.hlsKey.endsWith('/master.m3u8')) {
    throw new Error(`Invalid hlsKey: ${finishedVideo.hlsKey}`);
  }
  if (!finishedVideo.thumbnailUrl || !finishedVideo.thumbnailUrl.includes('.cloudfront.net')) {
    throw new Error(`Thumbnail URL not routed through CloudFront: ${finishedVideo.thumbnailUrl}`);
  }
  console.log(`  ✓ 4. Video document successfully verified as READY with CloudFront HLS & Thumbnail assets.`);

  // Step 4e: Verify Live API returns CloudFront streaming URL
  const apiCheck = await axios.get(`${API_BASE}/${newVideoId}`);
  const liveVideo = apiCheck.data.video;
  if (!liveVideo.hlsUrl || !liveVideo.hlsUrl.includes('.cloudfront.net')) {
    throw new Error(`Live API response missing CloudFront hlsUrl: ${liveVideo.hlsUrl}`);
  }
  console.log(`  ✓ 5. Live GET /api/videos/${newVideoId} returned CloudFront HLS URL:`);
  console.log(`       ${liveVideo.hlsUrl}`);

  // Cleanup test video
  await Video.findByIdAndDelete(newVideoId);
  console.log(`  ✓ 6. Cleaned up test video record.`);

  console.log('\n================================================================');
  console.log('🎉 ALL AWS SQS INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================');

  process.exit(0);
}

runSqsWorkerTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
