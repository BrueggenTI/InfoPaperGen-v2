# Verwende Node.js 18 Slim als Basis-Image für optimale Größe
FROM node:18-slim

# Setze Arbeitsverzeichnis im Container
WORKDIR /usr/src/app

# Installiere Systemabhängigkeiten für Puppeteer und Chromium
# Diese Pakete sind essentiell für headless Browser-Operationen
RUN apt-get update && apt-get install -y \
    # Chromium Browser und grundlegende Abhängigkeiten
    chromium \
    # Schriftarten für korrekte PDF-Darstellung
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-noto-cjk \
    # Grafik- und Audio-Bibliotheken
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgtk-3-0 \
    libgtk-4-1 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    # Zusätzliche Bibliotheken für stabile Browser-Ausführung
    xvfb \
    # Aufräumen des Package-Cache zur Reduzierung der Image-Größe
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Setze Umgebungsvariable für Puppeteer, um lokales Chromium zu verwenden
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Kopiere Package-Dateien zuerst (für besseren Docker Layer Cache)
COPY package*.json ./

# Installiere nur Produktionsabhängigkeiten
RUN npm ci --only=production

# Kopiere den restlichen Anwendungscode
COPY . .

# Erstelle Produktions-Build der Anwendung
RUN npm run build

# Exponiere den Standard-Port für die Anwendung
EXPOSE 5000

# Erstelle einen non-root Benutzer für Sicherheit
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /usr/src/app
USER appuser

# Setze NODE_ENV auf production
ENV NODE_ENV=production

# Starte die Anwendung
CMD ["npm", "start"]