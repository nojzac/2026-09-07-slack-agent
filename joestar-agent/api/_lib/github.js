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
export async function mintInstallationToken({ fetchImpl = fetch } = {}) {
  const appId = process.env.GITHUB_APP_ID;
  const installationId = process.env.GITHUB_INSTALLATION_ID;

  const jwt = signAppJwt({ appId, privateKey: readPrivateKey() });

  const res = await fetchImpl(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${jwt}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': API_VERSION,
      },
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
export async function tryMintInstallationToken() {
  if (!isGitHubConfigured()) return { token: null, reason: null };
  try {
    const { token, expiresAt } = await mintInstallationToken();
    console.log('[github] minted installation token, expires', expiresAt);
    return { token, expiresAt };
  } catch (err) {
    // The message is safe to log: it is GitHub's status and message, never the
    // token, and never any part of the key.
    console.error('[github] could not mint a token:', err.message);
    return { token: null, reason: err.message };
  }
}
