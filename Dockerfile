# =================================================================
# Stufe 1: "Builder"
# Diese Stufe ist eine temporäre Bau-Werkstatt. Ihr einziger Zweck
# ist es, Ihre Anwendung mit ALLEN Werkzeugen zu bauen (npm run build).
# =================================================================
FROM node:20-slim AS builder
WORKDIR /app

# Install Chrome dependencies in the builder stage as well, as some build processes might need it.
RUN apt-get update && apt-get install -y \
    wget gnupg ca-certificates fonts-liberation \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libcairo2 libcups2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 \
    libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 \
    libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 \
    libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
    libxtst6 lsb-release curl xdg-utils --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Install Chrome in the builder stage
RUN wget -q -O /tmp/google-chrome-key.pub https://dl-ssl.google.com/linux/linux_signing_key.pub && \
    gpg --dearmor -o /usr/share/keyrings/google-chrome-keyring.gpg /tmp/google-chrome-key.pub && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable --no-install-recommends && \
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

# Installiert ZUERST die benötigten Tools für Chrome und dann Chrome selbst
RUN apt-get update && apt-get install -y \
    wget gnupg ca-certificates fonts-liberation \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libcairo2 libcups2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 \
    libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 \
    libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 \
    libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
    libxtst6 lsb-release curl xdg-utils --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Installiert Google Chrome mit robuster Methode
RUN wget -q -O /tmp/google-chrome-key.pub https://dl-ssl.google.com/linux/linux_signing_key.pub && \
    gpg --dearmor -o /usr/share/keyrings/google-chrome-keyring.gpg /tmp/google-chrome-key.pub && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable --no-install-recommends && \
    rm -rf /var/lib/apt/lists/* /tmp/google-chrome-key.pub

# package.json und package-lock.json kopieren
COPY package*.json ./
# Installiert NUR die Laufzeit-Abhängigkeiten (keine devDependencies)
RUN npm ci --omit=dev

# Kopiert den fertigen 'dist'-Ordner aus der "Builder"-Stufe
COPY --from=builder /app/dist ./dist
# Kopiert die für die PDF-Generierung benötigten Assets
COPY --from=builder /app/attached_assets ./attached_assets

# Puppeteer-Umgebungsvariablen für die Laufzeit
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV NODE_ENV=production
ENV PORT=8080

# Sicherheitsmaßnahme: Einen nicht-privilegierten Benutzer erstellen
RUN useradd --system --uid 1001 --gid 0 appuser
RUN chown -R appuser:0 /app

# Zum nicht-privilegierten Benutzer wechseln
USER appuser

# Den Port freigeben, auf dem die App lauscht
EXPOSE 8080

# Der finale Startbefehl für die gebaute Anwendung
CMD ["node", "dist/index.js"]