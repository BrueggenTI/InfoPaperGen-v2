# Azure Container Apps Deployment - Einrichtungsanleitung

Diese Anleitung führt dich durch die einmalige Einrichtung deiner Node.js-App mit OpenAI und Puppeteer auf Azure Container Apps mit automatisiertem CI/CD über GitHub Actions.

## 📋 Voraussetzungen

- Azure-Abonnement mit ausreichenden Berechtigungen
- GitHub-Account
- Azure CLI installiert (`az --version` zum Testen)
- Git und Docker lokal installiert (optional für Tests)

## 🚀 Teil 1: Azure-Setup

### 1.1 Azure CLI Anmeldung

```bash
# Bei Azure anmelden
az login

# Verfügbare Abonnements anzeigen
az account list --output table

# Gewünschtes Abonnement auswählen (falls mehrere vorhanden)
az account set --subscription "Dein-Abonnement-Name-oder-ID"
```

### 1.2 Ressourcengruppe erstellen

```bash
# Ressourcengruppe erstellen (passe die Region nach Bedarf an)
az group create \
  --name rg-product-info-generator \
  --location "West Europe"
```

### 1.3 Azure Container Registry (ACR) erstellen

```bash
# Container Registry erstellen
az acr create \
  --resource-group rg-product-info-generator \
  --name productinfoacr \
  --sku Basic \
  --admin-enabled true

# ACR-Details anzeigen (notiere die loginServer URL)
az acr show \
  --name productinfoacr \
  --resource-group rg-product-info-generator \
  --query loginServer \
  --output tsv
```

**Wichtige Werte notieren:**
- **Login Server**: `productinfoacr.azurecr.io` (für GitHub Secret `ACR_LOGIN_SERVER`)

### 1.4 ACR-Anmeldeinformationen abrufen

```bash
# Username und Passwort für ACR abrufen
az acr credential show \
  --name productinfoacr \
  --resource-group rg-product-info-generator
```

**Wichtige Werte notieren:**
- **Username**: `productinfoacr` (für GitHub Secret `ACR_USERNAME`)
- **Password**: Das erste Passwort aus der Ausgabe (für GitHub Secret `ACR_PASSWORD`)

### 1.5 Container App Environment erstellen

```bash
# Container Apps Extension installieren (falls noch nicht installiert)
az extension add --name containerapp --upgrade

# Container App Environment erstellen
az containerapp env create \
  --name product-info-env \
  --resource-group rg-product-info-generator \
  --location "West Europe"
```

### 1.6 Initial Container App erstellen

```bash
# Placeholder Container App erstellen (wird später von GitHub Actions überschrieben)
az containerapp create \
  --name product-info-generator \
  --resource-group rg-product-info-generator \
  --environment product-info-env \
  --image mcr.microsoft.com/azuredocs/containerapps-helloworld:latest \
  --target-port 8080 \
  --ingress 'external' \
  --registry-server productinfoacr.azurecr.io \
  --cpu 1.0 \
  --memory 2.0Gi \
  --min-replicas 0 \
  --max-replicas 3
```

### 1.7 Service Principal für GitHub Actions erstellen

**Schritt 1: Subscription ID abrufen**
```bash
# Subscription ID notieren
az account show --query id --output tsv
```

**Schritt 2: Service Principal erstellen**
```bash
# Service Principal erstellen (OHNE --sdk-auth für neuere Azure CLI Versionen)
az ad sp create-for-rbac \
  --name "product-info-github-actions" \
  --role contributor \
  --scopes /subscriptions/DEINE_SUBSCRIPTION_ID/resourceGroups/rg-product-info-generator
```

**Schritt 3: JSON für AZURE_CREDENTIALS manuell erstellen**

Aus der Ausgabe des Service Principal Befehls erhältst du:
- `appId` (wird zu `clientId`)
- `password` (wird zu `clientSecret`)
- `tenant` (wird zu `tenantId`)

Erstelle das JSON für GitHub Secret `AZURE_CREDENTIALS`:
```json
{
  "clientId": "DEINE_APP_ID_HIER",
  "clientSecret": "DEIN_PASSWORD_HIER",
  "subscriptionId": "DEINE_SUBSCRIPTION_ID_HIER",
  "tenantId": "DEINE_TENANT_ID_HIER"
}
```

**Alternative (wenn --sdk-auth funktioniert):**
```bash
# Falls deine Azure CLI Version --sdk-auth unterstützt
az ad sp create-for-rbac \
  --name "product-info-github-actions" \
  --role contributor \
  --scopes /subscriptions/$(az account show --query id --output tsv)/resourceGroups/rg-product-info-generator \
  --sdk-auth
```

## 🔐 Teil 2: OpenAI API-Key in Azure Container App konfigurieren

### 2.1 OpenAI API-Key als Secret hinzufügen

