
// Azure-spezifische Konfiguration für optimale Performance
export const azureConfig = {
  // Azure App Service Erkennung
  isAzure: !!(process.env.WEBSITE_SITE_NAME || process.env.WEBSITES_PORT),
  
  // Browser-Konfiguration für Azure
  puppeteerConfig: {
    timeout: process.env.NODE_ENV === 'production' ? 30000 : 10000,
    browserPaths: [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/opt/google/chrome/chrome'
    ],
    launchArgs: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--memory-pressure-off',
      '--max_old_space_size=1024'
    ]
  },

  // Performance-Optimierungen für Azure
  performance: {
    maxConcurrentPdfGeneration: 3,
    pdfTimeout: 45000,
    browserReuseLimit: 50,
    memoryThreshold: 512 * 1024 * 1024 // 512MB
  },

  // Logging-Konfiguration
  logging: {
    enableDetailedLogs: process.env.NODE_ENV === 'production',
    logLevel: process.env.AZURE_LOG_LEVEL || 'info'
  }
};

// Azure-spezifische Umgebungsvariablen validieren
export function validateAzureEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!process.env.OPENAI_API_KEY) {
    errors.push('OPENAI_API_KEY fehlt in den Azure App Settings');
  }
  
  if (azureConfig.isAzure && !process.env.WEBSITE_SITE_NAME) {
    errors.push('Azure App Service Umgebung nicht korrekt erkannt');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export default azureConfig;
