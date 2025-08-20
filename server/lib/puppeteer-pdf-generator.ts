import puppeteer, { Browser, Page } from 'puppeteer';
import { Request, Response } from 'express';
import { generatePDFTemplate } from './pdf-template-generator';
import { ProductInfo } from '@shared/schema';
import * as fs from 'fs'; // Import the 'fs' module

// Azure-kompatible Browser-Pfade
const AZURE_BROWSER_PATHS = [
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/opt/google/chrome/chrome',
  process.env.PUPPETEER_EXECUTABLE_PATH
].filter(Boolean);

// Dynamische Browser-Erkennung für Azure
function findAvailableBrowser(): string | undefined {
  for (const path of AZURE_BROWSER_PATHS) {
    try {
      if (path && fs.existsSync(path)) { // Added path check for safety
        console.log(`✅ Browser gefunden: ${path}`);
        return path;
      }
    } catch (error) {
      // Fehler ignorieren und nächsten Pfad versuchen
    }
  }
  console.log('⚠️ Kein Browser gefunden, verwende Standard-Download');
  return undefined;
}

// Azure-optimierte Puppeteer-Konfiguration
function getPuppeteerConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isAzure = process.env.WEBSITE_SITE_NAME || process.env.WEBSITES_PORT;

  const config: any = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ],
    timeout: 30000 // Default timeout for launch
  };

  if (isProduction || isAzure) {
    const browserPath = findAvailableBrowser();
    if (browserPath) {
      config.executablePath = browserPath;
      console.log(`🚀 Verwende Browser: ${browserPath}`);
    } else {
      console.log('🔄 Fallback auf Puppeteer Standard-Browser');
      // Puppeteer lädt automatisch Chromium herunter
    }
  }

  return config;
}

/**
 * Puppeteer-basierte PDF-Generierung für Replit
 * 
 * Diese Datei implementiert eine vollständige serverseitige PDF-Generierung,
 * die die Live-Preview der Anwendung besucht und ein natives PDF-Dokument
 * mit auswählbarem Text und funktionalen Links erstellt.
 */

export interface PuppeteerPDFOptions {
  format?: 'A4' | 'A3' | 'Letter';
  printBackground?: boolean;
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  preferCSSPageSize?: boolean;
  landscape?: boolean;
  timeout?: number; // Added timeout for page operations
}


export class PuppeteerPdfGenerator {
  private browser: Browser | null = null;

