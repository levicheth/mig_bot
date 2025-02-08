const XLSX = require('xlsx');

function convertTextToCSV(text) {
    // Remove "OCR Output:" prefix if present
    text = text.replace(/^OCR Output:\s*/i, '');
    
    // Split text into lines and process each line
    const lines = text.split('\n')
        .filter(line => line.trim())  // Remove empty lines
        .map(line => {
            // Split line by spaces and take first and last parts
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
                const sku = parts.slice(0, -1).join('-');  // Join all parts except last with dash
                const quantity = parts[parts.length - 1];
                return `${sku},${quantity}`;
            }
            return line;  // Return original line if it doesn't match expected format
        });
    
    // Join lines with newlines and create return object
    return {
        buffer: Buffer.from(lines.join('\n')),
        timeSaved: 30, // Placeholder value
        lineCount: lines.length
    };
}

// re-use existing code, take CSV above two params and inject into existing workflow; 
// refactor from R2CCW 
// move this logic to any2ccw

// integrate API 


function convertToXLSXOutput(csvResult) {
    // Parse CSV content into array
    const rows = csvResult.buffer.toString()
        .split('\n')
        .map(line => line.split(','));

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet([
        ['SKU', 'Quantity'], // Header row
        ...rows
    ]);

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    // Generate buffer
    const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return in the expected format
    return {
        buffer: xlsxBuffer,
        timeSaved: csvResult.timeSaved,
        lineCount: csvResult.lineCount
    };
}

module.exports = {
    convertTextToCSV,
    convertToXLSXOutput
};
