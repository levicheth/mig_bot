const XLSX = require('xlsx');
const fs = require('fs');
const { calcReqStartDate, calculateDuration } = require('./quote-utils');

// Convert CSV to XLSX buffer
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

// convertExcelToCSV('392077814.xlsx', 'output.csv');
function convertExcelToCSV(inputFile, outputFile) {
  // Read the Excel file (assumes one sheet)
  const workbook = XLSX.readFile(inputFile);
  // Use the first sheet in the workbook
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  // Convert the worksheet to CSV format
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  // Save the CSV string to a file
  fs.writeFileSync(outputFile, csv);  
}

function parseCSVToRecords(csvString) {
  try {
    // Split CSV into lines
    const lines = csvString.trim().split('\n');
    
    // Get headers from first line
    const headers = lines[0].split(',');
    
    // Convert remaining lines to records
    const records = lines.slice(1).map(line => {
      const values = line.split(',');
      const record = {};
      headers.forEach((header, index) => {
        // Map CSV columns to record fields
        switch(header.trim()) {
          case 'Part Number':
            record.sku = values[index];
            break;
          case 'Quantity':
            record.qty = values[index];
            break;
          case 'Duration':
            // Map Duration to Initial Term
            record['Initial Term(Months)'] = values[index];
            break;
          default:
            record[header.trim()] = values[index];
        }
      });
      return record;
    });

    console.log('Parsed records:', records); // Debug log
    return records;
  } catch (error) {
    console.error('Error parsing CSV to records:', error);
    return [];
  }
}

function normalize2EstimateFormat(records, quoteInfo = { quoteType: 'HW' }) {
  if (!Array.isArray(records)) {
    console.error('Invalid records format:', records);
    return [];
  }

  // Get requested start date
  const reqStartDate = calcReqStartDate();

  // Transform records to new format
  return records.map(record => {
    const startDate = record.startDate || record['Start Date'] || '';
    const endDate = record.endDate || record['End Date'] || '';
    const duration = calculateDuration(startDate, endDate);

    return {
      'Part Number': quoteInfo.quoteType === 'SW' 
        ? (record.pid || record['Product Number'] || '')
        : (record.sku || record['SKU'] || ''),
      'Quantity': parseInt(record.qty || record['Quantity'] || '1', 10),
      'Duration (Mnths)': '',
      'List Price': '',
      'Discount %': '',
      'Initial Term(Months)': parseInt(record['Initial Term(Months)'] || duration || '0', 10),
      'Auto Renew Term(Months)': 0,
      'Billing Model': 'Prepaid Term',
      'Requested Start Date': reqStartDate,
      'Notes': ''
    };
  });
}

function BridgeAIPostProcess(csvResult) {
  try {
    // If csvResult is undefined or null, return empty CSV
    if (!csvResult) {
      console.warn('Empty CSV result received');
      return 'Part Number,Quantity,Duration\n';
    }

    // Ensure csvResult is a string
    const csvString = csvResult.toString();

    // Split into lines and filter out empty lines
    const lines = csvString.split('\n').filter(line => line.trim());
    
    // Validate header
    const expectedHeader = 'Part Number,Quantity,Duration';
    const headerIndex = lines.findIndex(line => line.includes(expectedHeader));
    
    // Extract only the CSV portion (from header onwards)
    const csvLines = headerIndex >= 0 
      ? lines.slice(headerIndex) 
      : [expectedHeader, ...lines];

    // Clean and validate each line
    const cleanedLines = csvLines.map(line => {
      // Remove any quotes, extra whitespace, and carriage returns
      return line.replace(/["'\r]/g, '').trim();
    }).filter(line => {
      // Keep only lines that have the correct format (two commas)
      const parts = line.split(',');
      return parts.length === 3;
    });

    // Ensure we have at least a header
    if (cleanedLines.length === 0) {
      cleanedLines.push(expectedHeader);
    }

    // Rejoin lines with proper line endings
    const result = cleanedLines.join('\n');
    console.log('Processed CSV result:', result); // Debug log
    return result;

  } catch (error) {
    console.error('Error in BridgeAIPostProcess:', error);
    // Return empty CSV with header if processing fails
    return 'Part Number,Quantity,Duration\n';
  }
}

module.exports = {
  convertToXLSXOutput,
  normalize2EstimateFormat,
  BridgeAIPostProcess,
  parseCSVToRecords,
  convertExcelToCSV
};

