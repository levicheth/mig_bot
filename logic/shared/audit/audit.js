const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { appendToS3File } = require('../storage/awsS3');

const AUDIT_FILE = path.join(__dirname, 'audit.log');
const STATUS = {
  OK: 'OK',
  ISSUE: 'ISSUE',
  ERROR: 'ERROR'
};

// Create audit log line
function createAuditLogLine(user, command, status, message, lineCount = 0, auditDetails = {}) {
  const timestamp = new Date().toISOString();
  const requestId = crypto.randomBytes(4).toString('hex').toUpperCase();

  let quoteType = '';
  let quoteNumber = '';
  let quoteCurrency = '';
  let quotePrice = '';

  if (command === 'CCWR2CCW') {
    quoteType = (auditDetails.quoteType || '').replace(/,/g, '');
    quoteNumber = (auditDetails.quoteNumber || '').replace(/,/g, '');
    quoteCurrency = (auditDetails.quoteCurrency || '').replace(/,/g, '');
    quotePrice = (auditDetails.quotePrice || '').replace(/,/g, '');
  }

  if (command === 'MbrVsbChk') {
    quoteType = 'NA';
    quoteNumber = 'NA';
    quoteCurrency = 'USD';
    quotePrice = (auditDetails.sumMissing || '').replace(/,/g, '');
  }  

  const logLine = [
    timestamp,
    requestId,
    user,
    command,
    quoteType,
    quoteNumber,
    quoteCurrency,
    quotePrice,
    status,
    lineCount,
    message
  ].join(',') + '\n';

  return { logLine, requestId };
}

// Local file logging
function logAuditText(logLine) {
  try {
    fs.appendFileSync(AUDIT_FILE, logLine);
    return true;
  } catch (error) {
    console.error('Failed to write local audit log:', error);
    return false;
  }
}

// S3 logging
async function logAuditS3(logLine) {
  try {
    await appendToS3File(
      logLine,
      process.env.S3_BUCKET_NAME,
      'audit_logs/audit.log'
    );
    return true;
  } catch (error) {
    console.error('Failed to write S3 audit log:', error);
    return false;
  }
}

// Combined logging function
async function logAudit(user, command, status, message, lineCount = 0, auditDetails = {}) {
  try {
    // Create log line
    const { logLine, requestId } = createAuditLogLine(
      user, command, status, message, lineCount, auditDetails
    );

    // Log to both destinations
    const localSuccess = logAuditText(logLine);
    const s3Success = await logAuditS3(logLine);

    // Return request ID if at least one logging method succeeded
    if (localSuccess || s3Success) {
      return requestId;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to write audit logs:', error);
    return null;
  }
}

module.exports = {
  logAudit,
  STATUS
};
