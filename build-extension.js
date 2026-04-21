// Build script to copy manifest.json and icons to dist
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync, statSync, renameSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get OAuth client ID from environment (injected at build time)
const oauthClientId = process.env.VITE_OAUTH_CLIENT_ID || process.env.OAUTH_CLIENT_ID || '';

// Copy manifest.json to dist with OAuth client ID injection
const distDir = resolve(__dirname, 'dist');
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

const manifestPath = resolve(__dirname, 'src/manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

// Inject OAuth client ID from environment variable
if (oauthClientId) {
  if (!manifest.oauth2) {
    manifest.oauth2 = {};
  }
  manifest.oauth2.client_id = oauthClientId;
  console.log('✓ OAuth client ID injected from environment');
} else {
  console.log('⚠ VITE_OAUTH_CLIENT_ID not set - using placeholder from manifest.json');
}

// Warn if using placeholder
if (manifest.oauth2?.client_id?.includes('YOUR_') || manifest.oauth2?.client_id === '508630701048-i0fhpo2p6pelhfml6fdifo7rdtq72m5l.apps.googleusercontent.com') {
  console.warn('⚠ WARNING: Using placeholder OAuth client ID!');
  console.warn('  Set VITE_OAUTH_CLIENT_ID in your .env file');
  console.warn('  Get your ID from: Google Cloud Console > APIs & Services > Credentials');
}

writeFileSync(
  resolve(distDir, 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);

// Move sidepanel.html to root of dist (manifest expects it there)
const sidepanelHtmlSrc = resolve(distDir, 'src/sidepanel/sidepanel.html');
const sidepanelHtmlDest = resolve(distDir, 'sidepanel.html');
if (existsSync(sidepanelHtmlSrc)) {
  copyFileSync(sidepanelHtmlSrc, sidepanelHtmlDest);
  console.log('✓ sidepanel.html moved to dist/');
}

// Copy icons if they exist
const publicIconsDir = resolve(__dirname, 'public/icons');
const distIconsDir = resolve(distDir, 'icons');

if (existsSync(publicIconsDir)) {
  if (!existsSync(distIconsDir)) {
    mkdirSync(distIconsDir, { recursive: true });
  }
  
  const files = readdirSync(publicIconsDir);
  files.forEach(file => {
    if (file.endsWith('.png')) {
      copyFileSync(
        join(publicIconsDir, file),
        join(distIconsDir, file)
      );
    }
  });
  console.log('✓ Icons copied to dist/icons/');
} else {
  console.warn('⚠ Icons directory not found. Extension will work but may show default icon.');
  console.warn('  Create PNG files at: public/icons/icon16.png, icon32.png, icon48.png, icon128.png');
}

console.log('✓ Manifest copied to dist/');
