# PERFEKTES DOCKERFILE FÜR AZURE CONTAINER DEPLOYMENT
# Optimiert für Puppeteer PDF-Generierung mit vollständiger Chrome-Integration
FROM node:18-slim

# Arbeitsverzeichnis früh setzen
WORKDIR /usr/src/app

# System als Root-User für Installationen konfigurieren
USER root

# System aktualisieren und grundlegende Tools installieren
RUN apt-get update && apt-get upgrade -y

# VOLLSTÄNDIGE Chrome-Abhängigkeiten installieren (alle erforderlichen Pakete für Azure)
RUN apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    wget \
    unzip \
    fonts-liberation \
    fonts-dejavu-core \
    fonts-noto \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    fontconfig \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    --no-install-recommends

# METHODE 1: Google Chrome über offizielle Quelle installieren
RUN curl -sSL https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable

# METHODE 2: Fallback - Direkte .deb Installation (falls Methode 1 fehlschlägt)
RUN if ! command -v google-chrome-stable &> /dev/null; then \
        echo "Fallback: Installiere Chrome direkt von Google..." && \
        wget -q -O chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
        apt-get install -y ./chrome.deb && \
        rm chrome.deb; \
    fi

# METHODE 3: Letzte Chance - Chromium als Backup
RUN if ! command -v google-chrome-stable &> /dev/null && ! command -v google-chrome &> /dev/null; then \
        echo "Ultima Ratio: Installiere Chromium..." && \
        apt-get install -y chromium-browser; \
    fi

# Chrome Installation verifizieren und Debugging-Informationen
RUN echo "=== Chrome Installation Status ===" && \
    (google-chrome-stable --version || echo "google-chrome-stable nicht gefunden") && \
    (google-chrome --version || echo "google-chrome nicht gefunden") && \
    (chromium-browser --version || echo "chromium-browser nicht gefunden") && \
    which google-chrome-stable || echo "google-chrome-stable nicht im PATH" && \
    which google-chrome || echo "google-chrome nicht im PATH" && \
    which chromium-browser || echo "chromium-browser nicht im PATH" && \
    ls -la /usr/bin/*chrome* || echo "Keine Chrome-Binärdateien gefunden" && \
    echo "=== Chrome Installation Complete ==="

# Cache leeren für kleinere Image-Größe
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Node.js User für Sicherheit erstellen
RUN groupadd -r nodeuser && useradd -r -g nodeuser -G audio,video nodeuser \
    && mkdir -p /home/nodeuser/Downloads \
    && chown -R nodeuser:nodeuser /home/nodeuser \
    && chown -R nodeuser:nodeuser /usr/src/app

# Package files kopieren für besseres Caching
COPY package*.json ./

# Abhängigkeiten installieren
RUN npm ci --only=production --no-audit --no-fund

# Anwendungscode kopieren
COPY . .

# TypeScript-Dateien kompilieren und Frontend bauen
RUN npm run build

# Chrome-Pfade für verschiedene Installationsarten setzen
ENV CHROME_BIN=/usr/bin/google-chrome-stable
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Fallback-Pfade für Chrome setzen
RUN if [ ! -f "$PUPPETEER_EXECUTABLE_PATH" ]; then \
        if [ -f "/usr/bin/google-chrome" ]; then \
            export PUPPETEER_EXECUTABLE_PATH="/usr/bin/google-chrome"; \
        elif [ -f "/usr/bin/chromium-browser" ]; then \
            export PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium-browser"; \
        fi \
    fi

# Azure-spezifische Umgebungsvariablen
ENV NODE_ENV=production
ENV PORT=8080
ENV WEBSITES_ENABLE_APP_SERVICE_STORAGE=false

# Berechtigungen für nodeuser setzen
RUN chown -R nodeuser:nodeuser /usr/src/app

# Zu nodeuser wechseln
USER nodeuser

# Port freigeben
EXPOSE 8080

# Health Check für Azure Container
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Anwendung starten
CMD ["npm", "start"]