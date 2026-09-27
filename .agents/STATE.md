## Credential cleanup and maintenance - 2026-09-27

A privileged credential embedded in SUPABASE_SETUP.md was removed by a narrowly scoped history rewrite. The rewrite preserves unrelated file contents, commit messages, identities and parent topology; rewritten commits lose their old signatures. Optional personal security-contact text was also replaced with private reporting guidance.

Credential revocation or rotation remains required and is separate from history cleanup. GitHub pull-request refs, cached commit views and other clones may still retain old history. Do not merge old history back into this repository. Follow GitHub sensitive-data-removal guidance for any remaining copies.

The previous baseline below is historical and does not establish that the repository is free of credentials.

# STATE.md — dejavista

Updated: 2026-09-16

## Current Status
Baseline review complete. No active task in progress.

## Stack
- **Framework**: React 19 + Vite 8
- **Language**: JavaScript (ESM, `"type": "module"`)
- **AI**: @google/genai ^2.12.0
- **Backend/Auth**: @supabase/supabase-js ^2.110.7
- **Build**: vite + custom build-wrapper.js
- **Tests**: Node built-in test runner (*.test.mjs)

## HEAD
`ed6b594` — chore: sync heartbeat [skip ci]

## Open PRs
| # | Title | Branch | Opened |
|---|-------|--------|--------|
| 193 | build(deps): bump actions/setup-python from 6 to 7 | dependabot/github_actions/actions/setup-python-7 | 2026-09-07 |
| 188 | build(deps): bump actions/labeler from 6 to 7 | dependabot/github_actions/actions/labeler-7 | 2026-08-24 |

Both are Dependabot GitHub Actions bumps — low risk, no code changes.

## Open Issues
None.

## Security Scan
No hardcoded secrets found. Token/password references are all runtime auth handling (Bearer token extraction, Supabase session tokens, URL validation).

## Vercel Hold
Active until 2026-09-16 07:14 UTC. No merges to main until then.

## Next Steps
- Dependabot PRs #193 and #188 can be merged after Vercel hold lifts (07:14 UTC 2026-09-16).
- No code fixes required from this baseline pass.
