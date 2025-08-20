# ✅ Azure Deployment Checklist

Verwenden Sie diese Checkliste, um sicherzustellen, dass Ihr Azure-Deployment erfolgreich durchgeführt wird.

## 📋 Pre-Deployment Checklist

### Azure-Ressourcen
- [ ] Azure Container Registry (ACR) erstellt
- [ ] ACR Admin-Zugriff aktiviert
- [ ] Container App Environment erstellt
- [ ] Container App erstellt und konfiguriert
- [ ] Service Principal mit korrekten Berechtigungen erstellt
- [ ] Alle Azure-Ressourcen in derselben Resource Group

### GitHub Repository
- [ ] Repository erstellt (privat oder öffentlich)
- [ ] Lokaler Code committed und gepusht
- [ ] GitHub Actions Workflow-Datei vorhanden (`.github/workflows/azure-deployment.yml`)

### GitHub Secrets konfiguriert
- [ ] `ACR_LOGIN_SERVER` (z.B. `myregistry.azurecr.io`)
- [ ] `ACR_NAME` (z.B. `myregistry`)
- [ ] `ACR_USERNAME` (aus Azure Portal ACR → Zugriffsschlüssel)
- [ ] `ACR_PASSWORD` (aus Azure Portal ACR → Zugriffsschlüssel)
- [ ] `AZURE_CREDENTIALS` (JSON von Service Principal)
- [ ] `AZURE_CONTAINER_APP_NAME` (Name Ihrer Container App)
- [ ] `AZURE_RESOURCE_GROUP` (Name Ihrer Resource Group)

### Container App Umgebungsvariablen
- [ ] `OPENAI_API_KEY` in Azure Container App konfiguriert
- [ ] Weitere erforderliche Umgebungsvariablen gesetzt

## 🚀 Deployment Process

### 1. Erstes Deployment
- [ ] Code-Änderung zu `main`-Branch gepusht
- [ ] GitHub Actions Workflow erfolgreich ausgeführt
- [ ] Docker Image in ACR sichtbar
- [ ] Container App automatisch aktualisiert

### 2. Deployment-Verifikation
- [ ] Container App läuft (Status: Running)
- [ ] Health-Endpoint erreichbar (`/api/health`)
- [ ] Hauptanwendung über Container App URL erreichbar
- [ ] PDF-Generierung funktioniert
- [ ] OpenAI-Integration funktioniert

## 🔍 Fehlerbehebung

### GitHub Actions Fehler
- [ ] Alle Secrets korrekt konfiguriert (keine Leerzeichen, richtige Namen)
- [ ] Service Principal hat ausreichende Berechtigungen
- [ ] ACR-Anmeldeinformationen sind korrekt

### Container App Fehler
- [ ] Image-Tag in Container App korrekt
- [ ] Port-Konfiguration ist 8080
- [ ] Ingress ist aktiviert und external
- [ ] Umgebungsvariablen sind gesetzt

### Anwendungsfehler
- [ ] `OPENAI_API_KEY` ist korrekt gesetzt
- [ ] Chrome/Puppeteer funktioniert (PDF-Generierung)
- [ ] Logs in Azure Portal überprüft

## 📊 Monitoring und Wartung

### Laufende Überwachung
- [ ] Azure Container App Logs regelmäßig überprüft
- [ ] GitHub Actions Status überwachen
- [ ] Performance-Metriken beobachten

### Updates und Deployments
- [ ] Jeder Push zu `main` löst automatisches Deployment aus
- [ ] Rolling Updates funktionieren ohne Downtime
- [ ] Rollback-Strategie definiert

## 🔧 Hilfreiche Befehle

### Azure CLI Befehle
```bash
# Container App Logs anzeigen
az containerapp logs show --name [APP_NAME] --resource-group [RG_NAME] --follow

# Container App Status überprüfen
az containerapp show --name [APP_NAME] --resource-group [RG_NAME]

# Umgebungsvariable setzen
az containerapp update --name [APP_NAME] --resource-group [RG_NAME] --set-env-vars OPENAI_API_KEY=your-key
```

### Lokale Tests
```bash
# Docker Image lokal bauen und testen
docker build -t product-info-generator .
docker run -p 8080:8080 -e OPENAI_API_KEY=your-key product-info-generator

# Mit Docker Compose testen
docker-compose -f docker-compose.azure.yml up
```

## 📞 Support-Ressourcen

- **Azure Container Apps Dokumentation**: https://docs.microsoft.com/en-us/azure/container-apps/
- **GitHub Actions Dokumentation**: https://docs.github.com/en/actions
- **Azure CLI Referenz**: https://docs.microsoft.com/en-us/cli/azure/containerapp

## ✅ Erfolg!

Wenn alle Checkboxen abgehakt sind, läuft Ihre Anwendung erfolgreich auf Azure mit automatischem CI/CD über GitHub Actions!

**Wichtige URLs:**
- 🌐 **Ihre App**: [Von Azure Container App URL]
- 📊 **GitHub Actions**: `https://github.com/[USERNAME]/[REPO]/actions`
- 🔧 **Azure Portal**: `https://portal.azure.com`