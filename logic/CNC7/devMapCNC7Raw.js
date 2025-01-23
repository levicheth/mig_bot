// Device type to license type mapping
const deviceMapping = {
  'Cisco': { 
    // Cisco 8100 Series
    '8101-32H': 'Type B',
    '8102-64H': 'Type B',
    '8101-32FH': 'Type B',
    '8111-32EH': 'Type C',
    
    // Cisco 8200 Series
    '8201-24H8FH': 'Type A',
    '8201-SYS': 'Type B',
    '8201-32FH': 'Type B',
    '8202-32FH-M': 'Type B',
    '8202-SYS': 'Type B',
    '8211-32FH-M': 'Type B',
    '8212-48FH-M': 'Type C',

    // Cisco 8600 Series
    '8608': 'Type B',

    // Cisco 8700 Series
    '8711-32FH-M': 'Type B',
    '8712': 'Type B',

    // Cisco 8800 Series
    '8804': 'Type C',
    '8808': 'Type C',
    '8812': 'Type C',
    '8818': 'Type C',
    
    // NCS 5000 Series
    'NCS-5001': 'Type A',
    'NCS-5002': 'Type A',
    'NCS-5011': 'Type A',
    
    // NCS 5500 Series
    'NCS-5501': 'Type A',
    'NCS-5502': 'Type A',
    'NCS-55A1': 'Type A',
    'NCS-55A2': 'Type A',
    'NCS-5504': 'Type C',
    'NCS-5508': 'Type C',
    'NCS-5516': 'Type C',
    
    // NCS 540 Series
    'NCS-540': 'Type A',
    
    // NCS 560 Series
    'NCS-560': 'Type B',
    
    // NCS 5700 Series
    'NCS-57B1': 'Type A',
    'NCS-57C1': 'Type A',
    'NCS-57C3': 'Type A',
    'NCS-57D2': 'Type B',
    
    // ASR 9000 Series
    'ASR-9001': 'Type A',
    'ASR-9006': 'Type C',
    'ASR-9010': 'Type C',
    'ASR-9901': 'Type A',
    'ASR-9902': 'Type B',
    'ASR-9903': 'Type C',
    'ASR-9904': 'Type C',
    'ASR-9906': 'Type C',
    'ASR-9910': 'Type C',
    'ASR-9912': 'Type C',
    'ASR-9922': 'Type C',
    
    // IOS XRv 9000
    'IOS-XRv-9000': 'Type A',
    
    // ASR 900 Series
    'ASR-902': 'Type A',
    'ASR-903': 'Type A',
    
    // ASR 920 Series
    'ASR-920': 'Type A'
  },
  'NonCisco': {
    'Any': 'Type A'
  }
};

module.exports = deviceMapping; 