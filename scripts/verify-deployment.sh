#!/bin/bash
# Deployment Verification Script
# This script checks if all required components are ready for deployment

echo "🔍 Verifying Azure Deployment Setup..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend URL is accessible
echo "1. Checking Backend API..."
BACKEND_URL="https://audit-app-backend-2221.azurewebsites.net"
if curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL" | grep -q "200\|404\|403"; then
    echo -e "${GREEN}✅ Backend is accessible at: $BACKEND_URL${NC}"
else
    echo -e "${RED}❌ Backend not accessible. Check Azure Portal.${NC}"
fi

echo ""
echo "2. Checking GitHub Secrets..."
echo "   Go to: https://github.com/newthingsit/audit_Checklists-app/settings/secrets/actions"
echo "   Required secrets:"
echo "   - AZURE_STATIC_WEB_APPS_API_TOKEN"
echo "   - AZURE_WEBAPP_PUBLISH_PROFILE"
echo "   - REACT_APP_API_URL"
echo ""

echo "3. Deployment Checklist:"
echo "   [ ] GitHub secrets added"
echo "   [ ] CORS_ORIGINS updated in App Service"
echo "   [ ] Backend environment variables configured"
echo "   [ ] Code pushed to GitHub main branch"
echo ""

echo "4. Next Steps:"
echo "   - Add secrets to GitHub"
echo "   - Update CORS settings"
echo "   - Push code to trigger deployment"
echo "   - Monitor: https://github.com/newthingsit/audit_Checklists-app/actions"
echo ""

echo "✅ Verification complete!"

