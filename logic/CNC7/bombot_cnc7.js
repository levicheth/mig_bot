const fs = require('fs');
const path = require('path');
const deviceMapping = require('./devMapCNC7Raw.js');

// Pre-process input string to clean up special characters
function preprocessInput(inputContent, bypassPreprocess = false) {
  try {
    // If bypass is enabled, return content as-is
    if (bypassPreprocess) {
      console.log("\n=== Preprocessing Bypassed ===");
      console.log("Original input:", JSON.stringify(inputContent));
      return inputContent;
    }

    console.log("\n=== Input Analysis ===");
    console.log("Original input:", JSON.stringify(inputContent));
    console.log("Input bytes:", Array.from(inputContent).map(c => ({
      char: c,
      code: c.charCodeAt(0),
      hex: '0x' + c.charCodeAt(0).toString(16)
    })));

    // First normalize any possible newline formats to \n
    const normalizedInput = inputContent
      .replace(/\r\n/g, '\n')     // Convert Windows newlines
      .replace(/<br\s*\/?>/gi, '\n') // Convert HTML breaks
      .replace(/\r/g, '\n');      // Convert remaining carriage returns

    console.log("\nAfter newline normalization:", JSON.stringify(normalizedInput));
    
    // Keep only letters, numbers, dash, comma, and newlines
    const cleaned = normalizedInput
      .split('\n')                          // Split into lines
      .map(line => 
        line.replace(/[^a-zA-Z0-9,-]/g, '') // Keep only alphanumeric, dash, comma
      )
      .filter(line => line)                 // Remove empty lines
      .join('\n');                          // Rejoin with newlines
    
    console.log("\nFinal cleaned input:", JSON.stringify(cleaned));
    return cleaned;
  } catch (error) {
    console.error("Input preprocessing error:", error.message);
    throw error;
  }
}

// Normalize input into structured format
function normalizeInput(cleanedInput) {
  try {
    // Track invalid entries
    const invalidEntries = [];
    
    // Process each line
    const entries = cleanedInput
      .split('\n')                          // Split on newlines
      .map(line => line.replace(/^BOM/i, ''))  // Remove BOM from each line
      .reduce((acc, line) => {
        try {
          // Split line on comma
          const parts = line.split(',');
          
          // Process each device-count pair in the line
          for (let i = 0; i < parts.length; i += 2) {
            const deviceType = parts[i];
            const count = parts[i + 1];
            
            if (!deviceType || !count) {
              invalidEntries.push(`${deviceType || ''}${count ? `,${count}` : ''}`);
              continue;
            }

            const quantity = parseInt(count);
            if (isNaN(quantity) || quantity <= 0) {
              invalidEntries.push(`${deviceType},${count}`);
              continue;
            }
            
            acc.push({ deviceType, count: quantity });
          }
          return acc;
        } catch (err) {
          invalidEntries.push(line);
          return acc;
        }
      }, []);

    if (entries.length === 0 && invalidEntries.length === 0) {
      throw new Error('No device entries found in input');
    }

    console.log("Normalized entries:", entries);
    console.log("Invalid entries:", invalidEntries);
    
    return {
      validEntries: entries,
      invalidEntries
    };
  } catch (error) {
    console.error("Input normalization error:", error.message);
    throw error;
  }
}

// Parse input string into device entries
function parseInput(inputContent, bypassParsing = false) {
  try {
    // Step 1: Pre-process input (can be bypassed)
    const cleanedInput = preprocessInput(inputContent, bypassParsing);
    
    // Step 2: Normalize input (can be bypassed)
    if (bypassParsing) {
      console.log("\n=== Parsing Bypassed ===");
      // Simple split on newlines and commas
      const entries = cleanedInput
        .split(/[\n,]+/)
        .map(part => {
          const [deviceType, count] = part.trim().split(/\s+/);
          return { deviceType, count: parseInt(count) || 1 };
        })
        .filter(entry => entry.deviceType && !isNaN(entry.count));
      
      return {
        validEntries: entries,
        invalidEntries: []
      };
    }
    
    return normalizeInput(cleanedInput);
    
  } catch (error) {
    console.error("Input parsing error:", error.message);
    throw error;
  }
}

