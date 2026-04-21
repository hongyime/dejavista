/**
 * @fileoverview API Route Type Definitions
 * JSDoc types for Vercel serverless function handlers
 * @module api/types
 */

/**
 * @typedef {Object} RecommendRequest
 * @property {string} userId - User ID making the request
 * @property {string[]} [itemIds] - Specific item IDs to include in context
 * @property {ClosetItem[]} [items] - Full item objects for context
 * @property {Object} [currentItem] - Current product being viewed
 */

/**
 * @typedef {Object} RecommendResponse
 * @property {Object|string} [recommendation] - Matched closet item
 * @property {string} [matchedItemId] - ID of matched closet item
 * @property {string} [reasoning] - AI explanation for match
 * @property {Object[]} [recommendations] - Alternative recommendations array
 */

/**
 * @typedef {Object} VisualizeRequest
 * @property {string} userId - User ID
 * @property {Array<{url: string, image: string, meta: ItemMeta}>} items - Items to visualize (1-2)
 */

/**
 * @typedef {Object} VisualizeResponse
 * @property {Pose[]} [poses] - Generated pose images
 * @property {string} [jobId] - Job ID for async polling (if applicable)
 * @property {string} [message] - Status message
 */

/**
 * @typedef {Object} ValidatePhotoRequest
 * @property {string} photoUrl - URL of photo to validate
 * @property {string} [userId] - Optional user ID
 */

/**
 * @typedef {Object} ValidatePhotoResponse
 * @property {boolean} valid - Whether photo is usable for try-on
 * @property {string} [reason] - Rejection reason if invalid
 * @property {string} [suggestion] - Improvement suggestion
 */

/**
 * @typedef {Object} RateLimitConfig
 * @property {number} windowMs - Time window in milliseconds
 * @property {number} maxRequests - Maximum requests per window
 */

/**
 * @typedef {Object} RateLimitResult
 * @property {boolean} allowed - Whether request should proceed
 * @property {number} remaining - Remaining requests
 * @property {number} reset - Reset timestamp
 */

/**
 * @typedef {Object} ModelConfig
 * @property {string} id - Model identifier
 * @property {string} [version] - Model version
 * @property {Object} [options] - Generation options
 */

/**
 * @typedef {Object} AuthCredentials
 * @property {string} [apiKey] - Google AI API key
 * @property {string} [projectId] - GCP project ID
 * @property {string} [credentials] - Service account JSON string
 */

/**
 * @typedef {Object} ApiHandlerContext
 * @property {Object} req - Next.js request object
 * @property {Object} res - Next.js response object
 */
