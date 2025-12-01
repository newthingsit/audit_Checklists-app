/**
 * Icon Generator Script for Audit Pro
 * 
 * This script creates placeholder icons for development.
 * For production, use professional design tools or services.
 * 
 * Prerequisites:
 * npm install sharp
 * 
 * Usage:
 * node generate-icons.js
 */

const fs = require('fs');
const path = require('path');

const PRIMARY_COLOR = '#0d9488';
const BACKGROUND_COLOR = '#ffffff';

// SVG template for the app icon
const createIconSVG = (size, bgColor = BACKGROUND_COLOR) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${bgColor}"/>
  <circle cx="${size/2}" cy="${size/2 - size*0.05}" r="${size*0.3}" fill="${PRIMARY_COLOR}"/>
  <rect x="${size*0.35}" y="${size*0.55}" width="${size*0.3}" height="${size*0.25}" rx="${size*0.02}" fill="${PRIMARY_COLOR}"/>
  <text x="${size/2}" y="${size*0.48}" font-family="Arial, sans-serif" font-size="${size*0.15}" font-weight="bold" fill="white" text-anchor="middle">✓</text>
  <text x="${size/2}" y="${size*0.72}" font-family="Arial, sans-serif" font-size="${size*0.06}" font-weight="bold" fill="white" text-anchor="middle">AUDIT</text>
</svg>
`;

// SVG for splash screen
const createSplashSVG = (width, height) => `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${PRIMARY_COLOR}"/>
  <circle cx="${width/2}" cy="${height/2 - 100}" r="120" fill="white" opacity="0.2"/>
  <circle cx="${width/2}" cy="${height/2 - 100}" r="80" fill="white"/>
  <text x="${width/2}" y="${height/2 - 80}" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="${PRIMARY_COLOR}" text-anchor="middle">✓</text>
  <text x="${width/2}" y="${height/2 + 50}" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle">Audit Pro</text>
  <text x="${width/2}" y="${height/2 + 100}" font-family="Arial, sans-serif" font-size="20" fill="white" opacity="0.8" text-anchor="middle">Restaurant Audit Management</text>
</svg>
`;

// Notification icon (white on transparent)
const createNotificationSVG = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.4}" fill="white"/>
  <text x="${size/2}" y="${size*0.6}" font-family="Arial, sans-serif" font-size="${size*0.4}" font-weight="bold" fill="${PRIMARY_COLOR}" text-anchor="middle">✓</text>
</svg>
`;

async function generateIcons() {
  console.log('🎨 Generating app icons...\n');

  const icons = [
    { name: 'icon.png', size: 1024, svg: createIconSVG(1024) },
    { name: 'adaptive-icon.png', size: 1024, svg: createIconSVG(1024, 'transparent') },
    { name: 'notification-icon.png', size: 96, svg: createNotificationSVG(96) },
  ];

  for (const icon of icons) {
    try {
      await sharp(Buffer.from(icon.svg))
        .png()
        .toFile(path.join(__dirname, icon.name));
      console.log(`✅ Created ${icon.name} (${icon.size}x${icon.size})`);
    } catch (error) {
      console.error(`❌ Error creating ${icon.name}:`, error.message);
    }
  }

  // Create splash screen
  try {
    const splashSVG = createSplashSVG(1284, 2778);
    await sharp(Buffer.from(splashSVG))
      .png()
      .toFile(path.join(__dirname, 'splash.png'));
    console.log('✅ Created splash.png (1284x2778)');
  } catch (error) {
    console.error('❌ Error creating splash.png:', error.message);
  }

  console.log('\n🎉 Icon generation complete!');
  console.log('\n⚠️  Note: These are placeholder icons.');
  console.log('   For production, use professionally designed icons.');
}

function createSVGPlaceholders() {
  console.log('📝 Creating SVG placeholder files...\n');
  
  const files = [
    { name: 'icon.svg', content: createIconSVG(1024) },
    { name: 'adaptive-icon.svg', content: createIconSVG(1024, 'transparent') },
    { name: 'notification-icon.svg', content: createNotificationSVG(96) },
    { name: 'splash.svg', content: createSplashSVG(1284, 2778) },
  ];

  for (const file of files) {
    fs.writeFileSync(path.join(__dirname, file.name), file.content);
    console.log(`✅ Created ${file.name}`);
  }

  console.log('\n📌 To convert SVG to PNG:');
  console.log('   1. Install sharp: npm install sharp');
  console.log('   2. Run this script again');
  console.log('   OR use online tools like https://cloudconvert.com/svg-to-png');
}

// Check if sharp is installed and run appropriate generator
let sharp;
try {
  sharp = require('sharp');
  console.log('Sharp found, generating PNG icons...');
  generateIcons().catch(console.error);
} catch (e) {
  console.log('Sharp not installed. Creating SVG placeholders instead.');
  console.log('To generate PNG icons, run: npm install sharp\n');
  createSVGPlaceholders();
}

