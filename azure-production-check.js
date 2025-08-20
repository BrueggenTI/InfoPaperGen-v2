#!/usr/bin/env node

/**
 * Azure Production Environment Check
 * Dieses Skript überprüft die Produktionsbereitschaft Ihrer Anwendung für Azure App Service
 */

import fs from 'fs';

console.log('🔍 Azure App Service Production Check\n');

// 1. Environment Variables Check
console.log('📋 Environment Variables:');
const requiredEnvVars = ['OPENAI_API_KEY', 'NODE_ENV'];
let envCheckPassed = true;

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`   ✅ ${envVar}: ${envVar.includes('KEY') ? '***REDACTED***' : value}`);
  } else {
    console.log(`   ❌ ${envVar}: MISSING`);
    envCheckPassed = false;
  }
});

// 2. File Structure Check
console.log('\n📁 File Structure Check:');
const requiredFiles = [
  'package.json',
  'startup.sh',
  'dist/index.js',
  '.github/workflows/main.yml'
];

let filesCheckPassed = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}: EXISTS`);
  } else {
    console.log(`   ❌ ${file}: MISSING`);
    filesCheckPassed = false;
  }
});

// 3. Package.json Check
console.log('\n📦 Package.json Check:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Check essential scripts
  const requiredScripts = ['start', 'build'];
  requiredScripts.forEach(script => {
    if (packageJson.scripts && packageJson.scripts[script]) {
      console.log(`   ✅ Script "${script}": ${packageJson.scripts[script]}`);
    } else {
      console.log(`   ❌ Script "${script}": MISSING`);
      filesCheckPassed = false;
    }
  });
  
  // Check essential dependencies
  const requiredDeps = ['openai', 'puppeteer', 'express'];
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`   ✅ Dependency "${dep}": ${packageJson.dependencies[dep]}`);
    } else {
      console.log(`   ❌ Dependency "${dep}": MISSING`);
      filesCheckPassed = false;
    }
  });
  
} catch (error) {
  console.log(`   ❌ Error reading package.json: ${error.message}`);
  filesCheckPassed = false;
}

// 4. Browser Check (für Puppeteer)
console.log('\n🌐 Browser Availability Check:');
const browserPaths = [
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome'
];

let browserFound = false;
browserPaths.forEach(path => {
  if (fs.existsSync(path)) {
    console.log(`   ✅ Browser found: ${path}`);
    browserFound = true;
  } else {
    console.log(`   ❌ Browser not found: ${path}`);
  }
});

if (!browserFound && process.env.NODE_ENV === 'production') {
  console.log('   ⚠️  No browser found. Startup script will install Chromium in Azure.');
}

// 5. Final Report
console.log('\n🎯 Production Readiness Report:');
const allChecksPassed = envCheckPassed && filesCheckPassed;

if (allChecksPassed) {
  console.log('   ✅ ALL CHECKS PASSED - Ready for Azure deployment!');
  console.log('\n📝 Next Steps:');
  console.log('   1. Commit and push to GitHub');
  console.log('   2. Configure Azure App Service with the deployment guide');
  console.log('   3. Set up GitHub Actions with publish profile');
  console.log('   4. Deploy and test your application');
} else {
  console.log('   ❌ SOME CHECKS FAILED - Please fix issues before deployment');
  console.log('\n🔧 Required Actions:');
  if (!envCheckPassed) {
    console.log('   - Set required environment variables');
  }
  if (!filesCheckPassed) {
    console.log('   - Ensure all required files exist');
    console.log('   - Run "npm run build" to create dist directory');
  }
}

console.log('\n📖 For detailed deployment instructions, see: azure-deployment-guide.md');

process.exit(allChecksPassed ? 0 : 1);