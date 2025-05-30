## Overview

Webex Teams bot that:
- Processes CSV quote file for I&MI & CAI Software from CCW-R format into for CCW estimates for MDM/DSA Cisco internal process
- Generates CNC v7.0 BoM from device lists

- (WIP) Processes CSV quote file for TS CCW-R format into for CCW estimates for MDM/DSA Cisco internal process

## Features

### Core Functionality
1/ R2CCW. CCW Estimate Generation: Converts CSV input to formatted Excel output
2/ CNC7. CNC7 BoM Generation: Creates BoM from device list input

Shared:
- File Processing: Handles CSV and Excel file formats
- Audit Logging: Tracks all operations with timestamps
- Uses webhooks for real-time message notifications
- Supports file upload/download via Webex API

### Limitations

(1) Software
- Select all lines and press "Validate" button
- If EPNM lic present, you must hit "Edit" > "Save" to validate the line


### Technical Features
- CSV Processing & Validation
- Excel File Generation
- File Upload/Download via Webex API
- Error Handling & Logging
- Request Auditing

## Configuration

### Environment Variables
- `BOTTOKEN`: Webex Teams bot access token
- `WEBEX_ACCESS_TOKEN`: Same as BOTTOKEN
- `WEBEX_WEBHOOK_SECRET`: Webhook verification secret
- `NGROK_AUTH_TOKEN`: ngrok authentication token (development)
- `PORT`: Server port (default: 5000)

## Key Components

### CCW Processing
- `R2CCW/ccwr2ccw.js`: CSV processing and Excel generation
- `R2CCW/file-handler.js`: File upload/download management
- `R2CCW/audit.js`: Operation auditing
- `R2CCW/r2ccw-logger.js`: Detailed operation logging

### CNC7 Integration
- `CNC7/bombot_cnc7.js`: BoM generation logic
- `CNC7/device-mapping.js`: Device configuration mappings

### Server
- `index.js`: Bot framework setup, command handling






## Development

1. Install dependencies
npm install
2. Configure environment variables in `.env`
3. Use readme-local to deploy locally

# Webex Teams Bot
A Node.js/Express server implementing a Webex Teams bot with webhook integration.
https://github.com/WebexCommunity/webex-node-bot-framework

## License
MIT


