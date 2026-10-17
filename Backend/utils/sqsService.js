const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  ChangeMessageVisibilityCommand,
} = require('@aws-sdk/client-sqs');
const { sqsClient, queueUrl, dlqUrl, hasCredentials } = require('../config/sqs');

// Maximum delivery attempts before moving to DLQ
const MAX_RECEIVE_COUNT = 3;

// File-backed persistent fallback queue for local development and offline cross-process communication
const QUEUE_FILE = path.join(__dirname, '..', 'temp', 'local_sqs_queue.json');
const DLQ_FILE = path.join(__dirname, '..', 'temp', 'local_sqs_dlq.json');

const readQueueFile = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch {
    return [];
  }
};

const writeQueueFile = (filePath, items) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf8');
  } catch (err) {
    console.error(`[SQS Local] Error writing queue file ${filePath}:`, err.message);
  }
};

/**
 * Send an asynchronous video processing job to AWS SQS
 * @param {Object} jobData - { videoId, s3Key, title, duration, categoryId }
 * @returns {Promise<{success: boolean, messageId: string, mode: string}>}
 */
const sendProcessingJob = async (jobData) => {
  const { videoId, s3Key, title, duration, categoryId } = jobData;

  if (!videoId || !s3Key) {
    throw new Error('videoId and s3Key are required to send an SQS processing job.');
  }

  const payload = {
    jobId: crypto.randomUUID(),
    videoId: String(videoId),
    s3Key: String(s3Key),
    title: title || 'Untitled Stream',
    duration: duration || '0m',
    categoryId: categoryId ? String(categoryId) : null,
    enqueuedAt: new Date().toISOString(),
  };

  const messageBody = JSON.stringify(payload);

  if (hasCredentials && process.env.AWS_SQS_QUEUE_URL) {
    try {
      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: messageBody,
        MessageAttributes: {
          JobType: {
            DataType: 'String',
            StringValue: 'VIDEO_TRANSCODE',
          },
          VideoId: {
            DataType: 'String',
            StringValue: String(videoId),
          },
        },
      });

      const response = await sqsClient.send(command);
      console.log(`[SQS] Successfully dispatched job to AWS SQS queue.`);
      console.log(`  Video ID:   ${videoId}`);
      console.log(`  Message ID: ${response.MessageId}`);
      console.log(`  Queue URL:  ${queueUrl}`);

      return {
        success: true,
        messageId: response.MessageId,
        mode: 'aws_sqs',
      };
    } catch (err) {
      console.error(`[SQS] Error sending message to AWS SQS: ${err.message}. Falling back to local buffer.`);
    }
  }

  // File-backed local simulated fallback
  const simulatedMessageId = `mock-sqs-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const simulatedReceiptHandle = `receipt-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

  const queue = readQueueFile(QUEUE_FILE);
  queue.push({
    MessageId: simulatedMessageId,
    ReceiptHandle: simulatedReceiptHandle,
    Body: messageBody,
    Attributes: {
      ApproximateReceiveCount: '0',
    },
    visibleAfter: 0,
  });
  writeQueueFile(QUEUE_FILE, queue);

  console.log(`[SQS Local] Enqueued video processing job into SQS buffer.`);
  console.log(`  Video ID:   ${videoId}`);
  console.log(`  Message ID: ${simulatedMessageId}`);

  return {
    success: true,
    messageId: simulatedMessageId,
    mode: 'simulated_sqs',
  };
};

/**
 * Receive video processing messages from AWS SQS using long-polling
 * @param {Object} options - { maxMessages, waitTimeSeconds, visibilityTimeout }
 * @returns {Promise<Array<Object>>} Normalized messages
 */
