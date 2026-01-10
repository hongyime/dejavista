import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { VERCEL_API_URL } from '../utils/env';

export default function MirrorTab() {
  const { user, supabase } = useAuth();
  const [currentItem, setCurrentItem] = useState(null);
  const [userPhoto, setUserPhoto] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);

  useEffect(() => {
    loadCurrentTab();
    loadUserPhoto();
    loadHistory();
  }, [user, supabase]);

  const loadCurrentTab = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        // Extract product info from current tab
        // This is a placeholder - you'll need to implement actual extraction
        setCurrentItem({
          url: tab.url,
          title: tab.title || 'Current Item',
          image: null,
        });
      }
    } catch (error) {
      console.error('Error loading current tab:', error);
    }
  };

  const loadUserPhoto = async () => {
    if (!user || !supabase) return;

    try {
      const { data } = await supabase.storage
        .from('user_photos')
        .download(`${user.id}/reference.jpg`);

      if (data) {
        const url = URL.createObjectURL(data);
        setUserPhoto(url);
      }
    } catch (error) {
      // Photo doesn't exist yet
      console.log('No user photo found');
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
        <p>Navigate to a product page to see recommendations</p>
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
