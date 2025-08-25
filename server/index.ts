import fs from "fs";

// =================================================================
// Globale Fehlerüberwachung für Absturzsicherheit
// =================================================================
process.on('unhandledRejection', (reason, promise) => {
  console.error('!!! UNHANDLED REJECTION !!!');
  console.error('Ein schwerwiegender Fehler ist aufgetreten, der nicht behandelt wurde.');
  console.error('Grund:', reason);
  console.error('Promise:', promise);
});

process.on('uncaughtException', (error) => {
  console.error('!!! UNCAUGHT EXCEPTION !!!');
  console.error('Ein kritischer, nicht abgefangener Fehler ist aufgetreten. Der Prozess könnte instabil sein.');
  console.error('Fehler:', error);
  // In einer echten Produktionsumgebung sollte hier ein Neustart des Prozesses in Betracht gezogen werden.
  // process.exit(1);
});
// =================================================================

// =================================================================
// Azure App Service /tmp/ Verzeichnis-Fix für Puppeteer
// Erzwingt, dass Chrome/Puppeteer /tmp/ verwendet, um Berechtigungsfehler zu vermeiden.
// =================================================================
process.env.HOME = '/tmp';
process.env.XDG_CONFIG_HOME = '/tmp/xdg-config';
process.env.XDG_CACHE_HOME  = '/tmp/xdg-cache';
process.env.PUPPETEER_CACHE_DIR = '/tmp/puppeteer-cache';

// Stellt sicher, dass die Verzeichnisse existieren.
const tempDirs = ['/tmp/xdg-config', '/tmp/xdg-cache', '/tmp/chrome-data', '/tmp/puppeteer-cache'];
tempDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[Azure Fix] Temporäres Verzeichnis erfolgreich erstellt: ${dir}`);
    } catch (error) {
      console.error(`[Azure Fix] Fehler beim Erstellen des temporären Verzeichnisses: ${dir}`, error);
    }
  }
});
// =================================================================

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./production";
import { azurePerformanceMiddleware } from "./middleware/azure-monitoring";

const app = express();

// Azure monitoring middleware (should be first)
if (process.env.NODE_ENV === 'production') {
  app.use(azurePerformanceMiddleware);
}

// Performance: HTTP-Kompression aktivieren
app.use((req, res, next) => {
  // Performance: Response Compression Headers setzen
  if (req.url.endsWith('.js') || req.url.endsWith('.css')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (req.url.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-cache');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
  next();
});

// Performance: Request/Response-Limits optimieren 
app.use(express.json({ 
  limit: '50mb',
  // Performance: JSON Parsing optimieren
  strict: true,
  type: 'application/json'
}));
app.use(express.urlencoded({ 
  extended: false, 
  limit: '50mb',
  // Performance: URL Parsing begrenzen
  parameterLimit: 100
}));

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
    // Log the full error for debugging purposes
    console.error("[GLOBAL_ERROR_HANDLER]", {
      message: err.message,
      stack: err.stack,
      status: err.status,
      statusCode: err.statusCode,
    });
    
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // If the response has already been sent, delegate to the default Express error handler.
    if (res.headersSent) {
      return _next(err);
    }

    res.status(status).json({
      error: {
        message: message,
        // Only include stack trace in development for security reasons
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite.js");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Azure App Service and Docker compatibility: Default to 8080, fallback to 5000 for Replit
  // this serves both the API and the client.
  const port = parseInt(process.env.PORT ?? "8080", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
