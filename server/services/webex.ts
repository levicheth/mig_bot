import Webex from 'webex';
import { config } from '../config';
import { DOMParser } from 'xmldom';

// Configure Node.js environment
if (typeof window === 'undefined') {
  (global as any).window = {
    location: {
      protocol: 'https:',
      hostname: 'localhost',
    },
  };
  (global as any).DOMParser = DOMParser;
  (global as any).WebSocket = require('ws');
}

// Configure Node.js environment
process.env.WEBEX_LOG_LEVEL = 'debug';
process.env.WEBEX_INTERNAL_LOG_LEVEL = 'debug';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Initialize Webex client
const webexClient = new Webex({
  credentials: {
    access_token: config.webex.accessToken
  },
  logger: {
    level: 'debug'
  }
});

// Handle incoming webhooks
export async function handleWebhook(payload: any) {
  try {
    // Verify webhook came from Webex
    if (payload.resource !== 'messages' || payload.event !== 'created') {
      console.log('Ignoring non-message webhook:', payload.resource, payload.event);
      return;
    }

    // Get message details
    const message = await webexClient.messages.get(payload.data.id);
    console.log('Received message:', message.text);

    // Don't process messages from the bot itself
    const me = await webexClient.people.get('me');
    if (message.personEmail === me.emails[0]) {
      console.log('Ignoring message from self');
      return;
    }

    // Echo the message back
    await webexClient.messages.create({
      roomId: message.roomId,
      text: `Echo: ${message.text}`,
      markdown: message.text ? `Echo: ${message.text}` : undefined
    });
    console.log('Sent echo message');

  } catch (error) {
    console.error('Error handling webhook:', error);
    throw error;
  }
}

// Create or update webhook
export async function setupWebhook(targetUrl: string) {
  try {
    // Initialize the client first
    await webexClient.register();
    console.log('Webex client registered');

    // List existing webhooks
    const webhooks = await webexClient.webhooks.list();
    console.log('Found existing webhooks:', webhooks.items.length);

    // Find existing webhook
    const existingWebhook = webhooks.items.find(
      (webhook: any) => webhook.name === 'Echo Bot Webhook'
    );

    if (existingWebhook) {
      // Update existing webhook
      console.log('Updating existing webhook');
      await webexClient.webhooks.update({
        webhookId: existingWebhook.id,
        targetUrl,
        name: 'Echo Bot Webhook',
        resource: 'messages',
        event: 'created',
        secret: config.webex.webhookSecret
      });
    } else {
      // Create new webhook
      console.log('Creating new webhook');
      await webexClient.webhooks.create({
        targetUrl,
        name: 'Echo Bot Webhook',
        resource: 'messages',
        event: 'created',
        secret: config.webex.webhookSecret
      });
    }
    console.log('Webhook setup completed');
  } catch (error) {
    console.error('Error setting up webhook:', error);
    throw error;
  }
}