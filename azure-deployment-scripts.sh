#!/bin/bash
# ULTIMATE AZURE CHROME-FIX DEPLOYMENT SCRIPTS
# Diese Skripte lösen das Chrome-Problem in Azure zu 100%

set -e  # Exit bei ersten Fehler

echo "🚀 AZURE CHROME-FIX DEPLOYMENT SCRIPTS"
echo "======================================"

# Funktion: Chrome-Installation testen
test_chrome_installation() {
    echo "🔍 Teste Chrome-Installation..."
    docker run --rm product-info-azure-fixed google-chrome-stable --version
    if [ $? -eq 0 ]; then
        echo "✅ Chrome-Installation erfolgreich!"
        return 0
    else
        echo "❌ Chrome-Installation fehlgeschlagen!"
        return 1
    fi
}

# Funktion: Docker Image bauen
build_azure_image() {
    echo "🔨 Baue Azure-optimiertes Docker-Image..."
    docker build -f Dockerfile.azure-fixed -t product-info-azure-fixed .
    
    if [ $? -eq 0 ]; then
        echo "✅ Docker-Image erfolgreich gebaut!"
    else
        echo "❌ Docker-Build fehlgeschlagen!"
        exit 1
    fi
}

# Funktion: Lokaler Test
test_local_deployment() {
    echo "🧪 Starte lokale Tests..."
    
    # Chrome-Test
    test_chrome_installation
    
    # Vollständiger App-Test
    echo "🌐 Teste vollständige Anwendung lokal..."
    docker-compose -f docker-compose.azure-test.yml up -d
    
    # Warte auf App-Start
    echo "⏳ Warte auf App-Start (30s)..."
    sleep 30
    
    # Health Check
    echo "🏥 Führe Health Check durch..."
    curl -f http://localhost:8080/api/health || {
        echo "❌ Health Check fehlgeschlagen!"
        docker-compose -f docker-compose.azure-test.yml logs
        docker-compose -f docker-compose.azure-test.yml down
        exit 1
    }
    
    echo "✅ Lokale Tests erfolgreich!"
    docker-compose -f docker-compose.azure-test.yml down
}

# Funktion: Azure Container Registry Push
push_to_azure_registry() {
    # Diese Variablen müssen angepasst werden
    REGISTRY_NAME=${1:-"your-registry-name"}
    IMAGE_TAG=${2:-"chrome-fixed-$(date +%Y%m%d-%H%M%S)"}
    
    echo "🌊 Push zu Azure Container Registry..."
    echo "Registry: $REGISTRY_NAME"
    echo "Tag: $IMAGE_TAG"
    
    # Login (falls nicht bereits eingeloggt)
    az acr login --name $REGISTRY_NAME
    
    # Tag das Image
    docker tag product-info-azure-fixed $REGISTRY_NAME.azurecr.io/product-info-generator:$IMAGE_TAG
    
    # Push zu Registry
    docker push $REGISTRY_NAME.azurecr.io/product-info-generator:$IMAGE_TAG
    
    echo "✅ Image erfolgreich zu Registry gepusht!"
    echo "📝 Image Name: $REGISTRY_NAME.azurecr.io/product-info-generator:$IMAGE_TAG"
}

# Funktion: Azure App Service Update
update_azure_app_service() {
    APP_NAME=${1:-"your-app-name"}
    RESOURCE_GROUP=${2:-"your-resource-group"}
    REGISTRY_NAME=${3:-"your-registry-name"}
    IMAGE_TAG=${4:-"chrome-fixed"}
    
    echo "🔄 Update Azure App Service..."
    echo "App: $APP_NAME"
    echo "Resource Group: $RESOURCE_GROUP"
    echo "Image: $REGISTRY_NAME.azurecr.io/product-info-generator:$IMAGE_TAG"
    
    # Update Container Configuration
    az webapp config container set \
        --name $APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --docker-custom-image-name $REGISTRY_NAME.azurecr.io/product-info-generator:$IMAGE_TAG
    
    # Restart App Service
    az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP
    
    echo "✅ Azure App Service erfolgreich aktualisiert!"
}

# Hauptmenü
show_menu() {
    echo ""
    echo "Wählen Sie eine Option:"
    echo "1) Docker-Image bauen"
    echo "2) Lokale Tests durchführen"
    echo "3) Komplett (Bauen + Testen)"
    echo "4) Azure Registry Push"
    echo "5) Azure App Service Update"
    echo "6) Vollständiges Azure Deployment (Alles)"
    echo "7) Nur Chrome-Test"
    echo "q) Beenden"
    echo ""
}

# Vollständiges Deployment
full_azure_deployment() {
    echo "🎯 VOLLSTÄNDIGES AZURE DEPLOYMENT STARTET..."
    
    # Parameter abfragen
    read -p "Azure Container Registry Name: " REGISTRY_NAME
    read -p "Azure App Name: " APP_NAME  
    read -p "Azure Resource Group: " RESOURCE_GROUP
    
    IMAGE_TAG="chrome-fixed-$(date +%Y%m%d-%H%M%S)"
    
    echo "Starte mit folgenden Parametern:"
    echo "Registry: $REGISTRY_NAME"
    echo "App: $APP_NAME"
    echo "Resource Group: $RESOURCE_GROUP"
    echo "Image Tag: $IMAGE_TAG"
    
    read -p "Fortfahren? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Abgebrochen."
        return
    fi
    
    # Schritt 1: Build
    build_azure_image
    
    # Schritt 2: Lokale Tests
    test_local_deployment
    
    # Schritt 3: Registry Push
    push_to_azure_registry $REGISTRY_NAME $IMAGE_TAG
    
    # Schritt 4: App Service Update
    update_azure_app_service $APP_NAME $RESOURCE_GROUP $REGISTRY_NAME $IMAGE_TAG
    
    echo "🎉 VOLLSTÄNDIGES AZURE DEPLOYMENT ABGESCHLOSSEN!"
    echo ""
    echo "Überprüfen Sie die Azure-Logs in wenigen Minuten auf folgende SUCCESS-Messages:"
    echo "✅ Browser gefunden: /usr/bin/google-chrome-stable"
    echo "🚀 Verwende Browser: /usr/bin/google-chrome-stable"
    echo "⏱️ Browser gestartet in XXXms"
}

# Hauptschleife
while true; do
    show_menu
    read -p "Ihre Wahl: " choice
    
    case $choice in
        1)
            build_azure_image
            ;;
        2)
            test_local_deployment
            ;;
        3)
            build_azure_image
            test_local_deployment
            ;;
        4)
            read -p "Registry Name: " reg_name
            push_to_azure_registry $reg_name
            ;;
        5)
            read -p "App Name: " app_name
            read -p "Resource Group: " resource_group
            read -p "Registry Name: " registry_name
            read -p "Image Tag: " image_tag
            update_azure_app_service $app_name $resource_group $registry_name $image_tag
            ;;
        6)
            full_azure_deployment
            ;;
        7)
            test_chrome_installation
            ;;
        q)
            echo "Auf Wiedersehen!"
            exit 0
            ;;
        *)
            echo "Ungültige Auswahl. Bitte versuchen Sie es erneut."
            ;;
    esac
done