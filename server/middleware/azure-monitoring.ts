import { Request, Response, NextFunction } from "express";

// Azure Application Insights compatible performance monitoring
export function azurePerformanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage();
    
    // Log performance metrics in Azure-compatible format
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        request: {
          method: req.method,
          url: req.url,
          userAgent: req.get('User-Agent'),
          duration: duration,
          statusCode: res.statusCode
        },
        performance: {
          memoryUsed: endMemory.heapUsed - startMemory.heapUsed,
          totalMemory: endMemory.heapTotal,
          rss: endMemory.rss
        },
        custom: {
          isApiRequest: req.url.startsWith('/api'),
          isPdfGeneration: req.url.includes('download-pdf'),
          sessionId: req.body?.sessionId || req.params?.id
        }
      }));
    }
  });
  
  next();
}

// Azure health monitoring
export function azureHealthCheck(req: Request, res: Response) {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    memory: {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`
    },
    services: {
      openai: !!process.env.OPENAI_API_KEY,
      puppeteer: true // Always available in our Docker setup
    }
  };
  
  res.json(health);
}