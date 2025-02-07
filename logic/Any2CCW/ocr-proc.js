const Tesseract = require('tesseract.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

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

// Run OCR on the downloaded image
async function runOCR(imagePath) {
    try {
        // Log file info before processing
        const fileStats = fs.statSync(imagePath);
        console.log('Processing file:', {
            path: imagePath,
            size: fileStats.size + ' bytes',
            exists: fs.existsSync(imagePath)
        });

        // Read and log first few bytes to check file format
        const buffer = fs.readFileSync(imagePath);
        console.log('File header (first 16 bytes):', buffer.slice(0, 16));
        
        const result = await Tesseract.recognize(imagePath, 'eng');
        console.log('OCR completed successfully');
        
        // Clean up temp file
        try {
            fs.unlinkSync(imagePath);
            console.log('Temp file cleaned up:', imagePath);
        } catch (cleanupError) {
            console.warn('Failed to clean up temp file:', cleanupError);
        }
        
        return result.data.text;
    } catch (error) {
        console.error('OCR Error:', error);
        throw new Error(`OCR processing failed: ${error.message}`);
    }
}

module.exports = {
    downloadImage,
    runOCR
};