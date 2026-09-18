const { S3Client } = require('@aws-sdk/client-s3');

const region = process.env.AWS_REGION || 'us-east-1';
const bucketName = process.env.AWS_S3_BUCKET || 'streamcloud-raw-videos';

const s3Config = {
  region,
};

// If explicit AWS credentials exist in environment variables, apply them
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Config.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const s3Client = new S3Client(s3Config);

module.exports = {
  s3Client,
  region,
  bucketName,
};