  async initBrowser(): Promise<void> {
    if (this.browser) return;

    try {
      console.log('🚀 Starte Puppeteer Browser...');
      const startTime = Date.now();

      const config = getPuppeteerConfig();
      this.browser = await puppeteer.launch(config);

      const duration = Date.now() - startTime;
      console.log(`⏱️ Browser gestartet in ${duration}ms`);
    } catch (error: any) { // Explicitly type error for message property
      console.error('❌ Fehler beim Starten des Browsers:', error);
      throw new Error(`Browser-Initialisierung fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Generiert ein PDF-Dokument mit Puppeteer aus einer URL
   * 
   * @param url - Die URL der zu erfassenden Seite
   * @param options - PDF-Generierungsoptionen
   * @returns PDF-Buffer
   */
  async generatePDFFromURL(
    url: string, 
    options: PuppeteerPDFOptions = {}
  ): Promise<Buffer> {
    await this.initBrowser();

    if (!this.browser) {
      throw new Error('Browser konnte nicht initialisiert werden');
    }

    let page: Page | null = null;

    try {
      console.log('📄 Erstelle neue Seite...');
      page = await this.browser.newPage();

      // Optimiertes Viewport für bessere Performance
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 1 // Reduziert für bessere Performance
      });

      // Performance-Optimierungen für die Seite
      await page.setDefaultNavigationTimeout(options.timeout || 60000); // Use provided or default
      await page.setDefaultTimeout(options.timeout ? Math.floor(options.timeout / 2) : 30000); // Adjust default timeout

      // Erlaube ALLE Ressourcen für vollständigen Inhalt
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        // Erlaube alle wichtigen Ressourcen für vollständige PDF-Darstellung
        if (['document', 'stylesheet', 'font', 'image', 'script', 'xhr', 'fetch'].includes(resourceType)) {
          req.continue(); // Alle wichtigen Ressourcen erlauben
        } else if (['media', 'websocket'].includes(resourceType)) {
          req.abort(); // Nur unwichtige Ressourcen blockieren
        } else {
          req.continue(); // Standardverhalten für andere Ressourcen
        }
      });

      // User-Agent setzen (hilft bei einigen CORS-Problemen)
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

      console.log(`🌐 Besuche URL: ${url}`);

      // Seite laden mit optimierten Optionen für schnellere Ladezeit
      await page.goto(url, {
        waitUntil: ['networkidle2', 'domcontentloaded'], // networkidle2 statt networkidle0 für bessere Performance
        timeout: options.timeout || 60000 // Use provided or default timeout
      });

      console.log('⏳ Warte auf vollständiges Laden der Seite...');

      // Mehrstufige Wartestrategie für vollständige Datenladung
      try {
        // 1. Warte auf Live Preview Container
        await page.waitForSelector('#document-preview-content', { timeout: 15000 });
        console.log('✅ Live Preview Container gefunden');

        // 2. Performance: Optimierte Session-Daten-Ladung (reduziertes Polling)
        await page.waitForFunction(() => {
          // Prüfe ob Produktname und andere Daten geladen sind
          const productNameElements = document.querySelectorAll('[data-testid*="product"], h1, h2, h3');
          const hasProductData = Array.from(productNameElements).some(el =>
            el.textContent && el.textContent.trim().length > 10 &&
            !el.textContent.includes('will appear') &&
            !el.textContent.includes('Live Preview')
          );

          // Prüfe auf Tabellen mit echten Daten
          const tables = document.querySelectorAll('table');
          const hasTableData = Array.from(tables).some(table => {
            const rows = table.querySelectorAll('tr');
            return rows.length > 1; // Mehr als nur Header-Zeile
          });

          console.log(`Content check: hasProductData=${hasProductData}, hasTableData=${hasTableData}, tables=${tables.length}`);
          return hasProductData || hasTableData;
        }, { timeout: 8000, polling: 500 }); // Performance: Reduzierte Polling-Zeit von 1000ms auf 500ms

        console.log('✅ Daten-Content erfolgreich geladen');

        // 3. Performance: Reduzierte finale Rendering-Zeit
        await new Promise(resolve => setTimeout(resolve, 1000)); // Performance: 2000ms → 1000ms
        console.log('✅ Finale Rendering-Zeit abgewartet');

      } catch (error) {
        console.log('⚠️ Content-Load-Timeout - verwende verfügbare Inhalte');
        // Performance: Reduzierte Fallback-Zeit
        await new Promise(resolve => setTimeout(resolve, 1500)); // Performance: 3000ms → 1500ms
      }

      // Performance: Reduzierte zusätzliche Wartezeit
      await new Promise(resolve => setTimeout(resolve, 1000)); // Performance: 2000ms → 1000ms

      console.log('📋 Generiere PDF...');

      // Standard PDF-Optionen
      const defaultOptions: PuppeteerPDFOptions = {
        format: options.format || 'A4',
        printBackground: options.printBackground !== undefined ? options.printBackground : true,
        displayHeaderFooter: options.displayHeaderFooter || false,
        headerTemplate: options.headerTemplate,
        footerTemplate: options.footerTemplate,
        margin: options.margin || {
          top: '3mm',
          bottom: '3mm',
          left: '3mm',
          right: '3mm'
        },
        preferCSSPageSize: options.preferCSSPageSize !== undefined ? options.preferCSSPageSize : false,
        landscape: options.landscape || false,
        timeout: options.timeout || 60000 // Use provided or default timeout for PDF generation
      };

      // PDF generieren
      const pdfBuffer = Buffer.from(await page.pdf(defaultOptions));

      console.log('✅ PDF erfolgreich generiert!');
      return pdfBuffer;

    } catch (error: any) { // Explicitly type error for message property
      console.error('❌ Fehler bei der PDF-Generierung:', error);
      throw new Error(`PDF-Generierung fehlgeschlagen: ${error.message}`);
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (error: any) {
          console.error('⚠️ Fehler beim Schließen der Seite:', error);
        }
      }
    }
  }

  /**
   * Generiert ein PDF-Dokument direkt aus HTML-String
   * 
   * @param htmlContent - HTML-Inhalt als String
   * @param options - PDF-Generierungsoptionen
   * @returns PDF-Buffer
   */
  async generatePDFFromHTML(
    htmlContent: string,
    options: PuppeteerPDFOptions = {}
  ): Promise<Buffer> {
    await this.initBrowser();

    if (!this.browser) {
      throw new Error('Browser konnte nicht initialisiert werden');
    }

    let page: Page | null = null;
    const startTime = Date.now();

    try {
      console.log('📄 Erstelle neue Seite für HTML-Template...');
      page = await this.browser.newPage();

      // Viewport für konsistente Darstellung
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 1
      });

      // Optimierte Timeouts
      await page.setDefaultNavigationTimeout(options.timeout || 15000);
      await page.setDefaultTimeout(options.timeout ? Math.floor(options.timeout / 2) : 10000);

      // HTML-Inhalt direkt setzen (kein externes Laden erforderlich)
      console.log('📝 Setze HTML-Template-Inhalt...');
      const contentStartTime = Date.now();

      await page.setContent(htmlContent, {
        waitUntil: ['domcontentloaded'], // Nur DOM laden, nicht alle Ressourcen
        timeout: options.timeout || 15000
      });

      console.log(`⏱️ Content gesetzt in ${Date.now() - contentStartTime}ms`);

      // Minimale Wartezeit für finales Rendering
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('📋 Generiere PDF aus HTML-Template...');
      const pdfStartTime = Date.now();

      // Standard PDF-Optionen
      const defaultOptions: PuppeteerPDFOptions = {
        format: options.format || 'A4',
        printBackground: options.printBackground !== undefined ? options.printBackground : true,
        displayHeaderFooter: options.displayHeaderFooter || false,
        headerTemplate: options.headerTemplate,
        footerTemplate: options.footerTemplate,
        margin: options.margin || {
          top: '3mm',
          bottom: '3mm',
          left: '3mm',
          right: '3mm'
        },
        preferCSSPageSize: options.preferCSSPageSize !== undefined ? options.preferCSSPageSize : true,
        landscape: options.landscape || false,
        timeout: options.timeout || 60000 // Use provided or default timeout for PDF generation
      };

      // PDF generieren
      const pdfBuffer = Buffer.from(await page.pdf(defaultOptions));

      console.log(`⏱️ PDF generiert in ${Date.now() - pdfStartTime}ms`);
      console.log(`✅ PDF aus HTML-Template erfolgreich generiert! Gesamt: ${Date.now() - startTime}ms`);
      console.log(`📊 PDF-Größe: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

      return pdfBuffer;

    } catch (error: any) { // Explicitly type error for message property
      console.error(`❌ Fehler bei der HTML-Template-PDF-Generierung nach ${Date.now() - startTime}ms:`, error);
      throw new Error(`PDF-Generierung aus HTML fehlgeschlagen: ${error.message}`);
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (error: any) {
          console.error('⚠️ Fehler beim Schließen der Seite:', error);
        }
      }
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        console.log('🔒 Browser geschlossen');
      } catch (error: any) {
        console.error('⚠️ Fehler beim Schließen des Browsers:', error);
      }
    }
  }
}

