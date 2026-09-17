// Playwright version installed into the sandbox image (e2b/template.mjs) and
// quoted in the model's briefing about it (api/_lib/thread.js). One constant
// so the two cannot drift apart — see TRAPS.md on hard-coded facts aging.
export const PLAYWRIGHT_VERSION = '1.63.0';

// Postgres major version installed into the sandbox image (e2b/template.mjs).
// node:24 is Debian bookworm, whose postgresql package resolves to major 15 —
// apt can only be pinned sensibly to the major here, not an exact point
// release. The Redis package has no equivalent constant: it is pinned only by
// whatever version bookworm's redis-server package happens to carry.
export const POSTGRES_MAJOR = '15';
