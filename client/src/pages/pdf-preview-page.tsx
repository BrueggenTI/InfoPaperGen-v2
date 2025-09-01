import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import DocumentPreview from "@/components/document-preview";
import { ProductInfo } from "@shared/schema";

/**
 * PDF-Preview-Seite für Puppeteer
 * 
 * Diese Seite wird von Puppeteer besucht, um die Live-Preview
 * als PDF zu rendern. Sie zeigt die DocumentPreview-Komponente
 * ohne Download-Buttons und andere UI-Elemente.
 */
export default function PDFPreviewPage() {
  const [, setLocation] = useLocation();
  
  // Session-ID aus URL-Parameter extrahieren
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session');

  // Session-Daten laden
  const { data: sessionData, isLoading, error } = useQuery({
    queryKey: ['/api/product-info/sessions', sessionId],
    enabled: !!sessionId,
  });

  // Fehlerbehandlung
  if (!sessionId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Session-ID fehlt</h1>
          <p className="text-gray-600">Diese Seite benötigt eine gültige Session-ID als URL-Parameter.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Produktdaten...</p>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Fehler beim Laden</h1>
          <p className="text-gray-600">Die Produktdaten konnten nicht geladen werden.</p>
          <p className="text-sm text-gray-500 mt-2">Session-ID: {sessionId}</p>
        </div>
      </div>
    );
  }

  // PDF-optimierte Styles für bessere Darstellung
  return (
    <div className="min-h-screen bg-white">
      {/* Container mit expliziter ID für Puppeteer */}
      <div id="document-preview-content">
        <style>{`
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
            .page-break-before { page-break-before: always; }
            .page-break-after { page-break-after: always; }
            .avoid-break { page-break-inside: avoid; }
          }
          
          /* CSS für Puppeteer PDF-Generierung */
          .page-break-before {
            page-break-before: always;
            break-before: page;
          }
          
          .page-break-after {
            page-break-after: always;
            break-after: page;
          }
          
          .avoid-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* PDF-optimierte Schriftarten */
          body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            margin: 0;
            padding: 0;
          }

          /* =================================================================== */
          /* CSS-Lösung zur Behebung des PDF-Abstandproblems (General Solution) */
          /* =================================================================== */

          h2, h3 {
            /* Setzt den Abstand UNTER der Überschrift auf einen kleinen, sauberen Wert. */
            margin-bottom: 4px !important; 
          }

          p {
            /* Entfernt den Abstand ÜBER dem Absatz vollständig. */
            margin-top: 0 !important;
            
            /* Verbessert die Lesbarkeit des Textes. */
            line-height: 1.5;
          }
          
          /* Container für PDF-Seiten */
          .pdf-page {
            min-height: 100vh;
            padding: 20mm;
            box-sizing: border-box;
          }
          
          /* Bessere Darstellung für PDF */
          img {
            max-width: 100%;
            height: auto;
            image-rendering: -webkit-optimize-contrast;
          }
          
          /* Tabellen-Optimierungen */
          table {
            border-collapse: collapse;
            width: 100%;
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          th, td {
            border: 1px solid #e5e7eb;
            padding: 8px;
            text-align: left;
          }
          
          /* Gradient-Fallbacks für PDF */
          .gradient-fallback {
            background: #f59e0b !important;
          }
          
          /* Verstecke visuelle Page-Break-Indikatoren im PDF */
          .page-break-indicator {
            display: none;
          }
        `}</style>
        
        {/* Document Preview ohne Download-Button */}
        <DocumentPreview 
          formData={sessionData as ProductInfo} 
          sessionId={sessionId}
        />
      </div>
    </div>
  );
}