import '../lib/setup-env.js';
import Webex from 'webex';
import { config } from '../config.js';
import fs from 'fs/promises';
import path from 'path';

// Configure Webex SDK
process.env.WEBEX_LOG_LEVEL = 'debug';
process.env.WEBEX_INTERNAL_LOG_LEVEL = 'debug';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

interface ProcessedMessage {
  csvContent: string;
  deviceTypes: string[];
  quantities: number[];
}

// Helper functions
const validateDeviceType = (type: string): boolean => 
  Boolean(type && /^[a-zA-Z0-9-]+$/.test(type));

const validateQuantity = (count: string): number => {
  const num = parseInt(count, 10);
  if (isNaN(num) || num <= 0) throw new Error(`Invalid quantity: ${count}`);
  return num;
};

const parseMessageToCSV = (messageText: string): ProcessedMessage => {
  const lines = messageText.trim().split('\n');
  if (lines.length < 2) throw new Error('Message must contain header and at least one data line');

  const deviceTypes: string[] = [];
  const quantities: number[] = [];
  const csvLines = ['type,count'];

  lines.slice(1).forEach(line => {
    const [type, count] = line.split(',').map(s => s.trim());
    
    if (!validateDeviceType(type)) {
      throw new Error(`Invalid device type format: ${type}`);
    }
    
    const quantity = validateQuantity(count);
    deviceTypes.push(type);
    quantities.push(quantity);
    csvLines.push(`${type},${quantity}`);
  });

  return {
    csvContent: csvLines.join('\n') + '\n',
    deviceTypes,
    quantities
  };
};

const processCsvWithBomBuilder = async (csvData: string): Promise<string> => {
  try {
    const inputPath = path.join(process.cwd(), 'data', 'input.csv');
    await fs.writeFile(inputPath, csvData);

    const { default: processQuote } = await import('../data/cnc7_bom_builder.js');
    await processQuote();

    const outputPath = path.join(process.cwd(), 'data', 'output.csv');
    return await fs.readFile(outputPath, 'utf-8');
  } catch (error) {
    console.error('Error processing CSV:', error);
    throw new Error('Failed to process CSV data');
  }
};

const sendWebexMessage = async (
  client: Webex,
  roomId: string,
  text: string,
  markdown?: string,
  maxRetries = 3
): Promise<void> => {
  let retryCount = 0;
  while (retryCount < maxRetries) {
    try {
      await client.messages.create({
        roomId,
        text,
        markdown: markdown || text
      });
      return;
    } catch (error) {
      retryCount++;
      if (retryCount === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

// Main webhook handler
export async function handleWebhook(payload: any) {
  if (payload.resource !== 'messages' || payload.event !== 'created') {
    console.log('Ignoring non-message webhook:', payload.resource, payload.event);
    return;
  }

  const client = new Webex({
    credentials: { access_token: config.webex.accessToken }
  });

  const message = await client.messages.get(payload.data.id);
  const me = await client.people.get('me');

  if (message.personEmail === me.emails[0]) {
    console.log('Ignoring message from self');
    return;
  }

  try {
    const processedInput = parseMessageToCSV(message.text);
    const processedOutput = await processCsvWithBomBuilder(processedInput.csvContent);
    
    await sendWebexMessage(
      client,
      message.roomId,
      processedOutput,
      `\`\`\`csv\n${processedOutput}\n\`\`\``
    );
  } catch (error) {
    const errorMsg = `Error: ${error.message}\n\nPlease use format:\ntype,count\n8101-32H,1\n8102-64H,2`;
    await sendWebexMessage(client, message.roomId, errorMsg);
  }
}

// Create or update webhook
export async function setupWebhook(targetUrl: string): Promise<void> {
  const client = new Webex({
    credentials: { access_token: config.webex.accessToken }
  });

  console.log('Setting up webhook with target URL:', targetUrl);

  // Delete all existing webhooks first
  const webhooks = await client.webhooks.list();
  console.log('Found existing webhooks:', webhooks.items.length);

  for (const webhook of webhooks.items) {
    console.log(`Deleting webhook: ${webhook.id} (${webhook.name})`);
    await client.webhooks.remove(webhook.id);
  }

  // Create new webhook
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

  try {
    const newWebhook = await client.webhooks.create(webhookConfig);
    console.log('New webhook created:', {
      id: newWebhook.id,
      name: newWebhook.name,
      targetUrl: newWebhook.targetUrl
    });
  } catch (error) {
    console.error('Error creating webhook:', error);
    throw error;
  }
}