// Get device type mapping
function readDevMapping() {
  try {
    // Use the imported device mapping directly
    const ciscoDevices = deviceMapping.Cisco;
    const nonCiscoDevices = deviceMapping.NonCisco;

    // Create mapper lookup
    const deviceMapper = new Map();
    
    // Add Cisco devices
    Object.entries(ciscoDevices).forEach(([device, type]) => {
      deviceMapper.set(device, { deviceType: device, cncType: type });
    });
    
    // Add NonCisco devices
    Object.entries(nonCiscoDevices).forEach(([device, type]) => {
      deviceMapper.set(device, { deviceType: device, cncType: type });
    });

    console.log("Created device mapper with keys:", Array.from(deviceMapper.keys()));
    return deviceMapper;
  } catch (error) {
    console.error("Mapping error:", error.message);
    throw new Error('Failed to load device mapping data');
  }
}

// Process entries using device mapping
function bomProcessor(entries, deviceMapper) {
  try {
    // Process and group by vendor and CNC type
    const ciscoGroups = new Map();
    const nonCiscoGroups = new Map();
    
    entries.forEach(input => {
      console.log("Processing input:", input);
      const deviceType = input.deviceType;
      const mapperEntry = deviceMapper.get(deviceType);
      
      if (!mapperEntry) {
        throw new Error(`Device type ${deviceType} not found in mapping`);
      }

      const quantity = input.count;
      if (isNaN(quantity) || quantity <= 0) {
        throw new Error(`Invalid quantity for device ${deviceType}: ${quantity}`);
      }

      const cncType = mapperEntry.cncType;
      // Check if device exists in Cisco mapping
      const isCisco = deviceType in deviceMapping.Cisco;
      
      console.log(`Mapped ${deviceType} to ${cncType} with quantity ${quantity} (${isCisco ? 'Cisco' : 'Non-Cisco'})`);
      
      // Add to appropriate group
      const targetGroup = isCisco ? ciscoGroups : nonCiscoGroups;
      targetGroup.set(
        cncType, 
        (targetGroup.get(cncType) || 0) + quantity
      );
    });

    console.log("Final groups:", {
      cisco: Object.fromEntries(ciscoGroups),
      nonCisco: Object.fromEntries(nonCiscoGroups)
    });
    
    return {
      cisco: ciscoGroups,
      nonCisco: nonCiscoGroups
    };
  } catch (error) {
    console.error("Processing error:", error.message);
    throw error;
  }
}

// Generate formatted output string
function genOutput(groups, invalidEntries = []) {
  try {
    const sections = [];
    
    // Add Cisco section if we have Cisco devices
    if (groups.cisco.size > 0) {
      sections.push('# Cisco');
      sections.push(Array.from(groups.cisco.entries())
        .sort((a, b) => a[0].localeCompare(b[0])) // Sort by type
        .map(([type, qty]) => `${type}, Qty ${qty}`)
        .join('\n')
      );
    }
    
    // Add Non-Cisco section if we have non-Cisco devices
    if (groups.nonCisco.size > 0) {
      sections.push('# Non Cisco');
      sections.push(Array.from(groups.nonCisco.entries())
        .sort((a, b) => a[0].localeCompare(b[0])) // Sort by type
        .map(([type, qty]) => `${type}, Qty ${qty}`)
        .join('\n')
      );
    }

    // Add invalid entries section if any
    if (invalidEntries.length > 0) {
      sections.push('\n# Invalid Entries');
      sections.push('The following entries were skipped due to invalid format:');
      sections.push(invalidEntries.map(entry => `- ${entry}`).join('\n'));
      sections.push('\nCorrect format is: deviceType,quantity (e.g., ASR-9001,2)');
    }

    const result = sections.join('\n');
    if (!result) {
      throw new Error('No output generated');
    }

    console.log("Generated output:", result);
    return result;
  } catch (error) {
    console.error("Output generation error:", error.message);
    throw error;
  }
}

// Main processing function
function processQuote(inputContent, bypassParsing = true) {  // Set default to bypass
  console.log("\n=== ProcessQuote Start ===");
  console.log("Received input content:", inputContent);
  
  try {
    // Parse input with optional bypass
    const { validEntries, invalidEntries } = parseInput(inputContent, bypassParsing);
    
    // Load device mapping
    const deviceMapper = readDevMapping();
    
    // Process BoM
    const cncTypeGroups = bomProcessor(validEntries, deviceMapper);
    
    // Generate output including invalid entries
    return genOutput(cncTypeGroups, invalidEntries);

  } catch (error) {
    console.error("ProcessQuote Error:", error);
    throw error;
  }
}

module.exports = { 
  processQuote,
  // Export individual functions for testing
  parseInput,
  readDevMapping,
  bomProcessor,
  genOutput
};
