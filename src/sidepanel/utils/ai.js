import { VERCEL_API_URL } from './env.js';

export async function requestAI(supabase, endpoint, body, { timeout = 35000, fetcher = fetch } = {}) {
  if (!supabase) throw new Error('Sign in again to use AI features.');
  if (!['recommend', 'visualize', 'validate-photo'].includes(endpoint)) throw new Error('Unknown AI action.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  let abortListener;
  const timedOut = new Promise((_, reject) => {
    abortListener = () => reject(new Error('AI request timed out. Please try again.'));
    controller.signal.addEventListener('abort', abortListener, { once: true });
  });
  try {
    const { data, error } = await Promise.race([supabase.auth.getSession(), timedOut]);
    if (error || !data?.session?.access_token) throw new Error('Sign in again to use AI features.');
    if (controller.signal.aborted) throw new Error('AI request timed out. Please try again.');
    const response = await Promise.race([fetcher(`${VERCEL_API_URL}/api/ai/${endpoint}`, {
      method: 'POST', signal: controller.signal, redirect: 'error',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify(body),
    }), timedOut]);
    const result = await Promise.race([response.json(), timedOut]);
    if (response.status === 401) throw new Error('Sign in again to use AI features.');
    if (response.status === 429) throw new Error(`Too many AI requests. Try again in ${Number(result.retryAfter) || 60} seconds.`);
    if (!response.ok) throw new Error(result.error || 'AI service is temporarily unavailable.');
    return result;
  } finally {
    clearTimeout(timer);
    controller.signal.removeEventListener('abort', abortListener);
    controller.abort();
  }
}
