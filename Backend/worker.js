require('dotenv').config();
const connectDB = require('./config/db');
const Video = require('./models/Video');
const { processVideo } = require('./workers/videoProcessor');
const {
  receiveProcessingJobs,
  deleteProcessingJob,
  sendToDLQ,
  sendProcessingJob,
  MAX_RECEIVE_COUNT,
} = require('./utils/sqsService');

let isShuttingDown = false;
let isProcessingJob = false;
let pollingTimeout = null;

/**
 * Structured logger helper
 */
const log = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
  console.log(`[${timestamp}] [Worker] [${level.toUpperCase()}] ${message}${metaStr}`);
};

/**
 * Poll SQS for video processing jobs and process them asynchronously
 */
const pollSqsJobs = async () => {
  if (isShuttingDown || isProcessingJob) {
    return;
  }

  try {
    // 1. Long-poll for processing jobs from AWS SQS (or local buffer)
    const messages = await receiveProcessingJobs({
      maxMessages: 1,
      waitTimeSeconds: 5,
      visibilityTimeout: 300, // 5 minutes processing window
    });

    if (messages && messages.length > 0) {
      const message = messages[0];
      const { videoId, s3Key, title } = message.body || {};

      log('info', `Received SQS message`, {
        messageId: message.messageId,
        videoId,
        receiveCount: message.receiveCount,
      });

      if (!videoId) {
        log('warn', `Received malformed SQS message without videoId. Deleting message.`);
        await deleteProcessingJob(message.receiptHandle);
        return;
      }

      // 2. Fetch video from DB and check state for idempotency & duplicate prevention
      const video = await Video.findById(videoId);

      if (!video) {
        log('warn', `Video ${videoId} not found in database. Deleting orphaned SQS message.`);
        await deleteProcessingJob(message.receiptHandle);
        return;
      }

      // Check if already processed
      if (video.status === 'READY') {
        log('info', `Video ${videoId} is already READY. Discarding duplicate SQS message.`, {
          videoId,
        });
        await deleteProcessingJob(message.receiptHandle);
        return;
      }

      // Check if another worker is actively transcoding this video
      if (video.status === 'PROCESSING' && message.receiveCount === 1) {
        log('info', `Video ${videoId} is currently being processed by another worker. Skipping.`, {
          videoId,
        });
        return;
      }

      // 3. Check retry threshold for Dead-Letter Queue (DLQ) routing
      if (message.receiveCount > MAX_RECEIVE_COUNT) {
        log('error', `Max delivery attempts (${message.receiveCount}/${MAX_RECEIVE_COUNT}) exceeded. Routing to DLQ.`, {
          videoId,
          messageId: message.messageId,
        });

        await sendToDLQ(message.body, `Max delivery attempts (${MAX_RECEIVE_COUNT}) exceeded without successful transcode.`);
        await deleteProcessingJob(message.receiptHandle);

        video.status = 'FAILED';
        await video.save();
        log('warn', `Video ${videoId} marked as FAILED in database after routing to DLQ.`);
        return;
      }

      // 4. Execute video transcode pipeline
      isProcessingJob = true;
      const startTime = Date.now();
      log('info', `Starting HLS transcoding pipeline for video "${title || video.title}"`, {
        videoId,
        attempt: `${message.receiveCount}/${MAX_RECEIVE_COUNT}`,
      });

      try {
        await processVideo(video._id);

        const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
        log('info', `Transcoding pipeline completed successfully in ${durationSec}s. Deleting SQS message.`, {
          videoId,
          messageId: message.messageId,
        });

        // 5. Delete successfully processed job from SQS
        await deleteProcessingJob(message.receiptHandle);
      } catch (err) {
        const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
        log('error', `Transcoding failed after ${durationSec}s: ${err.message}`, {
          videoId,
          attempt: message.receiveCount,
        });

        if (message.receiveCount >= MAX_RECEIVE_COUNT) {
          log('error', `Final retry attempt reached for video ${videoId}. Routing job to DLQ.`, {
            videoId,
          });
          await sendToDLQ(message.body, err.message);
          await deleteProcessingJob(message.receiptHandle);
        } else {
          log('info', `Job will be retried on next visibility cycle (Attempt ${message.receiveCount} of ${MAX_RECEIVE_COUNT}).`, {
            videoId,
          });
        }
      } finally {
        isProcessingJob = false;
      }
    } else {
      // 6. Queue check: If SQS is empty, verify if any legacy UPLOADED videos need dispatching
      const strandedVideo = await Video.findOne({ status: 'UPLOADED' }).sort({ createdAt: 1 });
      if (strandedVideo) {
        log('info', `Discovered unqueued video ${strandedVideo._id} in UPLOADED state. Sending to SQS queue...`);
        await sendProcessingJob({
          videoId: strandedVideo._id,
          s3Key: strandedVideo.originalKey,
          title: strandedVideo.title,
          duration: strandedVideo.duration,
          categoryId: strandedVideo.categoryId,
        });
      }
    }
  } catch (error) {
    log('error', `Error during SQS polling iteration: ${error.message}`);
  }
};

/**
 * Polling loop with backoff and graceful shutdown control
 */
const runPollingLoop = async () => {
  if (isShuttingDown) return;

  await pollSqsJobs();

  if (!isShuttingDown) {
    // If we're not currently processing, poll again after 1.5 seconds
    const delay = isProcessingJob ? 3000 : 1500;
    pollingTimeout = setTimeout(runPollingLoop, delay);
  }
};

/**
 * Start the background worker daemon
 */
const startWorker = async () => {
  console.log('====================================================');
  console.log('  StreamCloud AWS SQS Video Processing Worker Daemon  ');
  console.log('====================================================');
  await connectDB();
  log('info', 'Worker daemon initialized. Listening for SQS video processing jobs...');

  runPollingLoop();

  // Graceful shutdown handling
  const shutdown = (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    log('info', `Received ${signal}. Initiating graceful worker shutdown...`);

    if (pollingTimeout) {
      clearTimeout(pollingTimeout);
    }

    const checkInterval = setInterval(() => {
      if (!isProcessingJob) {
        clearInterval(checkInterval);
        log('info', 'Active jobs completed. Worker shutdown complete.');
        process.exit(0);
      } else {
        log('info', 'Waiting for active video transcoding job to complete before exit...');
      }
    }, 1000);

    // Hard termination timeout after 20 seconds
    setTimeout(() => {
      log('warn', 'Force shutdown timeout reached. Exiting immediately.');
      process.exit(0);
    }, 20000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

if (require.main === module) {
  startWorker();
}

module.exports = {
  startWorker,
  pollSqsJobs,
  runPollingLoop,
};
