# Icon Setup Instructions

The Chrome extension needs icons at different sizes. Here's how to create them:

## Option 1: Use the HTML Generator (Easiest)

1. Open `public/icons/create-icons.html` in your browser
2. Click the download buttons for each size
3. Save the files to `public/icons/`:
   - `icon16.png`
   - `icon32.png`
   - `icon48.png`
   - `icon128.png`

## Option 2: Use Online Tools

1. Use the SVG file at `public/icons/icon.svg`
2. Go to https://convertio.co/svg-png/ or similar
3. Convert to PNG at sizes: 16x16, 32x32, 48x48, 128x128
4. Save to `public/icons/`

## Option 3: Use ImageMagick (Command Line)

```bash
cd public/icons
convert -background none -resize 16x16 icon.svg icon16.png
convert -background none -resize 32x32 icon.svg icon32.png
convert -background none -resize 48x48 icon.svg icon48.png
convert -background none -resize 128x128 icon.svg icon128.png
```

## Temporary Solution

If you just want to test the extension without icons:
- The extension will work, but Chrome will show a default puzzle piece icon
- You can add icons later without breaking functionality

After creating the icons, run `npm run build` and they'll be copied to `dist/icons/` automatically.
