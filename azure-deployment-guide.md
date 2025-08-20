# Azure App Service Deployment Anleitung
## Node.js Anwendung mit OpenAI und Puppeteer

### Übersicht
Diese Anleitung führt Sie durch die vollständige Einrichtung Ihrer Node.js-Anwendung in Azure App Service ohne Docker. Das Deployment erfolgt automatisch über GitHub Actions bei jedem Push in Ihr Repository.

---

## 📋 Voraussetzungen

- **Azure Subscription** mit aktiver App Service Berechtigung
- **GitHub Repository** mit Ihrem Code
- **OpenAI API Key** für die KI-Funktionalitäten
- **Azure CLI** (optional für erweiterte Konfiguration)

---

## 🚀 Schritt 1: Azure App Service erstellen

### 1.1 Im Azure Portal
1. Gehen Sie zu [Azure Portal](https://portal.azure.com)
2. Klicken Sie auf **"Create a resource"** → **"Web App"**
3. Füllen Sie die Grundkonfiguration aus:
   - **Resource Group**: Erstellen Sie eine neue oder verwenden Sie eine bestehende
   - **Name**: `ihr-app-name` (eindeutiger Name, wird Teil der URL)
   - **Runtime Stack**: **Node.js 18 LTS**
   - **Operating System**: **Linux**
   - **Region**: Wählen Sie eine Region in Ihrer Nähe
   - **Pricing Plan**: Minimum **B1 Basic** (empfohlen: **S1 Standard** für Produktion)

### 1.2 Wichtige Einstellungen
- **Runtime**: Node.js 18 LTS (NICHT 20, da bessere Kompatibilität)
- **OS**: Linux (erforderlich für Chromium-Installation)
- **Deployment**: Später über GitHub Actions konfigurieren

---

## 🔧 Schritt 2: Azure App Service konfigurieren

### 2.1 Application Settings (Umgebungsvariablen)
1. Gehen Sie zu Ihrem App Service → **Configuration** → **Application Settings**
2. Klicken Sie **"New application setting"** und fügen Sie hinzu:

```
Name: OPENAI_API_KEY
Value: sk-proj-... (Ihr OpenAI API Key)
```

```
Name: NODE_ENV
Value: production
```

```
Name: PUPPETEER_EXECUTABLE_PATH
Value: /usr/bin/chromium-browser
```

### 2.2 Startup Command
1. Gehen Sie zu **Configuration** → **General Settings**
2. Setzen Sie **Startup Command** auf:
```bash
bash startup.sh
```

### 2.3 Speichern
- Klicken Sie **"Save"** (die App wird automatisch neugestartet)

---

## 📁 Schritt 3: GitHub Actions Setup

### 3.1 Publish Profile herunterladen
1. Gehen Sie zu Ihrem App Service → **Deployment Center**
2. Klicken Sie **"Download publish profile"**
3. Speichern Sie die `.publishsettings` Datei

### 3.2 GitHub Secret erstellen
1. Gehen Sie zu Ihrem GitHub Repository
2. Klicken Sie **Settings** → **Secrets and variables** → **Actions**
3. Klicken Sie **"New repository secret"**
4. Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
5. Value: Öffnen Sie die `.publishsettings` Datei und kopieren Sie den **gesamten Inhalt**
6. Klicken Sie **"Add secret"**

### 3.3 Optional: App Name als Secret
Falls Sie den App Namen nicht im Workflow hart codieren möchten:
- Name: `AZURE_WEBAPP_NAME`  
- Value: `ihr-app-service-name`

---

## 🔐 Schritt 4: OpenAI API Key einrichten

### 4.1 OpenAI API Key erhalten
1. Gehen Sie zu [OpenAI Platform](https://platform.openai.com)
2. Navigieren Sie zu **API Keys** → **Create new secret key**
3. Kopieren Sie den Key (beginnt mit `sk-proj-...`)

### 4.2 In Azure hinterlegen
- Bereits in Schritt 2.1 erledigt ✅

---

## 🚀 Schritt 5: Deployment testen

### 5.1 Code in GitHub pushen
```bash
git add .
git commit -m "Azure deployment configuration"
git push origin main
```

### 5.2 GitHub Actions überwachen
1. Gehen Sie zu GitHub → **Actions**
2. Verfolgen Sie den Workflow **"Deploy Node.js App to Azure App Service"**
3. Bei Erfolg: Grüner Haken ✅
4. Bei Fehler: Rote X ❌ → Klicken Sie für Details

### 5.3 App testen
1. Ihre App ist erreichbar unter: `https://ihr-app-name.azurewebsites.net`
2. Testen Sie die PDF-Generierung und OpenAI-Funktionen

---

## 🐛 Troubleshooting

### Problem: "Could not find Chrome/Chromium"
**Lösung**: 
1. Überprüfen Sie den Startup Command: `bash startup.sh`
2. Kontrollieren Sie die Logs: App Service → **Log stream**
3. Stellen Sie sicher, dass Linux als OS gewählt wurde

### Problem: "OpenAI API Key not found"
**Lösung**:
1. Überprüfen Sie App Service → Configuration → Application Settings
2. Der Key muss genau `OPENAI_API_KEY` heißen
3. Nach Änderungen: **Save** und App neu starten

### Problem: "Module not found" Fehler
**Lösung**:
1. Überprüfen Sie `package.json` Dependencies
2. Stellen Sie sicher, dass `npm run build` erfolgreich läuft
3. Kontrollieren Sie GitHub Actions Logs

### Problem: GitHub Actions schlägt fehl
**Lösung**:
1. Überprüfen Sie das Publish Profile Secret
2. Stellen Sie sicher, dass das gesamte `.publishsettings` File kopiert wurde
3. Kontrollieren Sie App Service Einstellungen

---

## 📊 Monitoring und Logs

### Azure App Service Logs
1. App Service → **Log stream** (Live-Logs)
2. App Service → **App Service logs** → Enable Application Logging

### Application Insights (optional)
1. Erstellen Sie Application Insights Ressource
2. Verbinden Sie mit Ihrer App Service
3. Erweiterte Monitoring-Features verfügbar

---

## 🔄 Updates und Wartung

### Automatische Deployments
- Jeder Push zu `main` Branch löst automatisches Deployment aus
- Überwachen Sie GitHub Actions für Deployment-Status

### Environment Variables aktualisieren
1. Azure Portal → App Service → Configuration
2. Ändern Sie Application Settings
3. Klicken Sie **Save** (App wird neugestartet)

### Dependencies aktualisieren
1. Aktualisieren Sie `package.json`
2. Pushen Sie zu GitHub → Automatisches Deployment

---

## 📞 Support und weiterführende Ressourcen

- **Azure Documentation**: [App Service Node.js](https://docs.microsoft.com/azure/app-service/)
- **GitHub Actions**: [Azure Web Apps Deploy](https://github.com/Azure/webapps-deploy)
- **OpenAI API**: [Platform Documentation](https://platform.openai.com/docs)
- **Puppeteer**: [Azure App Service Guide](https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md)

---

## ✅ Erfolgreich deployed!

Nach erfolgreichem Setup haben Sie:
- ✅ Automatisches Deployment via GitHub Actions
- ✅ Funktionsfähige Puppeteer PDF-Generierung
- ✅ OpenAI Integration mit sicherer API Key Verwaltung
- ✅ Skalierbare Azure App Service Infrastruktur
- ✅ Monitoring und Logging Capabilities

Ihre Anwendung ist nun produktionsbereit! 🎉