import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { VERCEL_API_URL } from '../utils/env';

export default function MirrorTab() {
  const { user, supabase } = useAuth();
  const { showToast } = useToast();
  const [currentItem, setCurrentItem] = useState(null);
  const [userPhoto, setUserPhoto] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);

  useEffect(() => {
    loadCurrentTab();
    loadUserPhoto();
    loadHistory();

    // Listen for tab updates (navigation)
    const handleTabUpdated = (tabId, changeInfo, tab) => {
      if (tab.active && changeInfo.status === 'loading') {
        loadCurrentTab();
      }
    };

    // Listen for tab switching
    const handleTabActivated = () => {
      loadCurrentTab();
    };

    // Listen for storage updates (e.g. from FAB)
    const handleStorageChanged = (changes) => {
      if (changes.currentProduct) {
        loadCurrentTab();
      }
    };

    chrome.tabs.onUpdated.addListener(handleTabUpdated);
    chrome.tabs.onActivated.addListener(handleTabActivated);
    chrome.storage.onChanged.addListener(handleStorageChanged);

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.storage.onChanged.removeListener(handleStorageChanged);
    };
  }, [user, supabase]);

  const loadCurrentTab = async () => {
    try {
      // 1. Try to get rich product data from storage (set by FAB click)
      const { currentProduct } = await chrome.storage.local.get(['currentProduct']);

      if (currentProduct && currentProduct.url === window.location.href) {
        // Keep it if it matches current page (or if extension context, check tab match)
        // Note: Inside side panel, window.location is the extension's URL.
        // Effectively we just trust storage for the "Actively Viewed" item.
        setCurrentItem(currentProduct);
        return;
      }

      // 2. Fallback: Check active tab URL
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (currentProduct && tab?.url === currentProduct.url) {
        setCurrentItem(currentProduct);
      }

      // Removed fallback: 
      // If it's not a recognized "currentProduct" from our content script,
      // we prefer to show the Empty State ("Ready to Shop") rather than a generic page mirror.
      // This avoids showing giant favicons for random pages.
    } catch (error) {
      console.error('Error loading current tab:', error);
    }
  };

  const loadUserPhoto = async () => {
    if (!user || !supabase) {
      console.log('[Mirror] Skipping photo load: User or Supabase missing', { user: !!user, supabase: !!supabase });
      return;
    }

    const path = `${user.id}/reference.jpg`;
    console.log('[Mirror] Loading user photo from:', path);

    try {
      const { data, error } = await supabase.storage
        .from('user_photos')
        .download(path);

      if (error) {
        console.warn('[Mirror] Photo verify/download error:', error);
        // showToast('Failed to load photo', 'error'); // Optional: don't spam user if just missing
        throw error;
      }

      if (data) {
        console.log('[Mirror] Photo downloaded successfully, size:', data.size);
        const url = URL.createObjectURL(data);
        setUserPhoto(url);
      }
    } catch (error) {
      // Photo doesn't exist yet
      console.log('[Mirror] No user photo found or error:', error);

      // Check for various 404 signatures
      const is404 =
        error.status === 404 ||
        error.statusCode === 404 ||
        error.status === 400 || // Supabase storage 400 = invalid path/missing
        error.statusCode === 400 ||
        error.code === '404' ||
        (error.message && error.message.toLowerCase().includes('not found')) ||
        (error.name === 'StorageUnknownError' && JSON.stringify(error) === '{}');

      if (!is404) {
        showToast('Error loading photo', 'error');
      }
    }
  };

  const loadHistory = async () => {
    if (!user || !supabase) return;

    try {
      const { data, error } = await supabase
        .from('closet_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setHistoryItems(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const getRecommendation = async () => {
    if (!currentItem || !user || !VERCEL_API_URL) return;

    setLoading(true);
    try {
      const response = await fetch(`${VERCEL_API_URL}/api/ai/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentItem,
          historyItems,
          userId: user.id,
        }),
      });

      const data = await response.json();
      setRecommendation(data);
    } catch (error) {
      console.error('Error getting recommendation:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentItem && historyItems.length > 0) {
      getRecommendation();
    }
  }, [currentItem, historyItems]);

  if (!currentItem) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛍️</div>
        <h3>Ready to Shop</h3>
        <p>Visit a product page to see AI recommendations.</p>
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
          Look for the "View Match" button on fashion sites.
        </p>
      </div>
    );
  }

  return (
    <div>
      {userPhoto ? (
        <div className="card" style={{ marginBottom: '16px' }}>
          <img
            src={userPhoto}
            alt="Your reference"
            className="product-image"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '16px', padding: '48px', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
            Upload a reference photo in Settings
          </p>
        </div>
      )}

      <div className={`card ${recommendation ? 'card-ai' : ''}`}>
        {currentItem.image && (
          <img
            src={currentItem.image}
            alt={currentItem.title}
            className="product-image"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        )}
        <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          {currentItem.isFallback && (
            <span style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-primary)',
              fontWeight: 700
            }}>
              Currently Browsing
            </span>
          )}
          <h3 style={{ fontSize: '16px', lineHeight: '1.5', fontWeight: 600 }}>
            {currentItem.title}
          </h3>
          {currentItem.price && (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: '1.6', fontWeight: 400 }}>
              {currentItem.price}
            </p>
          )}
        </div>

        {loading && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        )}

        {recommendation?.matchedItemId && (
          <>
            <div className="ai-reasoning">{recommendation.reasoning}</div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>
              Try On
            </button>
          </>
        )}

        {recommendation && !recommendation.matchedItemId && (
          <div className="ai-reasoning">
            {recommendation.reasoning || 'No matching items found in your browsing history.'}
          </div>
        )}
      </div>
    </div>
  );
}
