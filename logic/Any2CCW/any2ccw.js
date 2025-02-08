const { logAudit, STATUS } = require('../shared/audit/audit');
const { convertToXLSXOutput, normalize2EstimateFormat, parseCSVToRecords } = require('../shared/utils/file-conversion');
const { countOutputLines, calculateTimeSavings } = require('../shared/utils/quote-utils');
const { runOCR } = require('./ocr-proc');
const { Normalize2CSVwAI } = require('../shared/utils/bridgeAI');
const { BridgeAIPostProcess } = require('../shared/utils/file-conversion');

// Master workflow function for Any2CCW
async function wflowAny2CCW(fileContent, user, filename) {
  try {
    // Step 1: Process image through OCR
    const ocrText = await runOCR(fileContent);
    console.log('ocrText', ocrText);

    // Step 2: Convert OCR text to normalized CSV format
    // const csvResult = convertTextToCSV(ocrText);  

    // Step 3: Use Bridge AI to convert CSV to structured data
    const csvResultPostBridgeAI = await Normalize2CSVwAI(ocrText);
    const cleanedCSV = BridgeAIPostProcess(csvResultPostBridgeAI);
    console.log('csvResultPostBridgeAI\n', csvResultPostBridgeAI);

    // Parse CSV to records before normalization
    const records = parseCSVToRecords(cleanedCSV);
    const normalizedRecords = normalize2EstimateFormat(records);

    // Count lines and calculate savings
    const lineCount = countOutputLines(normalizedRecords);
    const timeSaved = calculateTimeSavings(lineCount);

    // Convert to XLSX using the imported function
    const buffer = convertToXLSXOutput(normalizedRecords);
    
    // Add line count to log with quote info
    logAudit(user, 'ANY2CCW', STATUS.OK, 'File processed OK', lineCount);

    return {
      buffer,
      lineCount,
      timeSaved
    };

  } catch (error) {
    console.error('Any2CCW Processing Error:', error.message);
    logAudit(user, 'ANY2CCW', STATUS.ERROR, error.message, 0);

    throw error;
  }
}

module.exports = { wflowAny2CCW };
