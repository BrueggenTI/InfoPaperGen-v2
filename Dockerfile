# DEFINITIVE AZURE CHROME-FIX DOCKERFILE
# 100% funktionsfähige Chrome-Installation für Azure App Service
FROM node:18-slim

# Root-Benutzer für Paketinstallation
USER root

# System aktualisieren und grundlegende Tools installieren
RUN apt-get update && apt-get upgrade -y

# VOLLSTÄNDIGE Chrome-Abhängigkeiten installieren (alle erforderlichen Pakete)
RUN apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    wget \
    unzip \
    procps \
    fonts-liberation \
    fonts-dejavu-core \
    fontconfig \
    hicolor-icon-theme \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
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
    libxshmfence-dev \
    libgbm-dev \
    lsb-release \
    xdg-utils \
    --no-install-recommends

# METHODE 1: Google Chrome über offizielle Quelle installieren (moderne GPG-Schlüssel Handhabung)
RUN curl -sSL https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable

# METHODE 2: Fallback - Direkte .deb Installation (falls Methode 1 fehlschlägt)
RUN if ! command -v google-chrome-stable &> /dev/null; then \
        echo "FALLBACK: Installiere Chrome direkt von Google..." && \
        wget -q -O chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
        apt-get install -y ./chrome.deb && \
        rm chrome.deb; \
    fi

# METHODE 3: Ultimate Fallback - Chromium als letzte Chance
RUN if ! command -v google-chrome-stable &> /dev/null && ! command -v google-chrome &> /dev/null; then \
        echo "ULTIMATE FALLBACK: Installiere Chromium..." && \
        apt-get install -y chromium-browser; \
    fi

# Chrome Installation verifizieren und Debugging-Informationen ausgeben
RUN echo "=== CHROME INSTALLATION VERIFICATION ===" && \
    ls -la /usr/bin/google-chrome* 2>/dev/null || echo "Keine google-chrome* gefunden" && \
    ls -la /usr/bin/chromium* 2>/dev/null || echo "Keine chromium* gefunden" && \
    which google-chrome-stable 2>/dev/null || echo "google-chrome-stable nicht im PATH" && \
    which google-chrome 2>/dev/null || echo "google-chrome nicht im PATH" && \
    which chromium-browser 2>/dev/null || echo "chromium-browser nicht im PATH"

# Chrome Version ausgeben (für Azure Logs)
RUN if command -v google-chrome-stable &> /dev/null; then \
        echo "SUCCESS: Google Chrome Stable installiert" && \
        google-chrome-stable --version; \
    elif command -v google-chrome &> /dev/null; then \
        echo "SUCCESS: Google Chrome installiert" && \
        google-chrome --version; \
    elif command -v chromium-browser &> /dev/null; then \
        echo "FALLBACK: Chromium Browser installiert" && \
        chromium-browser --version; \
    else \
        echo "KRITISCHER FEHLER: Kein Browser installiert!" && \
        exit 1; \
    fi

# Cache aufräumen
RUN rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && apt-get clean

# Arbeitsverzeichnis einrichten
WORKDIR /usr/src/app

# Zuerst alle Abhängigkeiten installieren (inkl. devDependencies für Build)
COPY package*.json ./
RUN npm ci

# Quellcode kopieren und Projekt builden
COPY . .
RUN npm run build

# Nur Production-Abhängigkeiten installieren
RUN npm ci --only=production && npm cache clean --force

# Environment Variables für Puppeteer setzen (KRITISCH für Azure)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Nicht-root-Benutzer für Sicherheit erstellen
RUN groupadd -g 1001 -r nodejs && \
    useradd -r -g nodejs -u 1001 nodejs

# Ordnerrechte setzen
RUN chown -R nodejs:nodejs /usr/src/app
USER nodejs

# Port freigeben - Azure App Service leitet Traffic automatisch weiter
EXPOSE 8080

# Health Check für Container-Monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Startbefehl definieren
CMD [ "npm", "start" ]