```bash
# OpenAI API-Key als Secret in Container App setzen
az containerapp secret set \
  --name product-info-generator \
  --resource-group rg-product-info-generator \
  --secrets openai-api-key="DEIN_OPENAI_API_KEY_HIER"

# Umgebungsvariable konfigurieren
az containerapp update \
  --name product-info-generator \
  --resource-group rg-product-info-generator \
  --set-env-vars OPENAI_API_KEY=secretref:openai-api-key
```

**WICHTIG:** Ersetze `DEIN_OPENAI_API_KEY_HIER` mit deinem echten OpenAI API-Key!

### 2.2 Weitere Umgebungsvariablen (optional)

```bash
# Weitere Produktionseinstellungen
az containerapp update \
  --name product-info-generator \
  --resource-group rg-product-info-generator \
  --set-env-vars \
    NODE_ENV=production \
    PORT=8080 \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

## 📱 Teil 3: GitHub-Setup

### 3.1 GitHub Repository erstellen

1. Gehe zu [GitHub](https://github.com) und erstelle ein neues Repository
2. Klone das Repository lokal:
   ```bash
   git clone https://github.com/DEIN_USERNAME/DEIN_REPO_NAME.git
   cd DEIN_REPO_NAME
   ```

3. Kopiere alle Dateien aus deinem Replit-Projekt in das lokale Repository
4. Committe und pushe den Code:
   ```bash
   git add .
   git commit -m "Initial commit: Node.js app with Puppeteer and OpenAI"
   git push origin main
   ```

### 3.2 GitHub Secrets einrichten

Gehe zu deinem GitHub Repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Erstelle diese 4 Secrets:

| Secret Name | Wert | Wo zu finden |
|-------------|------|--------------|
| `ACR_LOGIN_SERVER` | `productinfoacr.azurecr.io` | Azure Portal → Container Registry → Overview → Login server |
| `ACR_USERNAME` | `productinfoacr` | Azure Portal → Container Registry → Access keys → Username |
| `ACR_PASSWORD` | `[Passwort aus ACR]` | Azure Portal → Container Registry → Access keys → Password |
| `AZURE_CREDENTIALS` | `[JSON von Service Principal]` | Manuell erstelltes JSON mit clientId, clientSecret, subscriptionId, tenantId |

### 3.3 GitHub Actions Workflow testen

1. Mache eine kleine Änderung in deinem Code
2. Committe und pushe auf den `main` Branch:
   ```bash
   git add .
   git commit -m "Test deployment workflow"
   git push origin main
   ```

3. Gehe zu GitHub → **Actions** Tab und überwache den Deployment-Prozess

## 🌐 Teil 4: Zugriff auf deine App

Nach erfolgreichem Deployment ist deine App verfügbar unter:

```
https://product-info-generator.azurecontainerapps.io
```

### App-URL abrufen:

```bash
# App-URL anzeigen
az containerapp show \
  --name product-info-generator \
  --resource-group rg-product-info-generator \
  --query properties.configuration.ingress.fqdn \
  --output tsv
```

## 🔧 Teil 5: Troubleshooting

### Logs anzeigen

```bash
# Container App Logs anzeigen
az containerapp logs show \
  --name product-info-generator \
  --resource-group rg-product-info-generator \
  --follow
```

### Container App neu starten

```bash
# Container App neu starten
az containerapp revision restart \
  --name product-info-generator \
  --resource-group rg-product-info-generator
```

### Secrets aktualisieren

```bash
# OpenAI API-Key aktualisieren
az containerapp secret set \
  --name product-info-generator \
  --resource-group rg-product-info-generator \
  --secrets openai-api-key="NEUER_API_KEY"
```

## 📊 Teil 6: Monitoring und Scaling

### Auto-Scaling konfigurieren

```bash
# Scaling-Regeln anpassen
az containerapp update \
  --name product-info-generator \
  --resource-group rg-product-info-generator \
  --min-replicas 1 \
  --max-replicas 5
```

### Ressourcen überwachen

```bash
# Aktueller Status der Container App
az containerapp show \
  --name product-info-generator \
  --resource-group rg-product-info-generator \
  --output table
```

## 🎉 Fertig!

Deine Node.js-App mit Puppeteer-PDF-Generierung läuft jetzt automatisiert auf Azure Container Apps!

**Bei jedem Push auf `main`:**
1. GitHub Actions baut ein neues Docker Image
2. Pusht es in deine Azure Container Registry
3. Aktualisiert automatisch deine Container App
4. Deine App ist sofort verfügbar unter der Azure-URL

**Nächste Schritte:**
- Teste die PDF-Generierung über die Web-UI
- Überwache die Logs für eventuelle Puppeteer-Probleme
- Konfiguriere bei Bedarf Custom Domains
- Implementiere Monitoring und Alerting