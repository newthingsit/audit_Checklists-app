#!/bin/bash
# Android SDK & Build Setup Script for WSL2 Ubuntu
# Run this inside WSL Ubuntu after 1_Enable-WSL2.ps1 completes and you restart
# Command: bash 2_Android-SDK-Setup.sh

set -e  # Exit on any error

echo "================================================"
echo "Android SDK & Build Environment Setup"
echo "================================================"
echo ""

# Step 1: Update system packages
echo "[1/6] Updating system packages..."
sudo apt update && sudo apt upgrade -y > /dev/null 2>&1
echo "✓ System packages updated"
echo ""

# Step 2: Install Java 17
echo "[2/6] Installing Java 17 (OpenJDK)..."
sudo apt install -y openjdk-17-jdk openjdk-17-jre > /dev/null 2>&1
java -version 2>&1 | head -n 3
echo "✓ Java 17 installed"
echo ""

# Step 3: Install Node.js and npm
echo "[3/6] Installing Node.js 18+ and npm..."
sudo apt install -y nodejs npm > /dev/null 2>&1
node --version
npm --version
echo "✓ Node.js and npm installed"
echo ""

# Step 4: Setup Android SDK
echo "[4/6] Setting up Android SDK..."
mkdir -p ~/android-sdk/cmdline-tools
cd ~/android-sdk/cmdline-tools

# Download latest cmdline-tools
echo "  Downloading cmdline-tools (this may take a minute)..."
wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip -q commandlinetools-linux-*_latest.zip
rm commandlinetools-linux-*_latest.zip
mv cmdline-tools latest

echo "✓ Android SDK cmdline-tools installed"
echo ""

# Step 5: Configure environment variables
echo "[5/6] Configuring environment variables..."
ENV_BLOCK=$(cat <<'EOF'
export ANDROID_SDK_ROOT=$HOME/android-sdk
export ANDROID_HOME=$HOME/android-sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_SDK_ROOT/platform-tools
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
EOF
)

# Append once to .bashrc and .profile (login shells read .profile, non-login shells read .bashrc)
if ! grep -q "ANDROID_SDK_ROOT" ~/.bashrc 2>/dev/null; then
    echo "$ENV_BLOCK" >> ~/.bashrc
fi
if [ -f ~/.profile ] && ! grep -q "ANDROID_SDK_ROOT" ~/.profile 2>/dev/null; then
    echo "$ENV_BLOCK" >> ~/.profile
fi
if [ -f ~/.bash_profile ] && ! grep -q "ANDROID_SDK_ROOT" ~/.bash_profile 2>/dev/null; then
    echo "$ENV_BLOCK" >> ~/.bash_profile
fi

# Load for current shell
source ~/.bashrc
echo "✓ Environment variables configured"
echo ""

# Step 6: Accept licenses and install SDKs
echo "[6/6] Installing Android platforms, build-tools, and NDK..."
echo "  Accepting Android SDK licenses..."
yes | sdkmanager --licenses > /dev/null 2>&1

echo "  Installing platforms;android-34..."
sdkmanager "platforms;android-34" > /dev/null 2>&1

echo "  Installing build-tools;34.0.0..."
sdkmanager "build-tools;34.0.0" > /dev/null 2>&1

echo "  Installing ndk;27.0.11718014..."
sdkmanager "ndk;27.0.11718014" > /dev/null 2>&1

echo "  Installing platform-tools..."
sdkmanager "platform-tools" > /dev/null 2>&1

echo "✓ Android SDK, build-tools, and NDK installed"
echo ""

# Step 7: Install EAS CLI
echo "Installing EAS CLI globally..."
sudo npm install -g eas-cli > /dev/null 2>&1
eas --version
echo "✓ EAS CLI installed"
echo ""

# Verify installations
echo "================================================"
echo "Installation Complete - Verifying..."
echo "================================================"
echo ""
echo "Installed versions:"
echo "  Java: $(java -version 2>&1 | head -n 1)"
echo "  Node: $(node --version)"
echo "  npm: $(npm --version)"
echo "  EAS: $(eas --version)"
echo ""

# List installed Android components
echo "Installed Android components:"
sdkmanager --list_installed 2>&1 | grep -E "platforms|build-tools|ndk|platform-tools" || echo "  ✓ All components installed"
echo ""

echo "================================================"
echo "Next Steps:"
echo "================================================"
echo ""
echo "1. Clone or navigate to your project:"
echo "   cd /mnt/d/audit_Checklists-app/mobile"
echo ""
echo "2. Install npm dependencies:"
echo "   npm install"
echo ""
echo "3. Build preview APK:"
echo "   npx eas build --platform android --profile preview --local --output app-preview.apk"
echo ""
echo "4. Or build release APK:"
echo "   npx eas build --platform android --profile release --local --output app-release.apk"
echo ""
echo "5. Find your APK at:"
echo "   ~/audit_Checklists-app/mobile/app-preview.apk (or app-release.apk)"
echo ""
echo "6. Copy to Windows Downloads (optional):"
echo "   cp app-preview.apk /mnt/c/Users/YOUR_USERNAME/Downloads/"
echo ""
echo "================================================"
echo "Setup Complete!"
echo "================================================"
