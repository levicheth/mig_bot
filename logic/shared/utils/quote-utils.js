const fs = require('fs');
const csv = require('csv');
const XLSX = require('xlsx');

// Count lines in transformed records
function countOutputLines(records) {
    return records.length;
}
  
  // Calculate time savings (0.5 mins per line)
function calculateTimeSavings(lineCount) {
return lineCount * 0.5;
}

// Calculate requested start date (30 days from today)
function calcReqStartDate() {
const today = new Date();
const futureDate = new Date(today);
futureDate.setDate(today.getDate() + 30);

// Format as M/D/YYYY
const month = futureDate.getMonth() + 1;  // getMonth() returns 0-11
const day = futureDate.getDate();
const year = futureDate.getFullYear();

return `${month}/${day}/${year}`;
}

// Calculate duration between dates in months with ceiling / roundup
function calculateDuration(startDate, endDate) {
if (!startDate || !endDate) return 0;

try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Calculate months difference including partial months
    const yearDiff = end.getFullYear() - start.getFullYear();
    const monthDiff = end.getMonth() - start.getMonth();
    const dayDiff = end.getDate() - start.getDate();
    
    // Calculate total months with decimals
    let months = yearDiff * 12 + monthDiff;
    
    // Add partial month if there are remaining days
    if (dayDiff > 0) {
    const daysInMonth = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    months += dayDiff / daysInMonth;
    }
    
    // Round up to nearest integer and ensure non-negative
    return Math.max(0, Math.ceil(months));
    
} catch (error) {
    console.error('Date calculation error:', error.message);
    return 0;
}
}

// Detect file type and convert to CSV content if needed
async function normalizeInputToCSV(fileContent) {
try {
    // First try to parse as CSV
    try {
    console.log('Attempting to parse as CSV...');
    const content = fileContent.toString()
        .replace(/\r\n/g, '\n')  // Normalize line endings
        .replace(/\r/g, '\n');   // Convert remaining CRs
    
    // Try parsing CSV - if it succeeds, it's valid CSV
    await new Promise((resolve, reject) => {
        csv.parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relaxColumnCount: true  // Allow varying column counts
        }, (err, data) => {
        if (err || !data || !data.length) reject(new Error('Invalid CSV'));
        else resolve(data);
        });
    });
    
    console.log('Successfully parsed as CSV');
    return content;
    } catch (csvError) {
    
    // Try converting from XLSX
    try {
        console.log('Not a valid CSV file, trying XLSX...');
        const csvContent = convertXLSXtoCSV(fileContent);
        console.log('Successfully converted XLSX to CSV');
        return csvContent;
    } catch (xlsxError) {
        console.log('Not a valid XLSX file either');
        throw new Error('File is neither a valid CSV nor XLSX format');
    }
    }
} catch (error) {
    console.error('File format detection error:', error.message);
    throw new Error('Unable to process file format. Please provide a valid XLSX or CSV file.');
}
}

// Extract quote information from CSV content
function getCSVQuoteInfo(content) {
try {
    // Split into lines
    const lines = content.split('\n');
    
    // Initialize quote info
    const quoteInfo = {
    quoteNumber: '',
    quotePrice: '',
    quoteCurrency: '',
    quoteType: 'UNDEFINED'  // Default to CX
    };
    
    // Look for quote information in first 15 lines
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const line = lines[i].trim();
    
    // Extract Quote Number
    if (line.includes('Quote Number')) {
        const index = line.indexOf('Quote Number') + 'Quote Number'.length;
        const remaining = line.substring(index).trim();
        if (remaining.startsWith(',')) {
        // Get text between first and second comma
        const parts = remaining.split(',');
        if (parts.length > 1) {
            quoteInfo.quoteNumber = parts[1].trim();
        }
        }
    }
    
    // Extract Quote Extended List Price
    if (line.includes('Quote Extended List Price')) {
        const index = line.indexOf('Quote Extended List Price') + 'Quote Extended List Price'.length;
        const remaining = line.substring(index).trim();
        quoteInfo.quotePrice = remaining.startsWith(',') ? 
        remaining.substring(1).trim() : remaining.trim();
    }

    // Extract Quote Currency
    if (line.includes('Quote Currency')) {
        const index = line.indexOf('Quote Currency') + 'Quote Currency'.length;
        const remaining = line.substring(index).trim();
        quoteInfo.quoteCurrency = remaining.startsWith(',') ? 
        remaining.substring(1).trim() : remaining.trim();
    }

    // Look for Service Type column and check for "SUB-" pattern
    const headerIndex = lines.findIndex(line => 
        line.toLowerCase().includes('service type')
    );

    if (headerIndex !== -1) {
        // Check next line after header for "SUB-" pattern
        const serviceTypeLine = lines[headerIndex + 1];
        if (serviceTypeLine && serviceTypeLine.includes('SUB-')) {
            quoteInfo.quoteType = 'SW';
        } else if (serviceTypeLine && serviceTypeLine.includes('TS')) {
            quoteInfo.quoteType = 'CX';
        } else {
            quoteInfo.quoteType = 'UNDEFINED';
        }
    }
    
    // Break if we found all four
    if (quoteInfo.quoteNumber && quoteInfo.quotePrice && quoteInfo.quoteCurrency && quoteInfo.quoteType) {
        console.log('Quote info extracted:', quoteInfo);
        break;
    }
    }
        
    return quoteInfo;
} catch (error) {
    console.error('Quote info extraction error:', error.message);
    return {
    quoteNumber: '',
    quotePrice: '',
    quoteCurrency: '',
    quoteType: 'UNDEFINED'  // Default to CX on error
    };
}
}
  
module.exports = { countOutputLines, calculateTimeSavings, calcReqStartDate, calculateDuration, normalizeInputToCSV, getCSVQuoteInfo };
