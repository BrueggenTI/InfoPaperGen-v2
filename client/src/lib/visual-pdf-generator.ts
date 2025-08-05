import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Visual PDF Generator - Erstellt ein exaktes visuelles Abbild der Live-Preview
 * 
 * Diese Funktion verwendet html2canvas, um die Live-Preview als Bild zu erfassen
 * und dieses anschließend in ein PDF einzubetten. Dadurch werden alle Styles,
 * Bilder und visuellen Elemente originalgetreu übernommen.
 */

export interface VisualPDFOptions {
  filename?: string;
  quality?: number;
  scale?: number;
  useCORS?: boolean;
  allowTaint?: boolean;
}

/**
 * Generiert ein PDF aus der visuellen Darstellung eines DOM-Elements
 * 
 * @param elementId - Die ID des HTML-Elements, das als PDF exportiert werden soll
 * @param options - Konfigurationsoptionen für die PDF-Generierung
 */
export async function generateVisualPDF(
  elementId: string, 
  options: VisualPDFOptions = {}
): Promise<void> {
  // Standard-Konfiguration
  const config = {
    filename: 'product-information.pdf',
    quality: 1.0,
    scale: 2, // Höhere Auflösung für bessere Qualität
    useCORS: true,
    allowTaint: false,
    ...options
  };

  try {
    // Das zu erfassende Element finden
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element mit ID '${elementId}' wurde nicht gefunden`);
    }

    // Ladeindikator anzeigen (optional)
    console.log('📷 Erfasse visuelle Darstellung...');

    // HTML2Canvas-Konfiguration für beste Qualität
    const canvas = await html2canvas(element, {
      scale: config.scale,
      useCORS: config.useCORS,
      allowTaint: config.allowTaint,
      logging: false, // Reduziert Console-Logs
      backgroundColor: '#ffffff', // Weißer Hintergrund für PDF
      removeContainer: false,
      imageTimeout: 15000, // 15 Sekunden Timeout für Bilder
      onclone: (clonedDoc) => {
        // Optimierungen für den geklonten DOM
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          // Stelle sicher, dass alle Bilder geladen sind
          const images = clonedElement.querySelectorAll('img');
          images.forEach(img => {
            if (img.src && !img.complete) {
              console.warn('Bild wird noch geladen:', img.src);
            }
          });
        }
      }
    });

    console.log('✅ Screenshot erfolgreich erstellt');

    // PDF-Dimensionen berechnen (A4-Format)
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    // A4-Größe in mm
    const pdfWidth = 210;
    const pdfHeight = 297;
    
    // Skalierung berechnen, um das Bild optimal auf A4 zu platzieren
    const ratio = Math.min(pdfWidth / (imgWidth * 0.264583), pdfHeight / (imgHeight * 0.264583));
    const scaledWidth = imgWidth * 0.264583 * ratio;
    const scaledHeight = imgHeight * 0.264583 * ratio;

    // PDF erstellen
    console.log('📄 Erstelle PDF-Dokument...');
    const pdf = new jsPDF({
      orientation: scaledHeight > scaledWidth ? 'portrait' : 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Canvas als Bild-Data-URL konvertieren
    const imgData = canvas.toDataURL('image/jpeg', config.quality);

    // Zentrierung berechnen
    const xOffset = (pdfWidth - scaledWidth) / 2;
    const yOffset = (pdfHeight - scaledHeight) / 2;

    // Bild in PDF einfügen
    pdf.addImage(
      imgData,
      'JPEG',
      Math.max(0, xOffset),
      Math.max(0, yOffset),
      scaledWidth,
      scaledHeight
    );

    // Metadaten hinzufügen
    pdf.setProperties({
      title: 'Product Information',
      subject: 'Produktinformationen erstellt mit Visual PDF Generator',
      author: 'Brüggen Product Information System',
      creator: 'Visual PDF Generator',
      keywords: 'product, information, nutrition, ingredients'
    });

    console.log('💾 Starte PDF-Download...');

    // PDF herunterladen
    pdf.save(config.filename);

    console.log('✅ PDF erfolgreich heruntergeladen!');

  } catch (error) {
    console.error('❌ Fehler beim Generieren des PDFs:', error);
    
    // Benutzerfreundliche Fehlermeldung
    let errorMessage = 'Beim Erstellen des PDFs ist ein Fehler aufgetreten.';
    
    if (error instanceof Error) {
      if (error.message.includes('nicht gefunden')) {
        errorMessage = 'Das zu exportierende Element wurde nicht gefunden.';
      } else if (error.message.includes('CORS')) {
        errorMessage = 'Bilder konnten aufgrund von CORS-Richtlinien nicht geladen werden.';
      } else if (error.message.includes('tainted')) {
        errorMessage = 'Externe Inhalte konnten nicht erfasst werden.';
      }
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Hilfsfunktion: Wartet bis alle Bilder in einem Element geladen sind
 * 
 * @param element - Das HTML-Element, dessen Bilder überprüft werden sollen
 * @returns Promise, das erfüllt wird, wenn alle Bilder geladen sind
 */
export async function waitForImagesToLoad(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll('img');
  const imagePromises: Promise<void>[] = [];

  images.forEach(img => {
    if (img.complete) {
      return; // Bild ist bereits geladen
    }

    const promise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout beim Laden des Bildes: ${img.src}`));
      }, 10000); // 10 Sekunden Timeout

      img.onload = () => {
        clearTimeout(timeout);
        resolve();
      };

      img.onerror = () => {
        clearTimeout(timeout);
        console.warn(`Bild konnte nicht geladen werden: ${img.src}`);
        resolve(); // Fahre trotzdem fort
      };
    });

    imagePromises.push(promise);
  });

  await Promise.all(imagePromises);
}

