# Local Git Hooks Setup (Optional)

Use this to enforce release safeguards automatically before every push.

---

## What this enables

The `.githooks/pre-push` hook runs:

- `node scripts/check-expo-config-parity.js`
- `node scripts/check-release-type.js`

This blocks pushes when mobile-impact changes are present and release type is missing/invalid.

---

## One-time setup

Run from repo root:

```bash
git config core.hooksPath .githooks
```

Or use npm script:

```bash
npm run hooks:install
```

Run full diagnostics:

```bash
npm run hooks:doctor
```

---

## Daily usage

### If your changes require APK release

PowerShell:

```powershell
$env:RELEASE_TYPE='APK'
git push
```

bash:

```bash
RELEASE_TYPE=APK git push
```

### If your changes are OTA-safe

PowerShell:

```powershell
$env:RELEASE_TYPE='OTA'
git push
```

bash:

```bash
RELEASE_TYPE=OTA git push
```

---

## Optional bypass (not recommended)

Use only for emergency/debug situations:

PowerShell:

```powershell
$env:SKIP_RELEASE_GUARD='1'
git push
```

bash:

```bash
SKIP_RELEASE_GUARD=1 git push
```

---

## Validation

To confirm hook path is active:

```bash
git config --get core.hooksPath
```

Expected output:

```text
.githooks
```

---

## Troubleshooting

### Hook not running

- Re-run: `git config core.hooksPath .githooks`
- Verify the file exists: `.githooks/pre-push`

### Permission issue on macOS/Linux

```bash
chmod +x .githooks/pre-push
```

### Push blocked due to missing release type

Provide `RELEASE_TYPE=APK` or `RELEASE_TYPE=OTA` and push again.