const receiveProcessingJobs = async ({
  maxMessages = 1,
  waitTimeSeconds = 5,
  visibilityTimeout = 300,
} = {}) => {
  if (hasCredentials && process.env.AWS_SQS_QUEUE_URL) {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: Math.min(10, Math.max(1, maxMessages)),
        WaitTimeSeconds: waitTimeSeconds,
        VisibilityTimeout: visibilityTimeout,
        AttributeNames: ['All', 'ApproximateReceiveCount'],
        MessageAttributeNames: ['All'],
      });

      const response = await sqsClient.send(command);
      const messages = response.Messages || [];

      return messages.map((msg) => {
        let parsedBody = {};
        try {
          parsedBody = JSON.parse(msg.Body);
        } catch {
          parsedBody = { raw: msg.Body };
        }

        return {
          messageId: msg.MessageId,
          receiptHandle: msg.ReceiptHandle,
          receiveCount: parseInt(msg.Attributes?.ApproximateReceiveCount || '1', 10),
          body: parsedBody,
          rawMessage: msg,
        };
      });
    } catch (err) {
      console.error(`[SQS] Error receiving from AWS SQS: ${err.message}. Checking local buffer.`);
    }
  }

  // Simulated queue long polling from persistent file
  const queue = readQueueFile(QUEUE_FILE);
  const now = Date.now();
  const availableIndex = queue.findIndex((item) => (item.visibleAfter || 0) <= now);

  if (availableIndex === -1) {
    return [];
  }

  const item = queue[availableIndex];
  const count = parseInt(item.Attributes?.ApproximateReceiveCount || '0', 10) + 1;
  item.Attributes.ApproximateReceiveCount = String(count);
  item.visibleAfter = now + visibilityTimeout * 1000;
  writeQueueFile(QUEUE_FILE, queue);

  let parsedBody = {};
  try {
    parsedBody = JSON.parse(item.Body);
  } catch {
    parsedBody = { raw: item.Body };
  }

  return [
    {
      messageId: item.MessageId,
      receiptHandle: item.ReceiptHandle,
      receiveCount: count,
      body: parsedBody,
      rawMessage: item,
    },
  ];
};

/**
 * Delete a processed message from SQS queue
 * @param {string} receiptHandle - Message receipt handle
 */
const deleteProcessingJob = async (receiptHandle) => {
  if (!receiptHandle) return;

  if (hasCredentials && process.env.AWS_SQS_QUEUE_URL && !receiptHandle.startsWith('receipt-')) {
    try {
      const command = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
      });

      await sqsClient.send(command);
      console.log(`[SQS] Message deleted from AWS queue (ReceiptHandle: ${receiptHandle.slice(0, 16)}...)`);
      return;
    } catch (err) {
      console.error(`[SQS] Failed to delete message from AWS SQS: ${err.message}`);
    }
  }

  // Local simulated removal
  const queue = readQueueFile(QUEUE_FILE);
  const idx = queue.findIndex((m) => m.ReceiptHandle === receiptHandle);
  if (idx !== -1) {
    queue.splice(idx, 1);
    writeQueueFile(QUEUE_FILE, queue);
    console.log(`[SQS Local] Message removed from local SQS buffer.`);
  }
};

/**
 * Route a failed message to the Dead-Letter Queue (DLQ)
 * @param {Object} job - { videoId, s3Key, title, error, receiveCount }
 */
const sendToDLQ = async (job, errorReason = 'Unknown failure') => {
  const payload = {
    ...job,
    deadLetterAt: new Date().toISOString(),
    errorReason: String(errorReason),
  };

  const messageBody = JSON.stringify(payload);

  if (hasCredentials && process.env.AWS_SQS_DLQ_URL) {
    try {
      const command = new SendMessageCommand({
        QueueUrl: dlqUrl,
        MessageBody: messageBody,
        MessageAttributes: {
          ErrorReason: {
            DataType: 'String',
            StringValue: String(errorReason).slice(0, 255),
          },
        },
      });

      const response = await sqsClient.send(command);
      console.log(`[SQS DLQ] Message routed to AWS Dead-Letter Queue: ${dlqUrl}`);
      console.log(`  DLQ Message ID: ${response.MessageId}`);
      return;
    } catch (err) {
      console.error(`[SQS DLQ] Failed to send to AWS DLQ: ${err.message}`);
    }
  }

  const dlq = readQueueFile(DLQ_FILE);
  dlq.push(payload);
  writeQueueFile(DLQ_FILE, dlq);
  console.log(`[SQS DLQ Local] Message recorded in Dead-Letter Queue (Total DLQ: ${dlq.length}).`);
};

const clearSimulatedQueue = () => {
  writeQueueFile(QUEUE_FILE, []);
  writeQueueFile(DLQ_FILE, []);
};

module.exports = {
  MAX_RECEIVE_COUNT,
  sendProcessingJob,
  receiveProcessingJobs,
  deleteProcessingJob,
  sendToDLQ,
  clearSimulatedQueue,
  getSimulatedQueueLength: () => readQueueFile(QUEUE_FILE).length,
  getSimulatedDLQLength: () => readQueueFile(DLQ_FILE).length,
};
