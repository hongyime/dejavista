// Buying Intent Scorer - Detects product pages and triggers Side Panel
(function() {
  'use strict';

  const INTENT_THRESHOLD = 3;

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

    return meta;
  }

  // Calculate score after page load
  setTimeout(() => {
    const score = calculateIntentScore();
    
    if (score > INTENT_THRESHOLD) {
      const currentProduct = extractCurrentProduct();
      
      // Send message to background to open Side Panel
      chrome.runtime.sendMessage({
        type: 'OPEN_SIDE_PANEL',
        product: currentProduct,
      }).catch(err => console.error('Error opening side panel:', err));
    }
  }, 1000); // Wait 1s for page to fully load
})();
