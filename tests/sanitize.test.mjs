import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeString, sanitizeUrl, sanitizeMeta } from '../lib/sanitize.js';

// --- sanitizeString ---

test('sanitizeString returns trimmed string unchanged when within limit', () => {
  assert.equal(sanitizeString('Blue Shirt'), 'Blue Shirt');
});

test('sanitizeString strips HTML tags', () => {
  assert.equal(sanitizeString('<b>Bold</b> text'), 'Bold text');
  assert.equal(sanitizeString('<script>alert("xss")</script>Safe'), 'alert("xss")Safe');
  assert.equal(sanitizeString('No <a href="x">link</a> here'), 'No link here');
});

test('sanitizeString trims whitespace', () => {
  assert.equal(sanitizeString('  padded  '), 'padded');
});

test('sanitizeString truncates to maxLength', () => {
  const long = 'a'.repeat(300);
  assert.equal(sanitizeString(long).length, 200);
  assert.equal(sanitizeString(long, 50).length, 50);
});

test('sanitizeString returns empty string for non-string values', () => {
  assert.equal(sanitizeString(null), '');
  assert.equal(sanitizeString(undefined), '');
  assert.equal(sanitizeString(42), '');
  assert.equal(sanitizeString({}), '');
  assert.equal(sanitizeString(true), '');
});

test('sanitizeString handles empty string', () => {
  assert.equal(sanitizeString(''), '');
});

test('sanitizeString handles string with only HTML tags', () => {
  assert.equal(sanitizeString('<br><hr><img src="x">'), '');
});

// --- sanitizeUrl ---

test('sanitizeUrl accepts valid http and https URLs', () => {
  assert.equal(sanitizeUrl('https://example.com/path'), 'https://example.com/path');
  assert.equal(sanitizeUrl('http://example.com'), 'http://example.com');
  assert.equal(sanitizeUrl('HTTPS://EXAMPLE.COM'), 'HTTPS://EXAMPLE.COM');
});

test('sanitizeUrl trims whitespace', () => {
  assert.equal(sanitizeUrl('  https://example.com  '), 'https://example.com');
});

test('sanitizeUrl rejects non-http protocols', () => {
  assert.equal(sanitizeUrl('ftp://example.com'), '');
  assert.equal(sanitizeUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeUrl('data:text/html,<h1>hi</h1>'), '');
  assert.equal(sanitizeUrl('file:///etc/passwd'), '');
});

test('sanitizeUrl rejects non-string values', () => {
  assert.equal(sanitizeUrl(null), '');
  assert.equal(sanitizeUrl(undefined), '');
  assert.equal(sanitizeUrl(42), '');
  assert.equal(sanitizeUrl({}), '');
});

test('sanitizeUrl truncates URLs longer than 2048 characters', () => {
  const longUrl = 'https://example.com/' + 'a'.repeat(2040);
  assert.equal(sanitizeUrl(longUrl).length, 2048);
});

test('sanitizeUrl returns empty string for empty input', () => {
  assert.equal(sanitizeUrl(''), '');
});

test('sanitizeUrl rejects plain text', () => {
  assert.equal(sanitizeUrl('not a url'), '');
});

// --- sanitizeMeta ---

test('sanitizeMeta returns sanitized fields from valid meta object', () => {
  const result = sanitizeMeta({
    title: '<b>Blue Shirt</b>',
    price: '$49.99',
    brand: 'Zara',
    image: 'https://example.com/shirt.jpg',
  });
  assert.equal(result.title, 'Blue Shirt');
  assert.equal(result.price, '$49.99');
  assert.equal(result.brand, 'Zara');
  assert.equal(result.image, 'https://example.com/shirt.jpg');
});

test('sanitizeMeta returns empty object for null/undefined/non-object', () => {
  assert.deepEqual(sanitizeMeta(null), {});
  assert.deepEqual(sanitizeMeta(undefined), {});
  assert.deepEqual(sanitizeMeta('string'), {});
  assert.deepEqual(sanitizeMeta(42), {});
});

test('sanitizeMeta applies field-specific length limits', () => {
  const result = sanitizeMeta({
    title: 'x'.repeat(300),
    price: 'y'.repeat(100),
    brand: 'z'.repeat(200),
    image: 'https://example.com/' + 'a'.repeat(2040),
  });
  assert.equal(result.title.length, 200);
  assert.equal(result.price.length, 50);
  assert.equal(result.brand.length, 100);
  assert.equal(result.image.length, 2048);
});

test('sanitizeMeta handles missing fields gracefully', () => {
  const result = sanitizeMeta({});
  assert.equal(result.title, '');
  assert.equal(result.price, '');
  assert.equal(result.brand, '');
  assert.equal(result.image, '');
});

test('sanitizeMeta strips HTML from all text fields', () => {
  const result = sanitizeMeta({
    title: '<script>xss</script>Dress',
    price: '<b>$99</b>',
    brand: '<a href="#">Nike</a>',
  });
  assert.equal(result.title, 'xssDress');
  assert.equal(result.price, '$99');
  assert.equal(result.brand, 'Nike');
});

test('sanitizeMeta rejects non-http image URLs', () => {
  const result = sanitizeMeta({ image: 'javascript:alert(1)' });
  assert.equal(result.image, '');
});
