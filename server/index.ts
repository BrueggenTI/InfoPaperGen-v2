// server/index.ts (FINALE, KORRIGIERTE VERSION)

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
// WICHTIGE ÄNDERUNG: Importiert jetzt aus der produktionssicheren Datei!
import { serveStatic, log } from "./production.js";
import { azurePerformanceMiddleware } from "./middleware/azure-monitoring";

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.use(azurePerformanceMiddleware);
}

app.use((req, res, next) => {
  if (req.url.endsWith('.js') || req.url.endsWith('.css')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (req.url.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-cache');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
  next();
});

app.use(express.json({ limit: '50mb', strict: true, type: 'application/json' }));
app.use(express.urlencoded({ extended: false, limit: '50mb', parameterLimit: 100 }));

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
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Diese Logik funktioniert jetzt, da keine Vite-Abhängigkeiten mehr vorab geladen werden.
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite.js");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '8080', 10);
  server.listen({ port, host: "0.0.0.0" }, () => {
    log(`serving on port ${port}`);
  });
})();
