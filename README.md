# DejaView - AI Fashion Memory Extension

Chrome Extension that passively tracks viewed clothing items and uses GenAI to recommend matching outfits from browsing history.

## Features

- 🎯 **Passive Tracking:** Automatically tracks clothing items you view while browsing
- 🤖 **AI Recommendations:** Uses Gemini 3 Pro to find matching items from your history
- 👔 **Virtual Try-On:** Visualize outfits with Vertex AI Imagen 3
- 🔒 **Privacy First:** Full control over your data with incognito mode and purge options

## Quick Start

1. **Set up services** (see [SETUP.md](./SETUP.md) for detailed instructions):
   - Supabase (database & storage)
   - Google Cloud Platform (OAuth & AI services)
   - Vercel (API functions)

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   - Create `.env` file with your API keys (see SETUP.md)

4. **Build extension:**
   ```bash
   npm run build
   ```

5. **Load in Chrome:**
   - Go to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the `dist` folder

## Project Structure

```
├── src/
│   ├── manifest.json          # Chrome extension manifest
│   ├── sidepanel/             # React UI components
│   │   ├── App.jsx
│   │   ├── components/
│   │   └── contexts/
│   ├── content/               # Content scripts
│   │   ├── gaze-tracker.js
│   │   └── intent-scorer.js
│   └── background/            # Service worker
│       └── background.js
├── vercel/
│   └── api/                   # Serverless functions
│       └── ai/
│           ├── recommend.js
│           └── visualize.js
└── SETUP.md                   # Detailed setup guide
```

## Development

```bash
# Development mode
npm run dev

# Production build
npm run build
```

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Vercel Serverless Functions
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **Auth:** Supabase Auth + Google OAuth
- **AI:** Gemini 3 Pro, Vertex AI Imagen 3

## Documentation

- [SETUP.md](./SETUP.md) - Complete setup guide with all API keys
- [BASE.md](./dejaview/BASE.md) - Architecture and technical details
- [STYLE.md](./dejaview/STYLE.md) - Design system and styling guide
- [TASKS.md](./dejaview/TASKS.md) - Development task checklist

## License

MIT License - see [LICENSE](./dejaview/LICENSE) for details
