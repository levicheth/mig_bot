const xlsx = require('node-xlsx');

function convertXLSXtoCSV(xlsxBuffer) {
  try {
    // Parse XLSX from buffer
    const sheets = xlsx.parse(xlsxBuffer);
    const rows = [];
    let csvContent = '';

    // Get first sheet only since we expect single sheet
    const sheet = sheets[0];
    if (!sheet || !sheet.data) {
      throw new Error('No valid sheet found in Excel file');
    }

    // Log sheet info
    console.log('\n=== XLSX Sheet Info ===');
    // console.log('Sheet name:', sheet.name);
    // console.log('Total rows:', sheet.data.length);
    
    // Process each row
    sheet.data.forEach((row) => {
      // Skip empty rows
      if (!row || row.every(cell => !cell)) return;
      
      // Clean and validate row data
      const cleanRow = row.map(cell => {
        if (cell === null || cell === undefined) return '';
        // Quote strings containing commas or newlines
        const cellStr = String(cell).trim()
          .replace(/\r\n/g, ' ')  // Replace CRLF with space
          .replace(/\n/g, ' ')    // Replace LF with space
          .replace(/\r/g, ' ');   // Replace CR with space
        return cellStr.includes(',') ? `"${cellStr}"` : cellStr;
      });
      
      // Only add non-empty rows
      if (cleanRow.some(cell => cell)) {
        csvContent += cleanRow.join(',') + '\n';
      }
    });

    return csvContent;

  } catch (error) {
    console.error('XLSX to CSV conversion error:', error);
    throw new Error('Failed to convert Excel file to CSV');
  }
}

module.exports = { convertXLSXtoCSV }; 