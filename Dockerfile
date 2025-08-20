# Schritt 1: Basis-Image festlegen
# Wir verwenden ein offizielles, schlankes Node.js-Image. Version 18 ist eine stabile Wahl.
FROM node:18-slim

# Schritt 2: Root-Benutzer für Paketinstallation
USER root

# Schritt 3: Systemabhängigkeiten für Puppeteer installieren
# Dies ist der entscheidende Teil, der Chrome und alle Abhängigkeiten installiert.
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    libasound2 \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm-dev \
    libxshmfence-dev \
    libxdamage-dev \
    libxfixes-dev \
    libxrandr-dev \
    libxcomposite-dev \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libatspi2.0-0 \
    fonts-liberation \
    libcairo2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcursor1 \
    libxext6 \
    libxi6 \
    libxrender1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    --no-install-recommends

# Schritt 4: Google Chrome Signing Key und Repository hinzufügen
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'

# Schritt 5: Google Chrome installieren
RUN apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Schritt 6: Arbeitsverzeichnis einrichten
WORKDIR /usr/src/app

# Schritt 7: Zuerst alle Abhängigkeiten installieren (inkl. devDependencies für Build)
COPY package*.json ./
RUN npm ci

# Schritt 8: Quellcode kopieren und Projekt builden
COPY . .
RUN npm run build

# Schritt 9: Nur Production-Abhängigkeiten installieren
RUN npm ci --only=production && npm cache clean --force

# Schritt 10: Nicht-root-Benutzer für Sicherheit erstellen
RUN groupadd -g 1001 -r nodejs && \
    useradd -r -g nodejs -u 1001 nodejs

# Schritt 11: Ordnerrechte setzen
RUN chown -R nodejs:nodejs /usr/src/app
USER nodejs

# Schritt 12: Port freigeben, auf dem die App lauscht
# Azure App Service leitet den externen Traffic automatisch an diesen Port weiter.
EXPOSE 8080

# Schritt 13: Startbefehl definieren
CMD [ "npm", "start" ]