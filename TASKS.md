# DejaView - Development Tasks

## Phase 1: Infrastructure Setup

### 1.1 Supabase Configuration
- [ ] Create Supabase project
- [ ] Enable Google OAuth provider in Auth settings
- [ ] Add redirect URL: `https://<EXTENSION_ID>.chromiumapp.org/`
- [ ] Create `closet_items` table with schema
- [ ] Create indexes: `idx_closet_user_date`
- [ ] Enable RLS on `closet_items` table
- [ ] Create RLS policies (SELECT, INSERT, DELETE)
- [ ] Create `user_photos` storage bucket
- [ ] Enable RLS on storage bucket
- [ ] Configure storage bucket policies (user can only access own folder)

### 1.2 Google Cloud Platform
- [ ] Create GCP project
- [ ] Enable Vertex AI API
- [ ] Enable Generative Language API (Gemini)
- [ ] Create OAuth 2.0 credentials
- [ ] Add authorized redirect URI: `https://<EXTENSION_ID>.chromiumapp.org/`
- [ ] Generate API keys for Gemini and Vertex AI
- [ ] Set up service account for Vercel backend access

### 1.3 Vercel Setup
- [ ] Create Vercel project
- [ ] Configure environment variables (SUPABASE_URL, SUPABASE_SERVICE_KEY, etc.)
- [ ] Set `maxDuration: 60` in `vercel.json` for AI endpoints
- [ ] Configure CORS headers for Chrome extension origin

---

## Phase 2: Chrome Extension Core

### 2.1 Project Scaffolding
- [ ] Initialize React + Vite project
- [ ] Configure Vite for Chrome extension build
- [ ] Create `manifest.json` (Manifest V3)
- [ ] Add required permissions: `identity`, `storage`, `sidePanel`, `activeTab`
- [ ] Add host permissions: `https://*/*`
- [ ] Configure content scripts for all URLs
- [ ] Configure service worker (background.js)

### 2.2 Content Script: Passive Gaze Tracker
- [ ] Implement IntersectionObserver for image detection
- [ ] Add active tab check: `if (!document.hidden)`
- [ ] Set time threshold: 2000ms visibility
- [ ] Set size threshold: >200px width/height
- [ ] Implement high-res URL extraction:
  - [ ] Check `data-zoom-image` attribute
  - [ ] Parse `srcset` for largest image
  - [ ] Fallback to `src`
- [ ] Extract metadata:
  - [ ] Product title (og:title, h1)
  - [ ] Price (currency symbols, patterns)
  - [ ] Brand (domain, meta tags)
- [ ] Implement debounce logic (3 items OR 5s idle)
- [ ] Message background script with batched items

### 2.3 Content Script: Buying Intent Scorer
- [ ] Detect `og:type="product"` meta tag (+5 points)
- [ ] Detect "Add to Cart" button (+2 points)
- [ ] Detect currency symbols near large text (+1 point)
- [ ] Detect size selector elements (+2 points)
- [ ] Calculate total score
- [ ] Trigger Side Panel if score > 3:
  - [ ] Send message to background script
  - [ ] Include current product metadata

### 2.4 Service Worker: Sync Manager
- [ ] Listen for messages from content scripts
- [ ] Implement Supabase client initialization
- [ ] Handle batch writes to `closet_items` table
- [ ] Implement error handling and retry logic
- [ ] Handle Side Panel open/close commands
- [ ] Manage chrome.sidePanel API

---

## Phase 3: Side Panel UI

### 3.1 Authentication
- [ ] Create Sign In page component
- [ ] Implement `chrome.identity.launchWebAuthFlow`
- [ ] Parse OAuth redirect URL for tokens
- [ ] Initialize Supabase session
- [ ] Store auth state in React context
- [ ] Handle auth errors (redirect URI mismatch)

### 3.2 Mirror Tab (Home)
- [ ] Display current product from active tab
- [ ] Fetch user reference photo from Supabase Storage
- [ ] Display user photo placeholder if not uploaded
- [ ] Show "Upload Reference Photo" button
- [ ] Implement file upload to Supabase Storage
- [ ] Display loading state during AI processing
- [ ] Show skeleton loader for recommendations

### 3.3 Closet Tab (History)
- [ ] Query latest 200 items from Supabase
- [ ] Display items in responsive grid
- [ ] Add `referrerPolicy="no-referrer"` to all images
- [ ] Implement infinite scroll or pagination
- [ ] Show timestamp for each item
- [ ] Add item metadata (title, price, brand)
- [ ] Handle empty state ("No items yet")

