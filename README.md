# DejaVista - AI Fashion Memory

Chrome Extension that passively tracks viewed clothing items and uses GenAI to recommend matching outfits from browsing history.

## 🚀 Quick Load (For Testers)

AI endpoints now require your signed-in session. Pull the current release and
rebuild/reload an existing unpacked extension so it sends that session:

1. Run `npm ci` and `npm run build` with your existing frontend configuration.
2. Open Chrome → `chrome://extensions/` and enable **Developer mode**.
3. Click **Reload** for an existing installation, or **Load unpacked** and select
   the `dist` folder for a new installation.
4. Sign in if prompted. Keep the extension ID stable to preserve OAuth redirects.

The Vercel deployment hosts the landing page and API; it cannot update an
already installed unpacked Chrome extension automatically.

## AI request protection

The server verifies Supabase access tokens and uses that identity for photo
access. Recommendations accept at most 40 history items, try-on accepts up to
four items, and photo validation supports JPEG, PNG and WebP up to 2 MiB. Requests
have a 25-second server budget and a 35-second client deadline. Provider transport
retries are disabled; a missing Gemini model permits one alias attempt. Capacity,
quota and timeout failures do not launch more paid generations or silently
approve an unvalidated photo. The existing reference-photo simulation remains
explicit when no image provider is configured.

Burst limits are 10 recommendations, 10 photo validations and five try-ons per
verified user per minute **per server instance**. They are not a global spending
cap. Aborting a request does not reverse provider work or charges already incurred.
No retention policy, database migration or new storage service is introduced.

Run `npm test` for synthetic Auth, Storage, image transport, SDK and client
regressions. Never use real user photos or paid generations as test fixtures.

---

## Features

- 🎯 **Passive Tracking:** Automatically tracks clothing items you view while browsing
- 🤖 **AI Recommendations:** Uses Gemini to find matching items from your history
- 👔 **Virtual Try-On:** Visualize outfits with Vertex AI Imagen
- 🔒 **Privacy First:** Full control over your data with incognito mode and purge options

## Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   - Copy `.env.example` to `.env`
   - Fill in your Supabase and Google Cloud credentials
   - **CRITICAL:** Ensure `GOOGLE_CLOUD_PROJECT_ID` and `GEMINI_API_KEY` are set for backend features.
     (See [ENV_SETUP.md](./ENV_SETUP.md) for full list)

3. **Build extension:**
   ```bash
   npm run build
   ```

4. **Load in Chrome:**
   - Go to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the `dist` folder

## Project Structure

```
├── src/
│   ├── manifest.json          # Chrome extension manifest
│   ├── sidepanel/             # React UI components
│   ├── content/               # Content scripts (gaze tracking)
│   └── background/            # Service worker
├── api/                       # Vercel serverless functions
│   └── ai/
│       ├── recommend.js       # Gemini recommendations
│       └── visualize/         # Imagen visualization
├── database/                  # SQL migrations for Supabase
├── public/                    # Static assets (icons, landing page)
└── .env.example               # Environment variables template
```

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Vercel Serverless Functions
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **Auth:** Supabase Auth + Google OAuth
- **AI:** Google AI Gemini 2.5 Flash (reasoning), Gemini 3.1 Flash Image Preview (image generation)

## Documentation

- [SETUP.md](./SETUP.md) - Full setup guide
- [STYLE.md](./STYLE.md) - Design system
- [BASE.md](./BASE.md) - Architecture overview
- [database/README.md](./database/README.md) - Database setup

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
