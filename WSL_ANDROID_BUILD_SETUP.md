# WSL2 Android Build Setup Guide

This guide walks you through setting up WSL2 on Windows to build the Android APK using EAS locally.

## Prerequisites
- Windows 10 (build 19041+) or Windows 11
- Administrative access to enable WSL2
- ~20 GB free disk space for Android SDK/NDK/build artifacts

---

## Step 1: Enable WSL2 and Install Ubuntu

### 1.1 Enable WSL (PowerShell as Administrator)
```powershell
wsl --install
# This installs WSL2 and Ubuntu by default
# Restart your computer when prompted
```

### 1.2 Verify WSL2 Installation
```powershell
wsl --list --verbose
# Output should show:
# NAME      STATE           VERSION
# Ubuntu    Running         2
```

### 1.3 Start WSL
```powershell
wsl
# or:
wsl -d Ubuntu
```

---

## Step 2: Update Ubuntu and Install Java 17

Once inside WSL Ubuntu terminal:

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install Java 17 (required by Android SDK)
sudo apt install -y openjdk-17-jdk openjdk-17-jre

# Verify Java installation
java -version
# Expected: openjdk version "17.x.x"

javac -version
# Expected: javac 17.x.x
```

---

## Step 3: Install Android SDK and Build Tools

### 3.1 Create SDK directory and install cmdline-tools
```bash
# Create directories
mkdir -p ~/android-sdk/cmdline-tools
cd ~/android-sdk/cmdline-tools

# Download cmdline-tools (replace version if newer available)
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip

# Unzip
unzip commandlinetools-linux-*_latest.zip
rm commandlinetools-linux-*_latest.zip

# Rename to 'latest'
mv cmdline-tools latest
```

### 3.2 Set ANDROID_SDK_ROOT and PATH
```bash
# Add to ~/.bashrc or ~/.profile
echo 'export ANDROID_SDK_ROOT=$HOME/android-sdk' >> ~/.bashrc
echo 'export ANDROID_HOME=$HOME/android-sdk' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_SDK_ROOT/platform-tools' >> ~/.bashrc

# Reload shell
source ~/.bashrc
```

### 3.3 Accept Android SDK licenses
```bash
# Auto-accept all licenses
yes | sdkmanager --licenses

# Verify sdkmanager works
sdkmanager --list_installed
```

---

## Step 4: Install Required Build Tools and NDK

Run these **exact** sdkmanager commands:

```bash
# Install Android API 34 (or adjust to your target API)
sdkmanager "platforms;android-34"

# Install Build Tools 34.0.0 (or latest available)
sdkmanager "build-tools;34.0.0"

# Install Android NDK (latest stable)
sdkmanager "ndk;27.0.11718014"

# Install platform-tools (adb, fastboot, etc.)
sdkmanager "platform-tools"

# Install emulator (optional, for testing)
sdkmanager "emulator"
```

### 4.1 Verify installations
```bash
# List installed packages
sdkmanager --list_installed

# Expected output should include:
# - platforms;android-34
# - build-tools;34.0.0
# - ndk;27.0.11718014
# - platform-tools
```

---

## Step 5: Install Node.js and npm

```bash
# Install Node.js 18+ (for Expo/EAS compatibility)
sudo apt install -y nodejs npm

# Verify versions
node --version
npm --version

# Update npm to latest
sudo npm install -g npm@latest

# Install EAS CLI globally
sudo npm install -g eas-cli
```

---

## Step 6: Build Android APK using EAS

### 6.1 Navigate to mobile directory
```bash
# From WSL, navigate to your project
cd /mnt/d/audit_Checklists-app/mobile

# or mount and navigate
wsl --shell-type login
cd /mnt/d/audit_Checklists-app/mobile
```

### 6.2 Install dependencies
```bash
npm install
```

### 6.3 Build APK locally
```bash
# Build preview APK (debug)
npx eas build --platform android --profile preview --local --output app-preview.apk

