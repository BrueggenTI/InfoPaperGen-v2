#!/bin/bash

# Azure Ressourcen Setup Script
# Erstellt alle notwendigen Azure-Ressourcen für das Deployment

set -e

# Farbkonfiguration
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🏗️  Azure Ressourcen Setup für Product Info Generator${NC}"
echo -e "${BLUE}===================================================${NC}"

# Konfiguration
SUBSCRIPTION_ID=""
LOCATION="westeurope"
RESOURCE_GROUP="rg-product-info-app"
ACR_NAME="productinforegistry$(date +%s | tail -c 6)"  # Eindeutiger Name
CONTAINER_APP_ENV="product-info-env"
CONTAINER_APP_NAME="product-info-generator"
SERVICE_PRINCIPAL_NAME="github-actions-product-info"

echo -e "${YELLOW}📋 Ressourcen-Konfiguration:${NC}"
echo "  Subscription: $SUBSCRIPTION_ID"
echo "  Location: $LOCATION"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  ACR Name: $ACR_NAME"
echo "  Container App Environment: $CONTAINER_APP_ENV"
echo "  Container App: $CONTAINER_APP_NAME"
echo "  Service Principal: $SERVICE_PRINCIPAL_NAME"
echo

read -p "Möchten Sie fortfahren? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Abgebrochen."
    exit 1
fi

# Azure CLI prüfen
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI nicht gefunden!${NC}"
    echo "Installieren Sie Azure CLI: https://docs.microsoft.com/cli/azure/install-azure-cli"
    exit 1
fi

echo -e "${BLUE}🔐 Azure Login...${NC}"
az login

# Subscription ID automatisch abrufen wenn nicht gesetzt
if [ -z "$SUBSCRIPTION_ID" ]; then
    SUBSCRIPTION_ID=$(az account show --query id --output tsv)
    echo -e "${GREEN}✅ Subscription ID automatisch erkannt: $SUBSCRIPTION_ID${NC}"
fi

az account set --subscription "$SUBSCRIPTION_ID"

echo -e "${BLUE}📦 Resource Group erstellen...${NC}"
az group create --name $RESOURCE_GROUP --location $LOCATION

echo -e "${BLUE}📋 Container Registry erstellen...${NC}"
az acr create \
    --resource-group $RESOURCE_GROUP \
    --name $ACR_NAME \
    --sku Basic \
    --admin-enabled true

echo -e "${BLUE}🌐 Container Apps Extension installieren...${NC}"
az extension add --name containerapp --upgrade

echo -e "${BLUE}🔧 Container App Environment erstellen...${NC}"
az containerapp env create \
    --name $CONTAINER_APP_ENV \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION

echo -e "${BLUE}🚀 Container App erstellen...${NC}"
az containerapp create \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --environment $CONTAINER_APP_ENV \
    --image nginx:latest \
    --target-port 8080 \
    --ingress 'external' \
    --cpu 0.5 \
    --memory 1.0Gi

echo -e "${BLUE}👤 Service Principal erstellen...${NC}"
SP_OUTPUT=$(az ad sp create-for-rbac \
    --name $SERVICE_PRINCIPAL_NAME \
    --role "Contributor" \
    --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" \
    --sdk-auth)

echo -e "${GREEN}✅ Alle Ressourcen erfolgreich erstellt!${NC}"
echo

echo -e "${YELLOW}📋 ACR Anmeldeinformationen:${NC}"
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query loginServer --output tsv)
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username --output tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query passwords[0].value --output tsv)

echo "  Login Server: $ACR_LOGIN_SERVER"
echo "  Username: $ACR_USERNAME"
echo "  Password: [Siehe unten in den GitHub Secrets]"
echo

echo -e "${YELLOW}🔑 GitHub Secrets (für Repository Settings):${NC}"
echo
echo -e "${BLUE}ACR_LOGIN_SERVER:${NC}"
echo "$ACR_LOGIN_SERVER"
echo
echo -e "${BLUE}ACR_NAME:${NC}"
echo "$ACR_NAME"
echo
echo -e "${BLUE}ACR_USERNAME:${NC}"
echo "$ACR_USERNAME"
echo
echo -e "${BLUE}ACR_PASSWORD:${NC}"
echo "$ACR_PASSWORD"
echo
echo -e "${BLUE}AZURE_CREDENTIALS:${NC}"
echo "$SP_OUTPUT"
echo
echo -e "${BLUE}AZURE_CONTAINER_APP_NAME:${NC}"
echo "$CONTAINER_APP_NAME"
echo
echo -e "${BLUE}AZURE_RESOURCE_GROUP:${NC}"
echo "$RESOURCE_GROUP"
echo

echo -e "${GREEN}✅ Setup abgeschlossen!${NC}"
echo
echo -e "${YELLOW}📋 Nächste Schritte:${NC}"
echo "1. Kopieren Sie die GitHub Secrets in Ihr Repository"
echo "2. Setzen Sie OPENAI_API_KEY in der Container App:"
echo "   az containerapp update --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --set-env-vars OPENAI_API_KEY=your-api-key"
echo "3. Pushen Sie Ihren Code nach GitHub um das erste Deployment auszulösen"
echo
echo -e "${BLUE}Container App URL:${NC}"
CONTAINER_APP_URL=$(az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn --output tsv)
echo "https://$CONTAINER_APP_URL"