import { createSign } from 'node:crypto';

/**
 * Short-lived GitHub credentials for the sandbox.
 *
 * The whole design is one separation: this module runs in the Vercel function
 * and holds the App's private key, which mints tokens. The sandbox never sees
 * it. The sandbox gets an installation token — a capability that expires in an
 * hour and reaches only the repositories the App was installed on.
 *
 * Leak the token and you lose an hour on those repos. Leak the key and you lose
 * the App. That asymmetry is why the key does not cross the line.
 */

// GitHub's REST API is date-versioned. 2022-11-28 is not the newest (the current
// release is 2026-03-10) but it is supported through 10 March 2028 and is what
// an unversioned request defaults to. Pinning it deliberately beats inheriting
// whatever the default becomes later. Check the current table before changing:
// docs.github.com/en/rest/about-the-rest-api/api-versions
const API_VERSION = '2022-11-28';

// GitHub rejects a JWT more than 10 minutes out. Nine leaves margin.
const JWT_LIFETIME_SECONDS = 9 * 60;
// ...and rejects future-dated ones, so backdate to absorb clock skew.
const JWT_BACKDATE_SECONDS = 60;

/**
 * Pull an `owner/repo` out of a channel topic.
 *
 * Accepts a bare `owner/repo`, a github.com URL, or either sitting anywhere
 * inside a longer topic string (topics carry other things too — an emoji, a
 * one-line description). Returns null rather than guessing when nothing
 * matches, so a channel with an unrelated topic gets no GitHub access instead
 * of a wrong repo.
 */
export function repoFromTopic(topic) {
  const text = String(topic ?? '');
  const urlMatch = text.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?=[/\s)]|$)/i);
  if (urlMatch) return `${urlMatch[1]}/${urlMatch[2]}`;

  const bareMatch = text.match(/(?:^|\s)([\w.-]+)\/([\w.-]+)(?=\s|$)/);
  if (bareMatch) {
    const [, owner, name] = bareMatch;
    // Ordinary prose slips through the shape check too: "and/or", "24/7",
    // "his/her" all look like owner/repo. Both-numeric and a short list of
    // common connector phrases catch the frequent offenders without touching
    // real slugs, which almost always carry a hyphen, dot, or a longer word.
    const bothNumeric = /^\d+$/.test(owner) && /^\d+$/.test(name);
    const commonPhrase = /^(?:and|or|either|neither|him|her|his|yes|no|true|false|on|off|up|down|in|out|win|lose|pass|fail|black|white)\/(?:and|or|either|neither|him|her|his|yes|no|true|false|on|off|up|down|in|out|win|lose|pass|fail|black|white)$/i;
    if (bothNumeric || commonPhrase.test(`${owner}/${name}`)) return null;
    return `${owner}/${name}`;
  }

  return null;
}

/**
 * Is a GitHub App configured at all?
 *
 * This distinguishes "the feature is off" from "the feature is broken", which
 * matters for what the bot says in Slack: nobody who has not set up a GitHub App
 * should get a warning about GitHub on every message.
 */
export function isGitHubConfigured() {
  return Boolean(
    process.env.GITHUB_APP_ID &&
      process.env.GITHUB_INSTALLATION_ID &&
      process.env.GITHUB_APP_PRIVATE_KEY,
  );
}

/**
 * The App's private key, decoded.
 *
 * Despite the variable name, GITHUB_APP_PRIVATE_KEY holds base64, not PEM. A
 * .pem is multiline and multiline values do not survive the round trip into an
 * environment variable reliably, so it is encoded to one line on the way in.
 *
 * The explicit -----BEGIN check is worth its three lines: without it, a raw .pem
 * pasted into that variable fails later inside OpenSSL as
 * `error:1E08010C:DECODER routines::unsupported`, which names nothing and sends
 * you looking at your JWT code.
 */
function readPrivateKey() {
  const decoded = Buffer.from(process.env.GITHUB_APP_PRIVATE_KEY, 'base64').toString('utf8');
  if (!decoded.startsWith('-----BEGIN')) {
    throw new Error(
      'GITHUB_APP_PRIVATE_KEY does not decode to a PEM — it is expected to hold the ' +
        "App's .pem base64-encoded on a single line (base64 -i key.pem | tr -d '\\n')",
    );
  }
  return decoded;
}

const base64url = buf =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/**
 * An RS256 JWT saying "I am this App", signed with the private key.
 *
 * Hand-rolled rather than pulling in a JWT library: it is fifteen lines, and
 * this function has already been broken once by a dependency that worked
 * locally and died in Vercel's bundler (see TRAPS.md, lesson 05). Three claims
 * is the entire specification.
 */
export function signAppJwt({ appId, privateKey, now = Math.floor(Date.now() / 1000) }) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iat: now - JWT_BACKDATE_SECONDS,
    exp: now + JWT_LIFETIME_SECONDS,
    iss: appId,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = createSign('RSA-SHA256').update(signingInput).end().sign(privateKey);
  return `${signingInput}.${base64url(signature)}`;
}

