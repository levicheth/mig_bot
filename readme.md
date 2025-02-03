# Webex Teams Bot
A Node.js/Express server implementing a Webex Teams bot with webhook integration.
https://github.com/WebexCommunity/webex-node-bot-framework

# Limitations

- Select all lines and press "Validate" button
- If EPNM lic present, you must hit "Edit" > "Save" to validate the line

# Local Development

./node_modules/ngrok/bin/ngrok.exe http 5000

- check ngrok url
- update .env with ngrok url
- run bot

node index.js

## Overview

This project implements a Webex Teams bot that:
- Processes CSV files for CCW estimates
- Generates CNC v7.0 BoM from device lists
- Uses webhooks for real-time message notifications
- Supports file upload/download via Webex API

## Directory Structure
.
├── logic/
│ ├── CNC7/
│ │ ├── bombot_cnc7.js     # CNC7 BoM processing
│ │ └── device-mapping.js  # Device mappings for CNC7
│ ├── R2CCW/
│ │ ├── audit.js          # Audit logging functionality
│ │ ├── ccwr2ccw.js       # CSV to Excel conversion
│ │ ├── file-handler.js   # File upload/download handling
│ │ └── r2ccw-logger.js   # R2CCW operation logging
├── .env                  # Environment configuration
└── index.js             # Server entry point

## Features

### Core Functionality
- CCW Estimate Generation: Converts CSV input to formatted Excel output
- CNC7 BoM Generation: Creates BoM from device list input
- File Processing: Handles CSV and Excel file formats
- Audit Logging: Tracks all operations with timestamps

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

## Commands

### CCW

## Development

1. Install dependencies:
2. Configure environment variables in `.env`
3. Start development server:


## Security Notes

- Webhook secret used for request verification
- Environment variables for sensitive configuration
- Production/development environment separation

## Dependencies

### Core
- express: Web server framework
- webex: Webex Teams SDK
- ngrok: Local tunnel for development

### Development
- typescript: Type support
- tsx: TypeScript execution
- dotenv: Environment configuration

## License

MIT