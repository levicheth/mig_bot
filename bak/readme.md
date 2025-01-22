# Webex Teams Bot

A Node.js/Express server implementing a Webex Teams bot with webhook integration.

## Overview

This project implements a Webex Teams bot that:
- Responds to direct messages
- Uses webhooks for real-time message notifications
- Supports development with ngrok tunneling
- Provides TypeScript support throughout

## Directory Structure
.
├── server/
│ ├── lib/
│ │ └── setup-env.ts # Browser environment mocking
│ ├── services/
│ │ ├── webex.ts # Webex API integration
│ │ └── csv-handler.ts # CSV processing utility
│ ├── types/
│ │ └── global.d.ts # Global type declarations
│ ├── config.ts # Configuration management
│ ├── index.ts # Server entry point
│ └── routes.ts # API route definitions
├── .env # Environment configuration
└── package.json # Project dependencies


## Features

### Core Functionality
- Message Echo: Responds to direct messages with an echo
- Webhook Integration: Real-time message notifications
- Development Tools: ngrok tunnel for local testing

### Technical Features
- TypeScript Support
- Environment Configuration
- Express Middleware
- Error Handling
- Request Logging

## Configuration

### Environment Variables
- `WEBEX_ACCESS_TOKEN`: Webex Teams bot access token
- `WEBEX_WEBHOOK_SECRET`: Webhook verification secret
- `NGROK_AUTH_TOKEN`: ngrok authentication token (development)
- `PORT`: Server port (default: 5000)

## Key Components

### Server
- `server/index.ts`: Express server setup, middleware configuration
- `server/routes.ts`: API endpoint definitions, webhook handling

### Webex Integration
- `services/webex.ts`: Webex Teams API client, webhook management
- `lib/setup-env.ts`: Browser environment simulation for Webex SDK

### Configuration
- `config.ts`: Environment variable management, configuration validation
- `.env`: Environment variable definitions

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