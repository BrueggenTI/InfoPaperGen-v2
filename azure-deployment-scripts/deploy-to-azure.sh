#!/bin/bash

# Azure Deployment Script für Product Info Generator
# Dieses Skript automatisiert das lokale Build und Push-Prozess für Azure Container Registry

set -e

# Farbkonfiguration für bessere Lesbarkeit
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Azure Deployment Script für Product Info Generator${NC}"
echo -e "${BLUE}=================================================${NC}"

# Variablen prüfen
if [ -z "$ACR_NAME" ] || [ -z "$ACR_LOGIN_SERVER" ] || [ -z "$RESOURCE_GROUP" ] || [ -z "$CONTAINER_APP_NAME" ]; then
    echo -e "${RED}❌ Erforderliche Umgebungsvariablen nicht gesetzt!${NC}"
    echo "Bitte setzen Sie folgende Variablen:"
    echo "  export ACR_NAME='your-acr-name'"
    echo "  export ACR_LOGIN_SERVER='your-acr-name.azurecr.io'"
    echo "  export RESOURCE_GROUP='your-resource-group'"
    echo "  export CONTAINER_APP_NAME='your-container-app'"
    exit 1
fi

# Image-Name und Tag
IMAGE_NAME="product-info-generator"
IMAGE_TAG=$(date +%Y%m%d-%H%M%S)
FULL_IMAGE_NAME="${ACR_LOGIN_SERVER}/${IMAGE_NAME}:${IMAGE_TAG}"

echo -e "${YELLOW}📋 Deployment-Konfiguration:${NC}"
echo "  ACR Name: $ACR_NAME"
echo "  Login Server: $ACR_LOGIN_SERVER"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Container App: $CONTAINER_APP_NAME"
echo "  Image: $FULL_IMAGE_NAME"
echo

# Azure CLI prüfen
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI nicht gefunden! Bitte installieren Sie Azure CLI.${NC}"
    exit 1
fi

# Docker prüfen
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker nicht gefunden! Bitte installieren Sie Docker.${NC}"
    exit 1
fi

echo -e "${BLUE}🔐 Azure Login und ACR-Anmeldung...${NC}"
az login --use-device-code
az acr login --name $ACR_NAME

echo -e "${BLUE}🏗️  Docker Image erstellen...${NC}"
docker build -t $FULL_IMAGE_NAME .

echo -e "${BLUE}📤 Image zu Azure Container Registry pushen...${NC}"
docker push $FULL_IMAGE_NAME

echo -e "${BLUE}🚀 Container App aktualisieren...${NC}"
az containerapp update \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --image $FULL_IMAGE_NAME

echo -e "${GREEN}✅ Deployment erfolgreich abgeschlossen!${NC}"
echo -e "${GREEN}🌐 Ihre Anwendung ist jetzt verfügbar unter:${NC}"

# Container App URL abrufen
APP_URL=$(az containerapp show \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query properties.configuration.ingress.fqdn \
    --output tsv)

if [ ! -z "$APP_URL" ]; then
    echo -e "${GREEN}   https://$APP_URL${NC}"
else
    echo -e "${YELLOW}   URL konnte nicht automatisch ermittelt werden. Prüfen Sie das Azure Portal.${NC}"
fi

echo
echo -e "${BLUE}📋 Nächste Schritte:${NC}"
echo "1. Öffnen Sie Ihre Anwendung im Browser"
echo "2. Testen Sie die PDF-Generierung"
echo "3. Überprüfen Sie die OpenAI-Integration"
echo "4. Überwachen Sie die Logs im Azure Portal"

echo
echo -e "${YELLOW}💡 Tipp: Verwenden Sie 'az containerapp logs show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --follow' für Live-Logs${NC}"