const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
  }
});

// Helper function to convert stream to string
function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
  });
}

// Generic function to append content to S3 file
async function appendToS3File(content, bucketName, key) {
  try {
    let existingContent = '';
    
    try {
      // Try to get existing content
      const existingData = await s3Client.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: key
      }));
      
      // Convert stream to string
      existingContent = await streamToString(existingData.Body);
    } catch (error) {
      if (error.name !== 'NoSuchKey') {
        throw error;
      }
      // If file doesn't exist, we'll create it with empty content
    }
    
    // Append new content
    const updatedContent = existingContent + content;
    
    // Upload combined content
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: updatedContent,
      ContentType: 'text/plain'
    }));
    
    return true;
  } catch (error) {
    console.error('Failed to append to S3:', error);
    throw error;
  }
}

// Generic function to upload file to S3
async function uploadToS3(content, bucketName, key, contentType = 'text/plain') {
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: content,
      ContentType: contentType
    }));
    return true;
  } catch (error) {
    console.error('Failed to upload to S3:', error);
    throw error;
  }
}

module.exports = {
  appendToS3File,
  uploadToS3,
  s3Client
};
