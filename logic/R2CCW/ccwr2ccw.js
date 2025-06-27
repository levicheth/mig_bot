const fs = require('fs');
const { logR2CCW } = require('../shared/logger/r2ccw-logger');
const { logAudit, STATUS } = require('../shared/audit/audit');
const { convertToXLSXOutput, normalize2EstimateFormat, convertCSV2Obj } = require('../shared/utils/file-conversion');
const { normalizeInputToCSV, getCSVQuoteInfo } = require('../shared/utils/quote-utils');
const axios = require('axios');

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


// Master function 
async function wflowCCWR2CCW(fileContent, user, filename) {
  try {
    // First get CSV content regardless of input format
    const csvContent = await normalizeInputToCSV(fileContent);
    
    // Get quote info - qwt #, NP, currency > Only for AUDIT file
    const quoteInfo = getCSVQuoteInfo(csvContent);

    const preprocessed = getCSVBodyFromCCWRQuote(csvContent);

    // Parse the quote body to get records
    const records = await convertCSV2Obj(preprocessed);

    // Transform records using the dedicated function
    const transformedRecords = normalize2EstimateFormat(records, quoteInfo);

    // Count lines via Express API
    const countResp = await axios.post("http://127.0.0.1:3000/count-output-lines", {
      records: transformedRecords
    });
    const lineCount = countResp.data.result;
    
    const response = await axios.post("http://127.0.0.1:3000/calc-time-savings", {
      lineCount: lineCount
    });
    const timeSaved = response.data.result;

    // Convert to XLSX using the imported function
    const buffer = convertToXLSXOutput(transformedRecords, quoteInfo);
    
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
