import { waitUntil } from '@vercel/functions';
import {
  verifySlackSignature,
  postMessage,
  updateMessage,
  getBotUserId,
  getThreadReplies,
  getChannelTopic,
  addReaction,
  downloadFile,
  uploadFile,
  completeUpload,
} from '../_lib/slack.js';
import { runClaude, sandboxInputPath, OUTPUT_DIR } from '../_lib/claude.js';
import { tryMintInstallationToken, repoFromTopic } from '../_lib/github.js';
import { isFromBot, renderTranscript, buildPrompt, THINKING } from '../_lib/thread.js';
import { toMrkdwn } from '../_lib/mrkdwn.js';

// Claude takes minutes, not milliseconds. The function must outlive the 200 we
// send Slack, so ask for the longest window the plan allows.
export const maxDuration = 300;

// Reactions are the bot's status line: seen, done, failed.
const SEEN = 'eyes';
const DONE = 'white_check_mark';
const FAILED = 'x';

// Attachments are downloaded on the ack path, inside the 300s budget. Caps keep
// someone dropping twenty photos in a channel from becoming twenty downloads.
const MAX_INPUT_FILES = 5;
const MAX_INPUT_BYTES = 8 * 1024 * 1024;

/**
 * What the model is told about its own GitHub access.
 *
 * Every line here is a wall it would otherwise find by walking into it, and
 * each refusal costs a minute of a five-minute budget. Stated as capabilities
 * and limits, not as a plea: these are enforced by GitHub, not by good
 * behaviour.
 */
function githubCapabilities(repos) {
  return [
  'You have GitHub access via the `gh` CLI and `git`, already authenticated.',
  repos.length === 1
    ? `It is scoped to a single repository for this channel: ${repos[0]}. Other repositories are not reachable, even other ones the App is installed on.`
    : `It is scoped to exactly these repositories: ${repos.join(', ')}. Other repositories are not reachable, even other ones the App is installed on.`,
  'Work by branching and opening a pull request. The default branch refuses direct pushes.',
  'Force-push and branch deletion are disabled. Do not attempt them.',
  'You cannot modify .github/workflows/ — that permission was deliberately withheld.',
  'The credential expires one hour after this message. It cannot be renewed from in here.',
  '',
  // The binding constraint is five minutes, not cleverness. Both of the first
  // two dogfooding requests died at the sandbox timeout while still working, so
  // the model is told how to spend the budget rather than left to discover it.
  'YOU HAVE UNDER FIVE MINUTES in total, including the clone. Work accordingly:',
  '- Clone shallow: `git clone --depth 1`. History is almost never what you need.',
  '- Do not read `sops/` — those are large HTML lesson pages, irrelevant to code changes.',
  '- Do not read `course/` unless asked; it is transcripts, not code.',
  '- Read `README.md`, `RESUME.md` and `TRAPS.md` first if you need orientation. They are short and they are current.',
  '- Go straight to the files you need. Do not survey the repository.',
  '- If you will not finish in time, push what you have to a branch and say what is left, rather than running out mid-edit and losing everything.',
  ].join('\n');
}

