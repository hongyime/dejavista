import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { VERCEL_API_URL } from '../utils/env';

export default function MirrorTab() {
  const { user, supabase } = useAuth();
  const { showToast } = useToast();

  const [currentItem, setCurrentItem] = useState(null);
  const [userPhoto, setUserPhoto] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [poses, setPoses] = useState([]);
  const [selectedPose, setSelectedPose] = useState(null);
  const [accessories, setAccessories] = useState([]);
  const [tryOnLoading, setTryOnLoading] = useState(false);
  const [tryOnError, setTryOnError] = useState(null);

  const isProduct = useMemo(() => (currentItem?.intentScore ?? 0) >= 2, [currentItem]);

  const matchedRecommendation = useMemo(() => {
    if (!recommendation) {
      return null;
    }

    if (recommendation.recommendation) {
      return recommendation.recommendation;
    }

    if (recommendation.recommendations?.length) {
      return recommendation.recommendations[0];
    }

    if (!recommendation.matchedItemId) {
      return null;
    }

    return (
      historyItems.find(
        (item) => String(item.id) === String(recommendation.matchedItemId)
      ) || null
    );
  }, [historyItems, recommendation]);

  useEffect(() => {
    loadCurrentTab();
    loadUserPhoto();
    loadHistory();

    const handleTabUpdated = (tabId, changeInfo, tab) => {
      if (tab.active && changeInfo.status === 'complete') {
        loadCurrentTab();
      }
    };

    const handleTabActivated = () => {
      loadCurrentTab();
    };

    const handleStorageChanged = (changes) => {
      if (changes.currentProduct) {
        loadCurrentTab();
      }

      if (changes.photoPurged) {
        setUserPhoto(null);
        setPoses([]);
        setSelectedPose(null);
        setAccessories([]);
        setTryOnError(null);
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

  useEffect(() => {
    return () => {
      if (userPhoto?.startsWith('blob:')) {
        URL.revokeObjectURL(userPhoto);
      }
    };
  }, [userPhoto]);

  useEffect(() => {
    setPoses([]);
    setSelectedPose(null);
    setAccessories([]);
    setTryOnError(null);
  }, [currentItem?.url, currentItem?.image]);

  useEffect(() => {
    if (!currentItem || !isProduct) {
      setRecommendation(null);
      return;
    }

    if (historyItems.length === 0) {
      setRecommendation(null);
      return;
    }

    fetchRecommendation();
  }, [currentItem?.url, historyItems.length, isProduct]);

  useEffect(() => {
    const restoreCachedTryOn = async () => {
      if (!user || !currentItem || !isProduct || !chrome?.storage?.local) {
        return;
      }

      try {
        const cacheKey = `tryon:${user.id}:${currentItem.url || currentItem.image}`;
        const data = await chrome.storage.local.get(cacheKey);
        const cached = data[cacheKey];

        if (!cached?.poses?.length) {
          return;
        }

        setPoses(cached.poses);
        const initialPose =
          cached.poses.find((pose) => pose.id === cached.selectedPoseId) || cached.poses[0];
        setSelectedPose(initialPose);
      } catch (error) {
        console.warn('[Mirror] Failed to restore cached try-on poses:', error);
      }
    };

    restoreCachedTryOn();
  }, [currentItem?.image, currentItem?.url, isProduct, user?.id]);

  const loadCurrentTab = async () => {
    try {
      const { currentProduct } = await chrome.storage.local.get(['currentProduct']);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentUrl = tab?.url || '';

      if (currentProduct && currentProduct.url === currentUrl) {
        setCurrentItem(currentProduct);
        return;
      }

      if (tab?.id && tab.url && !tab.url.startsWith('chrome://')) {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, {
            type: 'GET_PRODUCT_METADATA',
          });

          if (response?.meta?.title) {
            setCurrentItem({
              url: response.url,
              ...response.meta,
              isFallback: true,
            });
            return;
          }
        } catch (error) {
          if (!error.message?.includes('Could not establish connection')) {
            console.log('[Mirror] Active query failed:', error);
          }
        }
      }

      setCurrentItem(null);
    } catch (error) {
      console.error('[Mirror] Error loading current tab:', error);
    }
  };

  const loadUserPhoto = async () => {
    if (!user || !supabase) {
      return;
    }

    const path = `${user.id}/reference.jpg`;

    try {
      const { data, error } = await supabase.storage.from('user_photos').download(path);

      if (error) {
        console.log('[Mirror] No reference photo yet or download error:', error.message);
        setUserPhoto(null);
        return;
      }

      if (data) {
        const url = URL.createObjectURL(data);
        setUserPhoto(url);
      }
    } catch (error) {
      console.error('[Mirror] Error loading user photo:', error);
      setUserPhoto(null);
    }
  };

  const loadHistory = async () => {
    if (!user || !supabase) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('closet_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        throw error;
      }

      setHistoryItems(data || []);
    } catch (error) {
      console.error('[Mirror] Error loading history:', error);
    }
  };

  const fetchRecommendation = async () => {
    if (!currentItem || !user || !VERCEL_API_URL) {
      return;
    }

    setLoadingRecommendation(true);
    setRecommendation(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${VERCEL_API_URL}/api/ai/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentItem,
          historyItems,
          userId: user.id,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const text = await response.text();
        console.error('[Mirror] Recommendation API error:', text);
        return;
      }

      const data = await response.json();
      setRecommendation(data);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('[Mirror] Recommendation request timed out');
      } else {
        console.error('[Mirror] Error getting recommendation:', error);
      }
    } finally {
      setLoadingRecommendation(false);
    }
  };

  const openItemUrl = (url) => {
    if (!url) {
      return;
    }

    try {
      if (chrome?.tabs?.query && chrome?.tabs?.update && chrome?.tabs?.create) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const activeTab = tabs?.[0];

          if (activeTab?.id) {
            chrome.tabs.update(activeTab.id, { url });
            return;
          }

          chrome.tabs.create({ url });
        });
        return;
      }
    } catch (error) {
      console.warn('[Mirror] Failed to open item with Chrome tabs API:', error);
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleTryOn = async () => {
    if (!user?.id) {
      setTryOnError('Please sign in to use try-on.');
      return;
    }

    if (!VERCEL_API_URL) {
      setTryOnError('API URL not configured.');
      return;
    }

    if (!userPhoto) {
      setTryOnError('Upload a reference photo in Settings first.');
      return;
    }

    if (!currentItem?.image) {
      setTryOnError('Current product image missing.');
      return;
    }

    setTryOnLoading(true);
    setTryOnError(null);

    try {
      const itemsForLook = [
        {
          url: currentItem.url,
          image: currentItem.image,
          meta: {
            title: currentItem.title || currentItem.meta?.title || 'Current item',
            image: currentItem.image,
            brand: currentItem.brand || currentItem.meta?.brand,
            price: currentItem.price || currentItem.meta?.price,
          },
        },
      ];

      if (matchedRecommendation) {
        itemsForLook.push(matchedRecommendation);
      }

      const normalizedItems = itemsForLook.map((item) => ({
        url: item.url || item.meta?.url || item.meta?.productUrl || item.image || item.meta?.image,
        image: item.meta?.image || item.image || item.url,
        meta: {
          ...item.meta,
          title: item.meta?.title || item.title || 'Item',
          image: item.meta?.image || item.image || item.url,
          brand: item.meta?.brand || item.brand,
          price: item.meta?.price || item.price,
        },
      }));

      const response = await fetch(`${VERCEL_API_URL}/api/ai/visualize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          items: normalizedItems,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(
          errorData.details ||
            errorData.error ||
            `Failed to generate try-on image (${response.status})`
        );
      }

      const data = await response.json();
      const newPoses = Array.isArray(data.poses)
        ? data.poses.filter((pose) => pose?.imageUrl)
        : [];

      if (!newPoses.length) {
        throw new Error('No try-on poses returned.');
      }

      setPoses(newPoses);
      setSelectedPose(newPoses[0]);

      if (data.message?.toLowerCase().includes('simulation mode')) {
        showToast(
          'AI try-on is unavailable right now, so Mirror is showing your reference photo.',
          'warning'
        );
      } else {
        showToast('Try-on generated.', 'success');
      }

      try {
        if (chrome?.storage?.local) {
          const cacheKey = `tryon:${user.id}:${currentItem.url || currentItem.image}`;
          await chrome.storage.local.set({
            [cacheKey]: {
              poses: newPoses,
              selectedPoseId: newPoses[0]?.id || null,
              savedAt: Date.now(),
            },
          });
        }
      } catch (error) {
        console.warn('[Mirror] Failed to cache try-on poses:', error);
      }

      const accessoryCandidates = historyItems
        .filter((item) => String(item.id) !== String(matchedRecommendation?.id))
        .filter((item) => item.url !== currentItem.url)
        .slice(0, 6);

      setAccessories(accessoryCandidates);
    } catch (error) {
      console.error('[Mirror] Error generating try-on:', error);
      const message =
        error.message || 'Something went wrong while generating your try-on.';
      setTryOnError(message);
      showToast(message, 'error');
    } finally {
      setTryOnLoading(false);
    }
  };

  if (!currentItem || !isProduct) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛍️</div>
        <h3>Ready to Shop</h3>
        <p>Visit a product page to see AI recommendations.</p>
        <p
          style={{
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            marginTop: '8px',
          }}
        >
          Look for the &quot;View Match&quot; button on fashion sites.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '16px' }}>
        {userPhoto ? (
          <img
            src={userPhoto}
            alt="Your reference"
            className="product-image"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Upload a reference photo in Settings to see try-ons.
            </p>
          </div>
        )}
      </div>

      <div className={`card ${recommendation?.reasoning ? 'card-ai' : ''}`}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          {currentItem.image && (
            <img
              src={currentItem.image}
              alt={currentItem.title}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-sm)',
                objectFit: 'cover',
                flexShrink: 0,
              }}
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          )}
          <div style={{ flex: 1 }}>
            <span
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-primary)',
                fontWeight: 700,
              }}
            >
              Currently Browsing
            </span>
            <h3 style={{ fontSize: '15px', lineHeight: '1.4', fontWeight: 600, marginTop: '4px' }}>
              {currentItem.title}
            </h3>
            {currentItem.price && (
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: '13px',
                  lineHeight: '1.4',
                  marginTop: '2px',
                }}
              >
                {currentItem.price}
              </p>
            )}
          </div>
        </div>

        {loadingRecommendation && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        )}

        {recommendation?.reasoning && (
          <div className="ai-reasoning" style={{ marginTop: '16px' }}>
            {recommendation.reasoning}
          </div>
        )}

        {userPhoto ? (
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '16px' }}
            onClick={handleTryOn}
            disabled={tryOnLoading || !currentItem.image}
          >
            {tryOnLoading
              ? 'Generating look...'
              : !currentItem.image
                ? 'Image Missing'
                : 'Try On'}
          </button>
        ) : (
          <p
            style={{
              marginTop: '16px',
              color: 'var(--color-text-secondary)',
              fontSize: '13px',
            }}
          >
            Upload a reference photo in Settings to enable try-on.
          </p>
        )}
      </div>

      {historyItems.length === 0 && (
        <div
          className="card"
          style={{
            marginTop: '16px',
            textAlign: 'center',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px dashed var(--color-border)',
          }}
        >
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: 0 }}>
            Your fashion memory is empty.
            <br />
            Browse more items to unlock recommendations.
          </p>
        </div>
      )}

      {matchedRecommendation && (
        <div className="card card-ai" style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            {matchedRecommendation.meta?.image && (
              <img
                src={matchedRecommendation.meta.image}
                alt={matchedRecommendation.meta?.title || 'Recommended match'}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: 'var(--radius-sm)',
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--color-primary)',
                    fontWeight: 700,
                  }}
                >
                  Recommended Match
                </span>
                {!loadingRecommendation && (
                  <button
                    onClick={fetchRecommendation}
                    className="btn btn-secondary"
                    style={{
                      padding: '2px 6px',
                      fontSize: '9px',
                      height: 'auto',
                      borderRadius: 'var(--radius-sm)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Refresh
                  </button>
                )}
              </div>
              <h3
                style={{
                  fontSize: '15px',
                  lineHeight: '1.4',
                  fontWeight: 600,
                  margin: '4px 0 0',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {matchedRecommendation.meta?.title || 'Saved item'}
              </h3>
              {matchedRecommendation.meta?.price && (
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '2px' }}>
                  {matchedRecommendation.meta.price}
                </p>
              )}
            </div>
          </div>

          {matchedRecommendation.url && (
            <button
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '12px' }}
              onClick={() => openItemUrl(matchedRecommendation.url)}
            >
              View Item
            </button>
          )}
        </div>
      )}

      {tryOnError && (
        <div className="card" style={{ marginTop: '16px' }}>
          <p style={{ color: 'var(--color-accent-action)', fontSize: '13px' }}>{tryOnError}</p>
        </div>
      )}

      {selectedPose && (
        <div className="card" style={{ marginTop: '16px' }}>
          <img
            src={selectedPose.imageUrl}
            alt="AI try-on"
            className="product-image"
            referrerPolicy="no-referrer"
          />

          {poses.length > 1 && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginTop: '12px',
                overflowX: 'auto',
              }}
            >
              {poses.map((pose) => (
                <img
                  key={pose.id}
                  src={pose.imageUrl}
                  alt={pose.id}
                  onClick={() => setSelectedPose(pose)}
                  style={{
                    width: '48px',
                    height: '64px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    border:
                      pose.id === selectedPose.id
                        ? '2px solid var(--color-accent)'
                        : '1px solid var(--color-border)',
                    cursor: 'pointer',
                    flex: '0 0 auto',
                  }}
                  referrerPolicy="no-referrer"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {accessories.length > 0 && (
        <div className="card" style={{ marginTop: '16px' }}>
          <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Complete the look</h4>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
            {accessories.map((item) => (
              <div
                key={item.id}
                className="card"
                onClick={() => {
                  if (item.url) {
                    openItemUrl(item.url);
                  }
                }}
                style={{
                  minWidth: '120px',
                  padding: '8px',
                  cursor: item.url ? 'pointer' : 'default',
                }}
              >
                {item.meta?.image && (
                  <img
                    src={item.meta.image}
                    alt={item.meta?.title || 'Accessory'}
                    className="product-image"
                    style={{ marginBottom: '4px' }}
                    referrerPolicy="no-referrer"
                  />
                )}
                <p
                  style={{
                    fontSize: '12px',
                    lineHeight: '1.4',
                    margin: 0,
                  }}
                >
                  {item.meta?.title || 'Saved item'}
                </p>
                {item.url && (
                  <button
                    className="btn btn-secondary"
                    style={{
                      marginTop: '6px',
                      fontSize: '11px',
                      padding: '4px 8px',
                      width: '100%',
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      openItemUrl(item.url);
                    }}
                  >
                    View item
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
