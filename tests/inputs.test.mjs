import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateItem, validateRecommendation, validateVisualization, parsePhoto, imageMime, MAX_PHOTO_BYTES } from '../lib/ai/inputs.js';

// --- imageMime ---

test('imageMime detects JPEG magic bytes', () => {
  const jpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
  assert.equal(imageMime(jpeg), 'image/jpeg');
});

test('imageMime detects PNG magic bytes', () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]);
  assert.equal(imageMime(png), 'image/png');
});

test('imageMime detects WebP magic bytes', () => {
  const webp = Buffer.alloc(16);
  webp.write('RIFF', 0, 'ascii');
  webp.writeUInt32LE(100, 4);
  webp.write('WEBP', 8, 'ascii');
  assert.equal(imageMime(webp), 'image/webp');
});

test('imageMime returns null for unknown formats', () => {
  assert.equal(imageMime(Buffer.from([0x00, 0x00])), null);
  assert.equal(imageMime(Buffer.alloc(0)), null);
  assert.equal(imageMime(Buffer.from('GIF89a')), null);
});

// --- validateItem ---

test('validateItem accepts a minimal valid item', () => {
  assert.doesNotThrow(() => validateItem({ title: 'Blue Shirt' }));
});

test('validateItem accepts an item with nested meta', () => {
  assert.doesNotThrow(() => validateItem({ meta: { title: 'Skirt', brand: 'Zara', price: '$49' } }));
});

test('validateItem accepts numeric id and price fields', () => {
  assert.doesNotThrow(() => validateItem({ id: 42, price: 99.99 }));
});

test('validateItem rejects non-object values', () => {
  for (const value of [null, undefined, 'string', 42, true, []]) {
    assert.throws(() => validateItem(value), { status: 400 });
  }
});

test('validateItem rejects array meta', () => {
  assert.throws(() => validateItem({ meta: [1, 2] }), { status: 400 });
});

test('validateItem rejects fields that are too long', () => {
  assert.throws(() => validateItem({ title: 'x'.repeat(2001) }), { status: 400 });
});

test('validateItem allows URL fields up to 2048 chars', () => {
  assert.doesNotThrow(() => validateItem({ image: 'https://example.com/' + 'a'.repeat(2020) }));
  assert.throws(() => validateItem({ image: 'https://example.com/' + 'a'.repeat(2049) }), { status: 400 });
});

test('validateItem rejects boolean and object field values', () => {
  assert.throws(() => validateItem({ title: true }), { status: 400 });
  assert.throws(() => validateItem({ title: { nested: 'value' } }), { status: 400 });
});

// --- validateRecommendation ---

test('validateRecommendation accepts valid body with currentItem and historyItems', () => {
  assert.doesNotThrow(() => validateRecommendation({
    currentItem: { title: 'Top' },
    historyItems: [{ id: 'item-1', meta: { title: 'Skirt' } }],
  }));
});

test('validateRecommendation accepts empty history', () => {
  assert.doesNotThrow(() => validateRecommendation({
    currentItem: { title: 'Top' },
    historyItems: [],
  }));
});

test('validateRecommendation rejects more than 40 history items', () => {
  assert.throws(() => validateRecommendation({
    currentItem: { title: 'Top' },
    historyItems: Array(41).fill({ title: 'Item' }),
  }), { status: 400 });
});

test('validateRecommendation rejects non-array historyItems', () => {
  assert.throws(() => validateRecommendation({
    currentItem: { title: 'Top' },
    historyItems: 'not-array',
  }), { status: 400 });
});

test('validateRecommendation rejects invalid currentItem', () => {
  assert.throws(() => validateRecommendation({
    currentItem: null,
    historyItems: [],
  }), { status: 400 });
});

test('validateRecommendation rejects invalid items inside history', () => {
  assert.throws(() => validateRecommendation({
    currentItem: { title: 'Top' },
    historyItems: [{ title: { nested: true } }],
  }), { status: 400 });
});

// --- validateVisualization ---

test('validateVisualization accepts 1-4 valid items', () => {
  assert.doesNotThrow(() => validateVisualization({ items: [{ title: 'Top' }] }));
  assert.doesNotThrow(() => validateVisualization({ items: Array(4).fill({ title: 'Item' }) }));
});

test('validateVisualization rejects empty items array', () => {
  assert.throws(() => validateVisualization({ items: [] }), { status: 400 });
});

test('validateVisualization rejects more than 4 items', () => {
  assert.throws(() => validateVisualization({ items: Array(5).fill({ title: 'Item' }) }), { status: 400 });
});

test('validateVisualization rejects non-array items', () => {
  assert.throws(() => validateVisualization({ items: 'not-array' }), { status: 400 });
});

// --- parsePhoto ---

test('parsePhoto accepts a valid PNG data URI', () => {
  // Minimal valid PNG: 8-byte header
  const pngBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const b64 = pngBytes.toString('base64');
  const result = parsePhoto(`data:image/png;base64,${b64}`);
  assert.equal(result.mimeType, 'image/png');
  assert.equal(result.data, b64);
});

test('parsePhoto accepts raw base64 without data URI prefix', () => {
  const pngBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const b64 = pngBytes.toString('base64');
  const result = parsePhoto(b64);
  assert.equal(result.mimeType, 'image/png');
});

test('parsePhoto rejects non-string input', () => {
  for (const value of [null, undefined, 42, {}, []]) {
    assert.throws(() => parsePhoto(value), { status: 400 });
  }
});

test('parsePhoto rejects invalid base64', () => {
  assert.throws(() => parsePhoto('not-valid-base64!!!'), { status: 400 });
});

test('parsePhoto rejects mismatched MIME type in data URI', () => {
  // PNG bytes but declared as JPEG
  const pngBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const b64 = pngBytes.toString('base64');
  assert.throws(() => parsePhoto(`data:image/jpeg;base64,${b64}`), { status: 400 });
});

test('parsePhoto rejects oversized images', () => {
  // Create a string that exceeds the size limit check
  const oversized = 'A'.repeat(Math.ceil(MAX_PHOTO_BYTES / 3) * 4 + 41);
  assert.throws(() => parsePhoto(oversized), { status: 413 });
});

test('parsePhoto rejects unsupported image formats (GIF)', () => {
  const gifBytes = Buffer.from('GIF89a' + '\x00'.repeat(10));
  const b64 = gifBytes.toString('base64');
  assert.throws(() => parsePhoto(b64), { status: 400 });
});

test('MAX_PHOTO_BYTES is 2 MiB', () => {
  assert.equal(MAX_PHOTO_BYTES, 2 * 1024 * 1024);
});
