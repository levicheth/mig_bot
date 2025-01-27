const axios = require('axios');
const { logR2CCW } = require('../shared/logger/r2ccw-logger');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
require('dotenv').config();  // Add this to access env variables

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

async function uploadFile(bot, roomId, processedResult, user, filename = null) {
  try {
    // Generate filename if not provided
    const outputFilename = filename || generateFilename(user);
    
    logR2CCW(user, outputFilename, 'Starting file upload');
    
    // Create temporary file
    const tempFile = path.join(__dirname, `temp_${Date.now()}.xlsx`);
    fs.writeFileSync(tempFile, processedResult.buffer);
    
    try {
      // Create form data
      const form = new FormData();
      form.append('roomId', roomId);
      form.append('text', `Here is your Estimate Excel file.\nYou have saved ${processedResult.timeSaved} minutes of time. Not bad :)`);
      form.append('files', fs.createReadStream(tempFile), {
        filename: outputFilename,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      // Upload using Webex API directly with BOTTOKEN
      const response = await axios.post('https://webexapis.com/v1/messages', form, {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${process.env.BOTTOKEN}`
        }
      });
      
      logR2CCW(user, outputFilename, `Upload URL: ${response.data.files?.[0] || 'No URL returned'}`);
      logR2CCW(user, outputFilename, 'File uploaded to user space');
      
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

module.exports = {
  downloadFile,
  uploadFile
}; 