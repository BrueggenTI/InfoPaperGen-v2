#!/bin/bash

# Azure App Service Startup Script
# Dieses Skript wird beim Start der App Service Instanz ausgeführt
# und installiert Chromium für Puppeteer, bevor die Node.js App gestartet wird

echo "🚀 Azure App Service Startup Script gestartet..."

# Setze Exit-on-Error Flag für robuste Fehlerbehandlung
set -e

# 1. System Update und Paketlisten aktualisieren
echo "📦 Aktualisiere Paketlisten..."
apt-get update -qq > /dev/null 2>&1 || {
    echo "⚠️ apt-get update fehlgeschlagen, versuche fortzufahren..."
}

# 2. Chromium und notwendige Abhängigkeiten installieren
echo "🌐 Installiere Chromium Browser..."
apt-get install -y \
    chromium-browser \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    --quiet > /dev/null 2>&1 || {
    echo "⚠️ Chromium Installation fehlgeschlagen, versuche alternatives Paket..."
    apt-get install -y chromium --no-install-recommends --quiet > /dev/null 2>&1 || {
        echo "❌ Chromium Installation vollständig fehlgeschlagen!"
        echo "🔍 Verfügbare Browser-Pakete:"
        apt-cache search chromium || echo "Keine Chromium-Pakete gefunden"
    }
}

# 3. Browser-Installation verifizieren
echo "🔍 Verifiziere Browser-Installation..."
CHROMIUM_PATH=""

# Suche nach verfügbaren Browser-Pfaden
for path in /usr/bin/chromium-browser /usr/bin/chromium /usr/bin/google-chrome-stable /usr/bin/google-chrome; do
    if [ -f "$path" ]; then
        echo "✅ Browser gefunden: $path"
        CHROMIUM_PATH="$path"
        break
    fi
done

if [ -z "$CHROMIUM_PATH" ]; then
    echo "❌ FEHLER: Kein Browser gefunden!"
    echo "🔍 Verfügbare Executables in /usr/bin:"
    ls -la /usr/bin/ | grep -E "(chrom|chrome)" || echo "Keine Chrome/Chromium Executables gefunden"
    echo "⚠️ PDF-Generierung wird möglicherweise nicht funktionieren!"
else
    echo "🎉 Browser erfolgreich installiert: $CHROMIUM_PATH"
    # Setze Environment Variable für Puppeteer
    export PUPPETEER_EXECUTABLE_PATH="$CHROMIUM_PATH"
    echo "📝 PUPPETEER_EXECUTABLE_PATH gesetzt auf: $PUPPETEER_EXECUTABLE_PATH"
fi

# 4. Node.js und NPM Versionen anzeigen
echo "📋 System-Informationen:"
echo "   Node.js Version: $(node --version)"
echo "   NPM Version: $(npm --version)"
echo "   Working Directory: $(pwd)"
echo "   User: $(whoami)"

# 5. Anwendungsabhängigkeiten prüfen
echo "🔍 Prüfe Anwendungsstruktur..."
if [ -f "package.json" ]; then
    echo "✅ package.json gefunden"
else
    echo "❌ package.json nicht gefunden!"
    ls -la
    exit 1
fi

if [ -d "dist" ]; then
    echo "✅ dist-Verzeichnis gefunden"
    ls -la dist/
else
    echo "⚠️ dist-Verzeichnis nicht gefunden - läuft die App im Entwicklungsmodus?"
fi

# 6. Environment Variables für Puppeteer setzen
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH="$CHROMIUM_PATH"

# 7. Debug-Informationen ausgeben
echo "🔧 Environment Variables:"
echo "   NODE_ENV=${NODE_ENV:-development}"
echo "   PUPPETEER_EXECUTABLE_PATH=${PUPPETEER_EXECUTABLE_PATH:-nicht gesetzt}"
echo "   OPENAI_API_KEY=${OPENAI_API_KEY:+***gefunden***}"

# 8. Final: Node.js Anwendung starten
echo "🚀 Starte Node.js Anwendung..."
echo "====================================="

# Verwende den npm start Befehl aus package.json
exec npm start

# Alternative falls npm start nicht funktioniert:
# exec node dist/index.js