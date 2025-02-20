// Device type to license type mapping with regex patterns
const deviceMapping = {
  'Cisco': {
    // Cisco 8000 Series patterns
    '^81[0-9]{2}': 'Type B',      // 8100 series default
    '^8111': 'Type C',            // Override for 8111
    '^82[0-9]{2}': 'Type B',      // 8200 series default
    '^8212': 'Type C',            // Override for 8212
    '^86[0-9]{2}': 'Type B',      // 8600 series
    '^87[0-9]{2}': 'Type B',      // 8700 series
    '^88[0-9]{2}': 'Type C',      // 8800 series
    
    // NCS Series patterns
    '^(?:NCS-?)?5[0-9]{3}$': 'Type A',     // NCS-5xxx default
    '^(?:NCS-?)?55[A-Z][1-2]$': 'Type A',  // NCS-55Ax
    '^(?:NCS-?)?55(?:04|08|16)$': 'Type C',// NCS-55xx large chassis
    '^(?:NCS-?)?540': 'Type A',            // NCS 540 series
    '^(?:NCS-?)?560': 'Type B',            // NCS 560 series
    '^(?:NCS-?)?57[BC][1-3]': 'Type A',    // NCS 57x1/x3
    '^(?:NCS-?)?57D2': 'Type B',           // NCS 57D2

    // ASR Series patterns
    '^ASR-?9001': 'Type A',
    '^ASR-?99[0-9]{2}': 'Type A',
    '^ASR-?90(?:06|10)': 'Type C',
    '^ASR-?9[0-9]{3}': 'Type C',           // Other ASR-9xxx
    '^ASR-?9[0-9]{2}2': 'Type C',          // ASR-9xx2
    '^ASR-?90[2-3]': 'Type A',             // ASR-902/903
    '^ASR-?920': 'Type A',                 // ASR-920
    '^ASR-?10[0-9]{2}': 'Type A'           // ASR-1xxx series
  },
  'NonCisco': {
    // Single type vendors (Type A)
    '^(?:Adtran|Adva|Aviat|Overture|Quanta|Quagga)\\b': 'Type A',
    '^A10\\b': 'Type A',
    '^Citrix': 'Type A',
    '^Ericsson': 'Type A',
    '^F5\\b': 'Type A',
    '^Fortinet.*(?:50|60|80|90|100|200|[3-8]00|1000|3000|Virtual)': 'Type A',
    '^Fujitsu': 'Type A',    

    // Multi-name vendors
    '^(?:Alcatel|Lucent|ALU).*(?:6[8-9][0-9]{2}|7705)': 'Type A',
    '^(?:Alcatel|Lucent|ALU).*77(?:50|95)': 'Type C',

    // Arista patterns
    '^Arista.*(?:5000|7020R|7048|7150)': 'Type A',
    '^Arista.*7280(?:SR|CR3K-32D4)': 'Type B',
    '^Arista.*7280CR3K-96': 'Type C',
    '^Arista.*7250.*(?:B2|X1)': 'Type B',
    '^Arista.*7500R3': 'Type B',
    '^Arista.*7750.*SR-1-24D': 'Type A',
    '^Arista.*7750.*SR-1': 'Type C',
    '^Arista.*7800R[34]': 'Type A',

    // Ciena patterns
    '^Ciena.*(?:3000|ESM|Waveserver)': 'Type A',
    '^Ciena.*(?:5000|6500)': 'Type C',

    // Coriant patterns
    '^Coriant.*8602-8630': 'Type A',
    '^Coriant.*86(?:60|65)': 'Type C',


    // Extreme Networks patterns
    '^Extreme.*(?:SLX.*9[56]|7520|8820|9920)': 'Type B',
    '^Extreme.*SLX.*9540': 'Type A',

    // Huawei complex patterns
    '^Huawei.*(?:ATN.*9[15]0B|NE40E.*(?:X[123]|X8)|S[0-9]{4}|CX.*600)': 'Type A',
    '^Huawei.*(?:ATN Series|NE40E.*X8|CX.*600-X|NE[89]000|OSN.(?:8800|9800))': 'Type C',

    // Juniper patterns (simplified)
    '^Juniper.*(?:EX|SRX|ACX|CTP|ERX|M[0-9]+i|MX(?:5|10|40|80|104|204)|vSRX)': 'Type A',
    '^Juniper.*(?:MX(?:240|480|960|10003)|PTX.*3000)': 'Type B',
    '^Juniper.*(?:MX(?:2[0-9]{3}|304|10(?:004|008|016))|PTX.*(?:5000|10(?:002|003|004|008|016))|T[0-9]+)': 'Type C',

    // Nokia patterns (split by model)
    '^Nokia.*7210.*SAS': 'Type A',
    '^Nokia.*7250.*(?:IXR-(?:e|R[46]|s))': 'Type A',
    '^Nokia.*7250.*(?:IXR-(?:R6D|R6DL|Xs|X1))': 'Type B',
    '^Nokia.*7250.*(?:IXR-(?:X3|6|10))': 'Type C',
    '^Nokia.*7730.*SXR': 'Type B',
    '^Nokia.*7750.*(?:SR-1$)': 'Type A',
    '^Nokia.*7750.*(?:SR-(?:1s|2s|7|12|1x|7/7450|12/7450|12e))': 'Type B',
    '^Nokia.*7750.*(?:SR-(?:1se|2se|7s|14s))': 'Type C',
    '^Nokia.*7705.*SAR': 'Type A',

    // Palo Alto patterns
    '^Palo.*Alto.*(?:2000|3000|Virtual)': 'Type A',
    '^Palo.*Alto.*5000': 'Type C',

    // ZTE patterns
    '^ZTE.*(?:M6000-[235]S)': 'Type A',
    '^ZTE.*(?:M6000-(?:8S?|16)|CTN9000)': 'Type B',

    // Default pattern (must be last)
    'Any': 'Not Recognized'
  }
};