// Singleton-Instanz für bessere Performance
let pdfGeneratorInstance: PuppeteerPdfGenerator | null = null;

export function getPdfGenerator(): PuppeteerPdfGenerator {
  if (!pdfGeneratorInstance) {
    pdfGeneratorInstance = new PuppeteerPdfGenerator();
  }
  return pdfGeneratorInstance;
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM empfangen, schließe Browser...');
  if (pdfGeneratorInstance) {
    await pdfGeneratorInstance.close();
  }
  process.exit(0); // Ensure process exits after cleanup
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT empfangen, schließe Browser...');
  if (pdfGeneratorInstance) {
    await pdfGeneratorInstance.close();
  }
  process.exit(0); // Ensure process exits after cleanup
});


/**
 * Express-Route-Handler für PDF-Download
 * 
 * @param req - Express Request
 * @param res - Express Response
 */
export async function handlePDFDownload(req: Request, res: Response): Promise<void> {
  const startTime = Date.now(); // Track start time for logging
  try {
    const { sessionId, url } = req.body;

    if (!sessionId) {
      res.status(400).json({ error: 'Session ID ist erforderlich' });
      return;
    }

    // Base URL bestimmen (für lokale Entwicklung und Produktion)
    const baseUrl = url || `${req.protocol}://${req.get('host')}`;
    const previewUrl = `${baseUrl}/?session=${sessionId}`;

    console.log(`📄 Starte PDF-Generierung für Session: ${sessionId}`);
    console.log(`🔗 Preview URL: ${previewUrl}`);

    // PDF mit Puppeteer generieren
    const pdfBuffer = await getPdfGenerator().generatePDFFromURL(previewUrl, {
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width: 100%; font-size: 10px; margin: 0 15mm; text-align: center; color: #666; border-bottom: 1px solid #ddd; padding-bottom: 3mm;">
          <span style="float: left;">Product Information</span>
          <span style="float: right;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      footerTemplate: `
        <div style="width: 100%; font-size: 8px; text-align: center; color: #999; margin: 0 15mm; border-top: 1px solid #ddd; padding-top: 3mm;">
          Generated on ${new Date().toLocaleDateString('de-DE')} | Valid from: ${new Date().toLocaleDateString('de-DE')} | Prepared by: Brüggen KG
        </div>
      `,
      margin: {
        top: '20mm', // Increased top margin to accommodate header
        bottom: '20mm', // Increased bottom margin to accommodate footer
        left: '15mm',
        right: '15mm'
      },
      // Performance-Optimierungen für PDF-Generierung
      preferCSSPageSize: true,
      timeout: 90000 // Increased timeout for complex page loads
    });

    // Dateiname für Download
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `product-information-${sessionId.slice(0, 8)}-${timestamp}.pdf`;

    // Response-Headers für PDF-Download setzen
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache'); // Cache control for PDFs

    // PDF-Buffer an Client senden
    res.send(pdfBuffer);

    const duration = Date.now() - startTime; // Calculate duration
    console.log(`✅ PDF erfolgreich gesendet: ${filename} (${(pdfBuffer.length / 1024).toFixed(1)} KB) in ${duration}ms`);

  } catch (error: any) { // Explicitly type error for message property
    const duration = Date.now() - startTime;
    console.error(`❌ Fehler im PDF-Download-Handler nach ${duration}ms:`, error);

    res.status(500).json({
      error: 'PDF-Generierung fehlgeschlagen',
      message: error.message || 'Unbekannter Server-Fehler',
      duration: duration,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Express-Route-Handler für direkte PDF-Generierung aus Formular-Daten
 * 
 * @param req - Express Request mit formData im Body
 * @param res - Express Response
 */
export async function handleDirectPDFGeneration(req: Request, res: Response): Promise<void> {
  const startTime = Date.now(); // Track start time for logging

  try {
    const { formData, sessionId } = req.body;

    // Verbesserte Validierung
    if (!formData) {
      res.status(400).json({ error: 'Formular-Daten sind erforderlich' });
      return;
    }

    if (!sessionId) {
      res.status(400).json({ error: 'Session ID ist erforderlich' });
      return;
    }

    if (!formData.productName) {
      res.status(400).json({ error: 'Produktname ist erforderlich' });
      return;
    }

    console.log(`📄 Starte direkte PDF-Generierung für Session: ${sessionId}`);
    console.log(`📋 Formular-Daten erhalten:`, {
      productName: formData.productName,
      hasNutrition: !!formData.nutrition,
      ingredientsCount: formData.ingredients?.length || 0,
      hasBaseIngredients: formData.baseProductIngredients?.length || 0
    });

    // HTML-Template aus Formular-Daten generieren
    console.log('🔄 Generiere HTML-Template...');
    const htmlTemplate = generatePDFTemplate(formData as ProductInfo);

    // PDF mit Puppeteer aus HTML-Template generieren (optimierte Einstellungen)
    console.log('🔄 Starte Puppeteer PDF-Generierung...');
    const pdfBuffer = await getPdfGenerator().generatePDFFromHTML(htmlTemplate, {
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      margin: {
        top: '3mm',
        bottom: '3mm',
        left: '3mm',
        right: '3mm'
      },
      preferCSSPageSize: true,
      landscape: false,
      timeout: 60000 // Increased timeout for HTML content processing
    });

    // Dateiname für Download
    const timestamp = new Date().toISOString().slice(0, 10);
    const productName = formData.productName ?
      formData.productName.replace(/[^a-zA-Z0-9äöüÄÖÜß\s]/g, '').replace(/\s+/g, '-').toLowerCase() :
      'product';
    const filename = `${productName}-${sessionId.slice(0, 8)}-${timestamp}.pdf`;

    // Performance-Logging
    const duration = Date.now() - startTime;
    console.log(`⏱️ PDF-Generierung abgeschlossen in ${duration}ms`);

    // Response-Headers für PDF-Download setzen
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache');

    // PDF-Buffer an Client senden
    res.send(pdfBuffer);

    console.log(`✅ Direktes PDF erfolgreich gesendet: ${filename} (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);

  } catch (error: any) { // Explicitly type error for message property
    const duration = Date.now() - startTime;
    console.error(`❌ Fehler im direkten PDF-Generierungs-Handler nach ${duration}ms:`, error);

    // Detailliertere Error-Response
    const errorResponse = {
      error: 'PDF-Generierung fehlgeschlagen',
      message: error.message || 'Unbekannter Server-Fehler',
      duration: duration,
      timestamp: new Date().toISOString()
    };

    res.status(500).json(errorResponse);
  }
}

/**
 * Hilfsfunktion: Überprüft ob Puppeteer korrekt installiert ist
 */
export async function checkPuppeteerSetup(): Promise<boolean> {
  try {
    const config = getPuppeteerConfig();
    // Temporarily launch a browser to check setup
    const browser = await puppeteer.launch({
      ...config,
      executablePath: config.executablePath || undefined, // Ensure executablePath is correctly passed or undefined
      timeout: 20000 // Shorter timeout for setup check
    });
    await browser.close();
    return true;
  } catch (error: any) {
    console.error('Puppeteer Setup-Fehler:', error);
    return false;
  }
}