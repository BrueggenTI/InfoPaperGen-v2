#!/bin/bash

# Azure App Service Startup Script - Code Deployment optimiert
# Für Azure App Service mit Code-Bereitstellung (nicht Container)

echo "🚀 Azure App Service Startup Script gestartet..."
echo "📋 Environment: Azure App Service mit Code-Bereitstellung"
echo "📋 Node.js Version: $(node --version)"
echo "📋 Working Directory: $(pwd)"

# Azure App Service Code-Bereitstellung hat eingeschränkte Rechte
# Wir können keine System-Pakete installieren, müssen daher Puppeteer umkonfigurieren

# 1. Überprüfe verfügbare Browser-Pfade in Azure
echo "🔍 Suche nach verfügbaren Browsern in Azure App Service..."

# Azure App Service manchmal hat diese Pfade
POSSIBLE_PATHS=(
    "/usr/bin/chromium-browser"
    "/usr/bin/chromium" 
    "/usr/bin/google-chrome-stable"
    "/usr/bin/google-chrome"
    "/opt/google/chrome/chrome"
    "/snap/bin/chromium"
)

BROWSER_FOUND=""
for path in "${POSSIBLE_PATHS[@]}"; do
    if [ -f "$path" ]; then
        echo "✅ Browser gefunden: $path"
        BROWSER_FOUND="$path"
        export PUPPETEER_EXECUTABLE_PATH="$path"
        break
    else
        echo "❌ Nicht gefunden: $path"
    fi
done

if [ -z "$BROWSER_FOUND" ]; then
    echo "⚠️ KEIN BROWSER GEFUNDEN in Azure App Service!"
    echo "🔄 Setze Puppeteer auf Standard-Download-Modus..."
    export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
    unset PUPPETEER_EXECUTABLE_PATH
else
    echo "🎉 Browser konfiguriert: $BROWSER_FOUND"
    export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
fi

# 2. Überprüfe kritische Dateien
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
    ls -la dist/ | head -5
else
    echo "⚠️ dist-Verzeichnis nicht gefunden!"
    echo "🔧 Erstelle Build..."
    npm run build || {
        echo "❌ Build fehlgeschlagen!"
        exit 1
    }
fi

# 3. Azure-spezifische Environment Variables setzen
echo "🔧 Setze Azure-kompatible Environment Variables..."
export NODE_ENV=production
export PORT=${PORT:-8080}

# Puppeteer Configuration für Azure
if [ -n "$BROWSER_FOUND" ]; then
    export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
    export PUPPETEER_EXECUTABLE_PATH="$BROWSER_FOUND"
else
    echo "🔄 Aktiviere Puppeteer Browser-Download für Azure..."
    export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
    # Setze Cache-Verzeichnis auf schreibbaren Bereich
    export PUPPETEER_CACHE_DIR="/tmp/.puppeteer"
    mkdir -p "$PUPPETEER_CACHE_DIR"
fi

# 4. Debug-Informationen
echo "🔧 Final Environment Variables:"
echo "   NODE_ENV=${NODE_ENV}"
echo "   PORT=${PORT}"
echo "   PUPPETEER_EXECUTABLE_PATH=${PUPPETEER_EXECUTABLE_PATH:-nicht gesetzt}"
echo "   PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=${PUPPETEER_SKIP_CHROMIUM_DOWNLOAD}"
echo "   OPENAI_API_KEY=${OPENAI_API_KEY:+***gefunden***}"

# 5. Puppeteer Browser herunterladen falls nötig
if [ "$PUPPETEER_SKIP_CHROMIUM_DOWNLOAD" = "false" ]; then
    echo "📦 Installiere Puppeteer Browser..."
    npx puppeteer browsers install chrome || {
        echo "⚠️ Browser-Download fehlgeschlagen, versuche weiter..."
    }
fi

# 6. Starte die Anwendung
echo "🚀 Starte Node.js Anwendung..."
echo "====================================="

# Prüfe ob dist/index.js existiert
if [ -f "dist/index.js" ]; then
    echo "✅ Starte: node dist/index.js"
    exec node dist/index.js
else
    echo "⚠️ dist/index.js nicht gefunden, versuche npm start..."
    exec npm start
fi