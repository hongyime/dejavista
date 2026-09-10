# AUDIT.md — dejavista

## 2026-09-10 — AI endpoint diagnosis (confirmed)

Expected: only a verified signed-in user can spend AI requests or access their
reference photo; malformed inputs fail before provider work, and credential
values never enter logs. Baseline: `ac354f4ce5b80350d31ba9c74bad5dcfd5d648eb`.

Observed in isolated VM probes against that source:

- `visualize.js` returned 200 without an Authorization header and requested the
  photo path of the synthetic owner supplied in the body. Its service client
  reads storage before any authentication/ownership check.
- The process-local limiter accepted 20 requests with 20 invented user IDs.
  Its CommonJS export also raises ReferenceError when evaluated as native ESM,
  the module format declared in package.json. A fixture export adapter was used
  to inspect the handler independently; this does not establish a live crash.
- `parseGoogleCredentials()` logged a marker from malformed synthetic JSON and
  changed two spaces inside a valid string to one. Whole-string whitespace
  replacement and logging the rejected prefix are the confirmed causes.
- Source inspection: all three AI POST handlers omit caller verification;
  validation destructures unguarded input and hardcodes JPEG; visualization
  fetches arbitrary URLs without byte limits and its timeout race does not
  abort generation. Recommendation can attempt multiple providers without an
  overall deadline. SettingsTab uses VERCEL_API_URL without importing it.
- Further source inspection: MirrorTab uses React state/effect/memo hooks without
  importing them. A production build alone cannot detect these missing runtime
  bindings; component rendering must be included in verification.

Evidence: `deja-ai-baseline-probes.json` in the portfolio maintenance artifacts;
probe source `diagnose-deja-ai.mjs`. All storage/provider results were synthetic;
no environment file, real photo, account record or paid generation was used.

Fix and verification plan: verify the caller through Supabase Auth, derive
ownership from that response, bound inputs and per-user burst tracking, propagate
request deadlines, restrict and bound remote image downloads, and retain
credential string contents without logging them. Update all extension AI calls
with session authorization and test missing/invalid users, owner mismatch,
provider failures/timeouts, payload sizes, and successful synthetic flows.
Build the extension and landing page before release. Process-local limits alone
cannot guarantee a global quota or a sustainable free tier.

Reference: https://supabase.com/docs/reference/javascript/auth-getuser

### Implementation and verification

The handlers now verify Supabase users, reject mismatched owners, and access
Storage using the caller's JWT. Live policy-definition inspection confirmed the
existing SELECT policy checks the first photo-path folder against auth.uid();
no object names or user records were queried. All three extension callers send
their current session. The missing Mirror hooks and cached selected-pose binding
are fixed, and token-bearing OAuth redirects are no longer logged.

Thirty synthetic regressions pass, including the real Supabase SDK against a
fake Auth/Storage transport, private-address and redirect rejection, streamed
image byte limits, credential preservation, deadlines, and caller isolation.
A clean npm install and both fixture extension builds passed. Browser fixtures
at 1440px and 390px exercised recommendations, try-on, photo validation/upload
and cached result restoration with no unexpected network requests or page errors.

The already-installed Google GenAI SDK provides request abort signals and an
explicit one-attempt transport policy for both Google credential modes. Local
waiting is bounded; cancellation cannot reverse remote computation or charges.
Only missing-model errors can advance to one alias. Older Vertex 1.5 model
references are replaced by the existing 2.5 Flash text model. See the
[SDK transport options](https://googleapis.github.io/js-genai/release_docs/interfaces/types.HttpOptions.html).

Release preparation is in progress. Live OAuth, paid generation and billed
savings are unverified. Process-local limits are not a distributed spending cap.

Generated: 20260524

## 0. FILESYSTEM HEALTH REPORT
No corrupted, orphaned, or sync artifact files detected.

## 1. MASTER FEATURE MAP
| File | Size |
|------|------|
| build-extension.js | 2877 bytes |
| build-wrapper.js | 1567 bytes |
| index.html | 18359 bytes |
| vite.config.js | 2471 bytes |
| api/ai/recommend.js | 12218 bytes |
| api/ai/validate-photo.js | 5692 bytes |
| api/ai/visualize.js | 8437 bytes |
| api/ai/utils/auth.js | 5477 bytes |
| api/ai/utils/rate-limit.js | 3704 bytes |
| api/ai/visualize/[jobId].js | 2490 bytes |
| api/types/index.js | 2585 bytes |
| public/index.html | 17075 bytes |
| scripts/generate-icons.js | 1372 bytes |
| src/constants.js | 6255 bytes |
| src/background/background.js | 8359 bytes |
| src/content/gaze-tracker.js | 8936 bytes |
| src/content/intent-scorer.js | 8744 bytes |
| src/sidepanel/App.jsx | 1500 bytes |
| src/sidepanel/sidepanel.html | 687 bytes |
| src/sidepanel/sidepanel.jsx | 246 bytes |
| src/sidepanel/styles.css | 9471 bytes |
| src/sidepanel/components/ClosetTab.jsx | 3279 bytes |
| src/sidepanel/components/ErrorBoundary.jsx | 3301 bytes |
| src/sidepanel/components/MirrorTab.jsx | 25360 bytes |
| src/sidepanel/components/Navigation.jsx | 704 bytes |

Total: 35 source files | Language: React/TypeScript

## 2. RECONCILIATION SUMMARY
Documentation exists and describes project purpose.

## 3-5. GAPS / GHOSTS / DRIFT
No critical gaps identified.

## 6. DATA INTEGRITY
N/A — no databases detected.

## 7. CODE QUALITY FINDINGS
No P0/P1 issues. Project follows standard conventions for its language (React/TypeScript).

## 8. STRUCTURAL REORGANIZATION
No reorganization needed — structure appropriate for project size (35 files).

## 9. PRODUCTION READINESS
N/A — personal/educational project.

## 10. REMEDIATION ROADMAP
No critical actions required.
