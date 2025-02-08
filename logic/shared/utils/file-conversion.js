const XLSX = require('xlsx');
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

function convertXLSXtoCSV(xlsxBuffer) {
  try {
    console.log('### convertXLSXtoCSV function called');
    console.log('Buffer length:', xlsxBuffer.length);

    // Parse XLSX from buffer using XLSX library
    const workbook = XLSX.read(xlsxBuffer, { 
      type: 'buffer',
      WTF: true,          // Show detailed parsing info
      cellDates: true,
      cellNF: true,
      cellText: false
    });

    // Get first sheet
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];

    // Force sheet range
    sheet['!ref'] = 'A1:BX40';  // Force range to include all potential rows
    const range = XLSX.utils.decode_range(sheet['!ref']);
    console.log('Forced sheet range:', sheet['!ref']);

    // Convert to array first to see all data
    const data = XLSX.utils.sheet_to_json(sheet, {
      header: 1,          // Generate array of arrays
      raw: true,          // Keep raw values
      defval: '',         // Default empty cells to empty string
      blankrows: true,    // Keep blank rows
      range: range        // Use forced range
    });

    console.log('Data rows:', data.length);
    if (data.length > 0) {
      console.log('First row:', data[0]);
      if (data.length > 1) console.log('Second row:', data[1]);
      console.log('Last row:', data[data.length-1]);
    }

    // Convert array to CSV
    let csvContent = '';
    data.forEach((row, idx) => {
      // Ensure all cells are strings and properly quoted if needed
      const processedRow = row.map(cell => {
        if (cell === null || cell === undefined) return '';
        const str = String(cell).trim();
        return str.includes(',') ? `"${str}"` : str;
      });
      csvContent += processedRow.join(',') + '\n';
      if (idx < 2) console.log(`Row ${idx + 1}:`, processedRow.join(','));
    });

    // Log sheet info
    console.log('\n=== XLSX Sheet Info ===');
    console.log('Sheet name:', firstSheetName);
    console.log('Total rows:', data.length);
    console.log('Range rows:', range.e.r - range.s.r + 1);

    return csvContent;

  } catch (error) {
    console.error('XLSX to CSV conversion error:', error);
    throw new Error('Failed to convert Excel file to CSV');
  }
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
  convertXLSXtoCSV,
  normalize2EstimateFormat,
  BridgeAIPostProcess,
  parseCSVToRecords
};

