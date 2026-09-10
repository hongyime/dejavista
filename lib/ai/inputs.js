import { RequestError } from './request.js';

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const object = value => value && typeof value === 'object' && !Array.isArray(value);

export function validateItem(item) {
  if (!object(item) || (item.meta !== undefined && !object(item.meta))) throw new RequestError(400, 'Invalid clothing item.');
  for (const record of [item, item.meta].filter(Boolean)) {
    for (const field of ['id', 'title', 'brand', 'description', 'price', 'image', 'url', 'productUrl']) {
      const value = record[field];
      if (value === undefined || value === null) continue;
      if (!['string', 'number'].includes(typeof value) || String(value).length > (['image', 'url', 'productUrl'].includes(field) ? 2048 : 2000)) throw new RequestError(400, 'Clothing item fields are invalid or too long.');
    }
  }
}

export function validateRecommendation(body) {
  validateItem(body.currentItem);
  if (!Array.isArray(body.historyItems) || body.historyItems.length > 40) throw new RequestError(400, 'Send at most 40 history items.');
  body.historyItems.forEach(validateItem);
}

export function validateVisualization(body) {
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 4) throw new RequestError(400, 'Choose one to four clothing items.');
  body.items.forEach(validateItem);
}

export function parsePhoto(image) {
  if (typeof image !== 'string') throw new RequestError(400, 'Choose a JPEG, PNG or WebP image.');
  if (image.length > Math.ceil(MAX_PHOTO_BYTES / 3) * 4 + 40) throw new RequestError(413, 'Choose a photo no larger than 2 MiB.');
  const match = /^(?:data:(image\/(?:jpeg|png|webp));base64,)?([A-Za-z0-9+/]+={0,2})$/.exec(image);
  if (!match || match[2].length % 4) throw new RequestError(400, 'Choose a JPEG, PNG or WebP image.');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > MAX_PHOTO_BYTES) throw new RequestError(413, 'Choose a photo no larger than 2 MiB.');
  const mimeType = imageMime(bytes);
  if (!mimeType || (match[1] && match[1] !== mimeType)) throw new RequestError(400, 'Image contents do not match a supported photo format.');
  return { mimeType, data: match[2] };
}

export function imageMime(bytes) {
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (bytes.length >= 12 && bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP') return 'image/webp';
  return null;
}
