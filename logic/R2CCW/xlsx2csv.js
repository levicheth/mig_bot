const XLSX = require('xlsx');

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

module.exports = { convertXLSXtoCSV }; 