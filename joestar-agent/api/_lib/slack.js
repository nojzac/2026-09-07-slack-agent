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

/**
 * Form-encoded rather than JSON. Not a style choice: several Slack methods —
 * files.getUploadURLExternal among them — do not accept a JSON body and answer
 * `invalid_arguments` if you send one. Form encoding is accepted everywhere.
 */
async function callForm(method, token, params) {
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null) form.set(k, String(v));
  }
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
      authorization: `Bearer ${token}`,
    },
    body: form,
  });
  const body = await res.json();
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

// ---------------------------------------------------------------------------
// Who am I
// ---------------------------------------------------------------------------

let cachedBotUserId;

/**
 * The bot's own user id, needed by the loop guards. Cached on the module: a
 * warm serverless instance handles many events and this never changes, but it
 * is one more round trip in the ack path if you fetch it every time.
 *
 * Deliberately not hard-coded. Reinstalling the app can change it, and a stale
 * constant would disable a loop guard silently — the failure mode being an
 * unbounded spend rather than an error.
 */
export async function getBotUserId({ token }) {
  if (cachedBotUserId) return cachedBotUserId;
  const body = await callForm('auth.test', token, {});
  cachedBotUserId = body.user_id;
  return cachedBotUserId;
}

/** Tests only: the cache outlives a single test otherwise. */
export function __resetBotUserId() {
  cachedBotUserId = undefined;
}

// ---------------------------------------------------------------------------
// Threads
// ---------------------------------------------------------------------------

/**
 * The replies in a thread, oldest first. This is doing two jobs at once: it
 * answers "has the bot posted here, so is this its conversation?" and it is the
 * transcript that gets replayed into the prompt. One call, both answers.
 */
export async function getThreadReplies({ token, channel, ts, limit = 20 }) {
  const body = await callForm('conversations.replies', token, { channel, ts, limit });
  return body.messages ?? [];
}

// ---------------------------------------------------------------------------
// Channel metadata
// ---------------------------------------------------------------------------

/**
 * The channel's topic, or '' if it has none.
 *
 * Requires the `channels:read` scope for public channels and `groups:read` for
 * private ones — neither is in the manifest as of this writing. Without them
 * conversations.info answers `missing_scope` and this throws; callers should
 * treat that as "no repo configured for this channel" rather than a hard
 * failure, the same way a missing GitHub App is treated.
 */
export async function getChannelTopic({ token, channel }) {
  const body = await callForm('conversations.info', token, { channel });
  return body.channel?.topic?.value ?? '';
}

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

/**
 * Add an emoji to a message. A reaction is status: 👀 the moment the event
 * passes the guards, ✅ or ❌ when the run ends.
 *
 * Never throws. A reaction is decoration on top of the real work — failing the
 * whole run because an emoji would not stick is the wrong trade. `already_reacted`
 * in particular is not a problem: it means the desired state already holds.
 */
export async function addReaction({ token, channel, timestamp, name }) {
  try {
    await call('reactions.add', token, { channel, timestamp, name });
    return true;
  } catch (err) {
    if (!/already_reacted/.test(err.message)) {
      console.warn(`[slack] reaction ${name} failed:`, err.message);
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// Files in
// ---------------------------------------------------------------------------

/**
 * Download a file a user attached, using its url_private.
 *
 * THE TRAP: a url_private fetch without sufficient permission does not 401. It
 * returns HTTP 200 and an HTML sign-in page, so status-code checking sees
 * success and hands you a web page where the screenshot should be — and the
 * model then confidently describes a login form. The content-type is the only
 * reliable signal. An HTML answer means a missing files:read scope, or the bot
 * not being in the channel.
 */
export async function downloadFile({ token, url }) {
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);

  const contentType = res.headers.get('content-type') ?? '';
  if (/^text\/html/i.test(contentType)) {
    throw new Error(
      'download returned an HTML sign-in page, not file bytes — check the files:read scope and that the bot is in the channel',
    );
  }

  return new Uint8Array(await res.arrayBuffer());
}

// ---------------------------------------------------------------------------
// Files out
// ---------------------------------------------------------------------------

/**
 * files.upload (v1) was retired in March 2025, so getting a file into a
 * thread is a three-step v2 dance: ask for a URL (this function), POST the
 * bytes to it, then tell Slack the upload is complete and where to share it
 * (completeUpload below). (Ray's prompt calls step two a PUT; Slack's docs
 * say POST, and POST is what works.)
 *
 * Split out from the single-shot uploadFile below so the middle step — the
 * actual POST of bytes — can happen somewhere other than this process. A
 * sandbox streaming a 40 MB output file straight to this URL never has to
 * hand those bytes to the function; the function only ever sees this small
 * JSON response and, later, the file_id.
 */
export async function getUploadURL({ token, filename, length }) {
  if (!length) throw new Error(`refusing to upload an empty file: ${filename}`);
  const { upload_url, file_id } = await callForm('files.getUploadURLExternal', token, {
    filename,
    length,
  });
  return { upload_url, file_id };
}

/**
 * Step three of the v2 dance: tell Slack an upload is done and where to share
 * it. channel_id and thread_ts belong here, not on getUploadURL — the file
 * exists after step two but is shared nowhere until this call.
 */
export function completeUpload({ token, channel_id, thread_ts, file_id, title }) {
  return call('files.completeUploadExternal', token, {
    files: [{ id: file_id, title: title ?? file_id }],
    channel_id,
    thread_ts,
  });
}

/**
 * Upload a file to a thread in one call, POSTing the bytes from this process.
 * Fine for small files the function already holds in memory; the sandbox
 * output path bypasses this and calls getUploadURL / completeUpload directly
 * around a POST made from inside the sandbox instead. Hand-rolled rather than
 * via @slack/web-api's files.uploadV2, to keep this function's bundle to the
 * two dependencies it already has — see TRAPS.md on what a surprise
 * dependency did here in lesson 05.
 */
export async function uploadFile({ token, channel_id, thread_ts, filename, title, bytes }) {
  const length = bytes.byteLength ?? bytes.length;
  const { upload_url, file_id } = await getUploadURL({ token, filename, length });

  const sent = await fetch(upload_url, { method: 'POST', body: bytes });
  if (!sent.ok) throw new Error(`upload POST to ${filename} failed: HTTP ${sent.status}`);

  return completeUpload({ token, channel_id, thread_ts, file_id, title: title ?? filename });
}
