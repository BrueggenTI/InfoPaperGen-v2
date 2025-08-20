
#!/bin/bash

echo "--- Starting Azure App Service ---"
echo "📋 Node.js Version: $(node --version)"
echo "📋 Working Directory: $(pwd)"
echo "📋 Environment: Azure App Service with Code Deployment"

# Browser sollte bereits durch postinstall verfügbar sein
echo "🔍 Überprüfe Puppeteer Browser Installation..."
if [ -d "node_modules/puppeteer/.local-chromium" ] || [ -d "node_modules/puppeteer/.local-firefox" ]; then
    echo "✅ Puppeteer Browser gefunden"
else
    echo "⚠️ Puppeteer Browser nicht gefunden - verwende Standard-Download"
fi

# Environment Variables für optimale Performance
export NODE_ENV=production
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false

echo "🚀 Starte Node.js Anwendung..."
echo "✅ Kommando: npm start"

# Node.js Anwendung starten
npm start
