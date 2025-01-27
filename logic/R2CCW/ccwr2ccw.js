const fs = require('fs');
const csv = require('csv');
const XLSX = require('xlsx');
const { logR2CCW } = require('../shared/logger/r2ccw-logger');
const { convertXLSXtoCSV } = require('./xlsx2csv');

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
        const csvContent = await convertXLSXtoCSV(fileContent);
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

// Preprocess CSV content to find and extract data starting with header
function getCSVBody(content) {
  try {
    // Split into lines
    const lines = content.split('\n');
    
    // Find the header line index
    const headerIndex = lines.findIndex(line => 
      line.trim().startsWith('Product Number') || 
      line.trim().startsWith('pid') ||
      line.trim().startsWith('PID')
    );
    
    if (headerIndex === -1) {
      throw new Error('No valid header line found. File must contain "Product Number" column.');
    }
    
    // Get header and data lines
    const validLines = lines.slice(headerIndex);
    
    // Validate we have data after header
    if (validLines.length < 2) {
      throw new Error('No data found after header line');
    }
    
    // Join back into string
    return validLines.join('\n');
  } catch (error) {
    console.error('Preprocessing error:', error.message);
    throw error;
  }
}

// Convert records to XLSX buffer
function convertToXLSXOutput(records) {
  try {
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Convert records to worksheet
    const ws = XLSX.utils.json_to_sheet(records, {
      header: [
        'Part Number',
        'Quantity',
        'Duration (Mnths)',
        'List Price',
        'Discount %',
        'Initial Term(Months)',
        'Auto Renew Term(Months)',
        'Billing Model',
        'Requested Start Date',
        'Notes'
      ]
    });

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    // Generate buffer
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  } catch (error) {
    console.error('XLSX conversion error:', error.message);
    throw new Error('Failed to convert to Excel format');
  }
}

// Master function 
async function processCSVFile(fileContent, user, filename) {
  try {
    // First get CSV content regardless of input format
    const csvContent = await normalizeInputToCSV(fileContent);
    
    // Clean the input - first preprocess to find valid data
    const preprocessed = getCSVBody(csvContent);
    
    // Rest of the processing remains the same...
    const cleanContent = preprocessed.split('\n')
      .reduce((acc, line) => {
        if (acc.stopped || line.trim().startsWith(',')) {
          acc.stopped = true;
          return acc;
        }
        acc.lines.push(line);
        return acc;
      }, { lines: [], stopped: false })
      .lines
      .join('\n');

    if (!cleanContent.trim()) {
      throw new Error('No valid content found in file');
    }

    // Continue with existing processing...
    const records = await new Promise((resolve, reject) => {
      csv.parse(cleanContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relaxColumnCount: true
      }, (err, data) => {
        if (err) reject(new Error('Invalid file format'));
        else resolve(data);
      });
    });

    if (!records || records.length === 0) {
      throw new Error('CSV file is empty or invalid');
    }

    // Get requested start date
    const reqStartDate = calcReqStartDate();

    // Transform records to new format
    const transformedRecords = records.map(record => {
      const startDate = record.startDate || record['Start Date'] || '';
      const endDate = record.endDate || record['End Date'] || '';
      const duration = calculateDuration(startDate, endDate);
      
      return {
        'Part Number': record.pid || record['Product Number'] || '',
        'Quantity': parseInt(record.qty || record['Quantity'] || '1', 10),
        'Duration (Mnths)': '',
        'List Price': '',
        'Discount %': '',
        'Initial Term(Months)': parseInt(duration || '0', 10),
        'Auto Renew Term(Months)': 0,
        'Billing Model': 'Prepaid Term',
        'Requested Start Date': reqStartDate,
        'Notes': ''
      };
    });

    // Count lines and calculate savings
    const lineCount = countOutputLines(transformedRecords);
    const timeSaved = calculateTimeSavings(lineCount);

    // Convert to XLSX
    const buffer = convertToXLSXOutput(transformedRecords);
    
    // Add line count to log
    logR2CCW(user, filename, `file w ${lineCount} lines generated OK`);
    
    return {
      buffer,
      lineCount,
      timeSaved
    };

  } catch (error) {
    console.error('CSV Processing Error:', error.message);
    throw error;
  }
}

module.exports = { processCSVFile };

