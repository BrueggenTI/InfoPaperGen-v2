# 🚀 Deployment-Anleitung: Node.js App auf Azure mit GitHub Actions

Diese Anleitung führt Sie Schritt für Schritt durch das Setup Ihrer Node.js-Anwendung auf Azure mit automatischem CI/CD über GitHub Actions.

## 📋 Übersicht

Nach Abschluss dieser Anleitung haben Sie:
- ✅ Eine Azure Container Registry (ACR) für Ihre Docker Images
- ✅ Eine Azure Container App für das Hosting
- ✅ Einen Service Principal für automatische Deployments
- ✅ GitHub Actions für CI/CD-Automatisierung
- ✅ Sichere Verwaltung von API-Keys und Secrets

---

## 🎯 Teil 1: Azure-Ressourcen erstellen

### 1.1 Azure Container Registry (ACR) erstellen

1. **Azure Portal öffnen**: Gehen Sie zu [portal.azure.com](https://portal.azure.com)

2. **Container Registry erstellen**:
   - Klicken Sie auf "Ressource erstellen"
   - Suchen Sie nach "Container Registry"
   - Klicken Sie auf "Erstellen"

3. **ACR konfigurieren**:
   ```
   Abonnement: [Ihr Azure-Abonnement wählen]
   Ressourcengruppe: [Neue erstellen: "rg-product-info-app"]
   Registrierungsname: [Eindeutiger Name, z.B. "productinforegistry"]
   Standort: [Europa, z.B. "West Europe"]
   SKU: Basic (für Entwicklung) oder Standard (für Produktion)
   ```

4. **Admin-Zugriff aktivieren**:
   - Nach der Erstellung → zur ACR navigieren
   - Menü: "Zugriffsschlüssel"
   - "Administratorbenutzer" aktivieren
   - **Notieren Sie sich**: Anmeldeserver, Benutzername, Passwörter

### 1.2 Azure Container App erstellen

1. **Container App Environment erstellen**:
   - Suchen Sie nach "Container App Environment"
   - Erstellen Sie eine neue Umgebung in derselben Ressourcengruppe

2. **Container App erstellen**:
   - Suchen Sie nach "Container Apps"
   - Klicken Sie auf "Erstellen"

3. **Container App konfigurieren**:
   ```
   Abonnement: [Ihr Azure-Abonnement]
   Ressourcengruppe: [Dieselbe wie ACR: "rg-product-info-app"]
   Container App Name: [z.B. "product-info-generator"]
   Region: [Dieselbe wie ACR: "West Europe"]
   Container Apps Environment: [Die erstellte Umgebung wählen]
   ```

4. **Container-Konfiguration**:
   ```
   Container Image: nginx:latest (Platzhalter, wird durch GitHub Actions ersetzt)
   Name: product-info-app
   CPU: 0.5
   Memory: 1.0Gi
   ```

5. **Ingress-Konfiguration**:
   ```
   Ingress aktiviert: ✓
   Ingress-Typ: HTTP
   Target Port: 8080
   ```

### 1.3 Service Principal erstellen

1. **Azure CLI oder Cloud Shell verwenden**:
   ```bash
   # Subscription ID ermitteln
   az account show --query id --output tsv
   
   # Service Principal erstellen (ersetzen Sie <SUBSCRIPTION_ID>)
   az ad sp create-for-rbac \
     --name "github-actions-product-info" \
     --role "Contributor" \
     --scopes "/subscriptions/<SUBSCRIPTION_ID>/resourceGroups/rg-product-info-app" \
     --sdk-auth
   ```

2. **Output notieren**: Der Befehl gibt JSON aus - speichern Sie dieses komplett für GitHub Secrets.

---

## 🔑 Teil 2: GitHub Repository Setup

### 2.1 Repository erstellen und Code pushen

1. **Neues GitHub Repository erstellen**:
   - Gehen Sie zu [github.com](https://github.com)
   - Erstellen Sie ein neues Repository (z.B. "product-info-generator")
   - Repository als "Private" oder "Public" je nach Bedarf

2. **Lokalen Code zu GitHub pushen**:
   ```bash
   # In Ihrem Replit-Projektverzeichnis
   git init
   git add .
   git commit -m "Initial commit: Node.js app mit OpenAI und Puppeteer"
   git branch -M main
   git remote add origin https://github.com/[IHR-USERNAME]/[REPOSITORY-NAME].git
   git push -u origin main
   ```

### 2.2 GitHub Secrets konfigurieren

1. **Repository Settings öffnen**:
   - Gehen Sie zu Ihrem GitHub Repository
   - Klicken Sie auf "Settings"
   - Links im Menü: "Secrets and variables" → "Actions"

2. **Secrets hinzufügen** (Klicken Sie auf "New repository secret"):

   **Container Registry Secrets:**
   ```
   Name: ACR_LOGIN_SERVER
   Value: [Ihr ACR Anmeldeserver, z.B. productinforegistry.azurecr.io]
   
   Name: ACR_NAME
   Value: [Ihr ACR Name, z.B. productinforegistry]
   
   Name: ACR_USERNAME
   Value: [ACR Benutzername aus Azure Portal]
   
   Name: ACR_PASSWORD
   Value: [ACR Passwort aus Azure Portal]
   ```

   **Azure Deployment Secrets:**
   ```
   Name: AZURE_CREDENTIALS
   Value: [Komplettes JSON vom Service Principal Befehl]
   
   Name: AZURE_CONTAINER_APP_NAME
   Value: [Name Ihrer Container App, z.B. product-info-generator]
   
   Name: AZURE_RESOURCE_GROUP
   Value: [Name Ihrer Ressourcengruppe, z.B. rg-product-info-app]
   ```

---

## 🔐 Teil 3: Sichere API-Key-Verwaltung

### 3.1 OpenAI API Key in Azure Container App hinterlegen

1. **Azure Container App öffnen**:
   - Gehen Sie zu Ihrer Container App im Azure Portal
   - Menü: "Revision Management"

2. **Umgebungsvariablen konfigurieren**:
   - Klicken Sie auf "Create new revision"
   - Gehen Sie zum Abschnitt "Environment variables"
   - Fügen Sie hinzu:
     ```
     Name: OPENAI_API_KEY
     Source: Manual entry
     Value: [Ihr OpenAI API Key]
     ```

3. **Revision aktivieren**:
   - Klicken Sie auf "Create"
   - Die neue Revision wird automatisch aktiviert

### 3.2 Zusätzliche Umgebungsvariablen (optional)

Je nach Ihren Anforderungen können Sie weitere Variablen hinzufügen:
```
NODE_ENV=production
PORT=8080
LOG_LEVEL=info
```

---

## 🚀 Teil 4: Deployment testen

### 4.1 Automatisches Deployment auslösen

1. **Code-Änderung pushen**:
   ```bash
   # Kleine Änderung machen (z.B. README bearbeiten)
   echo "# Updated at $(date)" >> README.md
   git add README.md
   git commit -m "Test deployment trigger"
   git push origin main
   ```

2. **GitHub Actions überwachen**:
   - Gehen Sie zu Ihrem Repository auf GitHub
   - Klicken Sie auf "Actions"
   - Verfolgen Sie den Workflow-Status

### 4.2 Deployment verifizieren

1. **Container App URL finden**:
   - Azure Portal → Ihre Container App
   - Menü: "Overview"
   - Notieren Sie sich die "Application Url"

2. **Anwendung testen**:
   - Öffnen Sie die Application URL
   - Testen Sie die PDF-Generierung
   - Überprüfen Sie OpenAI-Integration

---

## 🛠️ Teil 5: Fehlerbehebung und Monitoring

### 5.1 Logs überwachen

```bash
# Azure CLI für Live-Logs (optional)
az containerapp logs show \
  --name product-info-generator \
  --resource-group rg-product-info-app \
  --follow
```

### 5.2 Häufige Probleme

**Problem: "Could not find Chrome"**
- ✅ **Lösung**: Ihr Dockerfile ist bereits optimiert für Azure Chrome-Installation

**Problem: "OpenAI API Key nicht gefunden"**
- ✅ **Lösung**: Überprüfen Sie die Umgebungsvariablen in der Container App

**Problem: "GitHub Actions schlägt fehl"**
- ✅ **Lösung**: Überprüfen Sie alle GitHub Secrets auf Tippfehler

### 5.3 Performance-Monitoring

1. **Azure Application Insights** (optional):
   - Für erweiterte Überwachung können Sie Application Insights hinzufügen
   - Verfolgen Sie Anfragen, Fehler und Performance-Metriken

---

## ✅ Checkliste für erfolgreiche Bereitstellung

- [ ] Azure Container Registry erstellt und Admin-Zugriff aktiviert
- [ ] Container App mit korrekter Port-Konfiguration (8080) erstellt
- [ ] Service Principal mit Contributor-Rechten erstellt
- [ ] GitHub Repository erstellt und Code gepusht
- [ ] Alle 7 GitHub Secrets korrekt konfiguriert
- [ ] OpenAI API Key in Container App Umgebungsvariablen hinterlegt
- [ ] Erstes Deployment erfolgreich durchgeführt
- [ ] Anwendung über Azure URL erreichbar
- [ ] PDF-Generierung funktioniert
- [ ] OpenAI-Integration funktioniert

---

## 📞 Support

Bei Problemen:

1. **GitHub Actions Logs** überprüfen
2. **Azure Container App Logs** überprüfen  
3. **Azure Portal** → Ihrer Resource Group → "Activity Log" für Azure-spezifische Probleme

---

## 🎉 Herzlichen Glückwunsch!

Ihre Node.js-Anwendung läuft jetzt automatisiert auf Azure! Jeder Push auf den main-Branch löst automatisch ein neues Deployment aus.

**Nützliche URLs:**
- 🌐 **Ihre App**: [Wird in der Azure Container App angezeigt]
- 📊 **GitHub Actions**: `https://github.com/[USERNAME]/[REPO]/actions`
- 🔧 **Azure Portal**: `https://portal.azure.com`