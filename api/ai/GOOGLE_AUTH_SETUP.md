# Google Cloud Authentication Setup

The active API uses `@google/genai` for both Google AI and Vertex AI. Its bounded
transport is in `lib/ai/generate.js`; `api/ai/utils/auth.js` only parses service
account JSON. The old SDK initializer helpers and their dependencies have been
removed because no application call sites use them.

## Provider configuration

- If `GEMINI_API_KEY` is configured, the API uses Google AI with that key.
- Otherwise, Vertex AI requires `GOOGLE_CLOUD_PROJECT_ID` and service account
  JSON in `GOOGLE_APPLICATION_CREDENTIALS`. `VERTEX_AI_LOCATION` defaults to
  `us-central1`.
- The credential parser accepts a raw JSON object, a JSON-encoded string, or
  outer single quotes. It validates the service account type, project ID,
  client email and private key. It never reads a credential file path.

Configure these as server environment variables in the existing deployment.
Never put service credentials or API keys in `VITE_*` variables or the browser
extension. Changing provider settings requires a separate review of quotas and
cost; dependency cleanup does not change these settings.

## Request behavior

The chosen provider uses the existing request deadline and cancellation signal,
with one SDK attempt per model. Only a missing-model response can try the
existing alternate text-model name when using an API key. Authentication,
capacity, quota and timeout errors do not trigger provider fallback or extra
generation attempts. If neither authentication mode is configured, the API
returns the existing service-unavailable response.

Photo and generation endpoints also require a verified caller bearer token.
An unauthenticated request must be rejected before any provider call. A 401
response therefore does not test whether provider credentials are valid.

## Verification

Run `npm test` for synthetic caller, transport, credential-parser and request
budget checks, then `npm run build` for the extension build. These checks mock
providers and must not perform a paid generation. A Vercel build uses the
existing landing-page branch of `build-wrapper.js`.

Live OAuth and real generation require separate authorized verification. Do
not use production credentials in test fixtures or print them in logs.
