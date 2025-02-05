const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const AUDIT_FILE = path.join(__dirname, 'audit.log');
const STATUS = {
  OK: 'OK',
  ISSUE: 'ISSUE',
  ERROR: 'ERROR'
};

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.S3_REGION, 
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
  }
});

// Local file logging
function logAuditText(user, command, status, message, lineCount = 0, quoteInfo = {}) {
  try {
    const timestamp = new Date().toISOString();
    const requestId = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // Sanitize values to prevent comma issues
    const sanitizedQuoteInfo = {
      quoteNumber: (quoteInfo.quoteNumber || '').replace(/,/g, ''),
      quoteCurrency: (quoteInfo.quoteCurrency || '').replace(/,/g, ''),
      quotePrice: (quoteInfo.quotePrice || '').replace(/,/g, '')
    };
    
    const logLine = [
      timestamp,
      requestId,
      user,
      command,
      sanitizedQuoteInfo.quoteNumber,
      sanitizedQuoteInfo.quoteCurrency,
      sanitizedQuoteInfo.quotePrice,
      status,
      lineCount,
      message
    ].join(',') + '\n';
    
    fs.appendFileSync(AUDIT_FILE, logLine);
    return requestId;
  } catch (error) {
    console.error('Failed to write audit log:', error);
    return null;
  }
}

// S3 logging
async function logAuditS3(user, command, status, message, lineCount = 0, quoteInfo = {}) {
  try {
    const timestamp = new Date().toISOString();
    const requestId = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // Sanitize values to prevent comma issues
    const sanitizedQuoteInfo = {
      quoteNumber: (quoteInfo.quoteNumber || '').replace(/,/g, ''),
      quoteCurrency: (quoteInfo.quoteCurrency || '').replace(/,/g, ''),
      quotePrice: (quoteInfo.quotePrice || '').replace(/,/g, '')
    };
    
    const logLine = [
      timestamp,
      requestId,
      user,
      command,
      sanitizedQuoteInfo.quoteNumber,
      sanitizedQuoteInfo.quoteCurrency,
      sanitizedQuoteInfo.quotePrice,
      status,
      lineCount,
      message
    ].join(',') + '\n';

    // Get the S3 key for today's log file
    const key = `audit_logs/audit.log`;

    try {
      // Try to get existing content
      const existingData = await s3Client.send(new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key
      }));
      
      // Convert stream to string
      const existingContent = await streamToString(existingData.Body);
      
      // Append new log line to existing content
      const updatedContent = existingContent + logLine;
      
      // Upload combined content
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: updatedContent,
        ContentType: 'text/plain'
      }));
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        // File doesn't exist yet, create new one
        await s3Client.send(new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: key,
          Body: logLine,
          ContentType: 'text/plain'
        }));
      } else {
        throw error; // Re-throw other errors
      }
    }
    
    return requestId;
  } catch (error) {
    console.error('Failed to write audit log to S3:', error);
    return null;
  }
}

// Helper function to convert stream to string
function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
  });
}

// Combined logging function
async function logAudit(user, command, status, message, lineCount = 0, quoteInfo = {}) {
  // Log to local file
  const localRequestId = logAuditText(user, command, status, message, lineCount, quoteInfo);
  
  // Log to S3
  const s3RequestId = await logAuditS3(user, command, status, message, lineCount, quoteInfo);
  
  return localRequestId || s3RequestId;
}

module.exports = {
  logAudit,
  STATUS
};
