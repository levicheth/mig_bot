const axios = require('axios');
const { logR2CCW } = require('../logger/r2ccw-logger');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const os = require('os');
require('dotenv').config();  // Add this to access env variables

// Download the image and save it locally
async function downloadImage(fileUrl, accessToken, user, bot, roomId) {
    try {
        // Create temp directory if it doesn't exist
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Generate a unique temp file path
        const filepath = path.join(tempDir, `temp_${Date.now()}.png`);
        
        // Download file with proper authorization
        const response = await axios.get(fileUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            responseType: 'arraybuffer'  // Important for binary files like images
        });

        // Write the buffer to a temp file
        fs.writeFileSync(filepath, response.data);
        console.log('Image downloaded to:', filepath);
        
        return filepath;
    } catch (error) {
        console.error('Error downloading image:', error);
        throw new Error(`Failed to download image: ${error.response?.data?.message || error.message}`);
    }
}

// Generate filename with timestamp and user
function generateFilename(user) {
  const now = new Date();
  const timestamp = now.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(/[/:]/g, '').replace(',', '_');
  
  // Extract username from email
  const username = user.split('@')[0];
  
  return `${timestamp}_CCWR2Estimate_${username}.xlsx`;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadFileWithRetry(fileUrl, accessToken, maxRetries = 3, delayMs = 10000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(fileUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        responseType: 'text'
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 423 && attempt < maxRetries) {
        console.log(`Attempt ${attempt}: File still processing, waiting ${delayMs/1000} seconds...`);
        await sleep(delayMs);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries reached while waiting for file');
}

async function downloadFile(fileUrl, accessToken, user, bot, roomId) {
  try {
    logR2CCW(user, 'download.csv', `Download URL: ${fileUrl}`);
    
    // Inform user about processing
    await bot.say({
      roomId: roomId,
      markdown: "📋 Your request is being processed, please wait..."
    });

    // Try to download with retries
    const fileContent = await downloadFileWithRetry(fileUrl, accessToken);
    
    // Extract filename from URL
    const filename = fileUrl.split('/').pop() || 'unknown.csv';
    logR2CCW(user, filename, 'File downloaded from user');
    
    return fileContent;
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error('Failed to download file: ' + (error.response?.data?.message || error.message));
  }
}

// Helper function to send Webex messages
async function uploadWxMsg(msgData) {
  try {
    const form = new FormData();
    
    // Add all form data
    Object.entries(msgData).forEach(([key, value]) => {
      form.append(key, value);
    });

    // Upload using Webex API
    const response = await axios.post('https://webexapis.com/v1/messages', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${process.env.BOTTOKEN}`
      }
    });

    return response;
  } catch (error) {
    console.error('Webex message error:', error);
    throw new Error('Failed to send Webex message');
  }
}

async function uploadFile(bot, roomId, processedResult, user, filename = null) {
  try {
    // Generate filename if not provided
    const outputFilename = filename || generateFilename(user);
    
    logR2CCW(user, outputFilename, 'Starting file upload');
    
    // Create temporary file
    const tempFile = path.join(__dirname, `temp_${Date.now()}.xlsx`);
    fs.writeFileSync(tempFile, processedResult.buffer);
    
    try {
      // Send file to user
      const response = await uploadWxMsg({
        roomId: roomId,
        text: `Here is your Estimate Excel file.\nYou have saved ${processedResult.timeSaved} minutes of time. Not bad :)`,
        files: fs.createReadStream(tempFile),
        filename: outputFilename        
      });

      logR2CCW(user, outputFilename, `Upload URL: ${response.data.files?.[0] || 'No URL returned'}`);
      logR2CCW(user, outputFilename, 'File uploaded to user space');

      // Send notification to admin
      await uploadWxMsg({
        toPersonEmail: 'allevich@cisco.com',
        text: `User ${user} saved ${processedResult.timeSaved} minutes of time`
      });

      
    } finally {
      // Clean up temp file
      try {
        fs.unlinkSync(tempFile);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    logR2CCW(user, filename, `Upload failed: ${error.message}`);
    throw new Error('Failed to upload file');
  }
}

// Save multiple files to a temp directory and return the directory path
function saveFilesToTempDir(files, fileContents) {
  const fs = require('fs');
  const path = require('path');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mbrvsbchk-'));
  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, fileContents[i]);
  }
  return tempDir;
}

// Remove a temp directory and all its contents
function removeTempDir(dirPath) {
  const fs = require('fs');
  const path = require('path');
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      fs.unlinkSync(curPath);
    });
    fs.rmdirSync(dirPath);
  }
}

// Canonicalize Excel filenames in a directory and return a role->path mapping
function canonicalizeExcelFilenames(tempDir) {
  const XLSX = require('xlsx');
  const fs = require('fs');
  const path = require('path');
  const canonicalNames = {
    'DIRECT': 'Goal to Cash Transactions - DIRECT.xlsx',
    'POS': 'Goal to Cash Transactions - POS.xlsx',
    'XAAS': 'Goal to Cash Transactions XAAS.xlsx',
    'MANREV': 'Goal to Cash Transactions MAN REV.xlsx',
    'CREMEMO': 'Goal to Cash Transactions CREMEMO.xlsx',
    'MBR': 'MBR.xlsx'
  };
  const roleToPath = {};
  const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.xlsx'));
  for (const file of files) {
    const filePath = path.join(tempDir, file);
    let role = null;
    if (file.toLowerCase().includes('mbr')) {
      role = 'MBR';
    } else {
      try {
        const wb = XLSX.readFile(filePath);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (json.length && json[0].includes('Type')) {
          const typeIdx = json[0].indexOf('Type');
          const typeVal = (json[1] && json[1][typeIdx]) ? json[1][typeIdx].toString().toLowerCase() : '';
          if (typeVal.includes('direct')) role = 'DIRECT';
          else if (typeVal.includes('pos')) role = 'POS';
          else if (typeVal.includes('xaas')) role = 'XAAS';
          else if (typeVal.includes('manual')) role = 'MANREV';
          else if (typeVal.includes('credit') || typeVal.includes('memo')) role = 'CREMEMO';
        }
      } catch (e) {}
    }
    if (role && !roleToPath[role]) {
      const canonicalPath = path.join(tempDir, canonicalNames[role]);
      if (filePath !== canonicalPath) {
        fs.renameSync(filePath, canonicalPath);
      }
      roleToPath[role] = canonicalPath;
    }
  }
  return roleToPath;
}

module.exports = {
  downloadFile,
  uploadFile,
  uploadWxMsg,
  downloadImage,
  saveFilesToTempDir,
  removeTempDir,
  canonicalizeExcelFilenames
}; 