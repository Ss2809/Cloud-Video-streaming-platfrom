require('dotenv').config();
const connectDB = require('./config/db');
const Video = require('./models/Video');
const { processVideo } = require('./workers/videoProcessor');

let isShuttingDown = false;
let isProcessingJob = false;

/**
 * Poll database for videos in UPLOADED state and process them
 */
const pollForJobs = async () => {
  if (isShuttingDown || isProcessingJob) {
    return;
  }

  try {
    // Find the oldest video pending processing
    const video = await Video.findOne({ status: 'UPLOADED' }).sort({ createdAt: 1 });

    if (!video) {
      return; // No work pending
    }

    isProcessingJob = true;
    console.log(`[Worker] Picked up job for video: ${video._id} ("${video.title}")`);

    try {
      await processVideo(video._id);
    } catch (jobErr) {
      console.error(`[Worker] Job processing failed for video ${video._id}:`, jobErr.message);
    } finally {
      isProcessingJob = false;
    }
  } catch (error) {
    console.error('[Worker] Error during polling iteration:', error.message);
  }
};

/**
 * Start the background worker daemon
 */
const startWorker = async () => {
  console.log('--- Starting StreamCloud Video Processing Worker ---');
  await connectDB();
  console.log('[Worker] Worker initialized. Listening for UPLOADED video jobs...');

  const pollInterval = setInterval(pollForJobs, 3000);

  const shutdown = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log('\n[Worker] Gracefully shutting down worker process...');
    clearInterval(pollInterval);

    // Give current active job 10 seconds to finish or terminate
    const checkActiveJob = setInterval(() => {
      if (!isProcessingJob) {
        clearInterval(checkActiveJob);
        console.log('[Worker] Shutdown complete.');
        process.exit(0);
      }
    }, 1000);

    setTimeout(() => {
      console.log('[Worker] Force shutdown timeout reached.');
      process.exit(0);
    }, 10000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

if (require.main === module) {
  startWorker();
}

module.exports = {
  startWorker,
  pollForJobs,
};
