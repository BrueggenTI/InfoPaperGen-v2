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
    
    // Browser starten mit optimierten Einstellungen für Replit
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
    });

    console.log('📄 Erstelle neue Seite...');
    const page = await browser.newPage();

    // Viewport für optimale Darstellung setzen
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 2
    });

    // User-Agent setzen (hilft bei einigen CORS-Problemen)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    console.log(`🌐 Besuche URL: ${url}`);
    
    // Seite laden mit erweiterten Optionen
    await page.goto(url, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000
    });

    console.log('⏳ Warte auf vollständiges Laden der Seite...');

    // Warten auf spezifische Elemente und Bilder
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        // Warte auf alle Bilder
        const images = Array.from(document.querySelectorAll('img'));
        let loadedImages = 0;
        
        if (images.length === 0) {
          resolve();
          return;
        }

        images.forEach(img => {
          if (img.complete) {
            loadedImages++;
          } else {
            img.onload = () => {
              loadedImages++;
              if (loadedImages === images.length) {
                resolve();
              }
            };
            img.onerror = () => {
              loadedImages++;
              if (loadedImages === images.length) {
                resolve();
              }
            };
          }
        });

        // Fallback nach 10 Sekunden
        setTimeout(() => {
          resolve();
        }, 10000);
      });
    });

    // Zusätzliche Wartezeit für CSS-Animationen und dynamische Inhalte
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
      margin: {
        top: '10mm',
        bottom: '10mm',
        left: '10mm',
        right: '10mm'
      }
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