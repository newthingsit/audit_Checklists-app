# Quick Reference: Android APK Build Paths

*Last updated: January 28, 2026*

## **FASTEST: Use GitHub Actions (No Setup Required)**
✅ **Recommended** - Takes ~2 minutes of your time, ~10-15 min build time

1. Go to: https://github.com/YOUR_REPO/actions
2. Click: **"Build Android Release APK"** (or any Android workflow)
3. Click: **"Run workflow"** → Select **main** → **"Run workflow"**
4. Wait ~10-15 minutes
5. Download: **app-release.apk** from Artifacts
6. Done! No local setup, no restarts, no WSL

---

## **LOCAL BUILD: Use WSL2 + Android SDK (For Development)**
⏱️ **One-time setup** (~30 min), then fast iterative builds

### Prerequisites
- Windows 10 (build 19041+) or Windows 11
- ~20 GB free disk space
- Administrative access

### Step-by-Step:

#### **Phase 1: Enable WSL2 (requires 1 restart)**
```powershell
# Open PowerShell as Administrator (right-click → Run as Administrator)
# Navigate to project root
cd D:\audit_Checklists-app

# Run setup script
.\1_Enable-WSL2.ps1

# Script will prompt to restart - select 'y' and let it restart
```

**After restart:**
- Your computer restarts automatically
- WSL2 and Ubuntu are enabled

#### **Phase 2: Install Android SDK (~10 min)**
```bash
# Open WSL
wsl

# Navigate to project
cd /mnt/d/audit_Checklists-app

# Make script executable and run it
bash 2_Android-SDK-Setup.sh

# This installs:
# - Java 17
# - Node.js 18+
# - Android SDK (API 34, build-tools 34.0.0, NDK 27.0.11718014)
# - EAS CLI
```

#### **Phase 3: Build APK (first time ~5-10 min, subsequent builds ~2-3 min)**
```bash
# Still in WSL Ubuntu
cd /mnt/d/audit_Checklists-app/mobile

# Install dependencies (first time only)
npm install

# Build preview APK (debug)
npx eas build --platform android --profile preview --local --output app-preview.apk

# OR build release APK (production)
npx eas build --platform android --profile release --local --output app-release.apk
```

**APK Location:**
- `~/audit_Checklists-app/mobile/app-preview.apk` (inside WSL)
- Access from Windows: `\\wsl$\Ubuntu\home\<username>\audit_Checklists-app\mobile\app-preview.apk`
- Or copy to Windows: `cp app-preview.apk /mnt/c/Users/YOUR_USERNAME/Downloads/`

---

## **How to Choose**

| Method | Time | Setup | Best For |
|--------|------|-------|----------|
| **GitHub Actions** | 15 min (mostly waiting) | None | Getting APK NOW, CI/CD pipelines |
| **WSL2 Local** | 30 min setup + 5 min builds | One-time | Development, testing, fast iterations |
| **Cloud (Alternatives)** | 10-20 min | Account + creds | If WSL fails, use EAS managed build |

---

## **Troubleshooting**

### **PowerShell Script Issues**
```powershell
# If .ps1 won't run, try:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\1_Enable-WSL2.ps1
```

### **Bash Script Issues**
```bash
# If .sh won't execute in WSL:
chmod +x 2_Android-SDK-Setup.sh
bash 2_Android-SDK-Setup.sh
```

### **"node.exe is not recognized" when running `npm`/`npx`**
This means Node.js isn't installed (or isn't on your PATH) in the shell you're using.

**Fix (Windows):**
1. Install Node.js LTS
2. Close and re-open PowerShell
3. Verify:
```powershell
node -v
npm -v
npx -v
```

**Fix (WSL):** If you're following the WSL2 build path, run `npm`/`npx` commands inside WSL (the setup script installs Node there).

### **Node install fails with MSI 1603 / "Error 1714" / "System Error 1612"**
This usually means an older Node.js version is registered, but Windows Installer can't find the older `.msi` to uninstall it.

**Fix:**
1. Open the MSI log path shown by Chocolatey (it will mention the missing file name, e.g. `node-v22.16.0-x64.msi`).
2. Download that exact `.msi` and place it at the path the log is trying to use (often `C:\Users\<you>\Downloads\`).
3. Re-run `choco install nodejs-lts -y` (from an Administrator PowerShell).

### **"Java not found" during build**
```bash
# In WSL, verify Java:
java -version
# Should show: openjdk version "17.x.x"

# If missing, reinstall:
sudo apt install -y openjdk-17-jdk
```

### **"sdkmanager: command not found"**
```bash
# Verify environment variables:
echo $ANDROID_SDK_ROOT
# Should return: /home/USERNAME/android-sdk

# If not set, reload:
source ~/.bashrc
```

### **Build fails with gradle error**
```bash
# Clear gradle cache and retry:
cd /mnt/d/audit_Checklists-app/mobile
./gradlew clean
npx eas build --platform android --profile preview --local --output app-preview.apk
```

### **Disk space error**
```bash
# Check available space:
df -h

# Clean Docker/gradle cache:
./gradlew --stop
rm -rf ~/.gradle/caches
```

---

## **File Locations**

| File | Purpose |
|------|---------|
| `1_Enable-WSL2.ps1` | PowerShell script to enable WSL2 (run once, as admin) |
| `2_Android-SDK-Setup.sh` | Bash script to install SDK tools (run once in WSL) |
| `mobile/app-preview.apk` | Debug APK (after build completes) |
| `mobile/app-release.apk` | Production APK (after release build completes) |

---

## **Next Actions**

### **Now (5 minutes):**
Go to GitHub Actions and click "Run workflow" on the Android APK builder.

### **Later (when ready to develop locally):**
Run `1_Enable-WSL2.ps1`, restart, then run `2_Android-SDK-Setup.sh` in WSL.

---

**Questions?** Check the detailed [WSL_ANDROID_BUILD_SETUP.md](WSL_ANDROID_BUILD_SETUP.md) file for step-by-step guidance.
