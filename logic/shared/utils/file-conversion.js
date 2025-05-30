const XLSX = require('xlsx');
const csv = require('csv');
const fs = require('fs');
const { calcReqStartDate, calculateDuration } = require('./quote-utils');

// Convert Records/JSON to XLSX buffer
function convertToXLSXOutput(records, quoteInfo = { quoteType: 'SW' }) {
  try {
    // Create workbook
    const wb = XLSX.utils.book_new();

    let ws;
    if (quoteInfo.quoteType === 'SW') {
      // SW header (as-is)
      ws = XLSX.utils.json_to_sheet(records, {
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
    } else {
      // TS header (as specified)
      ws = XLSX.utils.json_to_sheet(records, {
        header: [
          'Part Number',
          'Quantity',
          'Duration (Mnths)',
          'Initial Term(Months)',
          'Auto Renew Term(Months)',
          'Billing Model',
          'Requested Start Date',
          'List Price',
          'Discount %',
          'CPL/Draw Disc %',
          'Purchase Adjustments'
        ]
      });
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    // Generate buffer
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  } catch (error) {
    console.error('XLSX conversion error:', error.message);
    throw new Error('Failed to convert to Excel format');
  }
}

// convert XLSX > CSV ('392077814.xlsx', 'output.csv'); unused for now
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

// parse CSV to Records/JSON
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

// Parse quote body to get records from CSV content
async function convertCSV2Obj(csvContent) {
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

// normalize Records/JSON to Estimate Format
function normalize2EstimateFormat(records, quoteInfo = { quoteType: 'SW' }, majorLineFlag = false) {
  if (!Array.isArray(records)) {
    console.error('Invalid records format:', records);
    return [];
  }

  // Transform records to new format for SW
  if (quoteInfo.quoteType === 'SW') {
    const reqStartDate = calcReqStartDate();
    const transformedRecords = records.map(record => {
      const startDate = record.startDate || record['Start Date'] || '';
      const endDate = record.endDate || record['End Date'] || '';
      const duration = calculateDuration(startDate, endDate);
      const swFields = {
        'Part Number': record.pid || record['Product Number'] || record['Part Number'] || '',
        'Quantity': parseInt(record.qty || record['Quantity'] || '1', 10),
        'Duration (Mnths)': record['Duration'] || '',
        'List Price': '',
        'Discount %': '',
        'Initial Term(Months)': parseInt(record['Initial Term(Months)'] || record['Duration'] || duration || '0', 10),
        'Auto Renew Term(Months)': 0,
        'Billing Model': 'Prepaid Term',
        'Requested Start Date': reqStartDate,
        'Notes': ''
      };
      return swFields;
    });
    return transformedRecords;
  } else {
    const servicesTransformedRecordsRaw = records.map(record => {
      const rawListPrice = record['Prorated List Price'];
      // Replace specific suffix with generic '-1'
      const originalSKU = record.sku || record['SKU'] || '';
      const lastDashIndex = originalSKU.lastIndexOf('-');
      const SKUNoPrefix = lastDashIndex !== -1
        ? originalSKU.substring(0, lastDashIndex + 1) + '1'
        : originalSKU;
      const ListPrice = rawListPrice && !isNaN(parseFloat(rawListPrice))
        ? parseFloat(rawListPrice)
        : 0;
      return {
        'Part Number': SKUNoPrefix,
        'Quantity': 1,
        'Duration (Mnths)': '',
        'Initial Term(Months)': '',
        'Auto Renew Term(Months)': '',
        'Billing Model': '',
        'Requested Start Date': '',
        'List Price': ListPrice,
        'Discount %': '',
        'CPL/Draw Disc %': '',
        'Purchase Adjustments': ''
      };
    });

    // Pivot: group by Part Number and sum List Price
    const pivotMap = new Map();
    for (const rec of servicesTransformedRecordsRaw) {
      const key = rec['Part Number'];
      if (!pivotMap.has(key)) {
        pivotMap.set(key, { ...rec });
      } else {
        const existing = pivotMap.get(key);
        existing['List Price'] += rec['List Price'];
      }
    }
    // Format List Price as float with 2 decimals
    const servicesTransformedRecords = Array.from(pivotMap.values()).map(rec => ({
      ...rec,
      'List Price': rec['List Price'] ? rec['List Price'].toFixed(2) : ''
    }));

    return servicesTransformedRecords;
  }
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
  convertExcelToCSV,
  convertCSV2Obj
};

