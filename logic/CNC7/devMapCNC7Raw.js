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
    'ASR-920': 'Type A',

    // ASR 1000 Series
    'ASR-1001': 'Type A',
    'ASR-1002': 'Type A',
    'ASR-1006': 'Type A',
    'ASR-1009': 'Type A',
    'ASR-1013': 'Type A'
  },
  'NonCisco': {
    // A10 Devices
    'A10 AX Series': 'Type A',
    'A10 Thunder Series': 'Type A',

    // Adtran Devices
    'Adtran Total Access 900': 'Type A',
    'Adtran Total Access 5000': 'Type A',
    
    // Adva Devices
    'Adva Carrier Ethernet FSP 150CC': 'Type A',
    
    // Affirmed Networks Devices
    'Affirmed Acuitas Service Management': 'Type A',
    
    // Alcatel-Lucent Devices
    'Alcatel-Lucent 6850E-U24X': 'Type A',
    'Alcatel-Lucent 6855U10': 'Type A',
    'Alcatel-Lucent 6855U24X': 'Type A',
    'Alcatel-Lucent 7705 Service Router': 'Type A',
    'Alcatel-Lucent 7750 Service Router': 'Type C',
    'Alcatel-Lucent 7950 Extensible Routing System': 'Type C',
    'Alcatel-Lucent OS6860E-U28': 'Type A',

    // Allot Devices
    'Allot SG9700': 'Type A',

    // Arista Devices
    'Arista 5000 Series': 'Type A',
    'Arista 7020R': 'Type A',
    'Arista 7048 Series': 'Type A',
    'Arista 7150 Series': 'Type A',
    'Arista 7280SR/7280E': 'Type B',
    'Arista 7280CR3K-32D4 Switch': 'Type A',
    'Arista 7280CR3K-96': 'Type C',
    'Arista 7250 IXR-B2': 'Type B',
    'Arista 7250 IXR-X1': 'Type B',
    'Arista 7500R3': 'Type B',
    'Arista 7750 SR-1': 'Type C',
    'Arista 7750 SR-1-24D': 'Type A',
    'Arista 7800R3': 'Type A',
    'Arista 7800R4': 'Type A',
    'Arista 7250 IXR-R6dl': 'Type A',

    // Aviat Devices
    'Aviat CTR 8740': 'Type A',

    // Ciena Devices
    'Ciena 3000 Family': 'Type A',
    'Ciena 5000 Family': 'Type C',
    'Ciena 6500 Family': 'Type C',
    'Ciena ESM': 'Type A',
    'Ciena Waveserver 5': 'Type A',
    'Ciena Waveserver Ai': 'Type A',

    // Citrix Devices
    'Citrix Netscaler 1000v': 'Type A',

    // Coriant Devices
    'Coriant 8602-8630': 'Type A',
    'Coriant 8660': 'Type C',
    'Coriant 8665': 'Type C',

    // Ericsson/Redback Devices
    'Ericsson SE100, 1200': 'Type A',
    'Ericsson SE400': 'Type A',
    'Ericsson SE800': 'Type A',
    'Ericsson SSR 8020': 'Type A',

    // Extreme Networks Devices
    'Extreme SLX 9540': 'Type A',
    'Extreme SLX 9640': 'Type A',
    'Extreme SLX 9740': 'Type B',
    'Extreme 7520': 'Type B',
    'Extreme 8820': 'Type B',
    'Extreme 9920': 'Type B',

    // F5 Networks Devices
    'F5 BIG-IP 1600': 'Type A',
    'F5 BIG-IP 3600': 'Type A',
    'F5 BIG-IP 3900': 'Type A',
    'F5 BIG-IP 6400': 'Type A',
    'F5 BIG-IP 8900': 'Type A',
    'F5 BIG-IP Virtual Edition': 'Type A',
    'F5 Viprion Chassis': 'Type A',

    // Fortinet Devices
    'Fortinet FortiGate 50/60/80/90 Series': 'Type A',
    'Fortinet FortiGate 100 Series': 'Type A',
    'Fortinet FortiGate 200 Series': 'Type A',
    'Fortinet FortiGate 500-300 Series': 'Type A',
    'Fortinet FortiGate 800-600 Series': 'Type A',
    'Fortinet FortiGate 1000 Series': 'Type A',
    'Fortinet FortiGate 3000 Series': 'Type A',
    'Fortinet FortiGate Virtual Appliances': 'Type A',

    // Fujitsu Devices
    'Fujitsu 1FINITY L100 Lambda Blade Series': 'Type A',
    'Fujitsu 1FINITY T300 and T310 transport': 'Type A',

    // Huawei Devices
    'Huawei ATN Series': 'Type C',
    'Huawei ATN 910B': 'Type A',
    'Huawei ATN 950B': 'Type A',
    'Huawei NetEngine NE40E X1 Series': 'Type A',
    'Huawei NetEngine NE40E X2, X3 Series': 'Type A',
    'Huawei NetEngine NE40E X8 Series': 'Type C',
    'Huawei Quidway S2300 Series': 'Type A',
    'Huawei Quidway AR29 Series': 'Type A',
    'Huawei Quidway AR19 Series': 'Type A',
    'Huawei AR100/AR120/AR150/AR160/AR200': 'Type A',
    'Huawei Enterprise Network Simulation Platform': 'Type A',
    'Huawei S7700 series': 'Type A',
    'Huawei S5700 series': 'Type A',
    'Huawei CX 600-X': 'Type C',
    'Huawei CX 600-X1/X2/X3': 'Type A',
    'Huawei CX 600-M2F': 'Type A',
    'Huawei S9303': 'Type A',
    'Huawei NE8000 M & F series': 'Type A',
    'Huawei NE8000 X series': 'Type C',
    'Huawei NetEngine 9000-8': 'Type C',
    'Huawei NetEngine 9000-20': 'Type C',
    'Huawei S6330': 'Type A',
    'Huawei OptiX OSN 1800': 'Type A',
    'Huawei OptiX OSN 6800': 'Type A',
    'Huawei OptiX OSN 8800': 'Type C',
    'Huawei OptiX OSN 9800': 'Type C',

    // Juniper Devices
    'Juniper ACX Series': 'Type A',
    'Juniper CTP Series': 'Type A',
    'Juniper ERX 1400': 'Type A',
    'Juniper EX 2300 Series Ethernet Switches': 'Type A',
    'Juniper EX 3400 Series Ethernet Switches': 'Type A',
    'Juniper EX 4100 Series Ethernet Switches': 'Type A',
    'Juniper EX 4200 Series Ethernet Switches': 'Type A',
    'Juniper EX 4300 Series Ethernet Switches': 'Type A',
    'Juniper EX 4400 Series Ethernet Switches': 'Type A',
    'Juniper EX 4500 Series Ethernet Switches': 'Type A',
    'Juniper EX 4600/4650 Series Ethernet Switches': 'Type A',
    'Juniper EX 6300 Series Ethernet Switches': 'Type A',
    'Juniper EX 9200 Series Ethernet Switches': 'Type A',
    'Juniper JRR200 Route Reflector': 'Type A',
    'Juniper M7i Multiservice Edge Routers': 'Type A',
    'Juniper M10i Multiservice Edge Routers': 'Type A',
    'Juniper M40e Multiservice Edge Routers': 'Type A',
    'Juniper M120 Multiservice Edge Routers': 'Type A',
    'Juniper M320 Multiservice Edge Routers': 'Type A',
    'Juniper MX5 3D Universal Edge Routers': 'Type A',
    'Juniper MX10 3D Universal Edge Routers': 'Type A',
    'Juniper MX40 3D Universal Edge Routers': 'Type A',
    'Juniper MX80 3D Universal Edge Routers': 'Type A',
    'Juniper MX104 3D Universal Edge Routers': 'Type A',
    'Juniper MX204 3D Universal Edge Routers': 'Type A',
    'Juniper MX10003 3D Universal Edge Routers': 'Type B',
    'Juniper MX240 3D Universal Edge Routers': 'Type B',
    'Juniper MX304 Universal Routing Platform': 'Type C',
    'Juniper MX480 3D Universal Edge Routers': 'Type B',
    'Juniper MX960 3D Universal Edge Routers': 'Type B',
    'Juniper MX2008 3D Universal Edge Routers': 'Type C',
    'Juniper MX2010 3D Universal Edge Routers': 'Type C',
    'Juniper MX2020 3D Universal Edge Routers': 'Type C',
    'Juniper MX10004, MX10008 and MX10016 Universal Routers': 'Type C',
    'Juniper PTX 3000 3D Universal Edge Routers': 'Type B',
    'Juniper PTX 5000 3D Universal Edge Routers': 'Type C',
    'Juniper PTX10001-36MR Packet Transport Router': 'Type B',
    'Juniper PTX10002-36ODD Packet Transport Router': 'Type C',
    'Juniper PTX10003 Packet Transport Router': 'Type C',
    'Juniper PTX10004, PTX10008, and PTX10016 Packet Transport Routers': 'Type C',
    'Juniper SRX100 Series Services Gateways': 'Type A',
    'Juniper SRX200 Series Services Gateways': 'Type A',
    'Juniper SRX300 Series Services Gateways': 'Type A',
    'Juniper SRX500 Series Services Gateways': 'Type A',
    'Juniper SRX600 Series Services Gateways': 'Type A',
    'Juniper SRX1400 Series Services Gateways': 'Type A',
    'Juniper SRX1500 Series Services Gateways': 'Type A',
    'Juniper SRX1600 Series Services Gateways': 'Type A',
    'Juniper SRX2300 Series Services Gateways': 'Type A',
    'Juniper SRX3000 Series Services Gateways': 'Type A',
    'Juniper SRX4100 Series Services Gateways': 'Type A',
    'Juniper SRX4200 Series Services Gateways': 'Type A',
    'Juniper SRX4300 Series Services Gateways': 'Type A',
    'Juniper SRX4600 Series Services Gateways': 'Type A',
    'Juniper SRX4700 Series Services Gateways': 'Type A',
    'Juniper SRX5000 Series Services Gateways': 'Type A',
    'Juniper SRX6000 Series Services Gateways': 'Type A',
    'Juniper S-CRPD Juniper Cloud Native Router': 'Type A',
    'Juniper T320 Core Router': 'Type C',
    'Juniper T640 Core Router': 'Type C',
    'Juniper T1600 Core Router': 'Type C',
    'Juniper T4000 Core Router': 'Type C',
    'Juniper cSRX (Cloud SRX)': 'Type A',
    'Juniper Firefly Perimeter (Virtual SRX)': 'Type A',
    'Juniper QFX Series Switches': 'Type A',

    // Nokia Devices
    'Nokia 7210 SAS Service Access System': 'Type A',
    'Nokia 7250 IXR-e Series (ec,e2c,e,e2) Interconnect': 'Type A',
    'Nokia 7250 IXR-R4': 'Type A',
    'Nokia 7250 IXR-R6': 'Type A',
    'Nokia 7250 IXR-R6D': 'Type B',
    'Nokia 7250 IXR-R6DL': 'Type B',
    'Nokia 7250 IXR-s': 'Type A',
    'Nokia 7250 IXR-Xs': 'Type B',
    'Nokia 7250 IXR-X1': 'Type B',
    'Nokia 7250 IXR-X3': 'Type C',
    'Nokia 7250 IXR-6': 'Type C',
    'Nokia 7250 IXR-10': 'Type C',
    'Nokia 7730 SXR-1x-44S Service Interconnect Routers': 'Type B',
    'Nokia 7730 SXR-1-32D': 'Type B',
    'Nokia 7730 SXR-1d-32D': 'Type B',
    'Nokia 7730 SXR-1d-60S': 'Type B',
    'Nokia 7730 SXR-R6d': 'Type B',
    'Nokia 7730 SXR-R6di': 'Type B',
    'Nokia 7750 SR-1s Service Routers': 'Type B',
    'Nokia 7750 SR-1se': 'Type C',
    'Nokia 7750 SR-2s': 'Type B',
    'Nokia 7750 SR-2se': 'Type C',
    'Nokia 7750 SR-7': 'Type B',
    'Nokia 7750 SR-12': 'Type B',
    'Nokia 7750 SR-7s': 'Type C',
    'Nokia 7750 SR-14s': 'Type C',
    'Nokia 7750 SR-1': 'Type A',
    'Nokia 7750 SR-1x': 'Type B',
    'Nokia 7750 SR-7/7450 ESS-7': 'Type B',
    'Nokia 7750 SR-12/7450 ESS-12': 'Type B',
    'Nokia 7750 SR-12e': 'Type B',
    'Nokia 7705 SAR Service aggregation routers': 'Type A',

    // Overture Devices
    'Overture 1400': 'Type A',
    'Overture 2200': 'Type A',
    'Overture 5000': 'Type A',
    'Overture 5100': 'Type A',
    'Overture 6000': 'Type A',

    // Palo Alto Networks Devices
    'Palo Alto PA-2000 Series': 'Type A',
    'Palo Alto PA-3000 Series': 'Type A',
    'Palo Alto PA-5000 Series': 'Type C',
    'Palo Alto Virtualized Firewalls': 'Type A',

    // Quanta Devices
    'Quanta vCPU': 'Type A',

    // Quagga Devices
    'Quagga Routing Software Suite (BGP module)': 'Type A',

    // ZTE Devices
    'ZTE ZXR10 M6000-2S': 'Type A',
    'ZTE ZXR10 M6000-3S': 'Type A',
    'ZTE ZXR10 M6000-5S': 'Type A',
    'ZTE ZXR10 M6000-8S': 'Type B',
    'ZTE ZXR10 M6000-8': 'Type B',
    'ZTE ZXR10 M6000-16': 'Type B',
    'ZTE CTN9000-3E': 'Type B',
    'ZTE CTN9000-5E': 'Type B',
    'ZTE CTN9000-8E': 'Type B',

    // Default fallback
    'Any': 'Not Recognized, ask crosswork-device-sizing team'
  }
};

module.exports = deviceMapping; 