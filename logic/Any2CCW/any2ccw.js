const { logAudit, STATUS } = require('../shared/audit/audit');
const { convertToXLSXOutput, normalize2EstimateFormat } = require('../shared/utils/file-conversion');
const { countOutputLines, calculateTimeSavings } = require('../shared/utils/quote-utils');
const { runOCR } = require('./ocr-proc');
const { convertTextToCSV } = require('./ocr-txt2csv');


// Master workflow function for Any2CCW
async function wflowAny2CCW(fileContent, user, filename) {
  try {
    // Step 1: Process image through OCR
    const ocrText = await runOCR(fileContent);
    
    // Step 2: Convert OCR text to normalized CSV format
    const csvResult = convertTextToCSV(ocrText);
    
    // Step 3: Use Bridge AI to convert CSV to structured data
    //const csvResultPostBridgeAI = await NormalizeViaBridgeAI(csvResult);

    // Parse CSV content into records format
    // Note: csvResult.buffer contains CSV string data

    const records = csvResult.buffer.toString()
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [sku, quantity] = line.split(',');
        return {
          'SKU': sku.trim(),
          'Quantity': quantity.trim()
        };
      });

    // Get quote info with default HW type since this is SKU-based
    const quoteInfo = {
      quoteType: 'NA',
      quoteNumber: 'NA',
      quoteCurrency: 'NA',
      quotePrice: '0'
    };

    // Transform records using shared normalize function
    const transformedRecords = normalize2EstimateFormat(records, quoteInfo);

    // Count lines and calculate savings
    const lineCount = countOutputLines(transformedRecords);
    const timeSaved = calculateTimeSavings(lineCount);

    // Convert to XLSX using the imported function
    const buffer = convertToXLSXOutput(transformedRecords);
    
    // Add line count to log with quote info
    logAudit(user, 'ANY2CCW', STATUS.OK, 'File processed OK', lineCount, quoteInfo);

    return {
      buffer,
      lineCount,
      timeSaved,
      quoteInfo
    };

  } catch (error) {
    console.error('Any2CCW Processing Error:', error.message);
    logAudit(user, 'ANY2CCW', STATUS.ERROR, error.message, 0, {
      quoteNumber: '',
      quoteCurrency: '',
      quotePrice: ''
    });
    throw error;
  }
}

module.exports = { wflowAny2CCW };
