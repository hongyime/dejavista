# Chrome Extension Loading Guide

## Building the Extension

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file** with your API keys (see SETUP.md)

3. **Build the extension:**
   ```bash
   npm run build
   ```

   This will:
   - Compile React components
   - Bundle all JavaScript files
   - Copy manifest.json to `dist/`
   - Copy icons to `dist/icons/` (if they exist)

## Loading in Chrome

1. Open Chrome and go to `chrome://extensions/`

2. **Enable Developer mode** (toggle in top right)

3. Click **"Load unpacked"**

4. Select the `dist` folder (not `src`)

5. The extension should load without errors

## Troubleshooting

### "Manifest file is missing or unreadable"
- Make sure you're selecting the `dist` folder, not `src`
- Run `npm run build` first
- Check that `dist/manifest.json` exists

### "Service worker registration failed"
- Check the browser console (click "service worker" link in extension details)
- Look for import errors - make sure all files are built correctly
- Verify environment variables are set in `.env`

### "Side panel not opening"
- Check that `dist/sidepanel.html` exists
- Verify manifest has correct path: `"default_path": "sidepanel.html"`
- Check browser console for JavaScript errors

### "Icons not showing"
- Icons are optional - extension will work with default Chrome icon
- To add icons: see `ICONS.md` for instructions
- Icons should be in `dist/icons/` after build

### "Content scripts not running"
- Check that content scripts are in `dist/content/`
- Verify manifest has correct paths
- Check browser console on a webpage for errors

### Common Build Issues

**"Cannot find module" errors:**
- Run `npm install` to ensure all dependencies are installed
- Check that `node_modules` exists

**Environment variables not loading:**
- Make sure `.env` file exists in project root
- Variables must start with `VITE_` to be included in build
- Rebuild after changing `.env` file

## File Structure After Build

```
dist/
├── manifest.json
├── sidepanel.html
├── sidepanel/
│   └── sidepanel.js
├── background/
│   └── background.js
├── content/
│   ├── gaze-tracker.js
│   └── intent-scorer.js
└── icons/ (optional)
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Development Mode

For development, you can use:
```bash
npm run dev
```

However, Chrome extensions typically need to be built and reloaded manually. The dev server is mainly for testing React components in isolation.

## Reloading After Changes

After making code changes:
1. Run `npm run build`
2. Go to `chrome://extensions/`
3. Click the refresh icon on your extension card
4. Or click "Remove" and "Load unpacked" again

## Checking for Errors

1. **Extension errors:** Click "Errors" button on extension card
2. **Service worker:** Click "service worker" link to see background script console
3. **Side panel:** Right-click side panel → Inspect
4. **Content scripts:** Open DevTools on any webpage → Console tab
