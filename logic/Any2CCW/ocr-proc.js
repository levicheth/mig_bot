const Tesseract = require('tesseract.js');
const fs = require('fs');

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
    runOCR
};