### 3.4 Settings Tab
- [ ] Display current user email
- [ ] Sign Out button
- [ ] Upload Reference Photo:
  - [ ] File input (accept: image/*)
  - [ ] Preview uploaded image
  - [ ] Upload to Supabase Storage (`{user_id}/reference.jpg`)
  - [ ] Overwrite existing photo
- [ ] Privacy Controls:
  - [ ] Incognito Mode toggle (pauses sync)
  - [ ] Persist toggle state in chrome.storage.local
- [ ] Purge Memory button:
  - [ ] Confirmation dialog
  - [ ] Delete all rows in `closet_items` for user
  - [ ] Delete user photo from storage
  - [ ] Clear local cache

### 3.5 AI Recommendation UI
- [ ] Display recommended match card
- [ ] Show Gemini reasoning text (purple-black color)
- [ ] "Try On" button (GenAI purple accent)
- [ ] Handle click → trigger visualization API
- [ ] Display generated composite image
- [ ] Implement polling for long-running jobs
- [ ] Show progress indicator during generation
- [ ] Handle API errors gracefully

---

## Phase 4: Vercel API Functions

### 4.1 POST `/api/ai/recommend`
- [ ] Parse request body: currentItem, historyItems, userId
- [ ] Initialize Gemini 3 Pro client
- [ ] Construct prompt:
  ```
  Review these 200 items. Return the ONE item ID that best matches
  the style of the current item. Respond in JSON only: {"matchedItemId": "...", "reasoning": "..."}
  If no good match, return {"matchedItemId": null, "reasoning": "..."}.
  ```
- [ ] Send request to Gemini API
- [ ] Parse JSON response (strip markdown fences if present)
- [ ] Return matched item + reasoning
- [ ] Handle errors (timeout, invalid response)

### 4.2 POST `/api/ai/visualize`
- [ ] Parse request body: userPhotoUrl, items[]
- [ ] Download user photo from Supabase Storage
- [ ] Download item images
- [ ] Initialize Vertex AI Imagen 3 client
- [ ] Construct prompt:
  ```
  Generate a photorealistic composite image of this person wearing:
  - Item 1: [description]
  - Item 2: [description]
  Maintain realistic proportions and lighting.
  ```
- [ ] Send generation request
- [ ] Return job ID immediately (don't block)
- [ ] Store job status in temporary storage (Redis/Supabase)

### 4.3 GET `/api/ai/visualize/:jobId`
- [ ] Query job status from storage
- [ ] If complete, return image URL
- [ ] If processing, return status
- [ ] If failed, return error message
- [ ] Handle timeout (>60s)

---

## Phase 5: Testing & Quality Assurance

### 5.1 Extension Testing
- [ ] Test on major e-commerce sites:
  - [ ] Zara.com
  - [ ] Uniqlo.com
  - [ ] ASOS.com
  - [ ] H&M.com
- [ ] Verify gaze tracking accuracy (2s threshold)
- [ ] Test debounce logic (rapid browsing)
- [ ] Verify image hotlink protection fix
- [ ] Test buying intent scoring on various layouts
- [ ] Verify Side Panel only opens on product pages

### 5.2 Authentication Testing
- [ ] Test Google OAuth flow
- [ ] Verify redirect URI handling
- [ ] Test session persistence across browser restarts
- [ ] Test sign out functionality
- [ ] Verify RLS policies (user cannot access others' data)

### 5.3 AI Functionality Testing
- [ ] Test Gemini recommendations with varied datasets:
  - [ ] Matching items (should return valid ID)
  - [ ] Mismatched items (should return null)
  - [ ] 200-item context window
- [ ] Test Imagen 3 visualization:
  - [ ] Single outfit item
  - [ ] Multiple items (jacket + jeans)
  - [ ] Handle generation timeout
- [ ] Verify polling mechanism works
- [ ] Test error states (API failures)

### 5.4 Performance Testing
- [ ] Measure Supabase query time (200 items)
- [ ] Measure Gemini response time (optimize prompt)
- [ ] Measure Imagen generation time
- [ ] Test with 10,000+ items in database
- [ ] Verify debounce reduces database writes
- [ ] Test Service Worker doesn't sleep during operations

---

## Phase 6: Edge Cases & Error Handling

### 6.1 Network Failures
- [ ] Handle offline state gracefully
- [ ] Queue writes when offline, sync when back online
- [ ] Show error toast for failed API calls
- [ ] Implement retry logic (exponential backoff)

### 6.2 Data Edge Cases
- [ ] Handle products without images
- [ ] Handle products without prices
- [ ] Handle international currencies
- [ ] Handle products with multiple color variants
- [ ] Handle out-of-stock items

### 6.3 Browser Compatibility
- [ ] Test on Chrome stable
- [ ] Test on Chrome Beta
- [ ] Verify Manifest V3 compatibility
- [ ] Test on different screen sizes (Side Panel width)

---

## Phase 7: Deployment

### 7.1 Extension Build
- [ ] Run production build: `npm run build`
- [ ] Generate extension ID (consistent for OAuth)
- [ ] Update all hardcoded extension IDs in configs
- [ ] Create ZIP file for Chrome Web Store

### 7.2 Chrome Web Store Submission
- [ ] Create developer account
- [ ] Prepare store listing:
  - [ ] Screenshots (Side Panel, features)
  - [ ] Promotional images
  - [ ] Description
- [ ] Submit for review
- [ ] Address review feedback

### 7.3 Production Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Monitor Supabase usage/limits
- [ ] Monitor Vercel function invocations
- [ ] Monitor Vertex AI API quotas
- [ ] Set up usage alerts

---

## Phase 8: Post-Launch Optimization

### 8.1 User Feedback
- [ ] Add feedback mechanism in Settings
- [ ] Track common error patterns
- [ ] Identify poorly matched recommendations
- [ ] Survey users on feature requests

### 8.2 AI Prompt Refinement
- [ ] A/B test different Gemini prompts
- [ ] Optimize for speed (reduce reasoning tokens)
- [ ] Improve matching accuracy based on feedback
- [ ] Test with different model versions

### 8.3 Performance Improvements
- [ ] Implement caching for repeated recommendations
- [ ] Optimize image compression for storage
- [ ] Reduce API call frequency where possible
- [ ] Implement progressive image loading
