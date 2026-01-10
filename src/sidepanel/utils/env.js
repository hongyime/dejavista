// Environment variable helper
// In Chrome extensions, we need to handle env vars differently
export function getEnvVar(key) {
  // Try import.meta.env first (Vite)
  if (import.meta.env[key]) {
    return import.meta.env[key];
  }
  
  // Fallback to window (if injected)
  if (typeof window !== 'undefined' && window.__ENV__?.[key]) {
    return window.__ENV__[key];
  }
  
  return null;
}

export const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL') || '';
export const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY') || '';
export const VERCEL_API_URL = getEnvVar('VITE_VERCEL_API_URL') || '';
