import puppeteer from 'puppeteer';
import { Request, Response } from 'express';

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

    // Versuche verschiedene Browser-Pfade
    const possiblePaths = [
      '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      process.env.PUPPETEER_EXECUTABLE_PATH,
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome'
    ].filter(Boolean);

    let browserPath = null;
    for (const path of possiblePaths) {
      try {
        if (path && require('fs').existsSync(path)) {
          browserPath = path;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (browserPath) {
      console.log(`🔍 Verwende Browser: ${browserPath}`);
      launchOptions.executablePath = browserPath;
    } else {
      console.log('⚠️ Kein spezifischer Browser-Pfad gefunden, verwende Puppeteer Standard');
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

    // Warte auf vollständigen Content-Load
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        console.log('🔍 Prüfe Seiteninhalt...');
        
        // Warte auf alle wichtigen Elemente
        const checkContent = () => {
          const tables = document.querySelectorAll('table');
          const images = document.querySelectorAll('img');
          const mainContent = document.querySelector('#document-preview-content');
          
          console.log(`Gefunden: ${tables.length} Tabellen, ${images.length} Bilder`);
          
          // Prüfe Bilder
          const imagesLoaded = Array.from(images).every(img => img.complete);
          
          // Prüfe ob Hauptinhalt vorhanden ist
          const hasMainContent = !!mainContent;
          
          return hasMainContent && imagesLoaded;
        };
        
        // Sofort prüfen
        if (checkContent()) {
          console.log('✅ Alle Inhalte bereits geladen');
          resolve();
          return;
        }
        
        // Interval für kontinuierliche Prüfung
        const checkInterval = setInterval(() => {
          if (checkContent()) {
            console.log('✅ Inhalte vollständig geladen');
            clearInterval(checkInterval);
            resolve();
          }
        }, 500);
        
        // Fallback nach 10 Sekunden
        setTimeout(() => {
          console.log('⚠️ Content-Load-Timeout erreicht');
          clearInterval(checkInterval);
          resolve();
        }, 10000);
      });
    });

    // Zusätzliche Wartezeit für finales Rendering
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('📋 Generiere PDF...');

    // Standard PDF-Optionen
    const defaultOptions: PuppeteerPDFOptions = {
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm'
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
    const previewUrl = `${baseUrl}/document-preview?session=${sessionId}`;

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
        top: '10mm',
        bottom: '10mm', 
        left: '10mm',
        right: '10mm'
      },
      // Performance-Optimierungen für PDF-Generierung
      preferCSSPageSize: true,
      omitBackground: false
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