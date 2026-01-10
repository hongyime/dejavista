import { createClient } from '@supabase/supabase-js';

// Environment variables will be injected at build time via Vite
// For now, we'll get them from storage (set during extension setup)
let supabase = null;

async function initSupabase() {
  console.log('[DejaVista] Initializing Supabase...');

  const { supabaseUrl, supabaseAnonKey } = await chrome.storage.local.get([
    'supabaseUrl',
    'supabaseAnonKey',
  ]);

  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('[DejaVista] ✓ Supabase initialized from storage');
  } else {
    // Try to get from manifest (if injected)
    const manifest = chrome.runtime.getManifest();
    const url = manifest.env?.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
    const key = manifest.env?.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (url && key) {
      supabase = createClient(url, key);
      // Store for future use
      await chrome.storage.local.set({ supabaseUrl: url, supabaseAnonKey: key });
      console.log('[DejaVista] ✓ Supabase initialized from env vars');
    } else {
      console.warn('[DejaVista] ⚠ Supabase credentials not found');
    }
  }
}

initSupabase();

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'BATCH_ITEMS') {
    handleBatchItems(message.items, sender.tab?.id);
    sendResponse({ success: true });
  } else if (message.type === 'OPEN_SIDE_PANEL') {
    handleOpenSidePanel(message.product);
    sendResponse({ success: true });
  }
  return true; // Keep channel open for async response
});

async function handleBatchItems(items, tabId) {
  console.log(`[DejaVista] Processing ${items.length} items from tab ${tabId}...`);

  if (!supabase) {
    console.error('[DejaVista] ✗ Supabase not initialized');
    return;
  }

  // Check incognito mode
  const { incognitoMode } = await chrome.storage.local.get(['incognitoMode']);
  if (incognitoMode) {
    console.log('[DejaVista] Incognito mode - skipping sync');
    return;
  }

  // Get current user
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    console.log('[DejaVista] No authenticated user - skipping sync');
    return;
  }

  try {
    // Insert items in batch
    const itemsToInsert = items.map(item => ({
      user_id: session.user.id,
      url: item.url,
      meta: item.meta || {},
    }));

    const { error } = await supabase
      .from('closet_items')
      .insert(itemsToInsert);

    if (error) {
      console.error('[DejaVista] ✗ Error inserting items:', error);
    } else {
      console.log(`[DejaVista] ✓ Successfully synced ${items.length} items`);
    }
  } catch (error) {
    console.error('[DejaVista] ✗ Error handling batch items:', error);
  }
}

async function handleOpenSidePanel(product) {
  // Open side panel
  await chrome.sidePanel.open({ windowId: (await chrome.windows.getCurrent()).id });

  // Store current product for Mirror tab
  await chrome.storage.local.set({ currentProduct: product });
}

// Listen for side panel action click
chrome.action.onClicked.addListener(async () => {
  await chrome.sidePanel.open({ windowId: (await chrome.windows.getCurrent()).id });
});
