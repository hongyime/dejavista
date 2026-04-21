// Input Sanitization Utilities
// Ensures meta fields are safe before storage

/**
 * Maximum lengths for meta fields
 */
export const META_LIMITS = {
  title: 200,
  price: 50,
  brand: 100,
  description: 500,
  image: 2048,
  url: 2048,
};

/**
 * Sanitize a string value for safe storage
 * - Strips HTML tags
 * - Trims whitespace
 * - Enforces maximum length
 * @param {unknown} value - Value to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
export function sanitizeString(value, maxLength = 200) {
  if (typeof value !== 'string') {
    return '';
  }
  
  // Remove HTML tags
  let sanitized = value.replace(/<[^>]*>/g, '');
  
  // Remove script-like content
  sanitized = sanitized.replace(/<script[\s\S]*?<\/script>/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Enforce max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitize URL field
 * - Validates it starts with http(s)://
 * - Strips potentially dangerous patterns
 * @param {unknown} value - URL to sanitize
 * @returns {string} Sanitized URL or empty string
 */
export function sanitizeUrl(value) {
  if (typeof value !== 'string') {
    return '';
  }
  
  const trimmed = value.trim();
  
  // Must be a valid URL starting with http(s)
  if (!/^https?:\/\//i.test(trimmed)) {
    return '';
  }
  
  // Remove dangerous patterns from query string
  let sanitized = trimmed.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+=/gi, '');
  
  // Enforce max length
  if (sanitized.length > META_LIMITS.url) {
    sanitized = sanitized.substring(0, META_LIMITS.url);
  }
  
  return sanitized;
}

/**
 * Sanitize meta object for safe storage
 * @param {Object} meta - Meta object to sanitize
 * @returns {Object} Sanitized meta object
 */
export function sanitizeMeta(meta) {
  if (!meta || typeof meta !== 'object') {
    return {};
  }
  
  return {
    title: sanitizeString(meta?.title, META_LIMITS.title),
    price: sanitizeString(meta?.price, META_LIMITS.price),
    brand: sanitizeString(meta?.brand, META_LIMITS.brand),
    description: sanitizeString(meta?.description, META_LIMITS.description),
    image: sanitizeUrl(meta?.image),
    url: sanitizeUrl(meta?.url),
  };
}

/**
 * Sanitize array of items with meta fields
 * @param {Array} items - Array of items with meta field
 * @returns {Array} Sanitized items
 */
export function sanitizeItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  
  return items
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      ...item,
      meta: sanitizeMeta(item.meta),
      url: sanitizeUrl(item.url),
    }));
}

/**
 * Validate price string format
 * - Checks for common currency symbols
 * - Validates numeric format
 * @param {string} price - Price string to validate
 * @returns {boolean} True if valid price format
 */
export function isValidPrice(price) {
  if (typeof price !== 'string') {
    return false;
  }
  
  // Currency symbols: $, £, €, ¥
  const pricePattern = /^[\$\u00a3\u20ac\u00a5]\s*[\d,]+\.?\d*$/;
  return pricePattern.test(price.trim());
}

/**
 * Sanitize price with validation
 * @param {unknown} price - Price value to sanitize
 * @returns {string} Sanitized price or empty string
 */
export function sanitizePrice(price) {
  if (isValidPrice(price)) {
    return sanitizeString(price, META_LIMITS.price);
  }
  return '';
}
