/**
 * @fileoverview DejaVista Type Definitions
 * JSDoc type annotations for core data structures
 * @module types
 */

/**
 * @typedef {Object} ItemMeta
 * @property {string} [title] - Item display title
 * @property {string} [image] - Primary image URL
 * @property {string|number} [price] - Item price (string with currency or number)
 * @property {string} [brand] - Brand name
 * @property {string} [url] - Product URL
 * @property {number} [intentScore] - AI-calculated intent score (0-5)
 */

/**
 * @typedef {Object} ClosetItem
 * @property {string|number} id - Unique item identifier
 * @property {string} url - Product URL
 * @property {string} [title] - Item title (may be derived from meta)
 * @property {string} [image] - Image URL
 * @property {string|number} [price] - Price value
 * @property {string} [brand] - Brand name
 * @property {ItemMeta} [meta] - Metadata object
 * @property {number} [intentScore] - AI intent score
 * @property {boolean} [isFallback] - Whether this was a fallback/fuzzy match
 * @property {string} [matchedItemId] - ID of matched recommendation item
 * @property {string} [reasoning] - AI-generated explanation
 */

/**
 * @typedef {Object} Pose
 * @property {string} id - Unique pose identifier
 * @property {string} imageUrl - Generated try-on image URL
 * @property {string} [poseType] - Type of pose (e.g., "front", "side")
 */

/**
 * @typedef {Object} TryOnCache
 * @property {Pose[]} poses - Cached poses array
 * @property {string|null} selectedPoseId - Currently selected pose ID
 * @property {number} savedAt - Timestamp when cache was saved
 */

/**
 * @typedef {Object} RecommendationResponse
 * @property {Object|string} [recommendation] - Single recommendation object
 * @property {Object[]} [recommendations] - Array of recommendations
 * @property {string} [matchedItemId] - ID of matched item from closet
 * @property {string} [reasoning] - AI explanation text
 */

/**
 * @typedef {Object} VisualizeRequest
 * @property {string} userId - User ID
 * @property {Array<{url: string, image: string, meta: ItemMeta}>} items - Items to visualize
 */

/**
 * @typedef {Object} VisualizeResponse
 * @property {Pose[]} [poses] - Generated try-on poses
 * @property {string} [message] - Status message (e.g., "simulation mode")
 */

/**
 * @typedef {Object} ValidatePhotoResponse
 * @property {boolean} valid - Whether photo is suitable for try-on
 * @property {string} [reason] - Rejection reason if invalid
 */

/**
 * @typedef {Object} RateLimitInfo
 * @property {number} limit - Maximum requests allowed
 * @property {number} remaining - Requests remaining in window
 * @property {number} reset - Timestamp when window resets
 */

/**
 * @typedef {Object} ApiError
 * @property {string} error - Error message
 * @property {string} [details] - Detailed error information
 */

/**
 * @typedef {'success'|'warning'|'error'} ToastType
 */

/**
 * @typedef {Object} Toast
 * @property {string} id - Unique toast identifier
 * @property {string} message - Toast message content
 * @property {ToastType} type - Toast severity type
 * @property {number} [duration] - Auto-dismiss duration in ms
 */

/**
 * @typedef {Object} User
 * @property {string} id - User's unique identifier
 * @property {string} [email] - User email address
 * @property {Object} [user_metadata] - Additional user metadata
 */

/**
 * @typedef {Object} SupabaseClient
 * @description Minimal Supabase client interface used in components
 */

/**
 * @typedef {Object} ChromeStorage
 * @description Chrome storage.local interface
 */

/**
 * @typedef {'mirror'|'closet'|'settings'} TabId
 * Active tab identifiers
 */

/**
 * @typedef {Object} ProductMetadata
 * @property {string} title - Product title
 * @property {string} [image] - Product image URL
 * @property {string} [brand] - Brand name
 * @property {string|number} [price] - Price value
 * @property {string} [url] - Product URL
 */

/**
 * @typedef {Object} IntentScorerConfig
 * @property {number} [threshold] - Minimum score for high-intent classification
 * @property {number} [timeThreshold] - Time spent on page (ms)
 * @property {number} [scrollDepthThreshold] - Scroll percentage
 */

/**
 * @typedef {Object} ModelAttempt
 * @property {string} modelId - Model identifier used
 * @property {'success'|'failed'} status - Attempt result
 * @property {number} duration - Request duration in ms
 * @property {number} responseLength - Response size in bytes
 * @property {string} [errorType] - Error classification
 * @property {string} [errorMessage] - Error message
 * @property {number} timestamp - Unix timestamp
 */

/**
 * @typedef {Object} LogEvent
 * @property {'ATTEMPT_START'|'ATTEMPT_SUCCESS'|'ATTEMPT_FAILED'|'MODEL_ATTEMPT_SUMMARY'|'FINAL_ATTEMPT_SUMMARY'} type - Event type
 * @property {Object} data - Event payload
 * @property {number} timestamp - Unix timestamp
 */

/**
 * @namespace window
 * @property {chrome} chrome - Chrome extension API
 */

// Re-export useful types for IDE completion
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ClosetItem: {},
    ItemMeta: {},
    Pose: {},
    TryOnCache: {},
    RecommendationResponse: {},
    VisualizeRequest: {},
    VisualizeResponse: {},
    ValidatePhotoResponse: {},
    RateLimitInfo: {},
    ApiError: {},
    Toast: {},
    User: {},
    ProductMetadata: {},
    ModelAttempt: {},
  };
}
