const { SQSClient } = require('@aws-sdk/client-sqs');

const region = process.env.AWS_REGION || 'us-east-1';

const hasCredentials =
  Boolean(process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_ACCESS_KEY_ID !== 'your_aws_access_key_id' &&
  process.env.AWS_ACCESS_KEY_ID.trim().length > 0);

const sqsClient = new SQSClient({
  region,
  ...(hasCredentials && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim(),
    },
  }),
});

const queueUrl =
  process.env.AWS_SQS_QUEUE_URL ||
  'https://sqs.us-east-1.amazonaws.com/123456789012/streamcloud-video-processing-queue';

const dlqUrl =
  process.env.AWS_SQS_DLQ_URL ||
  'https://sqs.us-east-1.amazonaws.com/123456789012/streamcloud-video-processing-dlq';

module.exports = {
  sqsClient,
  queueUrl,
  dlqUrl,
  region,
  hasCredentials,
};
