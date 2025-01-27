// Device type to license mapping
const deviceMapping = {
  // Cisco 8100 Series Routers
  '8101': 'S',
  '8102': 'S',
  '8111': 'L',

  // Cisco 8200 Series Routers
  '8201': 'S',
  '8202': 'S',
  '8211': 'S',
  '8212': 'L',

  // Cisco 8600 Series Routers
  '8608': 'L',

  // Cisco 8700 Series Routers
  '8711': 'L',
  '8712': 'L',

  // Cisco 8800 Series Routers
  '8804': 'L',
  '8808': 'L',
  '8812': 'L',
  '8818': 'L',

  // Cisco Network Convergence System 5000 Series
  '5001': 'S',
  '5002': 'S',
  '5011': 'S',
  
  // Cisco Network Convergence System 5500 Series
  '5501': 'S',
  '5502': 'S',
  '5504': 'L',
  '5508': 'L',
  '5516': 'L',
  
  // Cisco Network Convergence System 540/560 Series
  '540': 'S',
  '560': 'L',
  
  // Cisco Network Convergence System 5700 Series
  '57B1': 'S',
  '57C1': 'S',
  '57C3': 'S',
  '57D2': 'L',
  
  // Cisco ASR 9000 Series
  '9001': 'S',
  '9006': 'L',
  '9010': 'L',
  '9901': 'S',
  '9902': 'L',
  '9903': 'L',
  '9904': 'L',
  '9906': 'L',
  '9910': 'L',
  '9912': 'L',
  '9922': 'L',
  
  // Cisco ASR 900 Series
  '902': 'S',
  '903': 'S',
  '920': 'S',

  // Cisco Catalyst Series
  '2900': 'S',
  '3750': 'S',
  '3850': 'S',
  '4500': 'S',
  '4900': 'S',
  '5500': 'S',
  '6500': 'S',
  '6800': 'S',
  '8300': 'S',
  '8500': 'L',
  
  // Cisco IR Series
  'IR8300': 'S',
  'IR8300': 'S',

  // Cisco ISR Series
  '1800': 'S',
  '1900': 'S',
  '2600': 'S',
  '2700': 'S',
  '2800': 'S',
  '2900': 'S',
  '3800': 'S',
  '3900': 'S',
  '4000': 'S',

  // Cisco Nexus Series
  '2000': 'S',
  '5000': 'S',
  '6001': 'S',
  '9200': 'S',
  '9300': 'S',
  '3000': 'S',
  '6004': 'S',
  '7000': 'S',
  '9500': 'S',

  // Cisco ME Series
  '1200': 'S',
  '3400': 'S',
  '3600X': 'S',
  '3800X': 'S',
  '4900': 'S',

  // Cisco ASR Series
  '1001': 'S',
  '1002': 'S',
  '1004': 'S',
  '1006': 'L',
  '1009': 'L',
  '1013': 'L',

  // Cisco Other Series
  '800': 'S',
  '2500': 'S',
  '7200': 'S',
  '7300': 'S',
  '7600': 'S',
  'ASA5500': 'S',
  'uBR10000': 'L',
  'CRS': 'L',
  'GSR': 'L',
  'CBR8': 'L',
  'CRS16': 'L',
  'ASR9000v': 'S',

  // Third Party Devices
  'A10 AX': 'S',
  'Thunder': 'S',
  
  // Adtran
  'Adtran TA900': 'S',
  'Adtran TA5000': 'S',
  
  // Adva
  'Adva FSP1500C': 'S',
  
  // Affirmed Networks
  'Affirmed Acultas': 'S',
  
  // Alcatel-Lucent / ALU
  'ALU 6850E': 'S',
  'ALU 6855': 'S',
  'ALU 7210': 'S',
  'ALU 7450': 'S',
  'ALU 7705': 'S',
  'ALU 7750': 'L',
  'ALU 7950': 'L',
  
  // OmniSwitch
  'ALU OS6450': 'S',
  'ALU OS6900': 'S',
  'ALU OS6860E': 'S'
};

module.exports = deviceMapping; 