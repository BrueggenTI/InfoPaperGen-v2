import { storage } from "../storage";

export async function generatePDFFromSessionId(sessionId: string): Promise<Buffer> {
  try {
    const puppeteer = require('puppeteer');
    
    // Fetch session data
    const session = await storage.getProductInfoSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

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