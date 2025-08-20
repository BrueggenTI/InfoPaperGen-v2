# === STAGE 1: Build-Umgebung ===
# Hier bauen wir die App. Dev-Dependencies sind hier erlaubt.
FROM node:18-slim AS builder

WORKDIR /usr/src/app

# Zuerst nur package.json kopieren und alle Abhängigkeiten installieren
COPY package*.json ./
RUN npm ci

# Den gesamten Quellcode kopieren
COPY . .

# Die App bauen (z.B. TypeScript zu JavaScript kompilieren)
RUN npm run build


# === STAGE 2: Finale Laufzeit-Umgebung ===
# Wir starten mit einem sauberen Image, um die Größe zu minimieren.
FROM node:18-slim

# Root-Benutzer für die Installation von Chrome
USER root

# System aktualisieren und die notwendigen Abhängigkeiten für Chrome installieren
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
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

# Google Chrome Stable installieren
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends

# Cache aufräumen, um das Image klein zu halten
RUN rm -rf /var/lib/apt/lists/*

# Arbeitsverzeichnis für die App
WORKDIR /usr/src/app

# Wichtige Environment Variables für Puppeteer
# Sagt Puppeteer, nicht seinen eigenen Browser herunterzuladen
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
# Sagt Puppeteer, wo der systemweit installierte Browser zu finden ist
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Kopiere die Abhängigkeiten und den gebauten Code aus der "builder"-Stage
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist

# Erstelle und wechsle zu einem sicheren, unprivilegierten Benutzer
RUN useradd --create-home appuser
USER appuser

# Port freigeben
EXPOSE 8080

# Der Befehl, der die App startet
CMD [ "npm", "start" ]