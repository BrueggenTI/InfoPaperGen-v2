# Docker Build und Deployment Anleitung

## Lokaler Build und Test

### 1. Docker Image erstellen
```bash
docker build -t product-info-generator .
```

### 2. Container lokal starten
```bash
docker run -p 5000:5000 -e OPENAI_API_KEY=your_api_key product-info-generator
```

### 3. Mit Docker Compose (empfohlen für Tests)
```bash
docker-compose up --build
```

## Azure App Service Deployment

### 1. Container Registry (Azure Container Registry)
```bash
# ACR Login
az acr login --name your-registry-name

# Image taggen
docker tag product-info-generator your-registry.azurecr.io/product-info-generator:latest

# Image hochladen
docker push your-registry.azurecr.io/product-info-generator:latest
```

### 2. Azure App Service Konfiguration
- **Basis-Image**: `your-registry.azurecr.io/product-info-generator:latest`
- **Port**: `5000`
- **Umgebungsvariablen**:
  - `OPENAI_API_KEY`: Ihr OpenAI API Schlüssel
  - `NODE_ENV`: `production`
  - `PORT`: `5000`

## Docker Image Optimierungen

### Image-Größe reduzieren
- ✅ Node.js Slim Image verwendet
- ✅ Multi-Stage Build für Produktions-Build
- ✅ .dockerignore für unnötige Dateien
- ✅ Package Cache nach Installation gelöscht

### Sicherheit
- ✅ Non-root Benutzer verwendet
- ✅ Keine Secrets im Image gespeichert
- ✅ Minimale Systemabhängigkeiten installiert

### Performance
- ✅ Layer-Caching optimiert
- ✅ Nur Produktionsabhängigkeiten installiert
- ✅ Puppeteer für Container-Umgebung konfiguriert

## Troubleshooting

### Puppeteer-Probleme
Falls Puppeteer nicht startet:
1. Überprüfen Sie, dass alle Systemabhängigkeiten installiert sind
2. Stellen Sie sicher, dass `PUPPETEER_EXECUTABLE_PATH` korrekt gesetzt ist
3. Verwenden Sie die `--no-sandbox` Flags (bereits im Code implementiert)

### Speicher-Probleme
Für größere PDF-Generierungen Azure App Service Plan mit mindestens 1GB RAM verwenden.

### Logs überprüfen
```bash
# Container-Logs anzeigen
docker logs container-name

# Live-Logs verfolgen
docker logs -f container-name
```