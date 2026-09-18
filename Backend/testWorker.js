const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { ffmpeg } = require('./config/ffmpeg');
const User = require('./models/User');
const Category = require('./models/Category');
const Video = require('./models/Video');
const { processVideo } = require('./workers/videoProcessor');

/**
 * Generate a short 2-second synthetic MP4 video with video & audio tracks using FFmpeg
 */
const generateSyntheticTestVideo = (outputPath) => {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    console.log('[TestWorker] Generating synthetic 2s test video via FFmpeg...');
    ffmpeg()
      .input('testsrc=duration=2:size=640x360:rate=24')
      .inputFormat('lavfi')
      .input('sine=frequency=1000:duration=2')
      .inputFormat('lavfi')
      .outputOptions([
        '-c:v libx264',
        '-preset ultrafast',
        '-pix_fmt yuv420p',
        '-c:a aac',
        '-b:a 64k',
      ])
      .output(outputPath)
      .on('end', () => {
        console.log(`✓ Synthetic test video created: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('[TestWorker] Failed to create synthetic video:', err.message);
        reject(err);
      })
      .run();
  });
};

async function runWorkerTests() {
  console.log('--- Starting Video Processing Pipeline Automated Verification ---\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cloud_streaming');

  // 1. Setup Test Fixtures
  console.log('1. Setting up test fixtures...');
  const testCategory = await Category.findOneAndUpdate(
    { name: 'Worker Pipeline Genre' },
    { name: 'Worker Pipeline Genre' },
    { upsert: true, returnDocument: 'after' }
  );

  const adminUser = await User.findOneAndUpdate(
    { email: 'worker_admin@streamcloud.io' },
    { name: 'Worker Admin', email: 'worker_admin@streamcloud.io', role: 'admin' },
    { upsert: true, returnDocument: 'after' }
  );

  const testVideoPath = path.join(__dirname, 'temp', 'synthetic_test.mp4');
  await generateSyntheticTestVideo(testVideoPath);

  // 2. Create Video in MongoDB with status UPLOADED
  console.log('\n2. Creating video in MongoDB with status UPLOADED...');
  const video = await Video.create({
    title: 'Interstellar Pipeline Run',
    description: 'Automated HLS transcoding test asset',
    creatorId: adminUser._id,
    categoryId: testCategory._id,
    originalKey: 'raw-uploads/synthetic_test.mp4',
    status: 'UPLOADED',
  });
  console.log(`✓ Video created: ${video._id} (Status: ${video.status})`);

  // 3. Run Video Processing Pipeline
  console.log('\n3. Running Video Processing Pipeline (FFmpeg multi-rendition HLS + thumbnail)...');
  const processedVideo = await processVideo(video._id, {
    localSourceOverride: testVideoPath,
  });

  // 4. Verify Final State in MongoDB
  console.log('\n4. Verifying MongoDB Video document state...');
  const verifiedDoc = await Video.findById(video._id);

  if (verifiedDoc.status === 'READY') {
    console.log('✓ Video status transitioned to READY.');
  } else {
    console.error('✗ Expected status READY, got:', verifiedDoc.status);
    process.exit(1);
  }

  if (verifiedDoc.hlsKey && verifiedDoc.hlsKey.includes(`videos/${video._id}/hls/master.m3u8`)) {
    console.log(`✓ HLS master playlist key verified: ${verifiedDoc.hlsKey}`);
  } else {
    console.error('✗ HLS key missing or incorrect:', verifiedDoc.hlsKey);
    process.exit(1);
  }

  if (verifiedDoc.thumbnailUrl && verifiedDoc.thumbnailUrl.includes('poster.jpg')) {
    console.log(`✓ Thumbnail URL verified: ${verifiedDoc.thumbnailUrl}`);
  } else {
    console.error('✗ Thumbnail URL missing or incorrect:', verifiedDoc.thumbnailUrl);
    process.exit(1);
  }

  if (verifiedDoc.duration) {
    console.log(`✓ Duration probed and recorded: ${verifiedDoc.duration}`);
  } else {
    console.error('✗ Duration is empty!');
  }

  // 5. Test Failure Path (Corrupt Source Asset)
  console.log('\n5. Testing failure handling with corrupt media source...');
  const corruptPath = path.join(__dirname, 'temp', 'corrupt_media.mp4');
  fs.writeFileSync(corruptPath, 'THIS_IS_NOT_A_VALID_VIDEO_FILE');

  const corruptVideo = await Video.create({
    title: 'Corrupt Ingest Test',
    creatorId: adminUser._id,
    categoryId: testCategory._id,
    originalKey: 'raw-uploads/corrupt_media.mp4',
    status: 'UPLOADED',
  });

  let threwError = false;
  try {
    await processVideo(corruptVideo._id, {
      localSourceOverride: corruptPath,
    });
  } catch (err) {
    threwError = true;
    console.log(`✓ Pipeline caught error as expected: ${err.message}`);
  }

  const failedDoc = await Video.findById(corruptVideo._id);
  if (threwError && failedDoc.status === 'FAILED') {
    console.log('✓ Failed video correctly transitioned status to FAILED in MongoDB.');
  } else {
    console.error('✗ Expected status FAILED, got:', failedDoc.status);
    process.exit(1);
  }

  // 6. Cleanup
  console.log('\n6. Cleaning up test assets and records...');
  if (fs.existsSync(testVideoPath)) fs.unlinkSync(testVideoPath);
  if (fs.existsSync(corruptPath)) fs.unlinkSync(corruptPath);
  await Video.findByIdAndDelete(video._id);
  await Video.findByIdAndDelete(corruptVideo._id);
  await User.findByIdAndDelete(adminUser._id);
  await Category.findByIdAndDelete(testCategory._id);
  await mongoose.disconnect();
  console.log('✓ Test cleanup complete.');

  console.log('\n======================================================');
  console.log('🎉 ALL VIDEO PROCESSING PIPELINE TESTS PASSED CLEANLY! 🎉');
  console.log('======================================================');
}

runWorkerTests().catch((err) => {
  console.error('Worker test error:', err);
  process.exit(1);
});
