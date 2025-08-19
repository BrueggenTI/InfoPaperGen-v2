import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

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

  // Enhanced logging for debugging
  if (path.startsWith("/api")) {
    console.log(`[SERVER] ${req.method} ${path} - Request started`, {
      headers: req.headers,
      bodySize: req.headers['content-length'] || 'unknown',
      userAgent: req.headers['user-agent']
    });
  }

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Enhanced error logging
      if (res.statusCode >= 400) {
        console.error(`[SERVER ERROR] ${logLine}`, {
          response: capturedJsonResponse,
          requestHeaders: req.headers,
          timestamp: new Date().toISOString()
        });
      }
      
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

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Enhanced error logging
    console.error(`[SERVER ERROR HANDLER]`, {
      status,
      message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });

    res.status(status).json({ 
      message,
      debug: process.env.NODE_ENV === 'development' ? {
        stack: err.stack,
        timestamp: new Date().toISOString()
      } : undefined
    });
    
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 8080 for Azure App Service compatibility.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '8080', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
