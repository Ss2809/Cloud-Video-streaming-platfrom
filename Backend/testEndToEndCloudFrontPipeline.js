require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const Video = require('./models/Video');
const Category = require('./models/Category');
const User = require('./models/User');
const { processVideo } = require('./workers/videoProcessor');

async function testPipeline() {
  console.log('=== Testing End-to-End Video Processing & CloudFront Delivery ===\n');

  await mongoose.connect(process.env.MONGO_URI);

  let category = await Category.findOne({});
  if (!category) {
    category = await Category.create({ name: 'Action', slug: 'action' });
  }

  let adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    adminUser = await User.create({ name: 'Admin', email: 'admin@streamcloud.io', role: 'admin' });
  }

  // 1. Create a video in UPLOADED status
  const testVideo = await Video.create({
    title: 'CloudFront 4K Stream Test Video',
    description: 'Verifying CloudFront OAC & HLS Delivery Pipeline',
    creatorId: adminUser._id,
    categoryId: category._id,
    status: 'UPLOADED',
    originalKey: `raw-uploads/test-${Date.now()}.mp4`,
  });

  console.log(`Created test video ID: ${testVideo._id}`);

  // 2. Process video through pipeline
  console.log('Executing processVideo pipeline...');
  const processed = await processVideo(testVideo._id);

  console.log('\n--- Verifying Database Document ---');
  console.log('Status:      ', processed.status);
  console.log('HLS Key:     ', processed.hlsKey);
  console.log('Thumbnail URL:', processed.thumbnailUrl);
  console.log('Duration:    ', processed.duration);

  if (processed.status !== 'READY') {
    throw new Error(`Expected status READY but got ${processed.status}`);
  }
  if (!processed.hlsKey.includes('/hls/master.m3u8')) {
    throw new Error(`Invalid hlsKey: ${processed.hlsKey}`);
  }
  if (!processed.thumbnailUrl.includes('.cloudfront.net')) {
    throw new Error(`Thumbnail URL is not routed via CloudFront: ${processed.thumbnailUrl}`);
  }

  // 3. Query via live API
  console.log('\n--- Verifying Live API Response (GET /api/videos/:id) ---');
  const apiRes = await axios.get(`http://localhost:5000/api/videos/${testVideo._id}`);
  const apiVideo = apiRes.data.video;

  console.log('API hlsUrl:     ', apiVideo.hlsUrl);
  console.log('API thumbnailUrl:', apiVideo.thumbnailUrl);

  if (!apiVideo.hlsUrl.includes('.cloudfront.net/videos/')) {
    throw new Error(`API response hlsUrl missing CloudFront domain: ${apiVideo.hlsUrl}`);
  }
  if (!apiVideo.thumbnailUrl.includes('.cloudfront.net/videos/')) {
    throw new Error(`API response thumbnailUrl missing CloudFront domain: ${apiVideo.thumbnailUrl}`);
  }

  // 4. Cleanup
  await Video.findByIdAndDelete(testVideo._id);
  console.log(`\n✓ Cleaned up test video ${testVideo._id}`);

  console.log('\n🎉 END-TO-END CLOUDFRONT PIPELINE TEST COMPLETED SUCCESSFULLY!');
  process.exit(0);
}

testPipeline().catch((err) => {
  console.error('Test Error:', err);
  process.exit(1);
});
