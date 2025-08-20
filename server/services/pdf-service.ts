import { storage } from "../storage";

export async function generatePDFFromSessionId(sessionId: string): Promise<Buffer> {
  try {
    const puppeteer = require('puppeteer');
    const fs = require('fs');
    
    // Fetch session data
    const session = await storage.getProductInfoSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Browser-Konfiguration mit Docker-optimierten Einstellungen
    const launchOptions: any = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-web-security'
      ]
    };

    // Azure Container Apps optimierte Browser-Pfade
    const possiblePaths = [
      process.env.PUPPETEER_EXECUTABLE_PATH, // Docker Umgebungsvariable (höchste Priorität)
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium'
    ].filter(Boolean);

    let browserPath = null;
    for (const path of possiblePaths) {
      try {
        if (path && fs.existsSync(path)) {
          browserPath = path;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (browserPath) {
      console.log(`🔍 PDF-Service verwendet Browser: ${browserPath}`);
      launchOptions.executablePath = browserPath;
    }

    const browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 800 });
    
    // Get the current URL for the preview page
    const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : 'https://your-app-url.replit.app';
    const previewUrl = `${baseUrl}/pdf-preview?session=${sessionId}`;
    
    // Navigate to the PDF preview page
    await page.goto(previewUrl, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      }
    });

    await browser.close();

    return pdfBuffer;
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('PDF generation failed: ' + (error as Error).message);
  }
}