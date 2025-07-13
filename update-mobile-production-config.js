#!/usr/bin/env node

/**
 * Mobile App Production Configuration Updater
 * 
 * This script updates mobile app configuration files with the production server URL
 * Run this after deployment to configure the mobile app for production
 */

import fs from 'fs';
import path from 'path';

// Get production URL from command line argument
const productionUrl = process.argv[2];

if (!productionUrl) {
  console.error('❌ Please provide production URL as argument');
  console.error('Usage: node update-mobile-production-config.js https://your-app.replit.app');
  process.exit(1);
}

// Validate URL format
try {
  new URL(productionUrl);
} catch (error) {
  console.error('❌ Invalid URL format:', productionUrl);
  process.exit(1);
}

console.log('🔧 Updating mobile app configuration for production...');
console.log('📱 Production URL:', productionUrl);

// Files to update
const configFiles = [
  {
    path: 'capacitor.config.ts',
    update: (content) => {
      // Add server URL configuration for production
      return content.replace(
        /server: \{[^}]*\}/s,
        `server: {
    androidScheme: 'https',
    url: '${productionUrl}'
  }`
      );
    }
  },
  {
    path: 'android/app/src/main/assets/capacitor.config.json',
    update: (content) => {
      const config = JSON.parse(content);
      config.server = {
        androidScheme: 'https',
        url: productionUrl
      };
      return JSON.stringify(config, null, '\t');
    }
  }
];

// Update each configuration file
let updatedFiles = 0;

for (const file of configFiles) {
  try {
    if (!fs.existsSync(file.path)) {
      console.warn(`⚠️  File not found: ${file.path}`);
      continue;
    }

    const content = fs.readFileSync(file.path, 'utf8');
    const updatedContent = file.update(content);
    
    fs.writeFileSync(file.path, updatedContent);
    console.log(`✅ Updated: ${file.path}`);
    updatedFiles++;
  } catch (error) {
    console.error(`❌ Error updating ${file.path}:`, error.message);
  }
}

// Update version for new mobile build
try {
  const variablesPath = 'android/variables.gradle';
  if (fs.existsSync(variablesPath)) {
    let content = fs.readFileSync(variablesPath, 'utf8');
    
    // Increment version code
    const currentVersion = content.match(/versionCode = (\d+)/);
    if (currentVersion) {
      const newVersion = parseInt(currentVersion[1]) + 1;
      content = content.replace(/versionCode = \d+/, `versionCode = ${newVersion}`);
      fs.writeFileSync(variablesPath, content);
      console.log(`📱 Updated mobile version to: ${newVersion}`);
    }
  }
} catch (error) {
  console.warn('⚠️  Could not update version:', error.message);
}

console.log('\n🎉 Mobile configuration updated successfully!');
console.log(`📱 Updated ${updatedFiles} configuration file(s)`);
console.log('\nNext steps:');
console.log('1. Commit and push changes to GitHub');
console.log('2. GitHub Actions will build new mobile app');
console.log('3. Download and test mobile app');
console.log('4. Upload to Google Play Console');

// Generate commit commands
console.log('\n📝 Suggested git commands:');
console.log(`git add .`);
console.log(`git commit -m "v${Date.now()}: Configure mobile app for production ${productionUrl}"`);
console.log(`git push origin main`);