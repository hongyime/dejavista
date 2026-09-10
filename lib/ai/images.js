import { lookup } from 'node:dns/promises';
import https from 'node:https';
import { isIP } from 'node:net';
import { imageMime, MAX_PHOTO_BYTES } from './inputs.js';
import { RequestError } from './request.js';

export function isPublicAddress(address) {
  if (isIP(address) === 4) {
    const [a,b,c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || (b === 0 && c <= 2) || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
  }
  if (isIP(address) === 6) {
    const [first, second = '0'] = address.toLowerCase().split(':');
    const prefix = parseInt(first,16), next = parseInt(second || '0',16);
    return prefix >= 0x2000 && prefix <= 0x3fff && prefix !== 0x2002 && prefix !== 0x3fff &&
      !(prefix === 0x2001 && (next < 0x200 || next === 0xdb8));
  }
  return false;
}

export function imageURL(value) {
  let url;
  try { url = new URL(value); } catch { throw new RequestError(400, 'Clothing images must use a public HTTPS URL.'); }
  if (url.protocol !== 'https:' || (url.port && url.port !== '443') || url.username || url.password) throw new RequestError(400, 'Clothing images must use a public HTTPS URL.');
  return url;
}

export async function resolveImageURL(value, budget, resolve = lookup) {
  const url = imageURL(value);
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const records = isIP(hostname) ? [{address:hostname,family:isIP(hostname)}] : await budget.run(() => resolve(hostname, { all: true }));
  if (!records.length || records.some(record => !isPublicAddress(record.address))) throw new RequestError(400, 'This image address is not allowed.');
  return { url, address: records[0] };
}

export async function fetchImage(value, budget, { resolve = lookup, request = https.request } = {}) {
  let url = imageURL(value);
  for (let redirects = 0; redirects <= 3; redirects++) {
    budget.remaining();
    const { address } = await resolveImageURL(url.href, budget, resolve);
    const result = await budget.run(() => new Promise((accept, reject) => {
      const req = request(url, {
        method: 'GET', signal: budget.signal,
        headers: { Accept: 'image/jpeg, image/png, image/webp', 'Accept-Encoding': 'identity' },
        // Pin the validated DNS result. The hostname is retained for TLS and Host.
        lookup: (_hostname, options, callback) => callback(null, options.all ? [address] : address.address, address.family),
      }, response => {
        if ([301,302,303,307,308].includes(response.statusCode)) {
          const location = response.headers.location;
          response.destroy();
          return location ? accept({location}) : reject(new RequestError(502, 'Image redirect is invalid.'));
        }
        if (response.statusCode !== 200 || Number(response.headers['content-length'] || 0) > MAX_PHOTO_BYTES) {
          response.destroy(); return reject(new RequestError(502, 'Image is unavailable or larger than 2 MiB.'));
        }
        const chunks=[]; let bytes=0;
        response.on('data', chunk => {
          bytes += chunk.length;
          if (bytes > MAX_PHOTO_BYTES) { response.destroy(); reject(new RequestError(502, 'Image is larger than 2 MiB.')); }
          else chunks.push(chunk);
        });
        response.on('error', reject);
        response.on('aborted', () => reject(new RequestError(502, 'Image download was interrupted.')));
        response.on('end', () => accept({bytes:Buffer.concat(chunks)}));
      });
      req.on('error', reject);
      req.end();
    }));
    if (result.location) { url = imageURL(new URL(result.location, url).href); continue; }
    const mimeType = imageMime(result.bytes);
    if (!mimeType) throw new RequestError(502, 'Image format is not supported.');
    return { mimeType, data: result.bytes.toString('base64') };
  }
  throw new RequestError(502, 'Image has too many redirects.');
}
