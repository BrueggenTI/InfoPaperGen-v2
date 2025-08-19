# 🚀 Azure Deployment Guide - Product Information Generator

## ✅ Pre-Deployment Checklist

### Application Status
- ✅ **Build Successful**: 872KB main bundle (268KB gzipped)
- ✅ **Runtime Errors Fixed**: No console errors, proper error boundaries
- ✅ **Azure Compatibility**: Environment variables, health checks, monitoring
- ✅ **Docker Ready**: Optimized Dockerfile with security best practices
- ✅ **Performance Optimized**: React memoization, TanStack Query caching

### Critical Components Verified
- ✅ **PDF Generation**: Puppeteer with 30+ Chrome flags for containerization
- ✅ **OpenAI Integration**: Timeout handling, retry logic, Azure-compatible config
- ✅ **Error Handling**: Global error boundaries, health monitoring
- ✅ **Security**: Non-root user, minimal dependencies, environment variables

## 🏗️ Azure Deployment Steps

### 1. Create Azure Resources

```bash
# Create Resource Group
az group create --name rg-product-info-generator --location "West Europe"

# Create Container Registry
az acr create --resource-group rg-product-info-generator \
  --name productinfoacr --sku Basic

# Create App Service Plan
az appservice plan create --name asp-product-info-generator \
  --resource-group rg-product-info-generator \
  --sku S1 --is-linux
```

### 2. Build and Push Docker Image

```bash
# Login to Azure Container Registry
az acr login --name productinfoacr

# Build and push image
docker build -t productinfoacr.azurecr.io/product-info-generator:latest .
docker push productinfoacr.azurecr.io/product-info-generator:latest
```

### 3. Create App Service

```bash
# Create App Service from container
az webapp create --resource-group rg-product-info-generator \
  --plan asp-product-info-generator \
  --name product-info-generator-app \
  --deployment-container-image-name productinfoacr.azurecr.io/product-info-generator:latest
```

### 4. Configure Environment Variables

```bash
# Set OpenAI API Key (REQUIRED)
az webapp config appsettings set --resource-group rg-product-info-generator \
  --name product-info-generator-app \
  --settings OPENAI_API_KEY="your-openai-api-key-here"

# Set production environment
az webapp config appsettings set --resource-group rg-product-info-generator \
  --name product-info-generator-app \
  --settings NODE_ENV="production" PORT="8080"
```

### 5. Configure App Service Settings

```bash
# Enable Always On
az webapp config set --resource-group rg-product-info-generator \
  --name product-info-generator-app \
  --always-on true

# Set HTTP version
az webapp config set --resource-group rg-product-info-generator \
  --name product-info-generator-app \
  --http20-enabled true
```

## 🔍 Verification Steps

### 1. Health Check
```bash
curl https://product-info-generator-app.azurewebsites.net/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-19T10:35:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "uptime": "5m 30s",
  "memory": {
    "heapUsed": "45MB",
    "heapTotal": "67MB",
    "rss": "123MB"
  },
  "services": {
    "openai": true,
    "puppeteer": true
  }
}
```

### 2. Application Load Test
- Navigate to: `https://product-info-generator-app.azurewebsites.net`
- Test product creation workflow
- Verify PDF generation works end-to-end
- Check OpenAI integration (ingredient extraction)

### 3. Performance Monitoring
- Monitor logs in Azure Portal
- Check Application Insights metrics
- Verify no memory leaks during PDF generation

## 🎯 Expected Performance

### Load Times
- **Initial Page Load**: < 3 seconds
- **PDF Generation**: 8-12 seconds (optimized)
- **API Response**: < 500ms average

### Resource Usage
- **Memory**: ~150MB steady state
- **CPU**: <30% under normal load
- **Storage**: Minimal (in-memory storage)

## 🚨 Troubleshooting

### Common Issues

1. **OpenAI API Key Missing**
   - Verify environment variable is set
   - Check Azure App Service Configuration

2. **PDF Generation Fails**
   - Ensure container has sufficient memory (512MB minimum)
   - Check Puppeteer Chrome flags in logs

3. **App Won't Start**
   - Verify Docker image built successfully
   - Check container logs in Azure Portal

### Debug Commands

```bash
# Check app logs
az webapp log tail --resource-group rg-product-info-generator \
  --name product-info-generator-app

# Check app status
az webapp show --resource-group rg-product-info-generator \
  --name product-info-generator-app \
  --query state
```

## 🔧 Production Optimization

### Auto-Scaling (Optional)
```bash
# Enable auto-scaling
az monitor autoscale create --resource-group rg-product-info-generator \
  --resource product-info-generator-app \
  --min-count 1 --max-count 3 \
  --count 1
```

### Custom Domain (Optional)
```bash
# Add custom domain
az webapp config hostname add --resource-group rg-product-info-generator \
  --webapp-name product-info-generator-app \
  --hostname your-domain.com
```

## 📊 Monitoring Setup

### Application Insights
1. Create Application Insights resource
2. Configure connection string in App Service
3. Monitor performance, errors, and user flows

### Alerts
- Set up alerts for high CPU usage (>80%)
- Monitor response times (>5 seconds)
- Track error rates (>5%)

---

**Deployment Status**: ✅ Ready for Azure
**Estimated Deployment Time**: 30-45 minutes
**Support**: All major Azure regions supported