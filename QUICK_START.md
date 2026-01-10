# Quick Start Guide

## What You Need to Set Up

### Required API Keys & Services:

1. **Supabase** (Database & Storage)
   - Project URL → `VITE_SUPABASE_URL`
   - Anon Key → `VITE_SUPABASE_ANON_KEY`
   - Service Role Key → `SUPABASE_SERVICE_KEY` (for Vercel)

2. **Google Cloud Platform** (OAuth & AI)
   - OAuth 2.0 Client ID → Update in `src/manifest.json`
   - Gemini API Key → `GEMINI_API_KEY` (for Vercel)
   - Project ID → `GOOGLE_CLOUD_PROJECT_ID` (for Vercel)
   - Location → `VERTEX_AI_LOCATION` (for Vercel, e.g., `us-central1`)

3. **Vercel** (API Functions)
   - Deploy the `vercel/` folder
   - Set all environment variables in Vercel dashboard

## Step-by-Step:

1. **Copy `.env.example` to `.env`** and fill in your keys:
   ```bash
   cp .env.example .env
   ```

2. **Follow [SETUP.md](./SETUP.md)** for detailed instructions on:
   - Creating Supabase project and tables
   - Setting up Google Cloud OAuth and APIs
   - Deploying to Vercel

3. **Install and build:**
   ```bash
   npm install
   npm run build
   ```

4. **Load extension in Chrome:**
   - Go to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the `dist` folder

5. **Get your Extension ID** and update redirect URLs:
   - After loading, copy your extension ID
   - Update redirect URLs in Supabase and Google Cloud:
     `https://<YOUR_EXTENSION_ID>.chromiumapp.org/`

## Important Notes:

- **Never commit** `.env` file to Git
- **Service Role Key** should ONLY be in Vercel, never in the extension
- Extension ID is needed for OAuth redirect URLs
- Make sure all APIs are enabled in Google Cloud Console

For complete setup instructions, see [SETUP.md](./SETUP.md).
