const fs = require('fs');
const path = require('path');
const deviceMapping = require('./devMapCNC7Raw.js');
const { findDeviceType } = require('./devMapCNC7Optim.js');

const { logR2CCW } = require('../shared/logger/r2ccw-logger');
const { logAudit, STATUS } = require('../shared/audit/audit');
const { convertToXLSXOutput, normalize2EstimateFormat, convertCSV2Obj } = require('../shared/utils/file-conversion');
const { countOutputLines, calculateTimeSavings, normalizeInputToCSV } = require('../shared/utils/quote-utils');
const { uploadWxMsg } = require('../shared/utils/file-handler');

// Process entries using device mapping
function bomProcessor(records) {
  try {
    // Initialize type groups and comments array
    const typeGroups = {
      'Cisco Type A': 0,
      'Cisco Type B': 0,
      'Cisco Type C': 0,
      'NonCisco Type A': 0,
      'NonCisco Type B': 0,
      'NonCisco Type C': 0
    };
    
    const comments = [];

    // Process each record
    records.forEach(record => {
      const deviceId = record.sku || record['Part Number'] || '';
      const quantity = parseInt(record.qty || record['Quantity'] || '0', 10);

      if (!deviceId || isNaN(quantity) || quantity <= 0) {
        console.warn(`Skipping invalid record: ${JSON.stringify(record)}`);
        return;
      }

      // Find device type using the mapping function
      const { vendor, type } = findDeviceType(deviceId);
      
      // Create group key with vendor prefix
      const groupKey = `${vendor} ${type}`;
      
      // Add quantity to appropriate type group
      typeGroups[groupKey] = (typeGroups[groupKey] || 0) + quantity;

      // Save comment
      const comment = `Device: ${deviceId} > ${groupKey}, Qty: ${quantity}, New total: ${typeGroups[groupKey]}`;
      console.log(comment);
      comments.push(comment);
    });

    // Filter out types with zero quantity
    const result = Object.entries(typeGroups)
      .filter(([_, qty]) => qty > 0)
      .reduce((acc, [type, qty]) => {
        acc[type] = qty;
        return acc;
      }, {});

    console.log('Final device type groups:', result);
    return { result, comments };

  } catch (error) {
    console.error('BOM Processing error:', error);
    throw new Error(`Failed to process BOM: ${error.message}`);
  }
}

// Generate CNC7 quote records
async function genCNC7QuoteRecords(records) {
  try {
    // Process records to get type groups and comments
    const { result: typeGroups, comments } = bomProcessor(records);
    console.log('CNC7 Quote typeGroups', typeGroups);

    // Generate output records
    const outputRecords = [];
    
    // Add records for each type
    Object.entries(typeGroups).forEach(([groupKey, count]) => {
      // Parse vendor and type from group key
      const [vendor, _, typeCode] = groupKey.split(' '); // e.g., "Cisco Type A" -> ["Cisco", "Type", "A"]
      
      // Convert vendor to SKU code (C for Cisco, 3 for NonCisco)
      const vendorCode = vendor === 'Cisco' ? 'C' : '3';
      
      console.log('CNC7 Quote vendorCode & typeCode:', vendorCode, typeCode);
      
      // Generate SKU: CNC-E-C-A-RTM-SBP
      const partNumber = `CNC-E-${vendorCode}-${typeCode}-RTM-SBP`;
      
      outputRecords.push({
        'Part Number': partNumber,
        'Quantity': count,
        'Duration': '36'
      });

      console.log('Generated record:', {
        'Part Number': partNumber,
        'Quantity': count,
        'Duration': '36'
      });
    });

    return { outputRecords, comments };

  } catch (error) {
    console.error('Error generating CNC7 quote:', error);
    throw error;
  }
}

