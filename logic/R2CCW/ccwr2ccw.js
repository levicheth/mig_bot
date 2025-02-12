const fs = require('fs');
const csv = require('csv');
const { logR2CCW } = require('../shared/logger/r2ccw-logger');
const { logAudit, STATUS } = require('../shared/audit/audit');
const { convertToXLSXOutput, normalize2EstimateFormat } = require('../shared/utils/file-conversion');
const { countOutputLines, calculateTimeSavings, normalizeInputToCSV, getCSVQuoteInfo } = require('../shared/utils/quote-utils');

// Preprocess CSV content to find and extract data starting with header
function getCSVBodyFromCCWRQuote(content) {
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

// Parse quote body to get records from CSV content
async function normalizeCSV2MemRecords(csvContent) {
  // Clean the content by removing empty/invalid lines
  const cleanContent = csvContent.split('\n')
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

  // Parse CSV content into records
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

  return records;
}


// Master function 
async function wflowCCWR2CCW(fileContent, user, filename) {
  try {
    // First get CSV content regardless of input format
    const csvContent = await normalizeInputToCSV(fileContent);
    
    // Get quote info - qwt #, NP, currency > Only for AUDIT file
    const quoteInfo = getCSVQuoteInfo(csvContent);

    const preprocessed = getCSVBodyFromCCWRQuote(csvContent);

    // Parse the quote body to get records
    const records = await normalizeCSV2MemRecords(preprocessed);

    // Transform records using the dedicated function
    const transformedRecords = normalize2EstimateFormat(records, quoteInfo);

    // Count lines and calculate savings
    const lineCount = countOutputLines(transformedRecords);
    const timeSaved = calculateTimeSavings(lineCount);

    // Convert to XLSX using the imported function
    const buffer = convertToXLSXOutput(transformedRecords);
    
    // Add line count to log with quote info
    logR2CCW(user, filename, `file w ${lineCount} lines generated OK`);
    logAudit(user, 'CCWR2CCW', STATUS.OK, 'File processed OK', lineCount, quoteInfo);

    return {
      buffer,
      lineCount,
      timeSaved,
      quoteInfo
    };

  } catch (error) {
    console.error('CSV Processing Error:', error.message);
    logAudit(user, 'CCWR2CCW', STATUS.ERROR, error.message, 0, {
      quoteNumber: '',
      quoteCurrency: '',
      quotePrice: ''
    });
    throw error;
  }
}

module.exports = { wflowCCWR2CCW };
