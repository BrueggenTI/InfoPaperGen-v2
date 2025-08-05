/**
 * Server-basierte PDF-Generierung mit Puppeteer
 * 
 * Diese Datei implementiert die Frontend-Integration für die serverseitige
 * PDF-Generierung mit Puppeteer. Sie kommuniziert mit der /api/download-pdf
 * Route und löst den direkten PDF-Download im Browser aus.
 */

export interface ServerPDFOptions {
  sessionId: string;
  baseUrl?: string;
}

/**
 * Generiert und lädt ein PDF über die serverseitige Puppeteer-API herunter
 * 
 * @param options - Konfigurationsoptionen für den PDF-Download
 */
export async function downloadPDFFromServer(options: ServerPDFOptions): Promise<void> {
  const { sessionId, baseUrl } = options;

  try {
    console.log('📄 Starte serverseitige PDF-Generierung...');

    // API-Aufruf zur PDF-Generierung
    const response = await fetch('/api/download-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: sessionId,
        url: baseUrl || window.location.origin
      }),
    });

    console.log('📡 Server-Antwort erhalten:', response.status);

    // Überprüfe Response-Status
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server-Fehler: ${response.status} ${response.statusText}`);
    }

    // Content-Type überprüfen
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/pdf')) {
      throw new Error('Server hat kein PDF-Dokument zurückgegeben');
    }

    console.log('✅ PDF vom Server erhalten');

    // PDF-Blob erstellen
    const pdfBlob = await response.blob();
    
    // Dateiname aus Response-Header extrahieren (falls vorhanden)
    const contentDisposition = response.headers.get('content-disposition');
    let filename = `product-information-${sessionId.slice(0, 8)}.pdf`;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }

    console.log(`💾 Download wird gestartet: ${filename}`);

    // Download-Link erstellen und automatisch klicken
    const downloadUrl = URL.createObjectURL(pdfBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = filename;
    downloadLink.style.display = 'none';

    // Link zum DOM hinzufügen, klicken und wieder entfernen
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // Memory-Leak vermeiden: URL freigeben
    setTimeout(() => {
      URL.revokeObjectURL(downloadUrl);
    }, 1000);

    console.log('✅ PDF-Download erfolgreich abgeschlossen!');

  } catch (error) {
    console.error('❌ Fehler beim PDF-Download:', error);
    
    // Benutzerfreundliche Fehlermeldung generieren
    let userMessage = 'Beim Erstellen des PDFs ist ein Fehler aufgetreten.';
    
    if (error instanceof Error) {
      if (error.message.includes('Server-Fehler: 500')) {
        userMessage = 'Server-Fehler bei der PDF-Generierung. Bitte versuchen Sie es erneut.';
      } else if (error.message.includes('Network')) {
        userMessage = 'Netzwerk-Fehler. Bitte überprüfen Sie Ihre Internetverbindung.';
      } else if (error.message.includes('kein PDF-Dokument')) {
        userMessage = 'Der Server konnte kein PDF erstellen. Bitte kontaktieren Sie den Support.';
      }
    }
    
    // Fehler an den Benutzer weiterleiten
    throw new Error(userMessage);
  }
}

/**
 * Erweiterte PDF-Download-Funktion mit Progress-Feedback
 * 
 * @param options - Konfigurationsoptionen
 * @param onProgress - Callback für Progress-Updates (optional)
 */
export async function downloadPDFWithProgress(
  options: ServerPDFOptions,
  onProgress?: (stage: string, progress: number) => void
): Promise<void> {
  const { sessionId, baseUrl } = options;

  try {
    // Schritt 1: Request senden
    onProgress?.('Sende Anfrage an Server...', 20);
    
    const response = await fetch('/api/download-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: sessionId,
        url: baseUrl || window.location.origin
      }),
    });

    // Schritt 2: Response validieren
    onProgress?.('Validiere Server-Antwort...', 40);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server-Fehler: ${response.status}`);
    }

    // Schritt 3: PDF-Daten laden
    onProgress?.('Lade PDF-Daten...', 60);
    
    const pdfBlob = await response.blob();

    // Schritt 4: Download vorbereiten
    onProgress?.('Bereite Download vor...', 80);
    
    const contentDisposition = response.headers.get('content-disposition');
    let filename = `product-information-${sessionId.slice(0, 8)}.pdf`;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }

    // Schritt 5: Download starten
    onProgress?.('Starte Download...', 100);
    
    const downloadUrl = URL.createObjectURL(pdfBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = filename;
    downloadLink.style.display = 'none';

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    setTimeout(() => {
      URL.revokeObjectURL(downloadUrl);
    }, 1000);

    onProgress?.('Download abgeschlossen!', 100);

  } catch (error) {
    onProgress?.('Fehler aufgetreten', 0);
    throw error;
  }
}

/**
 * Hilfsfunktion: Überprüft die Server-Verfügbarkeit
 */
export async function checkServerPDFAvailability(): Promise<boolean> {
  try {
    const response = await fetch('/api/download-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: 'test',
        url: 'test'
      }),
    });

    // Wir erwarten einen 400-Fehler (Bad Request) bei ungültigen Daten
    // Das bedeutet, die Route ist verfügbar
    return response.status === 400 || response.status === 500;
  } catch (error) {
    console.warn('Server PDF-Service nicht verfügbar:', error);
    return false;
  }
}