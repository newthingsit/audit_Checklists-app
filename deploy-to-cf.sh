#!/bin/bash

# Cloud Foundry Quick Deploy Script
# This script helps you quickly deploy the Restaurant Audit & Checklist app to Cloud Foundry

set -e

echo "======================================"
echo "Cloud Foundry Deployment Script"
echo "Restaurant Audit & Checklist App"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if CF CLI is installed
if ! command -v cf &> /dev/null; then
    echo -e "${RED}❌ Cloud Foundry CLI is not installed${NC}"
    echo "Please install it first: https://docs.cloudfoundry.org/cf-cli/install-go-cli.html"
    exit 1
fi

echo -e "${GREEN}✅ Cloud Foundry CLI is installed${NC}"
echo ""

# Check if user is logged in
if ! cf target &> /dev/null; then
    echo -e "${YELLOW}⚠️  You are not logged in to Cloud Foundry${NC}"
    echo ""
    read -p "Enter your Cloud Foundry API endpoint (e.g., api.run.pivotal.io): " CF_API
    cf login -a "$CF_API"
    echo ""
fi

echo -e "${GREEN}✅ Logged in to Cloud Foundry${NC}"
cf target
echo ""

# Ask what to deploy
echo "What would you like to deploy?"
echo "1) Backend API only"
echo "2) Web Frontend only"
echo "3) Both Backend and Frontend"
read -p "Enter your choice (1-3): " DEPLOY_CHOICE
echo ""

# Function to deploy backend
deploy_backend() {
    echo "======================================"
    echo "Deploying Backend API"
    echo "======================================"
    
    # Check if PostgreSQL service exists
    if ! cf service audit-checklist-db &> /dev/null; then
        echo -e "${YELLOW}⚠️  PostgreSQL service 'audit-checklist-db' not found${NC}"
        echo ""
        echo "Available database services:"
        cf marketplace | grep -i postgres || true
        echo ""
        read -p "Would you like to create a PostgreSQL service? (y/n): " CREATE_DB
        
        if [[ "$CREATE_DB" == "y" || "$CREATE_DB" == "Y" ]]; then
            read -p "Enter service name (e.g., elephantsql, postgresql): " SERVICE_NAME
            read -p "Enter plan name (e.g., turtle, small): " PLAN_NAME
            
            echo "Creating PostgreSQL service..."
            cf create-service "$SERVICE_NAME" "$PLAN_NAME" audit-checklist-db
            
            echo "Waiting for service to be ready..."
            sleep 10
        fi
    else
        echo -e "${GREEN}✅ PostgreSQL service found${NC}"
    fi
    
    # Check for environment variables
    if [ ! -f "backend/vars.yml" ]; then
        echo -e "${YELLOW}⚠️  vars.yml not found${NC}"
        echo "Creating vars.yml file..."
        
        # Generate JWT secret
        JWT_SECRET=$(openssl rand -hex 32)
        
        cat > backend/vars.yml << EOF
jwt-secret: ${JWT_SECRET}
allowed-origins: https://audit-checklist-web.cfapps.io
node-env: production
EOF
        
        echo -e "${GREEN}✅ Created vars.yml with auto-generated JWT secret${NC}"
        echo -e "${YELLOW}⚠️  Please update allowed-origins in backend/vars.yml if needed${NC}"
    fi
    
    # Deploy backend
    cd backend
    echo "Pushing backend to Cloud Foundry..."
    cf push --vars-file vars.yml
    
    echo ""
    echo -e "${GREEN}✅ Backend deployed successfully!${NC}"
    echo ""
    echo "Backend URL:"
    cf app audit-checklist-backend | grep routes || true
    cd ..
}

# Function to deploy web frontend
deploy_web() {
    echo "======================================"
    echo "Deploying Web Frontend"
    echo "======================================"
    
    # Get backend URL
    BACKEND_URL=""
    if cf app audit-checklist-backend &> /dev/null; then
        BACKEND_URL=$(cf app audit-checklist-backend | grep routes | awk '{print $2}' | head -1)
        if [ -n "$BACKEND_URL" ]; then
            BACKEND_URL="https://${BACKEND_URL}/api"
        fi
    fi
    
    if [ -z "$BACKEND_URL" ]; then
        read -p "Enter backend API URL (e.g., https://audit-checklist-backend.cfapps.io/api): " BACKEND_URL
    else
        echo "Detected backend URL: $BACKEND_URL"
        read -p "Use this URL? (y/n): " USE_DETECTED
        if [[ "$USE_DETECTED" != "y" && "$USE_DETECTED" != "Y" ]]; then
            read -p "Enter backend API URL: " BACKEND_URL
        fi
    fi
    
    # Create production environment file
    cd web
    cat > .env.production << EOF
REACT_APP_API_URL=${BACKEND_URL}
EOF
    
    echo "Building web application..."
    npm install
    npm run build
    
    # Copy Staticfile to build directory
    cp Staticfile build/ 2>/dev/null || true
    cp -r includes build/ 2>/dev/null || true
    
    echo "Pushing web frontend to Cloud Foundry..."
    cf push
    
    echo ""
    echo -e "${GREEN}✅ Web frontend deployed successfully!${NC}"
    echo ""
    echo "Web URL:"
    cf app audit-checklist-web | grep routes || true
    cd ..
}

# Execute deployment based on choice
case $DEPLOY_CHOICE in
    1)
        deploy_backend
        ;;
    2)
        deploy_web
        ;;
    3)
        deploy_backend
        echo ""
        deploy_web
        ;;
    *)
        echo -e "${RED}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

echo ""
echo "======================================"
echo "Deployment Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Test your deployed applications"
echo "2. Configure custom domains (optional)"
echo "3. Set up monitoring and logging"
echo "4. Review the deployment documentation in CLOUD_FOUNDRY_DEPLOYMENT.md"
echo ""
echo "Useful commands:"
echo "  cf apps                              # View all applications"
echo "  cf logs <app-name>                   # View application logs"
echo "  cf restart <app-name>                # Restart an application"
echo "  cf scale <app-name> -i <instances>   # Scale an application"
echo ""
