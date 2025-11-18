# 🎨 Color & UI Customization Guide

This guide shows you how to easily customize the colors and UI of your Audit Pro application.

## Quick Start

All colors are centralized in **`web/src/config/theme.js`**. Simply edit this file to change colors throughout the entire application!

## 📁 Theme Configuration File

Location: `web/src/config/theme.js`

This file contains all color settings, gradients, and UI styling options.

## 🎨 Changing Colors

### Primary Color (Main Accent)

The primary color is used for:
- Sidebar selected items
- Buttons
- Links
- Icons
- Top bar title
- User avatar

**To change it**, edit the `primary` section in `theme.js`:

```javascript
primary: {
  main: '#1976d2',      // Change this to your color
  light: '#42a5f5',     // Lighter shade
  dark: '#1565c0',      // Darker shade
},
```

### Pre-configured Color Schemes

The theme file includes commented-out alternative color schemes. To use one:

1. Comment out the current `primary` section
2. Uncomment the color scheme you want

**Available schemes:**
- **Purple Theme** - `#7b2cbf`
- **Green Theme** - `#2d6a4f`
- **Orange Theme** - `#f77f00`
- **Teal Theme** - `#06a77d`

### Background Colors

```javascript
background: {
  default: '#f5f7fa',   // Main page background
  paper: '#ffffff',      // Card/paper background
  sidebar: '#f8f9fa',    // Sidebar background
},
```

### Text Colors

```javascript
text: {
  primary: '#333333',   // Main text color
  secondary: '#666666',  // Secondary text
  disabled: '#999999',   // Disabled text
},
```

### Border Colors

```javascript
border: {
  default: '#e0e0e0',    // Default borders
  light: '#f0f0f0',      // Light borders
  dark: '#bdbdbd',      // Dark borders
},
```

## 🌈 Dashboard Card Gradients

The dashboard cards use beautiful gradients. Customize them:

```javascript
dashboardCards: {
  card1: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',  // Purple
  card2: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',  // Pink
  card3: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',  // Blue
  card4: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', // Green
},
```

**Gradient Ideas:**
- Ocean: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Sunset: `linear-gradient(135deg, #f093fb 0%, #f5576c 100%)`
- Sky: `linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)`
- Forest: `linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)`
- Fire: `linear-gradient(135deg, #fa709a 0%, #fee140 100%)`
- Ocean Blue: `linear-gradient(135deg, #30cfd0 0%, #330867 100%)`

## 🔐 Login/Register Page Gradient

Customize the authentication page background:

```javascript
auth: {
  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
},
```

## 📐 Border Radius

Control how rounded your UI elements are:

```javascript
borderRadius: {
  small: 4,      // Small elements
  medium: 8,     // Cards, buttons (default)
  large: 12,      // Large cards
  round: '50%',   // Circular elements
},
```

## 🎭 Shadows

Customize shadow effects:

```javascript
shadows: {
  small: '0 2px 4px rgba(0,0,0,0.1)',
  medium: '0 2px 8px rgba(0,0,0,0.1)',
  large: '0 4px 16px rgba(0,0,0,0.15)',
  card: '0 2px 8px rgba(0,0,0,0.1)',
  cardHover: '0 4px 16px rgba(0,0,0,0.15)',
},
```

## 🚀 Quick Color Change Examples

### Example 1: Change to Purple Theme

```javascript
primary: {
  main: '#7b2cbf',
  light: '#9d4edd',
  dark: '#5a189a',
},
```

### Example 2: Change to Green Theme

```javascript
primary: {
  main: '#2d6a4f',
  light: '#52b788',
  dark: '#1b4332',
},
```

### Example 3: Custom Brand Color

```javascript
primary: {
  main: '#YOUR_COLOR_HERE',      // Your brand color
  light: '#LIGHTER_SHADE',       // 20% lighter
  dark: '#DARKER_SHADE',         // 20% darker
},
```

**Tip:** Use online color tools to generate light/dark shades:
- [Coolors.co](https://coolors.co)
- [Material Design Color Tool](https://material.io/resources/color/)

## 🎯 Status Colors

These are used for success, warning, error, and info messages:

```javascript
success: {
  main: '#4caf50',
  light: '#81c784',
  dark: '#388e3c',
},
warning: {
  main: '#ff9800',
  light: '#ffb74d',
  dark: '#f57c00',
},
error: {
  main: '#f44336',
  light: '#e57373',
  dark: '#d32f2f',
},
```

## 📝 How Changes Apply

After editing `theme.js`:

1. **Save the file**
2. **The React app will automatically reload** (if running in development)
3. **All components will use the new colors** automatically

No need to restart the server! The changes apply immediately.

## 🔍 Where Colors Are Used

| Color Setting | Used In |
|--------------|---------|
| `primary.main` | Sidebar selected items, buttons, links, icons |
| `background.default` | Main page background |
| `background.sidebar` | Sidebar background |
| `text.primary` | Main text |
| `text.secondary` | Secondary text, icons |
| `border.default` | Card borders, dividers |
| `dashboardCards.*` | Dashboard stat cards |
| `auth.gradient` | Login/Register page background |

## 💡 Pro Tips

1. **Test in browser**: Use browser DevTools to preview colors before committing
2. **Accessibility**: Ensure sufficient contrast between text and backgrounds
3. **Consistency**: Stick to the color palette for a cohesive look
4. **Brand colors**: Use your brand's primary color as the `primary.main`
5. **Gradients**: Use subtle gradients for a modern, professional look

## 🎨 Color Palette Suggestions

### Professional Blue (Current)
- Primary: `#1976d2`
- Great for: Business, corporate, professional apps

### Modern Purple
- Primary: `#7b2cbf`
- Great for: Creative, modern, tech companies

### Natural Green
- Primary: `#2d6a4f`
- Great for: Environmental, health, wellness apps

### Energetic Orange
- Primary: `#f77f00`
- Great for: Food, hospitality, energetic brands

### Calm Teal
- Primary: `#06a77d`
- Great for: Healthcare, finance, calm interfaces

## 🐛 Troubleshooting

**Colors not updating?**
- Make sure you saved `theme.js`
- Check browser console for errors
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

**Need help?**
- Check `web/src/config/theme.js` for all available options
- All components import from this file automatically

---

**Happy Customizing! 🎨**

