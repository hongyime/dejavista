import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

// Mock external dependencies so the module can be imported without network/credentials.
mock.module('@google/genai', { namedExports: { GoogleGenAI: class {} } });
mock.module('../api/ai/utils/auth.js', { namedExports: { parseGoogleCredentials: () => null } });

const { parseAIObject } = await import('../lib/ai/generate.js');

// --- parseAIObject: response.text path ---

test('parseAIObject parses a plain JSON text response', () => {
  const result = parseAIObject({ text: '{"recommendedItemId":"item-1","reasoning":"Great match"}' });
  assert.equal(result.recommendedItemId, 'item-1');
  assert.equal(result.reasoning, 'Great match');
});

test('parseAIObject strips markdown code fences around JSON', () => {
  const result = parseAIObject({ text: '```json\n{"valid":true,"reasoning":"OK"}\n```' });
  assert.equal(result.valid, true);
  assert.equal(result.reasoning, 'OK');
});

test('parseAIObject strips code fences without language tag', () => {
  const result = parseAIObject({ text: '```\n{"key":"value"}\n```' });
  assert.equal(result.key, 'value');
});

test('parseAIObject handles whitespace around code fences', () => {
  const result = parseAIObject({ text: '  ```json  \n  {"a":1}  \n  ```  ' });
  assert.equal(result.a, 1);
});

// --- parseAIObject: candidates path ---

test('parseAIObject extracts text from candidates structure', () => {
  const result = parseAIObject({
    candidates: [{ content: { parts: [{ text: '{"found":true}' }] } }],
  });
  assert.equal(result.found, true);
});

test('parseAIObject prefers response.text over candidates', () => {
  const result = parseAIObject({
    text: '{"source":"text"}',
    candidates: [{ content: { parts: [{ text: '{"source":"candidates"}' }] } }],
  });
  assert.equal(result.source, 'text');
});

// --- parseAIObject: error cases ---

test('parseAIObject rejects non-JSON text with status 502', () => {
  assert.throws(() => parseAIObject({ text: 'This is not JSON at all' }), { status: 502 });
});

test('parseAIObject rejects empty text with status 502', () => {
  assert.throws(() => parseAIObject({ text: '' }), { status: 502 });
});

test('parseAIObject rejects text exceeding 16384 characters', () => {
  assert.throws(() => parseAIObject({ text: '{"a":"' + 'x'.repeat(16380) + '"}' }), { status: 502 });
});

test('parseAIObject rejects JSON arrays (must be object)', () => {
  assert.throws(() => parseAIObject({ text: '[1,2,3]' }), { status: 502 });
});

test('parseAIObject rejects JSON primitives (string)', () => {
  assert.throws(() => parseAIObject({ text: '"just a string"' }), { status: 502 });
});

test('parseAIObject rejects JSON null', () => {
  assert.throws(() => parseAIObject({ text: 'null' }), { status: 502 });
});

test('parseAIObject rejects missing text and candidates', () => {
  assert.throws(() => parseAIObject({}), { status: 502 });
});

test('parseAIObject handles nested objects correctly', () => {
  const result = parseAIObject({ text: '{"outer":{"inner":"value"},"list":[1,2]}' });
  assert.deepEqual(result.outer, { inner: 'value' });
  assert.deepEqual(result.list, [1, 2]);
});
