# 🚀 Azure App Service Deployment Checklist

## ✅ Vor dem Deployment

### 1. Repository Setup
- [ ] Code ist in GitHub Repository verfügbar
- [ ] `.github/workflows/main.yml` existiert
- [ ] `startup.sh` ist ausführbar (`chmod +x startup.sh`)
- [ ] `azure-deployment-guide.md` wurde gelesen

### 2. Build Check
- [ ] `npm run build` läuft erfolgreich durch
- [ ] `dist/index.js` wurde erstellt
- [ ] Alle Dependencies sind in `package.json` definiert

### 3. Environment Variables Check
- [ ] OpenAI API Key ist verfügbar
- [ ] `OPENAI_API_KEY` wird im Code korrekt verwendet
- [ ] Keine Secrets im Code hart codiert

---

## 🔧 Azure App Service Konfiguration

### 1. App Service Erstellung
- [ ] **Runtime Stack**: Node.js 18 LTS
- [ ] **Operating System**: Linux (erforderlich für Chromium)
- [ ] **Pricing Tier**: Minimum B1 Basic (empfohlen: S1 Standard)
- [ ] **Region**: Gewählt

### 2. Application Settings
In Azure Portal → App Service → Configuration → Application Settings:

```
OPENAI_API_KEY = sk-proj-... (Ihr OpenAI API Key)
NODE_ENV = production
PUPPETEER_EXECUTABLE_PATH = /usr/bin/chromium-browser
```

### 3. Startup Command
- [ ] **Startup Command**: `bash startup.sh`
- [ ] Konfiguration gespeichert (App wird neugestartet)

---

## 🔐 GitHub Actions Setup

### 1. Publish Profile
- [ ] Azure Portal → App Service → Deployment Center
- [ ] "Download publish profile" geklickt
- [ ] `.publishsettings` Datei heruntergeladen

### 2. GitHub Secrets
- [ ] GitHub Repository → Settings → Secrets and variables → Actions
- [ ] **Secret Name**: `AZURE_WEBAPP_PUBLISH_PROFILE`
- [ ] **Secret Value**: Kompletter Inhalt der `.publishsettings` Datei
- [ ] Secret gespeichert

### 3. Optional: App Name Secret
- [ ] **Secret Name**: `AZURE_WEBAPP_NAME`
- [ ] **Secret Value**: Ihr Azure App Service Name

---

## 🚀 Deployment Durchführung

### 1. Code Push
```bash
git add .
git commit -m "Azure deployment ready"
git push origin main
```

### 2. GitHub Actions Monitor
- [ ] GitHub → Actions Tab geöffnet
- [ ] Workflow "Deploy Node.js App to Azure App Service" überwacht
- [ ] ✅ Grüner Haken bei erfolgreichem Deployment
- [ ] ❌ Bei Fehlern: Logs überprüft

### 3. App Funktionalität Test
- [ ] App erreichbar unter: `https://ihr-app-name.azurewebsites.net`
- [ ] Frontend lädt korrekt
- [ ] PDF-Generierung funktioniert
- [ ] OpenAI Integration funktioniert

---

## 🐛 Troubleshooting Guide

### Häufige Probleme und Lösungen

#### ❌ "Could not find Chrome/Chromium"
**Ursache**: Chromium nicht installiert oder falscher Pfad
**Lösung**:
1. Startup Command überprüfen: `bash startup.sh`
2. Azure Portal → Log stream prüfen
3. Linux als OS bestätigen

#### ❌ "OpenAI API Key not found"
**Ursache**: Environment Variable nicht gesetzt
**Lösung**:
1. App Service → Configuration → Application Settings
2. `OPENAI_API_KEY` hinzufügen
3. Save & Restart

#### ❌ "Module not found" Fehler
**Ursache**: Dependencies nicht korrekt installiert
**Lösung**:
1. `package.json` überprüfen
2. GitHub Actions Logs prüfen
3. Build-Schritt überprüfen

#### ❌ GitHub Actions schlägt fehl
**Ursache**: Publish Profile oder Secrets falsch
**Lösung**:
1. Publish Profile neu herunterladen
2. Gesamten `.publishsettings` Inhalt als Secret
3. Secret Name exakt: `AZURE_WEBAPP_PUBLISH_PROFILE`

---

## 📊 Nach dem Deployment

### 1. Monitoring aktivieren
- [ ] Azure Portal → App Service → Log stream
- [ ] Application Insights aktiviert (optional)
- [ ] Health Check konfiguriert

### 2. Performance Check
- [ ] App Ladezeiten geprüft
- [ ] PDF-Generierung Geschwindigkeit getestet
- [ ] Memory Usage überwacht

### 3. Security Check
- [ ] HTTPS aktiviert (Standard in Azure)
- [ ] Custom Domain konfiguriert (optional)
- [ ] SSL Zertifikat aktiv

---

## 🔄 Wartung und Updates

### Automatische Deployments
- [x] Bei jedem Push zu `main` Branch
- [x] GitHub Actions Workflow aktiv
- [x] Deployment Status Monitoring

### Environment Variables Update
1. Azure Portal → App Service → Configuration
2. Application Settings ändern
3. Save (App wird automatisch neugestartet)

### Code Updates
1. Lokale Änderungen vornehmen
2. `git push origin main`
3. Automatisches Deployment via GitHub Actions

---

## ✅ Deployment erfolgreich!

Nach erfolgreichem Setup haben Sie:
- ✅ Automatisches CI/CD Pipeline via GitHub Actions
- ✅ Skalierbare Azure App Service Infrastruktur
- ✅ Sichere OpenAI API Key Verwaltung
- ✅ Funktionsfähige Puppeteer PDF-Generierung
- ✅ Production-ready Node.js Anwendung
- ✅ Monitoring und Logging Setup

**🎉 Ihre App ist jetzt produktiv und automatisch deployable!**

---

## 📞 Support Ressourcen

- **Azure Dokumentation**: [App Service für Node.js](https://docs.microsoft.com/azure/app-service/)
- **GitHub Actions**: [Azure Web Apps Deploy](https://github.com/Azure/webapps-deploy)
- **Puppeteer Troubleshooting**: [Azure Guide](https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md)
- **OpenAI API**: [Dokumentation](https://platform.openai.com/docs)