// const tesseract = require("tesseract.js");
const fs = require("fs");
const csv = require('csv');

// Path to the input image
const inputImagePath = "./image.png"; // Replace with the correct image path
const outputCsvPath = "./OUT01.csv";

// Template columns
const tplColumns = [
  "Part Number",
  "Quantity", 
  "Duration (Mnths)",
  "List Price",
  "Discount %",
  "Initial Term(Months)",
  "Auto Renew Term(Months)",
  "Billing Model",
  "Requested Start Date",
  "Notes"
];

/*
// Perform OCR on the input image
tesseract.recognize(inputImagePath, "eng")
  .then(({ data: { text } }) => {
    // Parse OCR text into structured data (manually cleaned for now)
*/

// Function to process image and return CSV data
async function processImageToCSV(imageContent) {
  try {
    // For now, return mock data structure matching CCWR2CCW output format
    const cleanedData = [
      { "TERM, MON": 47, "Product Number": "ADN-ED-100G-SIA3", "Quantity": 36 },
      { "TERM, MON": 40, "Product Number": "ESS-100G-SIA-3", "Quantity": 60 },
      { "TERM, MON": 40, "Product Number": "ADV-100G-SIA-3", "Quantity": 60 },
      { "TERM, MON": 42, "Product Number": "ESS-100G-SIA-3", "Quantity": 180 },
      { "TERM, MON": 42, "Product Number": "ADV-100G-SIA-3", "Quantity": 180 },
      { "TERM, MON": 51, "Product Number": "ESS-100G-SIA-3", "Quantity": 24 },
      { "TERM, MON": 51, "Product Number": "ADV-100G-SIA-3", "Quantity": 24 },
      { "TERM, MON": 42, "Product Number": "ESS-AC-10G-SIA-3", "Quantity": 750 },
      { "TERM, MON": 42, "Product Number": "ADV-AC-10G-SIA-3", "Quantity": 750 },
      { "TERM, MON": 43, "Product Number": "ESS-AC-10G-SIA-3", "Quantity": 1875 },
      { "TERM, MON": 43, "Product Number": "ADV-AC-10G-SIA-3", "Quantity": 1875 },
      { "TERM, MON": 45, "Product Number": "ESS-AC-10G-SIA-3", "Quantity": 1125 },
      { "TERM, MON": 45, "Product Number": "ADV-AC-10G-SIA-3", "Quantity": 1125 },
      { "TERM, MON": 46, "Product Number": "ESS-AC-10G-SIA-3", "Quantity": 3000 },
      { "TERM, MON": 46, "Product Number": "ADV-AC-10G-SIA-3", "Quantity": 3000 },
      { "TERM, MON": 47, "Product Number": "ESS-AC-10G-SIA-3", "Quantity": 7000 },
      { "TERM, MON": 47, "Product Number": "ADV-AC-10G-SIA-3", "Quantity": 7000 },
    ];

    // Compute dynamic "Requested Start Date" (30 days from now)
    const requestedStartDate = new Date();
    requestedStartDate.setDate(requestedStartDate.getDate() + 30);
    const formattedDate = requestedStartDate.toLocaleDateString("en-US");

    // Map data to match the template structure
    const outputData = cleanedData.map(row => ({
      "Part Number": row["Product Number"],
      "Quantity": row["Quantity"],
      "Duration (Mnths)": "",
      "List Price": "",
      "Discount %": "",
      "Initial Term(Months)": row["TERM, MON"],
      "Auto Renew Term(Months)": 0,
      "Billing Model": "Prepaid Term",
      "Requested Start Date": formattedDate,
      "Notes": ""
    }));

    // Convert to CSV using csv library
    const csvData = await new Promise((resolve, reject) => {
      csv.stringify(outputData, {
        header: true,
        columns: tplColumns
      }, (err, output) => {
        if (err) reject(new Error('Failed to generate CSV'));
        else resolve(output);
      });
    });

    // Return in the same format as CCWR2CCW
    return {
      buffer: Buffer.from(csvData), // Now using actual CSV data
      lineCount: outputData.length,
      timeSaved: outputData.length * 0.5,
      quoteInfo: {
        quoteNumber: 'ANY2CCW-' + Date.now(),
        quoteCurrency: 'USD',
        quotePrice: ''
      }
    };

  } catch (error) {
    console.error("Error during image processing:", error);
    throw error;
  }
}

module.exports = {
  processImageToCSV
};