# Or build release APK
npx eas build --platform android --profile release --local --output app-release.apk
```

### 6.4 Locate the APK
Once build completes:
```bash
# List generated APK
ls -lh app-preview.apk
# or
ls -lh app-release.apk

# Find it on Windows
# The APK is at: \\wsl$\Ubuntu\home\<your-username>\audit_Checklists-app\mobile\app-preview.apk
```

To copy to Windows Downloads folder:
```bash
cp app-preview.apk /mnt/c/Users/<YourUsername>/Downloads/
```

---

## Step 7: Troubleshooting

### Issue: `expo` not found / EAS says Expo SDK < 41
**Cause:** Running EAS from the repo root, so it reads the root `package.json` and `app.json` instead of the mobile app.

**Fix (recommended):**
```bash
cd /mnt/d/audit_Checklists-app/mobile
npm install
npx eas build --platform android --profile preview --local --output app-preview.apk
```

**Fix (from repo root):**
```bash
npm run build:apk:preview
# or
npm run build:apk:release
```

### Issue: `sdkmanager: command not found`
**Solution:** Verify PATH is set correctly
```bash
echo $PATH | grep android-sdk
# Should show /home/username/android-sdk/cmdline-tools/latest/bin
```

### Issue: `Java version not supported`
**Solution:** Ensure Java 17 is the default
```bash
update-alternatives --config java
# Select openjdk-17-jdk
```

### Issue: `Gradle daemon error` during build
**Solution:** Clear Gradle cache
```bash
cd /mnt/d/audit_Checklists-app/mobile
./gradlew clean
npx eas build --platform android --profile preview --local --output app-preview.apk
```

### Issue: `Not enough disk space`
**Solution:** Check available space
```bash
df -h
# Ensure /home has at least 15 GB free
```

### Issue: `build-tools version not found`
**Solution:** Use available version
```bash
# List available versions
sdkmanager --list | grep "build-tools"

# Install a different version (e.g., 33.0.2)
sdkmanager "build-tools;33.0.2"
```

---

## Quick Reference: Complete Setup One-Liner (After WSL installed)

```bash
# Run this in WSL Ubuntu to install everything
sudo apt update && sudo apt upgrade -y && \
sudo apt install -y openjdk-17-jdk openjdk-17-jre nodejs npm && \
mkdir -p ~/android-sdk/cmdline-tools && cd ~/android-sdk/cmdline-tools && \
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip && \
unzip commandlinetools-linux-*_latest.zip && \
mv cmdline-tools latest && \
echo 'export ANDROID_SDK_ROOT=$HOME/android-sdk' >> ~/.bashrc && \
echo 'export ANDROID_HOME=$HOME/android-sdk' >> ~/.bashrc && \
echo 'export PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools' >> ~/.bashrc && \
source ~/.bashrc && \
yes | sdkmanager --licenses && \
sdkmanager "platforms;android-34" "build-tools;34.0.0" "ndk;27.0.11718014" "platform-tools" && \
sudo npm install -g eas-cli && \
echo "✓ Setup complete! Navigate to /mnt/d/audit_Checklists-app/mobile and run: npm install && npx eas build --platform android --profile preview --local --output app-preview.apk"
```

---

## Alternative: Use GitHub Actions (No WSL Required)

If WSL setup is too complex, simply use the GitHub Actions workflow:

1. Go to your repo → **Actions** tab
2. Select **"Build Android Release APK"** workflow
3. Click **"Run workflow"** → confirm
4. Wait for completion (~10-15 minutes)
5. Download `app-release.apk` from Artifacts

This bypasses local setup entirely.

---

## References
- [WSL Official Docs](https://learn.microsoft.com/en-us/windows/wsl/)
- [Android SDK Setup](https://developer.android.com/studio/command-line/sdkmanager)
- [EAS Build Docs](https://docs.expo.dev/build/setup/)
- [Java JDK Installation](https://openjdk.org/)
