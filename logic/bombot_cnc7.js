const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');
const csvStringify = require('csv-stringify/sync');

function processQuote(inputContent) {
  console.log("\n=== ProcessQuote Start ===");
  console.log("Received input content:", inputContent);
  
  try {
    // Read mapper data
    const mapperContent = fs.readFileSync(path.join(__dirname, 'mapping.csv'), 'utf-8');
    console.log("Loaded mapper content:", mapperContent);
    
    const mapperData = csv.parse(mapperContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    // Create mapper lookup
    const deviceMapper = new Map();
    mapperData.forEach(entry => {
      deviceMapper.set(entry.deviceType, entry);
    });
    console.log("Created device mapper with keys:", Array.from(deviceMapper.keys()));

    // Parse space-separated input
    const entries = inputContent
      .split(/\s+/)  // Split on whitespace
      .filter(entry => entry && entry !== 'BOM')  // Remove empty entries and "BOM"
      .map(entry => {
        const [deviceType, count] = entry.split(',');
        return { deviceType, count };
      });

    console.log("Parsed input entries:", entries);

    // Process and group by CNC type
    const cncTypeGroups = new Map();
    
    entries.forEach(input => {
      console.log("Processing input:", input);
      const deviceType = input.deviceType;
      const mapperEntry = deviceMapper.get(deviceType);
      if (!mapperEntry) {
        throw new Error(`Device type ${deviceType} not found in mapper`);
      }

      const quantity = parseInt(input.count);
      if (isNaN(quantity) || quantity <= 0) {
        throw new Error(`Invalid quantity for device ${deviceType}: ${input.count}`);
      }

      const cncType = mapperEntry.cncType;
      console.log(`Mapped ${deviceType} to ${cncType} with quantity ${quantity}`);
      
      // Add to existing quantity for this CNC type
      cncTypeGroups.set(
        cncType, 
        (cncTypeGroups.get(cncType) || 0) + quantity
      );
    });

    console.log("Final CNC type groups:", Object.fromEntries(cncTypeGroups));

    // Format output as text
    const result = Array.from(cncTypeGroups.entries())
      .map(([type, qty]) => `${type}, Qty ${qty}`)
      .join('\n');

    console.log("Final result:", result);
    return result;

  } catch (error) {
    console.error("ProcessQuote Error:", error);
    throw error;
  }
}

// Export using CommonJS
module.exports = { processQuote };
