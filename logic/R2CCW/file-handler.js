const axios = require('axios');
const { logR2CCW } = require('./r2ccw-logger');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
require('dotenv').config();  // Add this to access env variables

async function downloadFile(fileUrl, accessToken, user) {
  try {
    logR2CCW(user, 'download.csv', `Download URL: ${fileUrl}`);
    
    const response = await axios.get(fileUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      responseType: 'text'
    });
    
    // Extract filename from URL
    const filename = fileUrl.split('/').pop() || 'unknown.csv';
    logR2CCW(user, filename, 'File downloaded from user');
    logR2CCW(user, filename, `Content: ${response.data.trim()}`);
    
    return response.data;
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error('Failed to download file');
  }
}

async function uploadFile(bot, roomId, content, user, filename = 'Est12345.csv') {
  try {
    logR2CCW(user, filename, 'Starting file upload');
    
    // Create temporary file
    const tempFile = path.join(__dirname, `temp_${Date.now()}.csv`);
    fs.writeFileSync(tempFile, content);
    
    try {
      // Create form data
      const form = new FormData();
      form.append('roomId', roomId);
      form.append('text', 'Here is your processed file:');
      form.append('files', fs.createReadStream(tempFile));

      // Upload using Webex API directly with BOTTOKEN
      const response = await axios.post('https://webexapis.com/v1/messages', form, {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${process.env.BOTTOKEN}`  // Use env token directly
        }
      });
      
      logR2CCW(user, filename, `Upload URL: ${response.data.files?.[0] || 'No URL returned'}`);
      logR2CCW(user, filename, 'File uploaded to user space');
      
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