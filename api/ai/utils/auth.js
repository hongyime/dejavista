/**
 * Robust Google Cloud authentication utilities
 * Handles both Vertex AI (service account) and Google AI SDK (API key) authentication
 */

/**
 * Parse GOOGLE_APPLICATION_CREDENTIALS from environment variable
 * Supports raw, double-encoded or outer-single-quoted JSON; never reads a file path
 * 
 * @returns {Object|null} Credentials object or null if not available/invalid
 */
export function parseGoogleCredentials() {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!raw) return null;
  try {
    let value = raw.trim();
    // Shell-style outer single quotes are not part of the JSON document.
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    let credentials = JSON.parse(value);
    if (typeof credentials === 'string') credentials = JSON.parse(credentials);
    if (!credentials || credentials.type !== 'service_account' ||
        !['project_id', 'client_email', 'private_key'].every(field => typeof credentials[field] === 'string' && credentials[field].trim())) return null;
    return credentials;
  } catch {
    console.warn('[Auth] Service account JSON is invalid. Check server configuration.');
    return null;
  }
}
