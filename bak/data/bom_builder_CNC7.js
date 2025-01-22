import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function processQuote() {
  // Read mapper data
  const mapperContent = fs.readFileSync(path.join(__dirname, 'mapper-db.csv'), 'utf-8');
  const mapperData = parse(mapperContent, {
    columns: true,
    skip_empty_lines: true
  });

  // Create mapper lookup
  const deviceMapper = new Map();
  mapperData.forEach(entry => {
    deviceMapper.set(entry.deviceType, entry);
  });

  // Read input data
  const inputContent = fs.readFileSync(path.join(__dirname, 'input.csv'), 'utf-8');
  const inputData = parse(inputContent, {
    columns: true,
    skip_empty_lines: true
  });

  // Process and group by CNC type
  const cncTypeGroups = new Map();
  
  inputData.forEach(input => {
    const mapperEntry = deviceMapper.get(input.type);
    if (!mapperEntry) {
      throw new Error(`Device type ${input.type} not found in mapper`);
    }

    const quantity = parseInt(input.count);
    const cncType = mapperEntry.cncType;
    
    cncTypeGroups.set(
      cncType, 
      (cncTypeGroups.get(cncType) || 0) + quantity
    );
  });

  // Convert to output format
  const output = Array.from(cncTypeGroups.entries()).map(([type, qty]) => ({
    Type: type,
    Qty: qty
  }));

  // Write output
  const outputContent = stringify(output, {
    header: true,
    columns: ['Type', 'Qty']
  });
  fs.writeFileSync(path.join(__dirname, 'output.csv'), outputContent);
}

// Execute the processor
processQuote();