/**
 * Erweiterte PDF-Generierung mit Vorbereitung
 * 
 * Diese Funktion bereitet das Element vor der Erfassung vor und
 * stellt sicher, dass alle Ressourcen geladen sind.
 * 
 * @param elementId - Die ID des HTML-Elements
 * @param options - Konfigurationsoptionen
 */
export async function generateEnhancedVisualPDF(
  elementId: string,
  options: VisualPDFOptions = {}
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element mit ID '${elementId}' wurde nicht gefunden`);
  }

  try {
    // Schritt 1: Warte auf alle Bilder
    console.log('⏳ Warte auf das Laden aller Bilder...');
    await waitForImagesToLoad(element);

    // Schritt 2: Kurze Verzögerung für CSS-Animationen
    await new Promise(resolve => setTimeout(resolve, 500));

    // Schritt 3: PDF generieren
    await generateVisualPDF(elementId, options);

  } catch (error) {
    console.error('Fehler bei der erweiterten PDF-Generierung:', error);
    throw error;
  }
}

/**
 * Multi-Page PDF Generator für große Inhalte
 * 
 * Teilt große Inhalte automatisch auf mehrere PDF-Seiten auf
 * 
 * @param elementId - Die ID des HTML-Elements
 * @param options - Konfigurationsoptionen
 */
export async function generateMultiPageVisualPDF(
  elementId: string,
  options: VisualPDFOptions = {}
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element mit ID '${elementId}' wurde nicht gefunden`);
  }

  const config = {
    filename: 'product-information.pdf',
    quality: 0.95,
    scale: 2,
    useCORS: true,
    allowTaint: false,
    ...options
  };

  try {
    console.log('📷 Erstelle Multi-Page PDF...');

    // Canvas von gesamtem Element erstellen
    const canvas = await html2canvas(element, {
      scale: config.scale,
      useCORS: config.useCORS,
      allowTaint: config.allowTaint,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // PDF-Setup
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = 210; // A4 Breite
    const pdfHeight = 297; // A4 Höhe
    const margin = 10;
    const contentWidth = pdfWidth - (margin * 2);
    const contentHeight = pdfHeight - (margin * 2);

    // Skalierung berechnen
    const scaleRatio = contentWidth / (canvas.width * 0.264583);
    const scaledHeight = canvas.height * 0.264583 * scaleRatio;

    // Wenn Inhalt auf eine Seite passt
    if (scaledHeight <= contentHeight) {
      const imgData = canvas.toDataURL('image/jpeg', config.quality);
      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, scaledHeight);
    } else {
      // Inhalt auf mehrere Seiten aufteilen
      const pageHeight = contentHeight;
      const numPages = Math.ceil(scaledHeight / pageHeight);

      for (let i = 0; i < numPages; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        // Canvas-Bereich für diese Seite berechnen
        const sourceY = (canvas.height / numPages) * i;
        const sourceHeight = Math.min(canvas.height / numPages, canvas.height - sourceY);

        // Temporäres Canvas für diese Seite erstellen
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        
        const pageCtx = pageCanvas.getContext('2d');
        if (pageCtx) {
          pageCtx.drawImage(
            canvas,
            0, sourceY, canvas.width, sourceHeight,
            0, 0, canvas.width, sourceHeight
          );

          const pageImgData = pageCanvas.toDataURL('image/jpeg', config.quality);
          const pageScaledHeight = sourceHeight * 0.264583 * scaleRatio;

          pdf.addImage(pageImgData, 'JPEG', margin, margin, contentWidth, pageScaledHeight);
        }
      }
    }

    // Metadaten hinzufügen
    pdf.setProperties({
      title: 'Product Information',
      subject: 'Multi-Page Product Information',
      author: 'Brüggen Product Information System',
      creator: 'Visual PDF Generator'
    });

    // PDF herunterladen
    pdf.save(config.filename);
    console.log('✅ Multi-Page PDF erfolgreich erstellt!');

  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Multi-Page PDFs:', error);
    throw error;
  }
}