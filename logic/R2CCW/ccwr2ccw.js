const fs = require('fs');
const csv = require('csv');

async function processCSVFile(fileContent) {
  try {
    // Parse CSV content
    const records = await new Promise((resolve, reject) => {
      csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    // Validate structure (just check if we have any data)
    if (!records || records.length === 0) {
      throw new Error('CSV file is empty or invalid');
    }

    // Add test line
    records.push({
      ...records[0], // Copy structure from first row
      'Quote Number': 'TEST123' // Override one field for testing
    });

    // Convert back to CSV
    const output = await new Promise((resolve, reject) => {
      csv.stringify(records, {
        header: true,
        columns: Object.keys(records[0])
      }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    return output;

  } catch (error) {
    console.error('CSV Processing Error:', error);
    throw error;
  }
}

module.exports = { processCSVFile };