/**
 * Exchange the JWT for an installation token: the credential that actually
 * works against repositories.
 *
 * One hour, fixed, not extendable — which is fine, because a sandbox lives
 * minutes. The token is never logged and its format is never parsed; treat it
 * as an opaque string.
 */
export async function mintInstallationToken({ fetchImpl = fetch, repo = null, repos = null } = {}) {
  const appId = process.env.GITHUB_APP_ID;
  const installationId = process.env.GITHUB_INSTALLATION_ID;

  const jwt = signAppJwt({ appId, privateKey: readPrivateKey() });
  const authHeaders = {
    authorization: `Bearer ${jwt}`,
    accept: 'application/vnd.github+json',
    'x-github-api-version': API_VERSION,
  };

  // `repo` is the old single-name shape, kept for existing callers; `repos`
  // is the list. Either way it collapses to a list below.
  //
  // Every entry must be exactly "owner/name" — one slash, both halves
  // non-empty. Anything else throws here, before any network call. Silently
  // filtering out a malformed entry (a memory repo typed without an owner,
  // say) would leave the caller's non-empty list looking honoured while this
  // function actually mints for zero repos, and zero repos means GitHub
  // hands back a token for *every* repo the App is installed on — a filter
  // that fails open. A "owner/repo/extra" entry is refused the same way: it
  // does not match the pattern, so it can't silently truncate to "repo".
  const rawList = repos ?? (repo ? [repo] : []);
  const REPO_NAME_PATTERN = /^[\w.-]+\/[\w.-]+$/;
  for (const entry of rawList) {
    if (!entry || !REPO_NAME_PATTERN.test(entry)) {
      throw new Error(`refusing to mint: invalid repo name "${entry}"`);
    }
  }
  // Dedupe so a memory repo that happens to equal the topic repo doesn't get
  // sent twice.
  const repoList = [...new Set(rawList)];

  // With no repos, the token reaches every repository the App is installed on
  // (today's behaviour). With any, GitHub scopes the token down to just them —
  // the boundary becomes an access boundary, not just a label.
  let repoNames = [];
  if (repoList.length) {
    // The owner half of every entry is part of that boundary too. Without this
    // check, a name like "someone-else/joestar-sandbox" would still mint a
    // token for *our* installation's joestar-sandbox — the repo name matches,
    // but nobody asked us to reach into someone else's account. Confirm the
    // installation's own account before trusting any repo name at all — one
    // lookup, checked against every entry in the list.
    const installRes = await fetchImpl(
      `https://api.github.com/app/installations/${installationId}`,
      { method: 'GET', headers: authHeaders },
    );
    const installBody = await installRes.json().catch(() => ({}));
    if (!installRes.ok) {
      throw new Error(
        `github installation lookup failed: ${installRes.status} ${installBody.message ?? ''}`,
      );
    }
    const installOwner = installBody.account?.login;

    for (const entry of repoList) {
      const [owner, name] = entry.split('/');
      if (!installOwner || installOwner.toLowerCase() !== owner.toLowerCase()) {
        throw new Error(
          `refusing to mint: "${entry}" names owner "${owner}", installation belongs to "${installOwner ?? 'unknown'}"`,
        );
      }
      repoNames.push(name);
    }
  }

  const res = await fetchImpl(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: repoNames.length ? JSON.stringify({ repositories: repoNames }) : undefined,
    },
  );

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Surface GitHub's own message plus the status. The two common failures are
    // unambiguous once you know them: 401 is a bad JWT or a skewed clock, 404 is
    // the wrong installation id (easy, since the App id is also numeric).
    const hint =
      res.status === 401
        ? ' — bad JWT or clock skew'
        : res.status === 404
          ? ' — wrong GITHUB_INSTALLATION_ID? (it is not the App ID)'
          : '';
    throw new Error(`github token mint failed: ${res.status} ${body.message ?? ''}${hint}`);
  }

  return { token: body.token, expiresAt: body.expires_at };
}

/**
 * Mint a token, or explain why not — without ever taking the request down.
 *
 * Returns { token } on success, { token: null, reason } otherwise. GitHub access
 * is one capability among several; a bot that cannot answer "what is 2 + 2?"
 * because an unrelated credential expired is worse than one that answers and
 * says GitHub is unavailable.
 */
export async function tryMintInstallationToken({ repo = null, repos = null } = {}) {
  if (!isGitHubConfigured()) return { token: null, reason: null };
  const repoList = repos ?? (repo ? [repo] : []);
  try {
    const { token, expiresAt } = await mintInstallationToken({ repos: repoList });
    console.log('[github] minted installation token, expires', expiresAt, repoList.length ? `scoped to ${repoList.join(', ')}` : '(all installed repos)');
    return { token, expiresAt };
  } catch (err) {
    // The message is safe to log: it is GitHub's status and message, never the
    // token, and never any part of the key.
    console.error('[github] could not mint a token:', err.message);
    return { token: null, reason: err.message };
  }
}
