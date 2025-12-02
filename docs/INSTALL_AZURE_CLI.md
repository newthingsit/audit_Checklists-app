# 🔧 Install Azure CLI on Windows

## Method 1: MSI Installer (Recommended)

### Download Direct Link:
👉 **https://aka.ms/installazurecliwindows**

### Steps:
1. Download the MSI file
2. **Right-click** → **"Run as administrator"**
3. Follow the installer
4. **Restart your computer** after installation
5. Open **new PowerShell/Command Prompt**
6. Test: `az --version`

---

## Method 2: PowerShell Installation (Alternative)

If MSI fails, try PowerShell:

```powershell
# Run PowerShell as Administrator
Invoke-WebRequest -Uri https://aka.ms/installazurecliwindows -OutFile .\AzureCLI.msi
Start-Process msiexec.exe -Wait -ArgumentList '/I AzureCLI.msi /quiet'
```

---

## Method 3: Winget (Windows Package Manager)

If you have Windows 11 or Windows 10 with winget:

```powershell
winget install -e --id Microsoft.AzureCLI
```

---

## Method 4: Chocolatey (If Installed)

```powershell
choco install azure-cli
```

---

## Fix Error 2755

Error 2755 usually means:
- Installer file is corrupted
- Need administrator rights
- Antivirus blocking installation

### Solutions:
1. **Download fresh installer** from official link
2. **Run as Administrator** (right-click → Run as administrator)
3. **Temporarily disable antivirus**
4. **Clear temp files**: `%TEMP%` folder
5. **Try Method 2** (PowerShell) instead

---

## Verify Installation

After installation, **restart your terminal** and run:

```powershell
az --version
```

You should see Azure CLI version information.

---

## Login After Installation

```powershell
az login
```

This will open a browser for authentication.

---

**Try Method 1 first (MSI with Run as Administrator)!**


