import './lib/setup-env';

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { config } from "./config";
import ngrok from 'ngrok';
import { setupWebhook } from "./services/webex";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      console.log(logLine);
    }
  });

  next();
});

const server = registerRoutes(app);

const port = config.server.port || 5000;
server.listen(port, async () => {
  console.log(`Server listening on port ${port}`);

  if (process.env.NODE_ENV !== 'production' && config.ngrok.authtoken) {
    try {
      const url = await ngrok.connect({
        addr: port,
        authtoken: config.ngrok.authtoken,
      });
      console.log(`ngrok tunnel established at: ${url}`);
      
      await setupWebhook(url + '/api/webhook');
    } catch (error) {
      console.error('Failed to establish ngrok tunnel:', error);
    }
  }
});

export default app;