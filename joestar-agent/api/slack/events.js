import { waitUntil } from '@vercel/functions';
import { verifySlackSignature, postMessage, updateMessage } from '../_lib/slack.js';
import { runClaude } from '../_lib/claude.js';

// Claude takes minutes, not milliseconds. The function must outlive the 200 we
// send Slack, so ask for the longest window the plan allows.
export const maxDuration = 300;

const THINKING = '_thinking…_';

/** Strip the leading <@U123> mention so Claude gets the question, not the ping. */
export function promptFrom(text) {
  return String(text ?? '').replace(/<@[A-Z0-9]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Only POST is exported, so anything else gets a 405 without reaching this code.
export async function POST(request) {
  // A missing variable is a deploy mistake, not a forged request — say so,
  // rather than letting it surface as an indistinguishable 401.
  if (!process.env.SLACK_SIGNING_SECRET || !process.env.SLACK_BOT_TOKEN) {
    console.error('[slack] missing SLACK_SIGNING_SECRET or SLACK_BOT_TOKEN');
    return new Response('server misconfigured', { status: 500 });
  }

  const rawBody = await request.text();

  const ok = verifySlackSignature({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    signature: request.headers.get('x-slack-signature'),
    timestamp: request.headers.get('x-slack-request-timestamp'),
    rawBody,
  });
  if (!ok) return new Response('invalid signature', { status: 401 });

  const payload = JSON.parse(rawBody);
  console.log('[slack] received', {
    type: payload.type,
    event: payload.event?.type,
    retry: request.headers.get('x-slack-retry-num'),
  });

  // One-off handshake when the URL is first saved in the Slack app config.
  if (payload.type === 'url_verification') {
    return Response.json({ challenge: payload.challenge });
  }

  // Slack retries anything it thinks failed; don't run Claude twice.
  if (request.headers.get('x-slack-retry-num')) {
    return new Response('ok', { status: 200 });
  }

  const event = payload.event;
  if (event?.type === 'app_mention' && !event.bot_id) {
    const token = process.env.SLACK_BOT_TOKEN;
    const channel = event.channel;
    // Reply in the thread; for a top-level message, ts starts the thread.
    const thread_ts = event.thread_ts ?? event.ts;

    const missing = ['E2B_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN'].filter(v => !process.env[v]);
    if (missing.length) {
      console.error('[claude] not configured:', missing.join(', '));
      await postMessage({
        token, channel, thread_ts,
        text: `I can't reach Claude — ${missing.join(' and ')} not set on this deployment.`,
      });
      return new Response('ok', { status: 200 });
    }

    // Answer Slack first, then keep working. Slack wants 200 within three
    // seconds and a placeholder tells the human something is happening, which
    // silence does not.
    const placeholder = await postMessage({ token, channel, thread_ts, text: THINKING });

    waitUntil((async () => {
      const started = Date.now();
      try {
        // Swappable so the tests can run the whole path without booting a real
        // sandbox; in production this is always runClaude.
        const run = globalThis.__claudeRunner ?? runClaude;
        const answer = await run({ prompt: promptFrom(event.text) });
        await updateMessage({
          token, channel, ts: placeholder.ts,
          text: answer || '_Claude finished but said nothing._',
        });
        console.log('[claude] answered in', Date.now() - started, 'ms');
      } catch (err) {
        console.error('[claude] failed:', err.message);
        // Never leave the placeholder sitting there: a stuck "thinking…" is
        // indistinguishable from a bot that has died.
        await updateMessage({
          token, channel, ts: placeholder.ts,
          text: `Claude fell over: \`${err.message}\``,
        }).catch(() => {});
      }
    })());
  }

  return new Response('ok', { status: 200 });
}
