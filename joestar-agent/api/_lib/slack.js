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

async function call(method, token, payload) {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  // Slack answers 200 with { ok: false, error } on failures, so check the body.
  if (!body.ok) throw new Error(`${method} failed: ${body.error}`);
  return body;
}

export function postMessage({ token, channel, text, thread_ts }) {
  return call('chat.postMessage', token, { channel, text, thread_ts });
}

/**
 * Replace the text of a message already posted. Claude takes minutes, so the
 * bot answers immediately with a placeholder and edits it once there is a real
 * answer — the alternative is silence for two minutes, which reads as broken.
 */
export function updateMessage({ token, channel, ts, text }) {
  return call('chat.update', token, { channel, ts, text });
}
