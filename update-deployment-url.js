#!/usr/bin/env node
// Script to update mobile app configuration with actual deployment URL

const fs = require('fs');
const path = require('path');

// Get deployment URL from command line argument
const deploymentUrl = process.argv[2];

if (!deploymentUrl) {
  console.error('Usage: node update-deployment-url.js <deployment-url>');
  console.error('Example: node update-deployment-url.js https://abc123.replit.app');
  process.exit(1);
}

// Validate URL format
if (!deploymentUrl.startsWith('https://') || !deploymentUrl.includes('.replit.app')) {
  console.error('Invalid URL format. Expected: https://xxx.replit.app');
  process.exit(1);
}

const configPath = path.join(__dirname, 'client', 'src', 'lib', 'config.ts');

try {
  // Read current config
  let config = fs.readFileSync(configPath, 'utf8');
  
  // Replace placeholder with actual URL
  config = config.replace(/DEPLOYMENT_URL_PLACEHOLDER/g, deploymentUrl);
  
  // Write updated config
  fs.writeFileSync(configPath, config);
  
  console.log(`✅ Updated mobile app configuration with deployment URL: ${deploymentUrl}`);
  console.log('📱 Mobile app will now connect to the correct server');
  
} catch (error) {
  console.error('❌ Error updating configuration:', error.message);
  process.exit(1);
}