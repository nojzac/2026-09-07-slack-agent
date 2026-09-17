#!/usr/bin/env node
// Usage: node transcribe.mjs <audio-file> [--language xx] [--diarize]
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

const MODEL_ID = 'scribe_v2';
const API_URL = 'https://api.elevenlabs.io/v1/speech-to-text';
const RETRY_DELAY_MS = 2000;

function parseArgs(argv) {
  let file = null;
  let language = null;
  let diarize = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--language') {
      language = argv[++i] ?? null;
    } else if (arg === '--diarize') {
      diarize = true;
    } else if (!file) {
      file = arg;
    }
  }
  return { file, language, diarize };
}

async function postOnce(apiKey, fileBuffer, fileName, language, diarize) {
  const form = new FormData();
  form.set('model_id', MODEL_ID);
  form.set('file', new Blob([fileBuffer]), fileName);
  if (language) form.set('language_code', language);
  if (diarize) form.set('diarize', 'true');

  return fetch(API_URL, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: form,
  });
}

async function postWithRetry(apiKey, fileBuffer, fileName, language, diarize) {
  try {
    const res = await postOnce(apiKey, fileBuffer, fileName, language, diarize);
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      return postOnce(apiKey, fileBuffer, fileName, language, diarize);
    }
    return res;
  } catch {
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    return postOnce(apiKey, fileBuffer, fileName, language, diarize);
  }
}

async function main() {
  const { file, language, diarize } = parseArgs(process.argv.slice(2));

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('transcription is not configured on this bot');
    process.exit(2);
  }

  if (!file) {
    console.error('usage: node transcribe.mjs <audio-file> [--language xx] [--diarize]');
    process.exit(1);
  }

  const fileBuffer = await readFile(file);
  const fileName = basename(file);

  const res = await postWithRetry(apiKey, fileBuffer, fileName, language, diarize);

  if (!res.ok) {
    const body = await res.text();
    console.error(`elevenlabs api error: ${res.status} ${body.slice(0, 200)}`);
    process.exit(1);
  }

  const data = await res.json();
  const transcript = data.text ?? '';
  const duration = data.audio_duration ?? data.duration ?? 'unknown';
  const detectedLanguage = data.language_code ?? data.language ?? 'unknown';

  console.error(`duration=${duration} language=${detectedLanguage}`);
  process.stdout.write(transcript + '\n');
  process.exit(0);
}

main().catch((err) => {
  console.error(`transcription failed: ${err.message}`);
  process.exit(1);
});
