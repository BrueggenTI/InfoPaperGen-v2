/**
 * Server-basierte PDF-Generierung mit direkten Formular-Daten
 * 
 * Diese Datei implementiert die Frontend-Integration für die serverseitige
 * PDF-Generierung. Die Formular-Daten werden direkt an den Server gesendet
 * und dort in ein sauberes PDF-Template konvertiert.
 */

import { ProductInfo } from "@shared/schema";

export interface DirectPDFOptions {
  formData: ProductInfo;
  sessionId: string;
}

/**
 * Generiert und lädt ein PDF direkt mit Formular-Daten herunter
 * 
 * @param options - Formular-Daten und Session-ID
 */
export async function downloadPDFFromServer(options: DirectPDFOptions): Promise<void> {
  const { formData, sessionId } = options;

  try {
    console.log('📄 Starte direkte PDF-Generierung mit Formular-Daten...');
    console.log('📋 Formular-Daten:', {
      productName: formData.productName,
      hasNutrition: !!formData.nutrition,
      ingredientsCount: formData.ingredients?.length || 0,
      sessionId: sessionId
    });

    // Validate required data
    if (!formData.productName) {
      throw new Error('Produktname ist erforderlich für die PDF-Generierung');
    }

    // API-Aufruf zur direkten PDF-Generierung mit verbesserter Timeout-Behandlung
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s Timeout

    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        formData: formData,
        sessionId: sessionId
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log('📡 Server-Antwort erhalten:', response.status);

    // Überprüfe Response-Status
    if (!response.ok) {
      let errorMessage = `Server-Fehler: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // JSON-Parse-Fehler ignorieren und Standard-Message verwenden
      }
      throw new Error(errorMessage);
    }

    // Content-Type überprüfen
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/pdf')) {
      throw new Error('Server hat kein PDF-Dokument zurückgegeben');
    }

    console.log('✅ PDF vom Server erhalten');

    // PDF-Blob erstellen
    const pdfBlob = await response.blob();
    
    // Dateiname generieren
    const timestamp = new Date().toISOString().slice(0, 10);
    const productName = formData.productName ? 
      formData.productName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() : 
      'product';
    
    // Dateiname aus Response-Header extrahieren (falls vorhanden)
    const contentDisposition = response.headers.get('content-disposition');
    let filename = `${productName}-${sessionId.slice(0, 8)}-${timestamp}.pdf`;
    
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
      if (error.name === 'AbortError') {
        userMessage = 'Die PDF-Generierung hat zu lange gedauert. Bitte versuchen Sie es erneut.';
      } else if (error.message.includes('Server-Fehler: 500')) {
        userMessage = 'Server-Fehler bei der PDF-Generierung. Bitte versuchen Sie es erneut.';
      } else if (error.message.includes('Network') || error.message.includes('fetch')) {
        userMessage = 'Netzwerk-Fehler. Bitte überprüfen Sie Ihre Internetverbindung.';
      } else if (error.message.includes('kein PDF-Dokument')) {
        userMessage = 'Der Server konnte kein PDF erstellen. Bitte kontaktieren Sie den Support.';
      } else if (error.message.includes('erforderlich')) {
        userMessage = error.message; // Validation error
      }
    }
    
    // Fehler an den Benutzer weiterleiten
    throw new Error(userMessage);
  }
}

/**
 * Erweiterte PDF-Download-Funktion mit Progress-Feedback
 * 
 * @param options - Formular-Daten und Session-ID
 * @param onProgress - Callback für Progress-Updates (optional)
 */
export async function downloadPDFWithProgress(
  options: DirectPDFOptions,
  onProgress?: (stage: string, progress: number) => void
): Promise<void> {
  const { formData, sessionId } = options;

  try {
    // Schritt 1: Request senden
    onProgress?.('Sende Formulardaten an Server...', 20);
    
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        formData: formData,
        sessionId: sessionId
      }),
    });

    // Schritt 2: Response validieren
    onProgress?.('Validiere Server-Antwort...', 40);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server-Fehler: ${response.status}`);
    }

    // Schritt 3: PDF-Daten laden
    onProgress?.('PDF wird generiert...', 60);
    
    const pdfBlob = await response.blob();

    // Schritt 4: Download vorbereiten
    onProgress?.('Bereite Download vor...', 80);
    
    const contentDisposition = response.headers.get('content-disposition');
    let filename = `product-information-${sessionId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.pdf`;
    
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
 * Hilfsfunktion: Überprüft die Server-Verfügbarkeit für direkte PDF-Generierung
 */
export async function checkServerPDFAvailability(): Promise<boolean> {
  try {
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        formData: {},
        sessionId: 'test'
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