const fs = require('fs');
const path = require('path');

const R2CCW_LOG = path.join(__dirname, 'r2ccw.log');

function logR2CCW(user, filename, comment) {
  try {
    // Don't log if comment contains file content
    if (comment.startsWith('Content:')) {
      return;
    }
    
    const timestamp = new Date().toISOString();
    const logLine = `${timestamp},${user},${filename},${comment}\n`;
    
    fs.appendFileSync(R2CCW_LOG, logLine);
    console.log('R2CCW logged:', logLine.trim());
  } catch (error) {
    console.error('Failed to write R2CCW log:', error);
  }
}

module.exports = { logR2CCW }; 