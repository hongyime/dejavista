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

// Listen for auth updates from side panel
chrome.storage.onChanged.addListener((changes) => {
  if (changes.supabaseSession && supabase) {
    const session = changes.supabaseSession.newValue;
    if (session) {
      console.log('[DejaVista] Syncing session to background...');
      supabase.auth.setSession(session);
    } else {
      console.log('[DejaVista] Clearing session in background...');
      supabase.auth.signOut();
    }
  }
});

initSupabase().then(() => {
  // Check for existing session
  chrome.storage.local.get(['supabaseSession']).then(({ supabaseSession }) => {
    if (supabaseSession && supabase) {
      console.log('[DejaVista] Restoring session in background');
      supabase.auth.setSession(supabaseSession);
    }
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'BATCH_ITEMS') {
    handleBatchItems(message.items, sender.tab?.id);
    sendResponse({ success: true });
  } else if (message.type === 'OPEN_SIDE_PANEL') {
    // Pass windowId directly to preserve user gesture
    const windowId = sender.tab?.windowId;
    if (windowId) {
      handleOpenSidePanel(message.product, windowId);
    }
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

async function handleOpenSidePanel(product, windowId) {
  // CRITICAL: Call sidePanel.open() IMMEDIATELY to preserve user gesture.
  // Do NOT wait for storage or other async ops.
  const openPromise = chrome.sidePanel.open({ windowId });

  // Update storage in parallel
  const storagePromise = chrome.storage.local.set({ currentProduct: product });

  try {
    await openPromise;
  } catch (error) {
    // Fallback: Show badge if open fails
    console.log('[DejaVista] Side panel open failed, showing badge:', error);
    await chrome.action.setBadgeText({ text: '!' });
    await chrome.action.setBadgeBackgroundColor({ color: '#D44D5C' }); // Coral color
  }

  await storagePromise;
}

// Listen for side panel action click
chrome.action.onClicked.addListener((tab) => {
  // CRITICAL: Call sidePanel.open() IMMEDIATELY.
  // We cannot mark this function as 'async' and await things before the open call.
  if (tab.windowId) {
    chrome.sidePanel.open({ windowId: tab.windowId })
      .then(() => {
        // Clear badge after open
        chrome.action.setBadgeText({ text: '' });
      })
      .catch((error) => {
        console.error('[DejaVista] Failed to open side panel on click:', error);
      });
  }
});
