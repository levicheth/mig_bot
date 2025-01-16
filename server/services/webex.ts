// Import environment setup first
import '../lib/setup-env';

import Webex from 'webex';
import { config } from '../config';

// Configure Webex SDK
process.env.WEBEX_LOG_LEVEL = 'debug';
process.env.WEBEX_INTERNAL_LOG_LEVEL = 'debug';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Initialize Webex client
let webexClient: Webex;

async function initializeWebexClient() {
  try {
    webexClient = new Webex({
      credentials: {
        access_token: config.webex.accessToken
      },
      logger: {
        level: 'debug'
      }
    });

    // Wait for client to be ready
    await new Promise<void>((resolve) => {
      webexClient.once('ready', () => {
        console.log('Webex client is ready');
        resolve();
      });
    });

    // Register device
    if (webexClient.internal?.device?.register) {
      await webexClient.internal.device.register();
      console.log('Device registered successfully');
    }
    
    // Set up auto-reconnect
    setInterval(async () => {
      try {
        const isRegistered = webexClient.internal?.device?.registered;
        const canRegister = webexClient.internal?.device?.register;
        
        if (canRegister && !isRegistered) {
          console.log('Reconnecting Webex client...');
          await webexClient.internal.device.register();
          console.log('Reconnection successful');
        }
      } catch (error) {
        console.error('Error during auto-reconnect:', error);
      }
    }, 60000); // Check every minute
    
    return webexClient;
  } catch (error) {
    console.error('Failed to initialize Webex client:', error);
    throw error;
  }
}

// Initialize the client immediately
initializeWebexClient().catch(error => {
  console.error('Initial Webex client initialization failed:', error);
  process.exit(1);
});

// Handle incoming webhooks
export async function handleWebhook(payload: any) {
  try {
    console.log('Received webhook payload:', JSON.stringify(payload, null, 2));

    // Verify webhook came from Webex
    if (payload.resource !== 'messages' || payload.event !== 'created') {
      console.log('Ignoring non-message webhook:', payload.resource, payload.event);
      return;
    }

    // Ensure client is initialized
    if (!webexClient) {
      throw new Error('Webex client not initialized');
    }

    // Get message details with retries
    let message;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        console.log(`Attempt ${retryCount + 1} to fetch message ${payload.data.id}`);
        message = await webexClient.messages.get(payload.data.id);
        break;
      } catch (error) {
        retryCount++;
        if (retryCount === maxRetries) {
          throw error;
        }
        console.log(`Retry ${retryCount} after error:`, error);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }

    if (!message) {
      throw new Error('Failed to fetch message after retries');
    }

    console.log('Received message details:', {
      id: message.id,
      roomId: message.roomId,
      text: message.text,
      personEmail: message.personEmail
    });

    // Don't process messages from the bot itself
    const me = await webexClient.people.get('me');
    console.log('Bot identity:', {
      id: me.id,
      email: me.emails[0],
      displayName: me.displayName
    });

    if (message.personEmail === me.emails[0]) {
      console.log('Ignoring message from self');
      return;
    }

    // Echo the message back with retry
    retryCount = 0;
    while (retryCount < maxRetries) {
      try {
        console.log('Attempting to send echo response...');
        const response = await webexClient.messages.create({
          roomId: message.roomId,
          text: `Echo: ${message.text}`,
          markdown: message.text ? `Echo: ${message.text}` : undefined
        });
        console.log('Echo message sent successfully:', response.id);
        break;
      } catch (error) {
        retryCount++;
        console.error(`Failed to send message (attempt ${retryCount}):`, error);
        if (retryCount === maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

  } catch (error) {
    console.error('Error handling webhook:', error);
    throw error;
  }
}

// Create or update webhook
export async function setupWebhook(targetUrl: string) {
  try {
    // Ensure client is initialized
    if (!webexClient) {
      throw new Error('Webex client not initialized');
    }

    console.log('Setting up webhook with target URL:', targetUrl);

    // Delete all existing webhooks first
    const webhooks = await webexClient.webhooks.list();
    console.log('Found existing webhooks:', webhooks.items.length);

    for (const webhook of webhooks.items) {
      console.log(`Deleting webhook: ${webhook.id} (${webhook.name})`);
      await webexClient.webhooks.remove(webhook.id);
    }

    // Create new webhook - removed status field
    const webhookConfig = {
      name: 'Echo Bot Webhook',
      targetUrl,
      resource: 'messages',
      event: 'created',
      secret: config.webex.webhookSecret
    };

    console.log('Creating new webhook with config:', {
      ...webhookConfig,
      secret: '***' // Don't log the secret
    });

    const newWebhook = await webexClient.webhooks.create(webhookConfig);
    console.log('New webhook created:', {
      id: newWebhook.id,
      name: newWebhook.name,
      targetUrl: newWebhook.targetUrl
    });

    console.log('Webhook setup completed successfully');

  } catch (error) {
    console.error('Error setting up webhook:', error);
    throw error;
  }
}

// Update the Webex type definition
declare module 'webex' {
  interface WebexInternal {
    device?: {
      registered: boolean;
      register(): Promise<void>;
    };
  }

  export default class Webex {
    constructor(config: any);
    messages: any;
    people: any;
    webhooks: any;
    internal?: WebexInternal;
    once(event: string, callback: () => void): void;
    on(event: string, callback: () => void): void;
    off(event: string, callback: () => void): void;
  }
}