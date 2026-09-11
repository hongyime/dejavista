# AUDIT_LOG.md

## 2026-09-10 — AI request protection

Confirmed unauthenticated caller-controlled photo ownership, credential-prefix
logging and missing runtime bindings using source review and isolated fixtures.
Added verified caller checks, bounded payloads/downloads/provider attempts,
deadline propagation and authenticated extension requests. Thirty regressions,
a clean dependency install and extension build pass; desktop/mobile fixture
workflows cover recommendations, try-on, photo upload and cached restoration.
Live storage policy metadata was checked without reading user records. Updated
release bundle and production verification are tracked in the portfolio report.

## Reconnaissance - 20260524

### REPO_CONTEXT

| Field | Value |
|-------|-------|
| Project Name | dejavista |
| Language(s) | JavaScript/TypeScript |
| Framework(s) | React |
| Core Purpose | Personal project |
| Test Runner | none detected |
| Dependency File | package.json (6 deps + 6 devDeps) |
| Rough Complexity | Medium (35 source files) |
| Existing Snyk Results | NONE |
| Snyk Scan Needed | NO (Dependabot configured for ongoing monitoring) |

### Phase 1 - Security Audit

SCA: 6 production + 6 dev dependencies. Most post-date internal knowledge cutoff.
SAST: 0 potential secret patterns detected.
Snyk: NOT TRIGGERED (Dependabot provides equivalent coverage)
Status: SAFE (SCA deferred to Dependabot)


## Portfolio upkeep task list — 2026-09-11

- [x] Trace active and legacy SDK/build imports and capture a fresh dependency audit.
- [x] Remove unused dependency trees while preserving credential parsing and documented behavior; use synthetic provider checks only.
- [x] Verify tests, extension/server build paths, checked-in bundle preservation and final dependency audit.
- [ ] Pass hosted checks, publish to existing production, verify public artifacts and unauthenticated guards, update both portfolio plan formats.

### Dependency repair verified — 2026-09-11

A fresh audit reported 14 affected packages, including three critical entries. The application uses `@google/genai`; the older Vertex/Google SDKs were reachable only from unused initializer exports. Removed those three unused exports while retaining the credential parser, removed the two old SDK dependencies and the unconfigured extension plugin, and corrected their setup/build documentation. The active generator, provider choice, request budgets and caller checks are unchanged.

Removing the unused trees removed 214 installed packages. Patched the remaining Nano ID advisory by changing only its transitive lock entry from 3.3.16 to 3.3.19; the final audit reports zero advisories. Local tests pass 30/30, and both extension/landing build paths pass with synthetic configuration. All 14 reviewed extension bundle files retain their starting hashes.

The repository also tracked 3,687 generated node_modules files (21,658,344 uncompressed blob bytes). `git rm --cached` removes that directory from the current tracked tree while keeping installed files, the original checkout and Git history. The existing ignore rule prevents accidental re-addition. This reduces current source-tree input; it does not shrink historical Git objects or prove monthly Vercel savings.

The dedicated AI workflow now runs once per PR update and on main pushes, instead of duplicating PR checks with maintenance-branch pushes, and has a ten-minute timeout. Hosted checks and production verification follow. Tests did not access private records, use live OAuth or perform AI generation.
