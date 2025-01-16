import type { Express } from "express";
import { createServer, type Server } from "http";
import { handleWebhook } from "./services/webex";
import { csvParser } from "./services/csv-handler";

export function registerRoutes(app: Express): Server {
  // Webex webhook endpoint
  app.post('/api/webhook', async (req, res) => {
    try {
      await handleWebhook(req.body);
      res.status(200).send('Webhook processed');
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).send('Webhook processing failed');
    }
  });

  // CSV upload endpoint
  app.post('/api/csv', csvParser, (req, res) => {
    try {
      if (!req.parsedCsv) {
        return res.status(400).send('No CSV data found');
      }
      res.status(200).json({
        message: 'CSV processed successfully',
        data: req.parsedCsv
      });
    } catch (error) {
      console.error('CSV processing error:', error);
      res.status(500).send('CSV processing failed');
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
