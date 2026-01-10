import { execSync } from 'child_process';

// Check if running in Vercel environment
if (process.env.VERCEL) {
    console.log(' [DejaVista] Detected Vercel environment.');
    console.log(' [DejaVista] Skipping Chrome Extension build (only API is needed).');
    process.exit(0);
}

// Run the normal local build
console.log(' [DejaVista] Starting local Chrome Extension build...');
try {
    // Execute the original build command: vite build && node build-extension.js
    // stdio: 'inherit' ensures we see the output and colors
    execSync('vite build && node build-extension.js', { stdio: 'inherit' });
} catch (error) {
    console.error(' [DejaVista] Build failed.');
    process.exit(1);
}
