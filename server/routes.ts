import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { handleWebhook } from "./services/webex";
import { config } from "./config";

export function registerRoutes(app: Express): Server {
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Webex webhook endpoint
  app.post('/api/webhook', express.json(), async (req, res) => {
    try {
      // Log all incoming webhook requests
      console.log('=== Webhook Request ===');
      console.log('Headers:', req.headers);
      console.log('Body:', JSON.stringify(req.body, null, 2));
      console.log('====================');

      // Basic validation
      if (!req.body || !req.body.data) {
        console.error('Invalid webhook payload - missing data');
        return res.status(400).json({ error: 'Invalid webhook payload' });
      }

      // Process the webhook
      await handleWebhook(req.body);
      res.status(200).json({ status: 'success' });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ 
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
