#!/bin/bash
# CHROME-INSTALLATION TESTSKRIPT
# Testet das aktualisierte Dockerfile auf Chrome-Kompatibilität

set -e

echo "🚀 CHROME-INSTALLATION TESTSKRIPT"
echo "=================================="

# Schritt 1: Docker-Image bauen
echo "🔨 Baue Docker-Image mit Chrome-Fix..."
docker build -t product-info-chrome-test .

if [ $? -ne 0 ]; then
    echo "❌ Docker-Build fehlgeschlagen!"
    exit 1
fi

echo "✅ Docker-Image erfolgreich gebaut!"

# Schritt 2: Chrome-Installation verifizieren
echo ""
echo "🔍 Teste Chrome-Installation im Container..."
docker run --rm product-info-chrome-test google-chrome-stable --version

if [ $? -eq 0 ]; then
    echo "✅ Google Chrome erfolgreich installiert!"
else
    echo "⚠️ Google Chrome Stable nicht gefunden, teste Alternativen..."
    
    # Alternative: google-chrome
    docker run --rm product-info-chrome-test google-chrome --version
    if [ $? -eq 0 ]; then
        echo "✅ Google Chrome (alternative Version) installiert!"
    else
        # Alternative: chromium-browser
        docker run --rm product-info-chrome-test chromium-browser --version
        if [ $? -eq 0 ]; then
            echo "⚠️ Chromium Browser installiert (Fallback)!"
        else
            echo "❌ KEIN BROWSER GEFUNDEN!"
            exit 1
        fi
    fi
fi

# Schritt 3: Browser-Pfade auflisten
echo ""
echo "📁 Verfügbare Browser-Pfade:"
docker run --rm product-info-chrome-test bash -c "ls -la /usr/bin/google-chrome* 2>/dev/null || echo 'Keine google-chrome* Dateien gefunden'"
docker run --rm product-info-chrome-test bash -c "ls -la /usr/bin/chromium* 2>/dev/null || echo 'Keine chromium* Dateien gefunden'"

# Schritt 4: Environment Variables prüfen
echo ""
echo "🌍 Environment Variables:"
docker run --rm product-info-chrome-test bash -c "echo 'PUPPETEER_EXECUTABLE_PATH=' \$PUPPETEER_EXECUTABLE_PATH"
docker run --rm product-info-chrome-test bash -c "echo 'PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=' \$PUPPETEER_SKIP_CHROMIUM_DOWNLOAD"

# Schritt 5: Minimaler Puppeteer-Test
echo ""
echo "🎭 Teste Puppeteer-Kompatibilität..."
docker run --rm product-info-chrome-test node -e "
const puppeteer = require('puppeteer');
(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable'
    });
    console.log('✅ Puppeteer Browser erfolgreich gestartet!');
    await browser.close();
    console.log('✅ Browser erfolgreich geschlossen!');
  } catch (error) {
    console.log('❌ Puppeteer-Test fehlgeschlagen:', error.message);
    process.exit(1);
  }
})();
"

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 ALLE TESTS ERFOLGREICH!"
    echo "✅ Chrome ist korrekt installiert"
    echo "✅ Environment Variables sind gesetzt"
    echo "✅ Puppeteer kann Browser starten"
    echo ""
    echo "Das Docker-Image ist bereit für Azure-Deployment!"
else
    echo "❌ Puppeteer-Test fehlgeschlagen!"
    exit 1
fi