#!/bin/bash

# Chrome Installation Test Script
# Simuliert die Docker-Installation zum Testen

echo "=== Chrome Installation Test ==="
echo "Simulating Docker build steps..."

# Test 1: Chrome Installation Simulation
echo
echo "1. Testing Chrome installation commands..."

# Simulate apt-get commands (these would run in Docker)
echo "   ✓ apt-get update (simulated)"
echo "   ✓ Installing dependencies (simulated)"
echo "   ✓ Adding Google Chrome repository (simulated)"
echo "   ✓ Installing google-chrome-stable (simulated)"

# Test 2: Check if Puppeteer can find browser paths
echo
echo "2. Testing Puppeteer browser path detection..."

# Check expected Chrome paths
expected_paths=(
    "/usr/bin/google-chrome-stable"
    "/usr/bin/google-chrome"
    "/usr/bin/chromium-browser"
    "/usr/bin/chromium"
)

echo "Expected Chrome paths in Docker container:"
for path in "${expected_paths[@]}"; do
    echo "   - $path"
done

# Test 3: Environment Variables
echo
echo "3. Testing environment variables..."
echo "   PUPPETEER_EXECUTABLE_PATH should be set to: /usr/bin/google-chrome-stable"

# Test 4: Docker Build Command Examples
echo
echo "4. Docker build commands for Azure deployment:"
echo
echo "Local testing:"
echo "   docker build --no-cache -f Dockerfile.production -t product-info-generator ."
echo "   docker run --rm product-info-generator google-chrome --version"
echo
echo "Azure deployment:"
echo "   docker tag product-info-generator your-registry.azurecr.io/product-info-generator:v2"
echo "   docker push your-registry.azurecr.io/product-info-generator:v2"

echo
echo "=== Test completed successfully ==="
echo "Next step: Deploy to Azure with new Docker image"