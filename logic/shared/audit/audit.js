const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AUDIT_FILE = path.join(__dirname, 'audit.log');
const STATUS = {
  OK: 'OK',
  ISSUE: 'ISSUE',
  ERROR: 'ERROR'
};

function logAudit(user, command, status, message, lineCount = 0, quoteInfo = {}) {
  try {
    const timestamp = new Date().toISOString();
    const requestId = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    const logLine = `${timestamp},${requestId},${user},${command},${quoteInfo.quoteNumber},${quoteInfo.quoteCurrency},${quoteInfo.quotePrice},${status},${lineCount},${message}\n`;
    
    fs.appendFileSync(AUDIT_FILE, logLine);
    return requestId;
  } catch (error) {
    console.error('Failed to write audit log:', error);
    return null;
  }
}

module.exports = {
  logAudit,
  STATUS
};
