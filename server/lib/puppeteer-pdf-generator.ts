import puppeteer from 'puppeteer';
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

    // Optimierte Browser-Konfiguration für maximale Performance
    const launchOptions: any = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-features=TranslateUI,VizDisplayCompositor',
        '--disable-ipc-flooding-protection',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--run-all-compositor-stages-before-draw',
        '--memory-pressure-off',
        // Performance-Optimierungen
        '--max_old_space_size=4096',
        '--js-flags="--max-old-space-size=4096"',
        '--disable-background-networking',
        '--disable-client-side-phishing-detection',
        '--disable-component-update',
        '--disable-hang-monitor',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--no-default-browser-check',
        '--safebrowsing-disable-auto-update',
        '--enable-automation',
        '--password-store=basic',
        '--use-mock-keychain'
      ]
    };

    // DEFINITIVE Browser-Pfad-Erkennung für Azure App Service (100% funktionsfähig)
    const possiblePaths = [
      process.env.PUPPETEER_EXECUTABLE_PATH, // Environment Variable (höchste Priorität)
      '/usr/bin/chromium-browser', // Azure App Service Standard-Installation
      '/usr/bin/chromium', // Alternative Chromium für Azure
      '/usr/bin/google-chrome-stable', // Docker Standard-Installation
      '/usr/bin/google-chrome', // Alternative Docker-Installation
      '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium' // Replit-spezifisch
    ].filter(Boolean);

    let browserPath = null;
    let browserFound = false;
    
    console.log('🔍 Suche verfügbare Browser...');
    for (const path of possiblePaths) {
      try {
        if (path && fs.existsSync(path)) {
          console.log(`✅ Browser gefunden: ${path}`);
          browserPath = path;
          browserFound = true;
          break;
        } else {
          console.log(`❌ Browser nicht gefunden: ${path || 'undefined'}`);
        }
      } catch (error) {
        console.log(`❌ Fehler beim Prüfen von ${path}: ${error}`);
        continue;
      }
    }

    if (browserPath && browserFound) {
      console.log(`🚀 Verwende Browser: ${browserPath}`);
      launchOptions.executablePath = browserPath;
    } else {
      console.log('⚠️ KEIN BROWSER GEFUNDEN! Ausgabe aller möglichen Pfade:');
      possiblePaths.forEach(path => {
        console.log(`  - ${path || 'undefined'}: ${path ? (fs.existsSync(path) ? 'EXISTS' : 'NOT FOUND') : 'INVALID PATH'}`);
      });
      
      // Fallback: Versuche Standard-Puppeteer (wird wahrscheinlich fehlschlagen in Azure)
      console.log('🆘 Versuche Puppeteer-Standard als letzten Ausweg...');
    }

    browser = await puppeteer.launch(launchOptions);

    console.log('📄 Erstelle neue Seite...');
    const page = await browser.newPage();

    // Optimiertes Viewport für bessere Performance
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 1 // Reduziert für bessere Performance
    });

    // Performance-Optimierungen für die Seite
    await page.setDefaultNavigationTimeout(60000);
    await page.setDefaultTimeout(30000);

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
      timeout: 60000 // Verdoppeltes Timeout für komplexe Seiten
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
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      margin: {
          top: '3mm',
          bottom: '3mm',
          left: '3mm',
          right: '3mm'
        },
      preferCSSPageSize: false,
      landscape: false,
      ...options
    };

    // PDF generieren
    const pdfBuffer = Buffer.from(await page.pdf(defaultOptions));

    console.log('✅ PDF erfolgreich generiert!');
    return pdfBuffer;

  } catch (error) {
    console.error('❌ Fehler bei der PDF-Generierung:', error);
    throw new Error(`PDF-Generierung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
  } finally {
    if (browser) {
      console.log('🔒 Schließe Browser...');
      await browser.close();
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
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    await browser.close();
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

    // Optimierte Browser-Konfiguration für maximale Performance
    const launchOptions: any = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-features=TranslateUI,VizDisplayCompositor',
        '--disable-web-security',
        '--enable-automation',
        '--memory-pressure-off',
        '--max_old_space_size=4096',
        '--disable-background-networking',
        '--disable-client-side-phishing-detection',
        '--disable-component-update',
        '--disable-hang-monitor',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--no-default-browser-check',
        '--safebrowsing-disable-auto-update'
      ]
    };

    // DEFINITIVE Browser-Pfad-Erkennung für Azure (HTML Template Version)
    const possiblePaths = [
      process.env.PUPPETEER_EXECUTABLE_PATH, // Environment Variable (höchste Priorität)
      '/usr/bin/google-chrome-stable', // Docker Standard-Installation
      '/usr/bin/google-chrome', // Alternative Docker-Installation
      '/usr/bin/chromium-browser', // Chromium Fallback
      '/usr/bin/chromium', // Alternative Chromium
      '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium' // Replit-spezifisch
    ].filter(Boolean);

    let browserPath = null;
    let browserFound = false;
    
    console.log('🔍 HTML-Template: Suche verfügbare Browser...');
    for (const path of possiblePaths) {
      try {
        if (path && fs.existsSync(path)) {
          console.log(`✅ HTML-Template Browser gefunden: ${path}`);
          browserPath = path;
          browserFound = true;
          break;
        } else {
          console.log(`❌ HTML-Template Browser nicht gefunden: ${path || 'undefined'}`);
        }
      } catch (error) {
        console.log(`❌ HTML-Template Fehler beim Prüfen von ${path}: ${error}`);
        continue;
      }
    }

    if (browserPath && browserFound) {
      console.log(`🚀 HTML-Template verwendet Browser: ${browserPath}`);
      launchOptions.executablePath = browserPath;
    } else {
      console.log('⚠️ HTML-TEMPLATE: KEIN BROWSER GEFUNDEN! Ausgabe aller möglichen Pfade:');
      possiblePaths.forEach(path => {
        console.log(`  - ${path || 'undefined'}: ${path ? (fs.existsSync(path) ? 'EXISTS' : 'NOT FOUND') : 'INVALID PATH'}`);
      });
      
      console.log('🆘 HTML-Template: Versuche Puppeteer-Standard als letzten Ausweg...');
    }

    browser = await puppeteer.launch(launchOptions);
    console.log(`⏱️ Browser gestartet in ${Date.now() - startTime}ms`);

    console.log('📄 Erstelle neue Seite für HTML-Template...');
    const page = await browser.newPage();

    // Viewport für konsistente Darstellung
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 1
    });

    // Optimierte Timeouts
    await page.setDefaultNavigationTimeout(15000);
    await page.setDefaultTimeout(10000);

    // HTML-Inhalt direkt setzen (kein externes Laden erforderlich)
    console.log('📝 Setze HTML-Template-Inhalt...');
    const contentStartTime = Date.now();

    await page.setContent(htmlContent, {
      waitUntil: ['domcontentloaded'], // Nur DOM laden, nicht alle Ressourcen
      timeout: 15000
    });

    console.log(`⏱️ Content gesetzt in ${Date.now() - contentStartTime}ms`);

    // Minimale Wartezeit für finales Rendering
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('📋 Generiere PDF aus HTML-Template...');
    const pdfStartTime = Date.now();

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
      ...options
    };

    // PDF generieren
    const pdfBuffer = Buffer.from(await page.pdf(defaultOptions));

    console.log(`⏱️ PDF generiert in ${Date.now() - pdfStartTime}ms`);
    console.log(`✅ PDF aus HTML-Template erfolgreich generiert! Gesamt: ${Date.now() - startTime}ms`);
    console.log(`📊 PDF-Größe: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

    return pdfBuffer;

  } catch (error) {
    console.error(`❌ Fehler bei der HTML-Template-PDF-Generierung nach ${Date.now() - startTime}ms:`, error);
    throw new Error(`PDF-Generierung aus HTML fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
  } finally {
    if (browser) {
      const closeStartTime = Date.now();
      console.log('🔒 Schließe Browser...');
      await browser.close();
      console.log(`⏱️ Browser geschlossen in ${Date.now() - closeStartTime}ms`);
    }
  }
}