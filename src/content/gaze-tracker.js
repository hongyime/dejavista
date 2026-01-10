// Passive Gaze Tracker - Tracks images viewed for >2 seconds
(function () {
  'use strict';

  const TIME_THRESHOLD = 2000; // 2 seconds
  const SIZE_THRESHOLD = 200; // pixels
  const DEBOUNCE_ITEMS = 3;
  const DEBOUNCE_TIME = 5000; // 5 seconds

  const observedImages = new Map();
  const queuedItems = [];
  let debounceTimer = null;

  // Extract highest resolution image URL
  function extractHighResUrl(img) {
    // Priority 1: data-zoom-image attribute
    if (img.dataset.zoomImage) {
      return img.dataset.zoomImage;
    }

    // Priority 2: srcset (parse for largest)
    if (img.srcset) {
      const sources = img.srcset.split(',').map(s => {
        const parts = s.trim().split(/\s+/);
        return {
          url: parts[0],
          width: parseInt(parts[1]) || 0,
        };
      });
      if (sources.length > 0) {
        const largest = sources.reduce((max, curr) =>
          curr.width > max.width ? curr : max
        );
        return largest.url;
      }
    }

    // Priority 3: src fallback
    return img.src;
  }

  // Extract metadata from page
  function extractMetadata() {
    const meta = {
      title: null,
      price: null,
      brand: null,
    };

    // Title: og:title or h1
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      meta.title = ogTitle.content;
    } else {
      const h1 = document.querySelector('h1');
      if (h1) meta.title = h1.textContent.trim();
    }

    // Price: Look for currency symbols
    const pricePattern = /[\$£€¥]\s*[\d,]+\.?\d*/;
    const bodyText = document.body.textContent;
    const priceMatch = bodyText.match(pricePattern);
    if (priceMatch) {
      meta.price = priceMatch[0];
    }

    // Brand: domain or meta tags
    meta.brand = window.location.hostname;

    return meta;
  }

  // Send batch to background script
  function sendBatch() {
    if (queuedItems.length === 0) return;

    const itemsToSend = [...queuedItems];
    queuedItems.length = 0;

    chrome.runtime.sendMessage({
      type: 'BATCH_ITEMS',
      items: itemsToSend,
    }).catch(err => console.error('Error sending batch:', err));
  }

  // Debounce logic
  function queueItem(item) {
    queuedItems.push(item);

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Send if we hit item threshold
    if (queuedItems.length >= DEBOUNCE_ITEMS) {
      sendBatch();
      return;
    }

    // Otherwise, set timer
    debounceTimer = setTimeout(() => {
      sendBatch();
    }, DEBOUNCE_TIME);
  }

  // Intersection Observer callback
  function handleIntersection(entries) {
    // Only track if tab is active
    if (document.hidden) return;

    entries.forEach(entry => {
      const img = entry.target;
      const imgId = img.src || img.dataset.zoomImage || 'unknown';

      if (entry.isIntersecting) {
        // Start tracking
        if (!observedImages.has(imgId)) {
          const rect = img.getBoundingClientRect();

          // Check size threshold
          if (rect.width < SIZE_THRESHOLD || rect.height < SIZE_THRESHOLD) {
            return;
          }

          observedImages.set(imgId, {
            startTime: Date.now(),
            img: img,
          });
        }
      } else {
        // Check if we've viewed long enough
        const record = observedImages.get(imgId);
        if (record) {
          const viewDuration = Date.now() - record.startTime;

          if (viewDuration >= TIME_THRESHOLD) {
            // Extract data and queue
            const highResUrl = extractHighResUrl(record.img);
            const metadata = extractMetadata();

            queueItem({
              url: highResUrl,
              meta: {
                ...metadata,
                image: highResUrl,
              },
            });

            // Remove from tracking
            observedImages.delete(imgId);
          }
        }
      }
    });
  }

  // Initialize Intersection Observer
  const observer = new IntersectionObserver(handleIntersection, {
    threshold: 0.5, // Image must be 50% visible
  });

  function observeImages() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.src && !img.dataset.dejavistaTracked) {
        img.dataset.dejavistaTracked = 'true';
        observer.observe(img);
      }
    });
  }

  // Initial observation
  observeImages();

  // Watch for dynamically added images
  const mutationObserver = new MutationObserver(() => {
    observeImages();
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Send any remaining items on page unload
  window.addEventListener('beforeunload', () => {
    if (queuedItems.length > 0) {
      sendBatch();
    }
  });
})();
