# 📱 Mobile App Assets

This folder contains the app icons and splash screens for the Audit Pro mobile app.

## Required Assets

| File | Size | Description |
|------|------|-------------|
| `icon.png` | 1024x1024 | Main app icon |
| `splash.png` | 1284x2778 | Splash/loading screen |
| `adaptive-icon.png` | 1024x1024 | Android adaptive icon foreground |
| `notification-icon.png` | 96x96 | Android notification icon (white on transparent) |

## Color Scheme
- Primary: `#0d9488` (Teal)
- Background: `#ffffff` (White)

## Generate Icons

### Option 1: Online Tools
1. **App Icon Generator**: https://appicon.co/
2. **Expo Icon Builder**: https://buildicon.netlify.app/
3. **Canva**: https://www.canva.com/

### Option 2: From SVG
Use the `generate-icons.js` script in this folder to generate PNG icons from SVG.

```bash
cd mobile/assets
node generate-icons.js
```

## Design Guidelines

### iOS App Icon
- No transparency
- No rounded corners (iOS adds them automatically)
- Simple, recognizable design

### Android Adaptive Icon
- Foreground image on transparent background
- Safe zone: center 66% of the image
- Background color set in app.json

### Notification Icon
- White silhouette on transparent background
- 96x96 pixels
- Simple shapes only

