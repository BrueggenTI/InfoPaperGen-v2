# Schritt 1: Basis-Image festlegen
# Wir verwenden ein offizielles, schlankes Node.js-Image. Version 18 ist eine stabile Wahl.
FROM node:18-slim

# Schritt 2: Systemabhängigkeiten für Puppeteer installieren
# Dies ist der entscheidende Teil, der Chromium in die Umgebung bringt.
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
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
    wget \
    xdg-utils \
    --no-install-recommends

# Schritt 3: Arbeitsverzeichnis einrichten
WORKDIR /usr/src/app

# Schritt 4: App-Abhängigkeiten installieren
# Dies nutzt den Layer-Cache von Docker, um die Installation zu beschleunigen.
COPY package*.json ./
RUN npm install --production

# Schritt 5: Quellcode in den Container kopieren
COPY . .

# Schritt 6: Port freigeben, auf dem die App lauscht
# Azure App Service leitet den externen Traffic automatisch an diesen Port weiter.
EXPOSE 8080

# Schritt 7: Startbefehl definieren
CMD [ "npm", "start" ]