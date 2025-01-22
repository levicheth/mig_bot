const fs = require('fs');
const csv = require('csv');
const XLSX = require('xlsx');

// Preprocess CSV content to find and extract data starting with header
function preprocessCSV(content) {
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

// Calculate duration between dates in months
function calculateDuration(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Calculate months difference
    const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                  (end.getMonth() - start.getMonth());
    
    return Math.max(0, months);  // Ensure non-negative
  } catch (error) {
    console.error('Date calculation error:', error.message);
    return 0;
  }
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

async function processCSVFile(fileContent) {
  try {
    // Clean the input - first preprocess to find valid data
    const preprocessed = preprocessCSV(fileContent.toString());
    
    // Then handle comma-starting lines
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
      throw new Error('No valid CSV content found');
    }

    // Parse CSV content
    const records = await new Promise((resolve, reject) => {
      csv.parse(cleanContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relaxColumnCount: true  // Add this to be more forgiving with malformed CSV
      }, (err, data) => {
        if (err) reject(new Error('Invalid CSV format'));
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

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Convert records to worksheet
    const ws = XLSX.utils.json_to_sheet(transformedRecords, {
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
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    return buffer;

  } catch (error) {
    console.error('CSV Processing Error:', error.message);  // Only log error message
    throw error;
  }
}

module.exports = { processCSVFile };

