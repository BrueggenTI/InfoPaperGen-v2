# Azure App Service Deployment - Schritt-für-Schritt Anleitung

## Übersicht
Diese Anleitung führt Sie durch das Deployment Ihrer Node.js Product Information Generator Anwendung auf Azure App Service als Docker-Container.

## Voraussetzungen
- Azure Account mit aktivem Abonnement
- Azure CLI installiert und konfiguriert
- Docker Desktop installiert
- OpenAI API-Schlüssel

## Schritt 1: Azure Container Registry erstellen

```bash
# Resource Group erstellen
az group create --name product-info-rg --location "West Europe"

# Container Registry erstellen
az acr create --resource-group product-info-rg --name productinfoacr --sku Basic
```

## Schritt 2: Docker Image erstellen und hochladen

```bash
# 1. Docker Image lokal erstellen
docker build -t product-info-generator .

# 2. ACR Login
az acr login --name productinfoacr

# 3. Image taggen für ACR
docker tag product-info-generator productinfoacr.azurecr.io/product-info-generator:latest

# 4. Image zu ACR hochladen
docker push productinfoacr.azurecr.io/product-info-generator:latest
```

## Schritt 3: Azure App Service erstellen

```bash
# App Service Plan erstellen (B1 = Basic, 1.75GB RAM)
az appservice plan create \
  --name product-info-plan \
  --resource-group product-info-rg \
  --sku B2 \
  --is-linux

# Web App erstellen
az webapp create \
  --resource-group product-info-rg \
  --plan product-info-plan \
  --name product-info-app \
  --deployment-container-image-name productinfoacr.azurecr.io/product-info-generator:latest
```

## Schritt 4: Umgebungsvariablen konfigurieren

```bash
# OpenAI API Key setzen
az webapp config appsettings set \
  --resource-group product-info-rg \
  --name product-info-app \
  --settings OPENAI_API_KEY="your-openai-api-key-here"

# Port konfigurieren
az webapp config appsettings set \
  --resource-group product-info-rg \
  --name product-info-app \
  --settings WEBSITES_PORT=8080

# Node.js Umgebung
az webapp config appsettings set \
  --resource-group product-info-rg \
  --name product-info-app \
  --settings NODE_ENV=production PORT=8080
```

## Schritt 5: Container Registry Zugriff konfigurieren

```bash
# Registry-Anmeldedaten für App Service setzen
az webapp config container set \
  --name product-info-app \
  --resource-group product-info-rg \
  --docker-custom-image-name productinfoacr.azurecr.io/product-info-generator:latest \
  --docker-registry-server-url https://productinfoacr.azurecr.io \
  --docker-registry-server-user productinfoacr \
  --docker-registry-server-password $(az acr credential show --name productinfoacr --query "passwords[0].value" --output tsv)
```

## Schritt 6: Continuous Deployment aktivieren (Optional)

```bash
# Webhook für automatisches Deployment bei neuen Images
az webapp deployment container config \
  --name product-info-app \
  --resource-group product-info-rg \
  --enable-cd true
```

## Schritt 7: SSL und Custom Domain (Optional)

```bash
# Kostenloses SSL-Zertifikat aktivieren
az webapp config ssl bind \
  --name product-info-app \
  --resource-group product-info-rg \
  --ssl-type SNI \
  --certificate-thumbprint auto
```

## Updates und Wartung

### Neue Version deployen
```bash
# 1. Neues Image erstellen
docker build -t product-info-generator .

# 2. Image taggen und hochladen
docker tag product-info-generator productinfoacr.azurecr.io/product-info-generator:latest
docker push productinfoacr.azurecr.io/product-info-generator:latest

# 3. App Service neu starten (automatisch bei aktivem CD)
az webapp restart --name product-info-app --resource-group product-info-rg
```

### Logs überprüfen
```bash
# Live-Logs anzeigen
az webapp log tail --name product-info-app --resource-group product-info-rg

# Log-Stream aktivieren
az webapp log config --name product-info-app --resource-group product-info-rg --docker-container-logging filesystem
```

### Monitoring einrichten
```bash
# Application Insights hinzufügen
az monitor app-insights component create \
  --app product-info-insights \
  --location "West Europe" \
  --resource-group product-info-rg

# Application Insights mit Web App verknüpfen
az webapp config appsettings set \
  --resource-group product-info-rg \
  --name product-info-app \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY=$(az monitor app-insights component show --app product-info-insights --resource-group product-info-rg --query instrumentationKey --output tsv)
```

## Kosten-Optimierung

### Development Environment (günstiger)
- **App Service Plan**: B1 (1.75GB RAM) - ca. €12/Monat
- **Container Registry**: Basic - ca. €4/Monat

### Production Environment (empfohlen)
- **App Service Plan**: S1 (1.75GB RAM) - ca. €58/Monat  
- **Container Registry**: Standard - ca. €16/Monat
- **Application Insights**: Pay-as-you-go

## Troubleshooting

### PDF-Generierung schlägt fehl
1. Überprüfen Sie RAM-Auslastung (mindestens 1.75GB empfohlen)
2. Prüfen Sie Logs auf Puppeteer-Fehler
3. Stellen Sie sicher, dass alle Dependencies im Container installiert sind

### Container startet nicht
1. Überprüfen Sie die Container-Logs
2. Validieren Sie Umgebungsvariablen
3. Testen Sie das Image lokal mit Docker

### Performance-Probleme
1. Erhöhen Sie den App Service Plan (mehr RAM/CPU)
2. Aktivieren Sie Application Insights für Monitoring
3. Implementieren Sie Caching-Strategien

## Wichtige URLs nach Deployment
- **Anwendung**: `https://product-info-app.azurewebsites.net`
- **Container Registry**: `https://productinfoacr.azurecr.io`
- **Azure Portal**: `https://portal.azure.com`