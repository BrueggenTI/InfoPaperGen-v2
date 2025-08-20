
#!/bin/bash

echo "--- Starting Azure App Service ---"
echo "📋 Node.js Version: $(node --version)"
echo "📋 Working Directory: $(pwd)"
echo "📋 Environment: Azure App Service with Code Deployment"

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ CRITICAL: dist directory not found!"
    echo "🔍 Available files:"
    ls -la
    exit 1
fi

# Check if dist/index.js exists
if [ ! -f "dist/index.js" ]; then
    echo "❌ CRITICAL: dist/index.js not found!"
    echo "🔍 Content of dist directory:"
    ls -la dist/
    exit 1
fi

# Browser check (but don't fail if not found)
echo "🔍 Überprüfe Puppeteer Browser Installation..."
if [ -d "node_modules/puppeteer/.local-chromium" ] || [ -d "node_modules/puppeteer/.local-firefox" ]; then
    echo "✅ Puppeteer Browser gefunden"
else
    echo "⚠️ Puppeteer Browser nicht gefunden - wird bei erster Nutzung heruntergeladen"
fi

# Environment Variables für optimale Performance
export NODE_ENV=production
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false

# Debug: Show Node.js and file info
echo "🔧 Node.js Info:"
echo "   Version: $(node --version)"
echo "   Platform: $(node -e 'console.log(process.platform)')"
echo "   Architecture: $(node -e 'console.log(process.arch)')"

echo "🔧 Application Files:"
echo "   dist/index.js exists: $([ -f 'dist/index.js' ] && echo 'YES' || echo 'NO')"
echo "   dist/index.js size: $([ -f 'dist/index.js' ] && ls -lh dist/index.js | awk '{print $5}' || echo 'N/A')"

# Test the built application before starting
echo "🧪 Testing application syntax..."
node --check dist/index.js
if [ $? -ne 0 ]; then
    echo "❌ CRITICAL: Syntax error in dist/index.js"
    echo "🔍 First 50 lines of dist/index.js:"
    head -50 dist/index.js
    exit 1
fi

echo "✅ Application syntax check passed"

echo "🚀 Starte Node.js Anwendung..."
echo "✅ Kommando: npm start"

# Node.js Anwendung starten
npm start