// Master workflow function
async function wflowCNC7Quoter(fileContent, user, filename) {
  try {
    // Convert input to CSV format
    const csvContent = await normalizeInputToCSV(fileContent);
    
    // Parse CSV to records
    const objRecords = await convertCSV2Obj(csvContent);
    
    // MAIN LOGIC: Generate CNC7 quote records
    const { outputRecords: cnc7Records, comments: cnc7Comments } = await genCNC7QuoteRecords(objRecords);
    console.log('cnc7Records before normalization:', cnc7Records);

    // Normalize to estimate format
    const transformedRecords = normalize2EstimateFormat(
      cnc7Records, 
      { quoteType: 'SW' },
      true  // Pass majorLineFlag as third parameter
    );
    console.log('transformedRecords after normalization:', transformedRecords);

    // Count lines and calculate savings
    const lineCount = countOutputLines(transformedRecords);
    const timeSaved = calculateTimeSavings(lineCount);

    // Convert to XLSX
    const buffer = convertToXLSXOutput(transformedRecords);
    
    // Define CNC links and contacts
    const cncInfo = {
      mailer: 'crosswork-device-sizing@cisco.com',
      sizingGuide: 'https://salesconnect.cisco.com/sc/s/simple-media?vtui__mediaId=a1m8c00000plBelAAE'
    };
    
    // Format comments for Webex message
    const commentsMsg = [
      '🔍 Device Mapping Results:',
      ...cnc7Comments,
      '',
      '📧 For sizing questions contact:',
      cncInfo.mailer,
      '',
      '📚 Automation Sizing Guide:',
      cncInfo.sizingGuide
    ].join('\n');

    // Log success
    logAudit(user, 'CNC7', STATUS.OK, 'File processed OK', lineCount);

    return {
      buffer,
      lineCount,
      timeSaved,
      comments: commentsMsg
    };

  } catch (error) {
    console.error('CNC7 Processing Error:', error.message);
    logAudit(user, 'CNC7', STATUS.ERROR, error.message, 0);
    throw error;
  }
}

// Test function to process CSV file
async function testCNC7QuoterWithFile(inputFilePath) {
  try {
    console.log('=== Testing CNC7 Quoter ===');
    console.log('Reading input file:', inputFilePath);

    // Read input file
    const fileContent = fs.readFileSync(inputFilePath);
    
    // Process through CNC7 workflow
    const result = await wflowCNC7Quoter(
      fileContent,
      'test-user',
      path.basename(inputFilePath)
    );

    // Generate output filename
    const outputPath = path.join(
      path.dirname(inputFilePath),
      `CNC7_Quote_${Date.now()}.xlsx`
    );

    // Write output file
    fs.writeFileSync(outputPath, result.buffer);

    console.log('\nProcessing complete:');
    console.log('- Lines processed:', result.lineCount);
    console.log('- Time saved:', result.timeSaved, 'minutes');
    console.log('- Output file:', outputPath);

  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

// Test function for bomProcessor
async function testBomProcessor(inputFilePath) {
  try {
    console.log('=== Testing BOM Processor ===');
    console.log('Reading input file:', inputFilePath);

    // Read and parse CSV file
    const fileContent = fs.readFileSync(inputFilePath, 'utf8');
    
    // Parse CSV to records
    const records = await convertCSV2Obj(fileContent);
    
    console.log('\nInput Records:');
    console.log(records);

    // Process through BOM processor
    const result = bomProcessor(records);

    console.log('\nProcessing Results:');
    console.log('-------------------');
    console.log(JSON.stringify(result, null, 2));
    console.log('-------------------');

    return result;

  } catch (error) {
    console.error('Test failed:', error.message);
    throw error;
  }
}

// Run test if file is executed directly
if (require.main === module) {
  const inputFile = process.argv[2];
  
  if (!inputFile) {
    console.error('Please provide input CSV file path');
    console.error('Usage: node cnc7quoter.js <input-file.csv>');
    process.exit(1);
  }

  if (!fs.existsSync(inputFile)) {
    console.error('Input file not found:', inputFile);
    process.exit(1);
  }

  testCNC7QuoterWithFile(inputFile)
    .then(() => console.log('Test completed successfully'))
    .catch(error => {
      console.error('Test failed:', error.message);
      process.exit(1);
    });

  testBomProcessor(inputFile)
    .then(() => console.log('Test completed successfully'))
    .catch(error => {
      console.error('Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { 
  wflowCNC7Quoter,
  bomProcessor,
  // Export test function
  testCNC7QuoterWithFile,
  testBomProcessor
};