// Helper function to check if device is NonCisco
function isNonCiscoDev(deviceId) {
  // List of all non-Cisco vendor prefixes
  const nonCiscoVendors = [
    'A10',
    'Adtran',
    'Adva',
    'Affirmed',
    'Alcatel',
    'ALU',
    'Allot',
    'Arista',
    'Aviat',
    'Ciena',
    'Citrix',
    'Coriant',
    'Ericsson',
    'Extreme',
    'F5',
    'Fortinet',
    'Fujitsu',
    'Huawei',
    'Juniper',
    'Lucent',
    'Nokia',
    'Overture',
    'Palo Alto',
    'Quanta',
    'Quagga',
    'ZTE'
  ];

  // Create regex pattern with word boundaries
  const vendorPattern = new RegExp(`\\b(${nonCiscoVendors.join('|')})\\b`, 'i');
  return vendorPattern.test(deviceId);
}

// Helper function to find matching type
function findDeviceType(deviceId) {
  // First determine if it's a NonCisco device
  const isNonCisco = isNonCiscoDev(deviceId);

  if (!isNonCisco) {
    // Check Cisco patterns (case sensitive)
    for (const [pattern, type] of Object.entries(deviceMapping.Cisco)) {
      if (new RegExp(pattern).test(deviceId)) {
        return { vendor: 'Cisco', type };
      }
    }
  } else {
    // Check NonCisco patterns (case insensitive)
    for (const [pattern, type] of Object.entries(deviceMapping.NonCisco)) {
      if (pattern === 'Any') continue; // Skip the default pattern
      if (new RegExp(pattern, 'i').test(deviceId)) {
        return { vendor: 'NonCisco', type };
      }
    }
  }
  
  // Default to NonCisco unrecognized
  return { vendor: 'NonCisco', type: deviceMapping.NonCisco.Any };
}

// Helper function to find devices by vendor or device name
function findDevice(searchTerm) {
  const rawMapping = require('./devMapCNC7Raw.js');
  let results = [];

  // Handle "all" parameter
  if (searchTerm.toLowerCase() === 'all') {
    // Add all Cisco devices
    for (const [device, type] of Object.entries(rawMapping.Cisco)) {
      results.push(`Cisco ${device} > ${type}`);
    }

    // Add all NonCisco devices
    for (const [device, type] of Object.entries(rawMapping.NonCisco)) {
      if (device === 'Any') continue; // Skip the default entry
      results.push(`${device} > ${type}`);
    }

    // Format and return all devices
    return [
      "📋 Complete list of supported devices:",
      "",
      "=== Cisco Devices ===",
      ...results.filter(r => r.startsWith('Cisco')).sort(),
      "",
      "=== Non-Cisco Devices ===",
      ...results.filter(r => !r.startsWith('Cisco')).sort(),
      "",
      "📧 For sizing questions contact: crosswork-device-sizing@cisco.com",
      "📚 Automation Sizing Guide: https://salesconnect.cisco.com/sc/s/simple-media?vtui__mediaId=a1m8c00000plBelAAE"
    ].join('\n');
  }

  // Handle "cisco" parameter
  if (searchTerm.toLowerCase() === 'cisco') {
    // Add all Cisco devices
    for (const [device, type] of Object.entries(rawMapping.Cisco)) {
      results.push(`Cisco ${device} > ${type}`);
    }

    // Format and return Cisco devices
    return [
      "📋 Complete list of Cisco devices:",
      "",
      "=== 8000 Series ===",
      ...results.filter(r => r.includes('8')).sort(),
      "",
      "=== NCS Series ===",
      ...results.filter(r => r.includes('NCS')).sort(),
      "",
      "=== ASR Series ===",
      ...results.filter(r => r.includes('ASR')).sort(),
      "",
      "📧 For sizing questions contact: crosswork-device-sizing@cisco.com",
      "📚 Automation Sizing Guide: https://salesconnect.cisco.com/sc/s/simple-media?vtui__mediaId=a1m8c00000plBelAAE"
    ].join('\n');
  }

  // Original search logic
  const searchLower = searchTerm.toLowerCase();

  // Search in Cisco devices
  for (const [device, type] of Object.entries(rawMapping.Cisco)) {
    if (device.toLowerCase().includes(searchLower)) {
      results.push(`Cisco ${device} > ${type}`);
    }
  }

  // Search in NonCisco devices
  for (const [device, type] of Object.entries(rawMapping.NonCisco)) {
    if (device === 'Any') continue;

    if (device.toLowerCase().startsWith(searchLower)) {
      results.push(`${device} > ${type}`);
    }
    else if (device.toLowerCase().includes(searchLower)) {
      results.push(`${device} > ${type}`);
    }
  }

  // Format the response
  if (results.length === 0) {
    return "No matching devices found. For questions contact: crosswork-device-sizing@cisco.com";
  }

  return [
    "🔍 Found matching devices:",
    ...results.sort(),
    "",
    "📧 For sizing questions contact: crosswork-device-sizing@cisco.com",
    "📚 Automation Sizing Guide: https://salesconnect.cisco.com/sc/s/simple-media?vtui__mediaId=a1m8c00000plBelAAE"
  ].join('\n');
}

module.exports = { findDeviceType, findDevice };
