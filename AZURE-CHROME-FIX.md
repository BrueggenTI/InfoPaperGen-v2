# Azure Chrome Installation Fix - Komplette Lösung

## Problem: "Could not find Chrome (ver. 138.0.7204.168)" 

Das Docker Image auf Azure enthält keinen Chrome Browser, obwohl die Dockerfile entsprechend aktualisiert wurde.

## Root Cause Analysis

Basierend auf den Azure Logs:
- App startet erfolgreich 
- Puppeteer.launch() wird aufgerufen
- Nach exakt 1ms Fehler: "Could not find Chrome"
- ChromeLauncher.resolveExecutablePath() schlägt sofort fehl

**Ursache:** Docker Image wurde nicht mit den neuen Chrome-Installationsschritten neu gebaut.

## Lösungsstrategie

### 1. Dockerfile Rebuild erzwingen

Die ursprüngliche `Dockerfile` wurde mit folgenden Änderungen aktualisiert:
- Kommentar hinzugefügt: `# Force rebuild - Chrome installation fix for Azure Container deployment`
- Chrome Version Check hinzugefügt: `&& google-chrome --version`
- Verbesserte GPG-Schlüssel Handhabung

### 2. Produktions-Dockerfile erstellt

`Dockerfile.production` mit mehreren Fallback-Mechanismen:
- **Methode 1**: Repository-basierte Installation über GPG-Schlüssel
- **Methode 2**: Direkter Download als Fallback
- **Verifikation**: Explizite Chrome-Installation-Checks
- **Environment Variables**: PUPPETEER_EXECUTABLE_PATH gesetzt
- **Health Check**: Container Gesundheitsprüfung

### 3. Puppeteer Konfiguration optimiert

Beide Puppeteer Services aktualisiert:
- `/usr/bin/google-chrome-stable` als primärer Pfad
- Vollständige Docker-kompatible Argumente
- Fallback-Pfade für verschiedene Umgebungen

## Deployment Schritte für Azure

### Schritt 1: Dockerfile auswählen
```bash
# Option A: Ursprüngliche Dockerfile (mit Rebuild-Kommentaren)
docker build -t product-info-generator .

# Option B: Produktions-Dockerfile (empfohlen)
docker build -f Dockerfile.production -t product-info-generator .
```

### Schritt 2: Lokaler Test
```bash
# Teste Chrome Installation
docker run --rm product-info-generator google-chrome --version

# Teste komplette App
docker-compose -f docker-compose.production.yml up --build
```

### Schritt 3: Azure Container Registry Deployment
```bash
# Login und Tag
az acr login --name your-registry-name
docker tag product-info-generator your-registry.azurecr.io/product-info-generator:v2

# Push mit neuer Versionsnummer
docker push your-registry.azurecr.io/product-info-generator:v2
```

### Schritt 4: Azure App Service Update
```bash
# Update App Service Container
az webapp config container set \
  --name your-app-name \
  --resource-group your-resource-group \
  --docker-custom-image-name your-registry.azurecr.io/product-info-generator:v2
```

## Verifikation

### 1. Container Logs prüfen
```bash
az webapp log tail --name your-app-name --resource-group your-resource-group
```

Erwartete Logs:
```
Chrome installation successful
google-chrome --version
🔍 Verwende Browser: /usr/bin/google-chrome-stable
```

### 2. Health Check testen
```bash
curl https://your-app.azurewebsites.net/api/health
```

### 3. PDF-Generierung testen
- App öffnen
- Produkt-Information erstellen  
- PDF-Download versuchen
- Logs auf Chrome-bezogene Fehler prüfen

## Troubleshooting

### Falls Chrome Installation fehlschlägt:
1. Build Logs in Azure Container Registry prüfen
2. Alternative: Chromium statt Chrome verwenden
3. Manual Chrome Download als Fallback

### Falls Puppeteer weiterhin fehlschlägt:
1. Environment Variable `PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable` prüfen
2. Container Shell Access für Debug: `docker exec -it container_name /bin/bash`
3. Chrome Pfade manuell verifizieren: `which google-chrome`

### Build Cache Probleme:
```bash
# Erzwinge kompletten Rebuild ohne Cache
docker build --no-cache -f Dockerfile.production -t product-info-generator .
```

## Nächste Schritte

1. ✅ Dockerfile aktualisiert mit Chrome Installation
2. ✅ Puppeteer Konfiguration optimiert  
3. ✅ Produktions-Dockerfile mit Fallbacks erstellt
4. 🔄 **NÄCHSTER SCHRITT**: Docker Image auf Azure neu deployen
5. ⏳ Deployment Logs überwachen
6. ⏳ PDF-Generierung nach Deployment testen

## Kritische Erkenntnisse

- **Problem war nicht im Code**: Puppeteer Konfiguration war bereits korrekt
- **Problem war im Build**: Docker Image enthielt keinen Chrome Browser
- **Lösung**: Erzwungener Dockerfile Rebuild mit verbesserten Installationsschritten
- **Prevention**: Versionierte Images verwenden (`v2`, `v3`) statt `latest`