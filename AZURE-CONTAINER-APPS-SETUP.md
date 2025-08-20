# Azure Container Apps - Komplettes Setup Summary

## 📦 Dockerfile (Optimiert für Azure Container Apps)

Deine aktualisierte `Dockerfile` ist bereits konfiguriert für:
- ✅ Node.js 20 (neueste LTS)
- ✅ Google Chrome Installation für Puppeteer
- ✅ Azure Container Apps Standards
- ✅ Umgebungsvariablen für Puppeteer

**Wichtige Dockerfile-Features:**
```dockerfile
# Arbeitsverzeichnis auf Azure-Standard
WORKDIR /app

# Puppeteer-Umgebungsvariablen
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Startbefehl für gebaute Anwendung
CMD [ "node", "dist/server/index.js" ]
```

## 🚀 GitHub Actions Workflow

Erstellt unter `.github/workflows/main.yml`:
- **Build Job**: Docker Image erstellen und in ACR pushen
- **Deploy Job**: Container App automatisch aktualisieren
- **Notify Job**: Deployment-Status ausgeben

## 🔧 Puppeteer-Code für Azure Container Apps

### Korrekte Browser-Konfiguration

Deine Puppeteer-Services sind bereits aktualisiert:

```typescript
// Azure Container Apps optimierte Browser-Pfade
const possiblePaths = [
  process.env.PUPPETEER_EXECUTABLE_PATH, // Docker Umgebungsvariable (höchste Priorität)
  '/usr/bin/google-chrome-stable', // Docker Standard-Installation
  '/usr/bin/google-chrome', // Alternative Docker-Installation
  '/usr/bin/chromium-browser', // Fallback Chromium
  '/usr/bin/chromium'
].filter(Boolean);

// Browser-Launch-Konfiguration
const launchOptions = {
  headless: true,
  args: [
    '--no-sandbox',              // KRITISCH für Container-Umgebungen
    '--disable-setuid-sandbox',  // KRITISCH für Container-Umgebungen
    '--disable-dev-shm-usage',   // Shared Memory Probleme verhindern
    '--disable-gpu',             // GPU-Probleme in Container verhindern
    '--disable-web-security',    // CORS-Probleme vermeiden
    '--disable-extensions',      // Unnötige Extensions deaktivieren
    '--disable-default-apps'     // Standard-Apps deaktivieren
  ]
};

// Browser mit erkanntem Pfad starten
if (browserPath) {
  launchOptions.executablePath = browserPath;
}

const browser = await puppeteer.launch(launchOptions);
```

## 🌐 Benötigte GitHub Secrets

| Secret | Beschreibung | Beispielwert |
|--------|--------------|--------------|
| `ACR_LOGIN_SERVER` | Container Registry URL | `productinfoacr.azurecr.io` |
| `ACR_USERNAME` | Container Registry Benutzername | `productinfoacr` |
| `ACR_PASSWORD` | Container Registry Passwort | `[Aus Azure Portal]` |
| `AZURE_CREDENTIALS` | Service Principal JSON | `{"clientId":"..."}` |

## 🔐 OpenAI API-Key Sicherheit

**NIEMALS** den API-Key ins Docker Image oder in GitHub-Code:

```bash
# Sicher in Azure Container App als Secret setzen
az containerapp secret set \
  --name product-info-generator \
  --resource-group rg-product-info-generator \
  --secrets openai-api-key="sk-..."

# Als Umgebungsvariable referenzieren
az containerapp update \
  --name product-info-generator \
  --resource-group rg-product-info-generator \
  --set-env-vars OPENAI_API_KEY=secretref:openai-api-key
```

## 🚀 Deployment-Workflow

1. **Entwicklung**: Code in Replit entwickeln
2. **Git Push**: Code nach GitHub pushen
3. **Automatisch**: GitHub Actions übernimmt:
   - Docker Image bauen
   - In Azure Container Registry pushen
   - Container App aktualisieren
4. **Live**: App ist sofort verfügbar

## 📍 App-URLs

- **Lokale Entwicklung**: `http://localhost:5000`
- **Azure Container App**: `https://product-info-generator.azurecontainerapps.io`

## 🔧 Produktions-Optimierungen

### Container App Scaling
```bash
# Auto-Scaling für Produktion
az containerapp update \
  --name product-info-generator \
  --resource-group rg-product-info-generator \
  --min-replicas 1 \
  --max-replicas 5 \
  --cpu 1.0 \
  --memory 2.0Gi
```

### Monitoring
```bash
# Live-Logs verfolgen
az containerapp logs show \
  --name product-info-generator \
  --resource-group rg-product-info-generator \
  --follow
```

## ✅ Nächste Schritte

1. **Folge der `ANLEITUNG.md`** für die einmalige Azure-Einrichtung
2. **Erstelle GitHub Repository** und pushe den Code
3. **Konfiguriere GitHub Secrets** wie beschrieben
4. **Teste ersten Deployment** durch Git Push auf main
5. **Überwache Logs** für Puppeteer-Funktionalität

## 🐛 Häufige Probleme & Lösungen

### "Could not find Chrome" Error
- ✅ **Gelöst** durch Chrome-Installation im Dockerfile
- ✅ **Pfad-Erkennung** durch PUPPETEER_EXECUTABLE_PATH

### PDF-Generierung schlägt fehl
```bash
# Container-Logs prüfen
az containerapp logs show --name product-info-generator --resource-group rg-product-info-generator

# Browser-Pfad testen
curl -X POST https://product-info-generator.azurecontainerapps.io/api/debug/browser-path
```

### Deployment fehlgeschlagen
- GitHub Actions Logs prüfen
- Azure Container Registry Berechtigung prüfen
- Service Principal Rechte überprüfen

Deine App ist jetzt vollständig für Azure Container Apps optimiert! 🎉