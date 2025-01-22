const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AUDIT_FILE = path.join(__dirname, 'audit.log');
const STATUS = {
  OK: 'OK',
  ISSUE: 'ISSUE',
  ERROR: 'ERROR'
};

// Generate 8 char unique ID using hex characters
function generateRequestId() {
  return crypto.randomBytes(4)  // 4 bytes = 8 hex chars
    .toString('hex')
    .toUpperCase();
}

function logAudit(user, command, status, details = '') {
  try {
    const timestamp = new Date().toISOString();
    const requestId = generateRequestId();
    const logLine = `${timestamp},${requestId},${user},${command},${status},${details}\n`;
    
    fs.appendFileSync(AUDIT_FILE, logLine);
    console.log('Audit logged:', logLine.trim());
    
    return requestId;  // Return ID for reference
  } catch (error) {
    console.error('Failed to write audit log:', error);
    return null;
  }
}

module.exports = {
  logAudit,
  STATUS
};
