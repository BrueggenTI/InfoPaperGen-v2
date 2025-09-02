# =================================================================
# Stufe 1: "Builder"
# Diese Stufe ist eine temporäre Bau-Werkstatt. Ihr einziger Zweck
# ist es, Ihre Anwendung mit ALLEN Werkzeugen zu bauen (npm run build).
# =================================================================
FROM node:20-slim AS builder
WORKDIR /app

# Installiert die Abhängigkeiten für Chrome und Chrome selbst in einem einzigen RUN-Befehl, um die Anzahl der Layer zu reduzieren
RUN apt-get update && apt-get install -y \
    wget gnupg ca-certificates fonts-liberation \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libcairo2 libcups2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 \
    libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 \
    libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 \
    libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
    libxtst6 lsb-release curl xdg-utils --no-install-recommends && \
    wget -q -O /tmp/google-chrome-key.pub https://dl-ssl.google.com/linux/linux_signing_key.pub && \
    gpg --dearmor -o /usr/share/keyrings/google-chrome-keyring.gpg /tmp/google-chrome-key.pub && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable --no-install-recommends && \
    # Bereinigt Caches und temporäre Dateien, um die Layer-Größe zu minimieren
    rm -rf /var/lib/apt/lists/* /tmp/google-chrome-key.pub

# Zuerst die package.json kopieren, um den Docker-Layer-Cache zu nutzen
COPY package*.json ./
# Alle Abhängigkeiten installieren, die zum Bauen benötigt werden (inkl. devDependencies)
RUN npm ci --include=dev

# Den gesamten restlichen Quellcode kopieren
COPY . .
# Den Build-Befehl ausführen
RUN npm run build

# =================================================================
# Stufe 2: "Final"
# Diese Stufe ist das finale, schlanke Image, das in Azure laufen wird.
# Es enthält KEINE Build-Werkzeuge mehr, nur die fertige App.
# =================================================================
FROM node:20-slim
WORKDIR /app

# Installiert NUR die Laufzeit-Abhängigkeiten für Chrome, NICHT Chrome selbst.
# Das spart Zeit und reduziert die Image-Größe, da Chrome aus der Builder-Stufe kopiert wird.
RUN apt-get update && apt-get install -y \
    fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libcairo2 libcups2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 \
    libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 \
    libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 \
    libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 \
    lsb-release xdg-utils --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Kopiert die vorinstallierte Chrome-Anwendung aus der Builder-Stufe
COPY --from=builder /opt/google /opt/google
COPY --from=builder /usr/bin/google-chrome-stable /usr/bin/google-chrome-stable

# package.json und package-lock.json kopieren
COPY package*.json ./
# Installiert NUR die Laufzeit-Abhängigkeiten (keine devDependencies)
RUN npm ci --omit=dev

# Kopiert die gebaute Anwendung und die Assets aus der "Builder"-Stufe
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/attached_assets ./attached_assets

# Puppeteer-Umgebungsvariablen für die Laufzeit
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV NODE_ENV=production
ENV PORT=8080

# Sicherheitsmaßnahme: Einen nicht-privilegierten Benutzer erstellen und Berechtigungen setzen
# Wichtig: Dies geschieht, nachdem alle Dateien nach /app kopiert wurden
RUN useradd --system --uid 1001 --gid 0 appuser
RUN chown -R appuser:0 /app

# [FIX] Berechtigungen für den Chrome-Browser für den appuser setzen
# Der appuser benötigt die Berechtigung, den Chrome-Browser auszuführen.
RUN chown -R appuser:0 /opt/google /usr/bin/google-chrome-stable && \
    chmod +x /usr/bin/google-chrome-stable

# Zum nicht-privilegierten Benutzer wechseln
USER appuser

# Den Port freigeben, auf dem die App lauscht
EXPOSE 8080

# Der finale Startbefehl für die gebaute Anwendung
CMD ["node", "dist/index.js"]