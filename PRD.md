# PRD: dejavista (DejaVista — Original Version)

## Overview
The original version of DejaVista — a Chrome extension that passively tracks clothing items browsed on fashion sites and uses Google GenAI to suggest outfit combinations. Stores data in Supabase. Includes Vercel serverless API for AI calls and a virtual try-on endpoint. This version preceded dejavistaa.

## Goals
- Passively track clothing items on fashion websites via Chrome content script
- Store items in Supabase (image URL, title, price, brand, category)
- Provide AI outfit recommendations via Vercel serverless API → Google GenAI
- Simulate virtual try-on via GenAI image generation
- Privacy controls: incognito toggle + purge

## Non-Goals
- True AR try-on
- Multi-browser support (Chrome only)
- Backend-heavy processing (serverless only)

## Tech Stack
- **Runtime**: Chrome Extension (Manifest V3)
- **Language**: TypeScript / React
- **Build**: Vite + `vite-plugin-web-extension`
- **AI**: Google GenAI, Google Generative AI
- **Database**: Supabase (PostgreSQL + Storage + Auth)
- **API**: Vercel serverless functions (Node.js)
- **Deployment**: Chrome extension (dist/) + Vercel

## Architecture
```
dejavista/
├── index.html            # Extension popup entry
├── build-extension.js    # Chrome extension packager
├── build-wrapper.js      # Build orchestration
├── api/                  # Vercel serverless functions
│   ├── ai/recommend.js   # Outfit recommendation endpoint
│   └── ai/tryon.js       # Virtual try-on endpoint
├── database/             # Supabase schema/migrations
├── dist/                 # Built extension
├── API.md                # Full API documentation
├── BASE.md               # Project architecture notes
└── ENV_SETUP.md          # Environment variable guide
```

## API Endpoints (Vercel)

### POST `/api/ai/recommend`
- **Input**: `currentItem` + `historyItems[]` (browsed fashion items)
- **Output**: AI-generated outfit combinations from closet history

### POST `/api/ai/tryon`
- **Input**: user reference photo + selected outfit items
- **Output**: GenAI-generated try-on image (simulated)

Full documentation: [API.md](API.md)

## Data / Config
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_VERCEL_API_URL=
VITE_GOOGLE_AI_API_KEY= (or Vertex AI credentials)
```

## Deployment / Run
```bash
npm install
npm run build
# Load dist/ in Chrome developer mode
# Deploy api/ to Vercel separately
```

## Constraints & Notes
- **Predecessor to dejavistaa**: this is the v1 — dejavistaa contains updates and fixes (CHANGELOG.md documents differences)
- **Fashion site support**: content script must list target site URL patterns explicitly
- **GenAI costs**: each recommendation/try-on call uses paid Google AI API tokens
- **Supabase RLS**: configure Row Level Security — each user should only access their own closet data
