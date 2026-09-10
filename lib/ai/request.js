import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, createRateLimitHeaders } from '../../api/ai/utils/rate-limit.js';

export class RequestError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function createBudget(milliseconds = 25000) {
  const controller = new AbortController();
  const end = Date.now() + milliseconds;
  const timer = setTimeout(() => controller.abort(), milliseconds);
  return {
    signal: controller.signal,
    remaining() {
      const remaining = end - Date.now();
      if (controller.signal.aborted || remaining <= 0) throw new RequestError(504, 'AI request timed out. Please try again.');
      return remaining;
    },
    async run(operation) {
      this.remaining();
      let onAbort;
      const expired = new Promise((_, reject) => {
        onAbort = () => reject(new RequestError(504, 'AI request timed out. Please try again.'));
        controller.signal.addEventListener('abort', onAbort, { once: true });
      });
      try { return await Promise.race([Promise.resolve().then(operation), expired]); }
      finally { controller.signal.removeEventListener('abort', onAbort); }
    },
    dispose() { clearTimeout(timer); controller.abort(); },
  };
}

export function protectAI(handler, { endpoint, maxBytes = 128 * 1024, limit = 10, method = 'POST', validate = () => {} }) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', `${method}, OPTIONS`);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== method) {
      res.setHeader('Allow', `${method}, OPTIONS`);
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const authorization = req.headers?.authorization;
    if (typeof authorization !== 'string' || authorization.length > 8192 || !/^Bearer [A-Za-z0-9._~-]+$/i.test(authorization)) {
      return res.status(401).json({ error: 'Sign in again to use AI features.' });
    }
    const budget = createBudget();
    try {
      const body = req.body;
      if (method === 'POST') {
        if (!/^application\/json(?:\s*;|$)/i.test(req.headers?.['content-type'] || '')) throw new RequestError(415, 'Send application/json.');
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new RequestError(400, 'Expected a JSON object.');
        if (Buffer.byteLength(JSON.stringify(body)) > maxBytes) throw new RequestError(413, 'Request is too large.');
        validate(body);
      }
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
      if (!url || !key) throw new RequestError(503, 'Authentication service is unavailable.');
      const token = authorization.slice(7);
      const supabase = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        global: {
          headers: { Authorization: `Bearer ${token}` },
          fetch: (input, options = {}) => fetch(input, {
            ...options,
            signal: AbortSignal.any([budget.signal, AbortSignal.timeout(Math.min(5000, budget.remaining())), ...(options.signal ? [options.signal] : [])]),
          }),
        },
      });
      const { data, error } = await budget.run(() => supabase.auth.getUser(token));
      if (error) {
        if (error.status >= 500 || !error.status) throw new RequestError(503, 'Authentication service is unavailable.');
        throw new RequestError(401, 'Sign in again to use AI features.');
      }
      const user = data?.user;
      if (!user || user.is_anonymous || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) throw new RequestError(401, 'Sign in again to use AI features.');
      if (body?.userId !== undefined && body.userId !== user.id) throw new RequestError(403, 'This request belongs to another user.');
      const rate = checkRateLimit(`${endpoint}:${user.id}`, { maxRequests: limit, windowMs: 60000 });
      for (const [name, value] of Object.entries(createRateLimitHeaders(rate))) res.setHeader(name, value);
      if (!rate.allowed) return res.status(429).json({ error: 'Too many requests. Please wait before trying again.', retryAfter: rate.retryAfter });
      return await handler(req, res, { user, supabase, budget });
    } catch (error) {
      const status = budget.signal.aborted ? 504 : error instanceof RequestError ? error.status : 502;
      return res.status(status).json({ error: status === 504 ? 'AI request timed out. Please try again.' : error instanceof RequestError ? error.message : 'AI service is temporarily unavailable. Please try again.' });
    } finally { budget.dispose(); }
  };
}
