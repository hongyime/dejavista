/**
 * Input sanitization utilities shared between background script and tests.
 */

export function sanitizeString(value, maxLength = 200) {
  if (typeof value !== 'string') return '';
  let sanitized = value.replace(/<[^>]*>/g, '').trim();
  if (sanitized.length > maxLength) sanitized = sanitized.substring(0, maxLength);
  return sanitized;
}

export function sanitizeUrl(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return '';
  if (trimmed.length > 2048) return trimmed.substring(0, 2048);
  return trimmed;
}

export function sanitizeMeta(meta) {
  if (!meta || typeof meta !== 'object') return {};
  return {
    title: sanitizeString(meta?.title, 200),
    price: sanitizeString(meta?.price, 50),
    brand: sanitizeString(meta?.brand, 100),
    image: sanitizeUrl(meta?.image),
  };
}
