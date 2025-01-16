import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  webex: {
    accessToken: process.env.WEBEX_ACCESS_TOKEN || '',
    webhookSecret: process.env.WEBEX_WEBHOOK_SECRET || '',
  },
  server: {
    port: parseInt(process.env.PORT || '5000', 10),
    host: '0.0.0.0',
  },
  ngrok: {
    authtoken: process.env.NGROK_AUTH_TOKEN,
    // Will be set dynamically when ngrok tunnel is created
    publicUrl: '',
  }
};

// Validate required config
if (!config.webex.accessToken) {
  throw new Error('WEBEX_ACCESS_TOKEN is required');
}
