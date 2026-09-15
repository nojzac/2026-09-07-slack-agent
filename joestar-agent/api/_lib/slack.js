import { createHmac, timingSafeEqual } from 'node:crypto';

const FIVE_MINUTES = 60 * 5;

/**
 * Slack signs every request with the app's signing secret. Verify it before
 * trusting anything in the body: without this, anyone who finds the URL can
 * make the bot post.
 */
export function verifySlackSignature({ signingSecret, signature, timestamp, rawBody }) {
  if (!signingSecret || !signature || !timestamp) return false;

  // Reject replays of an old, already-valid request.
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > FIVE_MINUTES) return false;

  const expected =
    'v0=' + createHmac('sha256', signingSecret).update(`v0:${timestamp}:${rawBody}`).digest('hex');

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function postMessage({ token, channel, text, thread_ts }) {
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ channel, text, thread_ts }),
  });
  const body = await res.json();
  // Slack answers 200 with { ok: false, error } on failures, so check the body.
  if (!body.ok) throw new Error(`chat.postMessage failed: ${body.error}`);
  return body;
}