/** Strip the leading <@U123> mention so Claude gets the question, not the ping. */
export function promptFrom(text) {
  return String(text ?? '').replace(/<@[A-Z0-9]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Decide what to do with one event, without touching the network.
 *
 * Two things are going on here, and both fail silently if they are wrong:
 *
 * THE LOOP GUARD. Subscribing to message.channels means the bot hears its own
 * posts. Unguarded it answers itself, which posts, which it hears — forever,
 * booting a real sandbox each cycle. It does not error; it just spends. Three
 * overlapping checks (see isFromBot) because Slack has more than one way of
 * saying "a bot wrote this" and missing one is unbounded.
 *
 * THE DEDUP SPLIT. An @mention fires BOTH app_mention and a message twin, so
 * exactly one must be ignored. The split is on FILES, not on event type:
 * app_mention carries files in practice but not by contract, and Slack has
 * shipped cases where a mention with an attachment arrives only on the message
 * event. Dropping the twin unconditionally loses images with no error at all —
 * just a confident answer about a picture nobody saw.
 */
export function classifyEvent(event, botUserId) {
  if (!event) return { action: 'skip', reason: 'no event' };
  if (event.type !== 'app_mention' && event.type !== 'message') {
    return { action: 'skip', reason: `not a message event (${event.type})` };
  }

  if (isFromBot(event, botUserId)) {
    return { action: 'skip', reason: 'posted by a bot — never answer ourselves' };
  }

  const hasFiles = Array.isArray(event.files) && event.files.length > 0;

  if (event.type === 'app_mention') {
    return hasFiles
      ? { action: 'skip', reason: 'mention with files — the message twin carries them' }
      : { action: 'run', reason: 'mention' };
  }

  // A message subtype is usually structure — a join, a topic change, an edit.
  // file_share is the exception: a screenshot with no caption is a real request.
  if (event.subtype && event.subtype !== 'file_share') {
    return { action: 'skip', reason: `structural subtype ${event.subtype}` };
  }

  if (botUserId && String(event.text ?? '').includes(`<@${botUserId}>`)) {
    return hasFiles
      ? { action: 'run', reason: 'mention with files — this twin is the file carrier' }
      : { action: 'skip', reason: 'mention without files — app_mention handles it' };
  }

  if (!event.thread_ts || event.thread_ts === event.ts) {
    return { action: 'skip', reason: 'channel chatter, not addressed to us' };
  }

  // A thread reply carries no sign of whether we are in the conversation.
  // Answering that needs Slack.
  return { action: 'check-thread', reason: 'thread reply — is this our thread?' };
}

/**
 * Fetch attachments into the sandbox. Returns the files to write and the paths
 * to name in the prompt, so Claude's own Read tool can open them.
 */
async function collectInputs({ token, files }) {
  const inputs = [];

  for (const [index, file] of (files ?? []).entries()) {
    if (inputs.length >= MAX_INPUT_FILES) {
      console.warn(`[slack] more than ${MAX_INPUT_FILES} attachments; ignoring the rest`);
      break;
    }
    // Google Drive and other external files have no bytes to fetch — the
    // url_private points at somebody else's service.
    if (file.is_external || file.mode === 'external' || !file.url_private) {
      console.warn(`[slack] skipping external file ${file.name}`);
      continue;
    }
    if (file.size > MAX_INPUT_BYTES) {
      console.warn(`[slack] skipping ${file.name}: ${file.size} bytes is over the cap`);
      continue;
    }
    try {
      const bytes = await downloadFile({ token, url: file.url_private });
      inputs.push({ path: sandboxInputPath(file.name, index), bytes });
    } catch (err) {
      // A failed download is worth saying out loud but not worth losing the
      // question over — the text may still be answerable.
      console.error(`[slack] could not download ${file.name}:`, err.message);
    }
  }

  return inputs;
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
    subtype: payload.event?.subtype,
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

  const token = process.env.SLACK_BOT_TOKEN;
  const event = payload.event;

  // The loop guards need our own user id, so this has to succeed before any
  // decision is made. Guessing our way past it would disable a guard whose
  // failure mode is an unbounded spend.
  let botUserId;
  try {
    botUserId = await getBotUserId({ token });
  } catch (err) {
    console.error('[slack] auth.test failed, refusing to dispatch:', err.message);
    return new Response('ok', { status: 200 });
  }

  const decision = classifyEvent(event, botUserId);
  const channel = event?.channel;
  // A top-level message starts its own thread; its ts becomes the key.
  const thread_ts = event?.thread_ts ?? event?.ts;

  // A thread reply has to prove the thread is ours, and the same call returns
  // the transcript that gets replayed. One round trip, both answers.
  let transcript = '';
  if (decision.action === 'check-thread' || (decision.action === 'run' && event.thread_ts)) {
    let messages = [];
    try {
      messages = await getThreadReplies({ token, channel, ts: thread_ts });
    } catch (err) {
      console.error('[slack] could not read the thread:', err.message);
      if (decision.action === 'check-thread') return new Response('ok', { status: 200 });
    }

    if (decision.action === 'check-thread') {
      const oursToAnswer = messages.some(m => isFromBot(m, botUserId));
      if (!oursToAnswer) {
        console.log('[slack] skipped: a thread we have never posted in');
        return new Response('ok', { status: 200 });
      }
    }

    transcript = renderTranscript({ messages, botUserId, skipTs: event.ts });
  } else if (decision.action !== 'run') {
    console.log('[slack] skipped:', decision.reason);
    return new Response('ok', { status: 200 });
  }

  // Past every guard: this one is for us.
  console.log('[slack] handling:', decision.reason);

  // Acknowledge before doing anything slow. A reaction lands in well under a
  // second, so the human sees "heard you" while the sandbox is still booting.
  await addReaction({ token, channel, timestamp: event.ts, name: SEEN });

  const missing = ['E2B_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN'].filter(v => !process.env[v]);
  if (missing.length) {
    console.error('[claude] not configured:', missing.join(', '));
    await postMessage({
      token, channel, thread_ts,
      text: `I can't reach Claude — ${missing.join(' and ')} not set on this deployment.`,
    });
    await addReaction({ token, channel, timestamp: event.ts, name: FAILED });
    return new Response('ok', { status: 200 });
  }

  // Answer Slack first, then keep working. Slack wants 200 within three
  // seconds and a placeholder tells the human something is happening, which
  // silence does not.
  const placeholder = await postMessage({ token, channel, thread_ts, text: THINKING });

  waitUntil((async () => {
    const started = Date.now();
    try {
      const inputs = await collectInputs({ token, files: event.files });

      // Every channel's topic names its repo. Read fresh each run, same as the
      // token below — a channel's topic can change between messages, and this
      // one HTTP call is not worth caching against a stale mapping.
      let repo = null;
      try {
        const topic = await getChannelTopic({ token, channel });
        repo = repoFromTopic(topic);
        if (topic && !repo) {
          console.warn('[github] channel topic set but no owner/repo found in it:', topic);
        }
      } catch (err) {
        // missing_scope means channels:read/groups:read were never granted —
        // see slack-app-manifest.yml. Treat it like "no repo configured" rather
        // than failing the whole run.
        console.warn('[github] could not read channel topic:', err.message);
      }

      // Long-term memory is a git repo the sandbox clones at the start of a run
      // and pushes at the end. `AGENT_MEMORY_REPO` is the kill switch: unset
      // means memory is off, full stop, regardless of what's in the topic.
      // Both the repo and the channel id are validated before use, and never
      // printed on failure — only their shape, not their value, is worth logging.
      const rawMemoryRepo = process.env.AGENT_MEMORY_REPO;
      let memoryRepo;
      if (!rawMemoryRepo) {
        memoryRepo = undefined;
      } else if (!/^[\w.-]+\/[\w.-]+$/.test(rawMemoryRepo)) {
        console.log('[memory] off (invalid repo)');
        memoryRepo = undefined;
      } else if (!/^[A-Z0-9]+$/.test(channel ?? '')) {
        console.log('[memory] off (invalid channel)');
        memoryRepo = undefined;
      } else {
        memoryRepo = rawMemoryRepo;
      }


      // Minted here, on every request, rather than lazily when the question
      // looks GitHub-shaped. Lazy minting means keyword-sniffing the prompt, and
      // the obvious counter-example is a thread reply reading "now open a PR for
      // that" — no keyword, and by then the transcript is the only thing that
      // makes it GitHub work. This runs after the Slack ack, inside waitUntil,
      // on a path that already takes minutes; one HTTP round trip against a
      // sandbox boot is not worth optimising by guessing.
      //
      // Nothing is cached across warm invocations: "fresh per request" stays
      // literally true, and an hour-long credential is not worth reusing to save
      // 200ms.
      //
      // No repo from the topic and no memory repo means no GitHub access at
      // all, even though the App may be installed on several repos — this list
      // is the boundary, not just a hint, so a channel with neither gets no
      // write access to anything.
      const repos = [repo, memoryRepo].filter(Boolean);
      const github = repos.length ? await tryMintInstallationToken({ repos }) : { token: null, reason: null };

      const prompt = buildPrompt({
        question: promptFrom(event.text) || 'The user sent this with no text. Respond to the attached file.',
        transcript,
        inputPaths: inputs.map(f => f.path),
        outputDir: OUTPUT_DIR,
        // Tell the model where the walls are. Without this it spends minutes
        // rediscovering them by hitting them — trying to push to main, trying to
        // force-push — and reports the refusals as failures.
        github: github.token ? githubCapabilities(repos) : null,
      });

      // Swappable so the tests can run the whole path without booting a real
      // sandbox; in production this is always runClaude.
      const run = globalThis.__claudeRunner ?? runClaude;
      const result = await run({ prompt, inputs, githubToken: github.token, slackToken: token, memoryRepo, channelId: channel });
      // Tolerate a bare string so a stubbed runner stays trivial to write.
      const { answer, files } = typeof result === 'string' ? { answer: result, files: [] } : result;

      // Say so only when GitHub is configured AND broken. A workspace with no
      // GitHub App at all gets nothing: the feature is simply off, and a warning
      // on every message about a capability nobody asked for is worse than
      // silence.
      const githubNote = github.reason ? `\n\n_GitHub access is unavailable for this run._` : '';

      await updateMessage({
        token, channel, ts: placeholder.ts,
        // Converted here, in code. Models ignore being asked for mrkdwn.
        text: (toMrkdwn(answer) || '_Claude finished but said nothing._') + githubNote,
      });

      for (const file of files ?? []) {
        try {
          if (file.file_id) {
            // Already uploaded from inside the sandbox (see collectOutputs in
            // claude.js) — this is just the completeUploadExternal step,
            // telling Slack where to share it.
            await completeUpload({
              token, channel_id: channel, thread_ts,
              file_id: file.file_id, title: file.name,
            });
          } else {
            await uploadFile({
              token, channel_id: channel, thread_ts,
              filename: file.name, title: file.name, bytes: file.bytes,
            });
          }
        } catch (err) {
          console.error(`[slack] could not upload ${file.name}:`, err.message);
        }
      }

      // Alongside the 👀, not instead of it: the pair reads as a history —
      // seen, then finished.
      await addReaction({ token, channel, timestamp: event.ts, name: DONE });
      console.log('[claude] answered in', Date.now() - started, 'ms');
    } catch (err) {
      console.error('[claude] failed:', err.message);
      // Never leave the placeholder sitting there: a stuck "thinking…" is
      // indistinguishable from a bot that has died.
      await updateMessage({
        token, channel, ts: placeholder.ts,
        text: `Claude fell over: \`${err.message}\``,
      }).catch(() => {});
      await addReaction({ token, channel, timestamp: event.ts, name: FAILED });
    }
  })());

  return new Response('ok', { status: 200 });
}
