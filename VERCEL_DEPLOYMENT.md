# Vercel Deployment Guide

## Common Deployment Issues & Solutions

### Issue 1: Functions Not Found

**Problem:** Vercel can't find your API functions

**Solution:** 
- API functions must be in the `api/` directory (not `ai/` or `vercel/api/`)
- Structure should be: `api/ai/recommend.js` and `api/ai/visualize.js`
- The `vercel.json` file should reference `api/ai/*.js`

### Issue 2: Environment Variables Not Set

**Problem:** Functions fail with "undefined" environment variables

**Solution:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_role_key
   GOOGLE_CLOUD_PROJECT_ID=your_gcp_project_id
   GEMINI_API_KEY=your_gemini_api_key
   VERTEX_AI_LOCATION=us-central1
   ```
3. **Important:** After adding variables, redeploy your project

### Issue 3: CORS Errors

**Problem:** Chrome extension can't call Vercel API due to CORS

**Solution:**
- The `vercel.json` already has CORS headers configured
- Make sure your functions handle OPTIONS requests:
  ```javascript
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  ```

### Issue 4: Function Timeout

**Problem:** AI functions timeout after 10 seconds

**Solution:**
- `vercel.json` already sets `maxDuration: 60` for AI endpoints
- Make sure the path matches: `api/ai/*.js`

### Issue 5: Module Not Found Errors

**Problem:** `@supabase/supabase-js` or `@google-cloud/vertexai` not found

**Solution:**
1. Make sure `package.json` includes these dependencies:
   ```json
   {
     "dependencies": {
       "@supabase/supabase-js": "^2.39.0",
       "@google-cloud/vertexai": "^1.0.0"
     }
   }
   ```
2. Vercel will automatically install dependencies during deployment

### Issue 6: Wrong Function Format

**Problem:** Functions don't export correctly

**Solution:**
- Vercel uses Next.js API route format
- Export default async function: `export default async function handler(req, res)`
- This is already correct in the provided functions

## Deployment Steps

### Option 1: Deploy via Git (Recommended)

1. **Push your code to GitHub/GitLab/Bitbucket**
2. **Import project in Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New" → "Project"
   - Import your Git repository
3. **Configure settings:**
   - Root Directory: Leave as default (or set if needed)
   - Framework Preset: "Other" (or "Vite" if available)
   - Build Command: `npm run build` (optional, only if you want to build extension)
   - Output Directory: Leave empty (Vercel will serve API functions)
4. **Add environment variables** (see Issue 2 above)
5. **Deploy**

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Add environment variables:**
   ```bash
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_SERVICE_KEY
   vercel env add GOOGLE_CLOUD_PROJECT_ID
   vercel env add GEMINI_API_KEY
   vercel env add VERTEX_AI_LOCATION
   ```

5. **Redeploy:**
   ```bash
   vercel --prod
   ```

## Project Structure for Vercel

```
your-project/
├── api/                    # Vercel API functions (REQUIRED)
│   └── ai/
│       ├── recommend.js
│       └── visualize.js
├── vercel.json             # Vercel configuration
├── package.json            # Dependencies
└── ... (other files)
```

**Important:** 
- The `api/` directory must be at the root of your project
- Vercel automatically detects and deploys functions in `api/`
- Don't put functions in `vercel/api/` - that won't work

## Testing Your Deployment

1. **Get your deployment URL** (e.g., `https://your-app.vercel.app`)

2. **Test the recommend endpoint:**
   ```bash
   curl -X POST https://your-app.vercel.app/api/ai/recommend \
     -H "Content-Type: application/json" \
     -d '{
       "currentItem": {"url": "test", "meta": {}},
       "historyItems": [],
       "userId": "test"
     }'
   ```

3. **Check Vercel logs:**
   - Go to Vercel Dashboard → Your Project → Functions
   - Click on a function to see logs
   - Check for errors

## Troubleshooting Checklist

- [ ] API functions are in `api/` directory (not `ai/` or `vercel/api/`)
- [ ] `vercel.json` exists and has correct configuration
- [ ] All environment variables are set in Vercel dashboard
- [ ] `package.json` includes required dependencies
- [ ] Functions export default async handler
- [ ] CORS headers are configured in `vercel.json`
- [ ] Functions handle OPTIONS requests
- [ ] Deployment URL is correct (check Vercel dashboard)

## Common Error Messages

**"Function not found"**
→ Check that functions are in `api/` directory

**"Environment variable not defined"**
→ Add variables in Vercel dashboard and redeploy

**"Module not found"**
→ Check `package.json` has dependencies, Vercel will install them

**"CORS policy blocked"**
→ Check `vercel.json` headers and OPTIONS handler in functions

**"Function timeout"**
→ Check `vercel.json` has `maxDuration: 60` for AI endpoints
