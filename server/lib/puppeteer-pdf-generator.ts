import puppeteer from 'puppeteer-core';
import { Request, Response } from 'express';
import { generatePDFTemplate } from './pdf-template-generator';
import { ProductInfo } from '@shared/schema';
import * as fs from 'fs'; // Import the 'fs' module

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
  timeout?: number; // Timeout für die PDF-Generierung
}

/**
 * Generiert ein PDF-Dokument mit Puppeteer
 * 
 * @param url - Die URL der zu erfassenden Seite
 * @param options - PDF-Generierungsoptionen
 * @returns PDF-Buffer
 */
export async function generatePDFWithPuppeteer(
  url: string, 
  options: PuppeteerPDFOptions = {}
): Promise<Buffer> {
  let browser;

  try {
    console.log('🚀 Starte Puppeteer Browser...');

    // Vereinfachte und erprobte Browser-Konfiguration für Docker/Azure
    const launchOptions: any = {
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // essential for some container environments
        '--disable-gpu'
      ],
    };

    console.log('[PUPPETEER_DEBUG] Schritt 1: Launch-Optionen vorbereitet.', launchOptions);
    browser = await puppeteer.launch(launchOptions);
    console.log('[PUPPETEER_DEBUG] Schritt 2: Browser erfolgreich gestartet.');

    // Detailliertes Prozess-Logging
    const browserProcess = browser.process();
    if (browserProcess && browserProcess.stderr && browserProcess.stdout) {
      console.log(`[PUPPETEER_DEBUG] Browser-Prozess-ID: ${browserProcess.pid}`);
      browserProcess.stderr.on('data', data => console.error(`[PUPPETEER STDERR] ${data}`));
      browserProcess.stdout.on('data', data => console.log(`[PUPPETEER STDOUT] ${data}`));
      browserProcess.on('close', code => console.log(`[PUPPETEER_DEBUG] Browser-Prozess geschlossen mit Code: ${code}`));
    } else {
      console.log('[PUPPETEER_DEBUG] Kein direkter Zugriff auf Browser-Prozess möglich.');
    }

    browser.on('disconnected', () => console.error('[PUPPETEER_DEBUG] BROWSER DISCONNECTED! Der Browser wurde geschlossen oder ist abgestürzt.'));

    console.log('[PUPPETEER_DEBUG] Schritt 3: Erstelle neue Seite...');
    const page = await browser.newPage();
    console.log('[PUPPETEER_DEBUG] Schritt 4: Neue Seite erfolgreich erstellt.');

    // Optimiertes Viewport für bessere Performance
    console.log('[PUPPETEER_DEBUG] Schritt 5: Setze Viewport...');
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 1
    });
    console.log('[PUPPETEER_DEBUG] Schritt 6: Viewport erfolgreich gesetzt.');

    // Performance-Optimierungen für die Seite
    await page.setDefaultNavigationTimeout(60000);
    await page.setDefaultTimeout(30000);
    console.log('[PUPPETEER_DEBUG] Schritt 7: Timeouts erfolgreich gesetzt.');

    // Request-Interception für Performance
    console.log('[PUPPETEER_DEBUG] Schritt 8: Setze Request-Interception...');
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['document', 'stylesheet', 'font', 'image', 'script', 'xhr', 'fetch'].includes(resourceType)) {
        req.continue();
      } else {
        req.abort();
      }
    });
    console.log('[PUPPETEER_DEBUG] Schritt 9: Request-Interception erfolgreich gesetzt.');

    // User-Agent setzen
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    console.log('[PUPPETEER_DEBUG] Schritt 10: User-Agent erfolgreich gesetzt.');

    console.log(`[PUPPETEER_DEBUG] Schritt 11: Besuche URL: ${url}`);
    await page.goto(url, {
      waitUntil: ['networkidle2', 'domcontentloaded'],
      timeout: 60000
    });
    console.log('[PUPPETEER_DEBUG] Schritt 12: URL erfolgreich geladen.');

    console.log('[PUPPETEER_DEBUG] Schritt 13: Warte auf Content...');
    try {
      await page.waitForSelector('#document-preview-content', { timeout: 15000 });
      console.log('[PUPPETEER_DEBUG] Schritt 14: Content-Selektor gefunden.');
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('[PUPPETEER_DEBUG] Schritt 15: Finale Rendering-Zeit abgewartet.');
    } catch (error) {
      console.log('[PUPPETEER_DEBUG] WARNUNG: Content-Selektor nicht gefunden, fahre trotzdem fort.');
    }

    console.log('[PUPPETEER_DEBUG] Schritt 16: Generiere PDF...');
    const defaultOptions: PuppeteerPDFOptions = {
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: '3mm', bottom: '3mm', left: '3mm', right: '3mm' },
      ...options
    };
    const pdfBuffer = Buffer.from(await page.pdf(defaultOptions));
    console.log('[PUPPETEER_DEBUG] Schritt 17: PDF-Buffer erfolgreich erstellt.');

    return pdfBuffer;

  } catch (error) {
    console.error('❌ [PUPPETEER_DEBUG] FEHLER in generatePDFWithPuppeteer:', error);
    throw new Error(`PDF-Generierung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
  } finally {
    if (browser) {
      console.log('[PUPPETEER_DEBUG] Schritt 18: Schließe Browser...');
      await browser.close();
      console.log('[PUPPETEER_DEBUG] Schritt 19: Browser erfolgreich geschlossen.');
    }
  }
}

/**
 * Express-Route-Handler für PDF-Download
 * 
 * @param req - Express Request
 * @param res - Express Response
 */
export async function handlePDFDownload(req: Request, res: Response): Promise<void> {
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
    const pdfBuffer = await generatePDFWithPuppeteer(previewUrl, {
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
        top: '3mm',
        bottom: '3mm', 
        left: '3mm',
        right: '3mm'
      },
      // Performance-Optimierungen für PDF-Generierung
      preferCSSPageSize: true
    });

    // Dateiname für Download
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `product-information-${sessionId.slice(0, 8)}-${timestamp}.pdf`;

    // Response-Headers für PDF-Download setzen
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // PDF-Buffer an Client senden
    res.send(pdfBuffer);

    console.log(`✅ PDF erfolgreich gesendet: ${filename}`);

  } catch (error) {
    console.error('❌ Fehler im PDF-Download-Handler:', error);

    res.status(500).json({
      error: 'PDF-Generierung fehlgeschlagen',
      message: error instanceof Error ? error.message : 'Unbekannter Server-Fehler'
    });
  }
}

/**
 * Hilfsfunktion: Überprüft ob Puppeteer korrekt installiert ist
 */
export async function checkPuppeteerSetup(): Promise<boolean> {
  try {
    console.log('🚀 Starte Puppeteer Setup Check...');
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-crash-reporter',
        '--user-data-dir=/tmp/chrome-data', // Use a specific dir for the check
        '--no-zygote',
        '--single-process'
      ]
    });
    await browser.close();
    console.log('✅ Puppeteer Setup Check erfolgreich.');
    return true;
  } catch (error) {
    console.error('Puppeteer Setup-Fehler:', error);
    return false;
  }
}


/**
 * Express-Route-Handler für direkte PDF-Generierung aus Formular-Daten
 * 
 * @param req - Express Request mit formData im Body
 * @param res - Express Response
 */
export async function handleDirectPDFGeneration(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

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
    const pdfBuffer = await generatePDFFromHTML(htmlTemplate, {
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
      landscape: false
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

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Fehler im direkten PDF-Generierungs-Handler nach ${duration}ms:`, error);

    // Detailliertere Error-Response
    const errorResponse = {
      error: 'PDF-Generierung fehlgeschlagen',
      message: error instanceof Error ? error.message : 'Unbekannter Server-Fehler',
      duration: duration,
      timestamp: new Date().toISOString()
    };

    res.status(500).json(errorResponse);
  }
}

