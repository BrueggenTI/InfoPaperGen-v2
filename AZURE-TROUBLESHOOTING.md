# Azure Container Apps Deployment - Troubleshooting

## 🚨 Häufige Deployment-Fehler und Lösungen

### Fehler: "No credentials found. Add an Azure login action before this action"

**Ursache:** Das `AZURE_CREDENTIALS` GitHub Secret ist falsch formatiert oder fehlt.

**Lösung:**

#### 1. Service Principal korrekt erstellen

```bash
# Subscription ID abrufen
SUBSCRIPTION_ID=$(az account show --query id --output tsv)
echo "Subscription ID: $SUBSCRIPTION_ID"

# Service Principal erstellen
az ad sp create-for-rbac \
  --name "product-info-github-actions" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-product-info-generator
```

#### 2. Ausgabe richtig interpretieren

Die Ausgabe sieht so aus:
```json
{
  "appId": "12345678-abcd-1234-abcd-123456789012",
  "displayName": "product-info-github-actions",
  "password": "dein-super-geheimer-password",
  "tenant": "87654321-dcba-4321-dcba-210987654321"
}
```

#### 3. AZURE_CREDENTIALS Secret korrekt erstellen

**GitHub Repository → Settings → Secrets and variables → Actions → New repository secret**

Name: `AZURE_CREDENTIALS`

Wert (JSON ohne Leerzeichen oder Zeilenumbrüche):
```json
{"clientId":"12345678-abcd-1234-abcd-123456789012","clientSecret":"dein-super-geheimer-password","subscriptionId":"deine-subscription-id","tenantId":"87654321-dcba-4321-dcba-210987654321"}
```

**Wichtige Zuordnung:**
- `appId` → `clientId`
- `password` → `clientSecret`
- `subscription ID` → `subscriptionId` (von az account show)
- `tenant` → `tenantId`

#### 4. Service Principal Berechtigungen prüfen

```bash
# Service Principal Berechtigungen anzeigen
az role assignment list \
  --assignee "12345678-abcd-1234-abcd-123456789012" \
  --output table
```

#### 5. Alternative: Service Principal mit erweiterten Rechten

Falls Container App Updates fehlschlagen:

```bash
# Service Principal mit erweiterten Rechten für Container Apps
az ad sp create-for-rbac \
  --name "product-info-github-actions" \
  --role "Contributor" \
  --scopes /subscriptions/$SUBSCRIPTION_ID
```

### Fehler: "Container registry access denied"

**Lösung:**

#### 1. ACR Admin User aktivieren
```bash
az acr update \
  --name productinfoacr \
  --resource-group rg-product-info-generator \
  --admin-enabled true
```

#### 2. GitHub Secrets für ACR überprüfen
```bash
# ACR Credentials anzeigen
az acr credential show \
  --name productinfoacr \
  --resource-group rg-product-info-generator
```

**GitHub Secrets erstellen:**
- `ACR_LOGIN_SERVER`: `productinfoacr.azurecr.io`
- `ACR_USERNAME`: `productinfoacr`
- `ACR_PASSWORD`: Das erste Passwort aus der credential show Ausgabe

### Fehler: "Container app update failed"

**Lösung:**

#### 1. Container App Status prüfen
```bash
az containerapp show \
  --name product-info-generator \
  --resource-group rg-product-info-generator \
  --query "properties.provisioningState"
```

#### 2. Manuelle Container App Aktualisierung
```bash
az containerapp update \
  --name product-info-generator \
  --resource-group rg-product-info-generator \
  --image productinfoacr.azurecr.io/product-info-generator:latest
```

### Fehler: "Image pull failed"

**Lösung:**

#### 1. Image in Registry prüfen
```bash
az acr repository list \
  --name productinfoacr \
  --output table

az acr repository show-tags \
  --name productinfoacr \
  --repository product-info-generator \
  --output table
```

#### 2. Registry Access für Container App konfigurieren
```bash
az containerapp registry set \
  --name product-info-generator \
  --resource-group rg-product-info-generator \
  --server productinfoacr.azurecr.io \
  --username productinfoacr \
  --password "$(az acr credential show --name productinfoacr --query passwords[0].value -o tsv)"
```

### GitHub Actions Logs analysieren

#### 1. Detaillierte Logs aktivieren
Füge folgende Umgebungsvariable in deine GitHub Actions hinzu:
```yaml
env:
  ACTIONS_STEP_DEBUG: true
```

#### 2. Azure CLI Debug aktivieren
```yaml
- name: Debug Azure Login
  run: |
    echo "Azure CLI Version:"
    az version
    echo "Service Principal Test:"
    az account show
```

### Deployment manuell testen

#### 1. Lokal Docker Image bauen
```bash
# In deinem Projekt-Verzeichnis
docker build -t product-info-generator .
docker run -p 8080:8080 -e OPENAI_API_KEY=dein_key product-info-generator
```

#### 2. Image zu ACR pushen
```bash
# Bei ACR anmelden
az acr login --name productinfoacr

# Image taggen und pushen
docker tag product-info-generator productinfoacr.azurecr.io/product-info-generator:manual-test
docker push productinfoacr.azurecr.io/product-info-generator:manual-test
```

#### 3. Container App manuell aktualisieren
```bash
az containerapp update \
  --name product-info-generator \
  --resource-group rg-product-info-generator \
  --image productinfoacr.azurecr.io/product-info-generator:manual-test
```

### Service Principal neu erstellen (wenn alles andere fehlschlägt)

```bash
# Alten Service Principal löschen
az ad sp delete --id "alte-app-id"

# Neuen Service Principal erstellen
az ad sp create-for-rbac \
  --name "product-info-github-actions-v2" \
  --role "Contributor" \
  --scopes /subscriptions/$(az account show --query id --output tsv)

# AZURE_CREDENTIALS Secret in GitHub komplett neu erstellen
```

### Erfolgreiche Deployment-Logs

Ein erfolgreiches Deployment zeigt folgende Logs:
```
✅ Build job completed
✅ Azure login successful
✅ Container app updated successfully
🌐 App verfügbar unter: https://product-info-generator.azurecontainerapps.io
```

### Weitere Hilfe

Bei anhaltenden Problemen:
1. Prüfe die GitHub Actions Logs im Detail
2. Teste den Service Principal manuell in Azure CLI
3. Überprüfe alle 4 GitHub Secrets auf Korrektheit
4. Nutze die Azure Portal Container App Logs für Runtime-Probleme