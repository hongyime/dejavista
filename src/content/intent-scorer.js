// Buying Intent Scorer - Detects product pages and triggers Side Panel
(function () {
  'use strict';

  const INTENT_THRESHOLD = 3;

  function isContextValid() {
    return !!(chrome.runtime && chrome.runtime.id);
  }

  function calculateIntentScore() {
    let score = 0;

    // Check for og:type="product" (+5 points)
    const ogType = document.querySelector('meta[property="og:type"]');
    if (ogType && ogType.content === 'product') {
      score += 5;
    }

    // Check for "Add to Cart" button (+2 points)
    const addToCartTexts = [
      'add to cart',
      'add to bag',
      'buy now',
      'purchase',
    ];
    const bodyText = document.body.textContent.toLowerCase();
    addToCartTexts.forEach(text => {
      if (bodyText.includes(text)) {
        score += 2;
        return;
      }
    });

    // Check for currency symbols near large text (+1 point)
    const pricePattern = /[\$£€¥]\s*[\d,]+\.?\d*/;
    if (pricePattern.test(document.body.textContent)) {
      score += 1;
    }

    // Check for size selector (+2 points)
    const sizeSelectors = [
      'select[name*="size" i]',
      'select[name*="Size" i]',
      '[data-testid*="size" i]',
      '.size-selector',
      '#size-selector',
    ];
    sizeSelectors.forEach(selector => {
      if (document.querySelector(selector)) {
        score += 2;
        return;
      }
    });

    // Check for size guide / table (+1 point)
    if (bodyText.includes('size guide') || bodyText.includes('size table') || bodyText.includes('size chart')) {
      score += 1;
    }

    // Check for color variations (+1 point)
    if (document.querySelector('.color-picker, [class*="color-swatch"], [id*="color-swatch"]')) {
      score += 1;
    }

    // Check for materials (+1 point)
    if (bodyText.includes('material') || bodyText.includes('fabric') || bodyText.includes('composition')) {
      score += 1;
    }

    return score;
  }

  function extractCurrentProduct() {
    const meta = {
      title: null,
      price: null,
      brand: null,
      image: null,
    };

    // Title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      meta.title = ogTitle.content;
    } else {
      const h1 = document.querySelector('h1');
      if (h1) meta.title = h1.textContent.trim();
    }

    // Price
    const pricePattern = /[\$£€¥]\s*[\d,]+\.?\d*/;
    const bodyText = document.body.textContent;
    const priceMatch = bodyText.match(pricePattern);
    if (priceMatch) {
      meta.price = priceMatch[0];
    }

    // Brand
    meta.brand = window.location.hostname;

    // Image
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
      meta.image = ogImage.content;
    } else {
      const mainImg = document.querySelector('img[src*="product"], img[data-zoom-image]');
      if (mainImg) {
        meta.image = mainImg.dataset.zoomImage || mainImg.srcset?.split(',')[0]?.trim() || mainImg.src;
      }
    }

    // Verification Score
    meta.intentScore = calculateIntentScore();

    return meta;
  }

  // Create and inject Floating Action Button
  function showNotification(product) {
    if (!isContextValid()) return;

    // Check if already exists
    if (document.getElementById('dejavista-fab')) return;

    const fab = document.createElement('div');
    fab.id = 'dejavista-fab';

    try {
      fab.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <img src="${chrome.runtime.getURL('icons/icon48.png')}" style="width: 24px; height: 24px;">
          <span>View Match</span>
        </div>
      `;
    } catch (e) {
      return; // Context invalidated
    }

    // Styles
    Object.assign(fab.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: '2147483647', // Max z-index
      backgroundColor: '#773344', // Brand color
      color: 'white',
      padding: '12px 20px',
      borderRadius: '50px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      cursor: 'pointer',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
      transform: 'translateY(100px)', // Start hidden
      display: 'flex',
      alignItems: 'center',
    });

    fab.onclick = () => {
      if (!isContextValid()) {
        fab.remove();
        return;
      }

      console.log('[DejaVista] FAB clicked, sending OPEN_SIDE_PANEL message');
      try {
        chrome.runtime.sendMessage({
          type: 'OPEN_SIDE_PANEL',
          product: product,
        });
        fab.style.transform = 'translateY(100px)'; // Hide after click
      } catch (e) {
        console.log('[DejaVista] Failed to send message (context invalidated)');
        fab.remove();
      }
    };

    document.body.appendChild(fab);

    // Animate in
    setTimeout(() => {
      if (fab.parentNode) {
        fab.style.transform = 'translateY(0)';
      }
    }, 100);
  }

  // Calculate score after page load
  setTimeout(() => {
    if (!isContextValid()) return;

    try {
      const score = calculateIntentScore();

      if (score > INTENT_THRESHOLD) {
        const currentProduct = extractCurrentProduct();
        showNotification(currentProduct);
      }
    } catch (e) {
      if (e.message && e.message.includes('Extension context invalidated')) {
        console.log('[DejaVista] Context invalidated, stopping scorer.');
      } else {
        console.error('[DejaVista] Scorer error:', e);
      }
    }
  }, 1000); // Wait 1s for page to fully load
})();