/**
 * Generiert ein PDF-Dokument direkt aus HTML-String
 * 
 * @param htmlContent - HTML-Inhalt als String
 * @param options - PDF-Generierungsoptionen
 * @returns PDF-Buffer
 */
export async function generatePDFFromHTML(
  htmlContent: string, 
  options: PuppeteerPDFOptions = {}
): Promise<Buffer> {
  let browser;
  const startTime = Date.now();

  try {
    console.log('🚀 Starte Puppeteer Browser für HTML-Template...');

    // Vereinfachte und erprobte Browser-Konfiguration für Docker/Azure
    const launchOptions: any = {
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // essential for some container environments
        '--disable-gpu'
      ],
    };

    console.log('[PUPPETEER_DEBUG] Schritt 1: Launch-Optionen vorbereitet.', launchOptions);
    browser = await puppeteer.launch(launchOptions);
    console.log('[PUPPETEER_DEBUG] Schritt 2: Browser erfolgreich gestartet.');

    // Detailliertes Prozess-Logging
    const browserProcess = browser.process();
    if (browserProcess && browserProcess.stderr && browserProcess.stdout) {
      console.log(`[PUPPETEER_DEBUG] Browser-Prozess-ID: ${browserProcess.pid}`);
      browserProcess.stderr.on('data', data => console.error(`[PUPPETEER STDERR] ${data}`));
      browserProcess.stdout.on('data', data => console.log(`[PUPPETEER STDOUT] ${data}`));
      browserProcess.on('close', code => console.log(`[PUPPETEER_DEBUG] Browser-Prozess geschlossen mit Code: ${code}`));
    } else {
      console.log('[PUPPETEER_DEBUG] Kein direkter Zugriff auf Browser-Prozess möglich.');
    }

    browser.on('disconnected', () => console.error('[PUPPETEER_DEBUG] BROWSER DISCONNECTED! Der Browser wurde geschlossen oder ist abgestürzt.'));

    console.log('[PUPPETEER_DEBUG] Schritt 3: Erstelle neue Seite...');
    const page = await browser.newPage();
    console.log('[PUPPETEER_DEBUG] Schritt 4: Neue Seite erfolgreich erstellt.');

    // Viewport für konsistente Darstellung
    console.log('[PUPPETEER_DEBUG] Schritt 5: Setze Viewport...');
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 1
    });
    console.log('[PUPPETEER_DEBUG] Schritt 6: Viewport erfolgreich gesetzt.');

    // Optimierte Timeouts (erhöht für Azure)
    await page.setDefaultNavigationTimeout(30000); // 30 Sekunden
    await page.setDefaultTimeout(30000); // 30 Sekunden
    console.log('[PUPPETEER_DEBUG] Schritt 7: Timeouts erfolgreich gesetzt.');

    // HTML-Inhalt direkt setzen (kein externes Laden erforderlich)
    console.log('[PUPPETEER_DEBUG] Schritt 8: Setze HTML-Template-Inhalt...');
    await page.setContent(htmlContent, {
      waitUntil: ['domcontentloaded'], // Nur DOM laden, nicht alle Ressourcen
      timeout: 15000
    });
    console.log('[PUPPETEER_DEBUG] Schritt 9: HTML-Content erfolgreich gesetzt.');

    // Minimale Wartezeit für finales Rendering
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('[PUPPETEER_DEBUG] Schritt 10: Finale Rendering-Wartezeit abgeschlossen.');

    console.log('[PUPPETEER_DEBUG] Schritt 11: Generiere PDF aus HTML-Template...');

    // Standard PDF-Optionen
    const defaultOptions: PuppeteerPDFOptions = {
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
      timeout: 30000, // 30 Sekunden Timeout für die PDF-Generierung selbst
      ...options
    };

    // PDF generieren
    const pdfBuffer = Buffer.from(await page.pdf(defaultOptions));
    console.log('[PUPPETEER_DEBUG] Schritt 12: PDF-Buffer erfolgreich erstellt.');

    console.log(`✅ PDF aus HTML-Template erfolgreich generiert!`);
    console.log(`📊 PDF-Größe: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

    return pdfBuffer;

  } catch (error) {
    console.error('❌ [PUPPETEER_DEBUG] FEHLER in generatePDFFromHTML:', error);
    throw new Error(`PDF-Generierung aus HTML fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
  } finally {
    if (browser) {
      console.log('[PUPPETEER_DEBUG] Schritt 13: Schließe Browser...');
      await browser.close();
      console.log('[PUPPETEER_DEBUG] Schritt 14: Browser erfolgreich geschlossen.');
    }
  }
}