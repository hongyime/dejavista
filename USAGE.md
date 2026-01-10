# DejaView Extension - User Guide

## Getting Started

### 1. First Time Setup

1. **Build and load the extension** (see [CHROME_EXTENSION_LOADING.md](./CHROME_EXTENSION_LOADING.md))
2. **Open the side panel** by clicking the extension icon in Chrome's toolbar
3. **Sign in with Google** - You'll be prompted to authenticate
4. **Upload a reference photo** in Settings (optional but recommended for virtual try-on)

### 2. Opening the Side Panel

- Click the **DejaView extension icon** in Chrome's toolbar
- Or the side panel may **auto-open** when you visit a product page (if buying intent is detected)

---

## How It Works

### Passive Tracking (Automatic)

The extension **automatically tracks** clothing items you view while browsing:

- **When browsing category pages** (e.g., browsing dresses on zara.com)
- **When viewing items for 2+ seconds** in the viewport
- **Items are saved to your "Closet"** automatically
- **No action required** - it works in the background

### Buying Intent Detection

When you visit a **product page**, the extension detects:
- Product metadata (og:type="product")
- "Add to Cart" buttons
- Price information
- Size selectors

If detected, the side panel may **pulse or auto-open** to show recommendations.

---

## Using the Tabs

### 🪞 Mirror Tab (Home)

**Purpose:** See AI recommendations for the current product page

**What you'll see:**
- Your reference photo (if uploaded)
- Current product you're viewing
- **AI recommendation** - A matching item from your browsing history
- **AI reasoning** - Why this item matches (purple text)
- **"Try On" button** - Visualize the outfit (coming soon)

**How to use:**
1. Navigate to a product page on any fashion website
2. Open the side panel (Mirror tab)
3. Wait a few seconds for AI to analyze your history
4. See the recommended matching item with reasoning

**Note:** If you see "Navigate to a product page to see recommendations", make sure you're on an actual product page (not a category or homepage).

---

### 📦 Closet Tab

**Purpose:** Browse all items you've viewed

**What you'll see:**
- **Grid view** of all items you've browsed
- Items sorted by most recent first
- Product images, titles, and prices
- Up to 200 most recent items

**How to use:**
1. Click the **"Closet"** tab
2. Scroll through your browsing history
3. Items are automatically added as you browse fashion sites

**Tips:**
- Items are tracked automatically - no need to save manually
- Only items viewed for 2+ seconds are saved
- Items must be >200px in size to be tracked

---

### ⚙️ Settings Tab

**Purpose:** Manage your account and privacy

#### Account Section
- View your email
- Sign out

#### Reference Photo Section
- **Upload a photo** of yourself for virtual try-on
- **Change photo** anytime
- Photo is stored securely in Supabase Storage

**How to upload:**
1. Click **"Upload Photo"** or **"Change Photo"**
2. Select an image file
3. Wait for upload to complete

#### Privacy Section

**Incognito Mode Toggle:**
- **ON:** Pauses all syncing - no items will be saved while browsing
- **OFF:** Normal operation - items are tracked and saved
- Useful when browsing private or sensitive content

#### Data Section

**Purge Memory:**
- **Deletes ALL your data:**
  - All browsing history (closet items)
  - Your reference photo
  - Local cache
- **Cannot be undone** - use with caution
- You'll be asked to confirm before deletion

---

## Typical Workflow

### Scenario 1: Shopping for an Outfit

1. **Browse category pages** (e.g., "Dresses" on zara.com)
   - Extension automatically saves items you view
   - No action needed - just browse normally

2. **Click on a product** you're interested in
   - Side panel may auto-open
   - Or click the extension icon to open it

3. **View AI recommendation** in Mirror tab
   - See which item from your history matches
   - Read the AI reasoning
   - Click "Try On" to visualize (when available)

4. **Check your Closet** tab
   - See all items you've browsed
   - Find items you liked earlier

### Scenario 2: Private Browsing

1. **Open Settings tab**
2. **Toggle "Incognito Mode" ON**
3. **Browse normally** - nothing will be saved
4. **Toggle OFF** when done to resume tracking

---

## Tips & Best Practices

### For Best Recommendations

1. **Browse extensively** - More history = better matches
2. **Upload a reference photo** - Enables virtual try-on feature
3. **Browse similar styles** - AI works best with consistent style preferences

### Privacy

- Use **Incognito Mode** when browsing sensitive content
- **Purge Memory** regularly if you want to start fresh
- Your data is **private** - only you can see your items (RLS enabled)

### Troubleshooting

**No recommendations showing:**
- Make sure you're on a product page (not category/homepage)
- Check that you have browsing history (visit Closet tab)
- Wait a few seconds for AI to process

**Items not being saved:**
- Check that Incognito Mode is OFF
- Make sure you're viewing items for 2+ seconds
- Items must be >200px in size

**Side panel not opening:**
- Click the extension icon manually
- Check browser console for errors
- Reload the extension if needed

---

## Features Overview

✅ **Automatic tracking** - No manual saving needed  
✅ **AI recommendations** - Gemini 3 Pro finds matching items  
✅ **Browsing history** - See everything you've viewed  
✅ **Privacy controls** - Incognito mode and data purge  
✅ **Virtual try-on** - Coming soon (Vertex AI Imagen 3)  
✅ **Secure storage** - All data encrypted and private  

---

## Need Help?

- Check [SETUP.md](./SETUP.md) for setup issues
- Check [CHROME_EXTENSION_LOADING.md](./CHROME_EXTENSION_LOADING.md) for loading issues
- Check browser console for errors (Right-click side panel → Inspect)
