// Device type to license type mapping with regex patterns
const deviceMapping = {
  'Cisco': {
    // Cisco 8000 Series patterns
    '^81[0-9]{2}-.*': 'Type B',      // 8100 series default to Type B
    '^8111-.*': 'Type C',            // Override for 8111
    '^82[0-9]{2}-.*': 'Type B',      // 8200 series default to Type B
    '^8212-.*': 'Type C',            // Override for 8212
    '^86[0-9]{2}': 'Type B',         // 8600 series
    '^87[0-9]{2}.*': 'Type B',       // 8700 series
    '^88[0-9]{2}': 'Type C',         // All 8800 series are Type C
    
    // NCS Series patterns - support NCS, NCS-, or direct number
    '^(?:NCS-?)?5[0-9]{3}$': 'Type A',     // NCS-5xxx default to Type A
    '^(?:NCS-?)?55[A-Z][1-2]$': 'Type A',  // NCS-55Ax
    '^(?:NCS-?)?55(?:04|08|16)$': 'Type C',// NCS-55xx large chassis
    '^(?:NCS-?)?540': 'Type A',            // NCS 540 series
    '^(?:NCS-?)?560': 'Type B',            // NCS 560 series
    '^(?:NCS-?)?57[BC][1-3]': 'Type A',    // NCS 57x1/x3
    '^(?:NCS-?)?57D2': 'Type B',           // NCS 57D2
    
    // ASR Series patterns - support ASR, ASR-, or direct number
    '^(?:ASR-?)?9001': 'Type A',
    '^(?:ASR-?)?9901': 'Type A',
    '^(?:ASR-?)?9902': 'Type B',
    '^(?:ASR-?)?99[0-9]{2}': 'Type C',     // ASR-99xx
    '^(?:ASR-?)?90(?:06|10)': 'Type C',    // ASR-9006/9010
    '^(?:ASR-?)?9[0-9]{3}': 'Type C',      // Other ASR-9xxx
    '^(?:ASR-?)?9[0-9]{2}': 'Type A',      // ASR-9xx (900 series)
    
    // Other patterns
    '^IOS-XRv-9000': 'Type A'
  },
  'NonCisco': {
    'Any': 'Type A'
  }
};

// Helper function to find matching type
function findDeviceType(deviceId) {
  // Check Cisco devices first
  for (const [pattern, type] of Object.entries(deviceMapping.Cisco)) {
    if (new RegExp(pattern).test(deviceId)) {
      return { vendor: 'Cisco', type };
    }
  }
  
  // Default to NonCisco
  return { vendor: 'NonCisco', type: deviceMapping.NonCisco.Any };
}

module.exports = { deviceMapping, findDeviceType };
