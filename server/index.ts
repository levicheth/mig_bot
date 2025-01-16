import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
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

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const server = registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = config.server.port;
    server.listen(PORT, config.server.host, async () => {
      log(`Server listening on port ${PORT}`);

      try {
        // Setup ngrok tunnel
        if (config.ngrok.authtoken) {
          const publicUrl = await ngrok.connect({
            addr: PORT,
            authtoken: config.ngrok.authtoken
          });
          config.ngrok.publicUrl = publicUrl;
          log(`ngrok tunnel established at: ${publicUrl}`);

          // Register Webex webhook with the public URL
          await setupWebhook(`${publicUrl}/api/webhook`);
          log('Webex webhook registered successfully');
        } else {
          log('Ngrok authtoken not provided, webhook registration skipped');
        }
      } catch (error) {
        console.error('Failed to setup ngrok or register webhook:', error);
      }
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
})();