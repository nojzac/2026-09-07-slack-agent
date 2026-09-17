import fs from 'node:fs';
import path from 'node:path';

const CLAUDE_MD_PATH = '/home/user/.claude/CLAUDE.md';
const SKILLS_BASE_PATH = '/home/user/.claude/skills';

// The sandbox is destroyed after every run and the thread is replayed fresh
// into the prompt each time, so there is no "first turn" to seed state on.
// Anything the sandbox should have — persona, skills — has to be written on
// every single run.
const MAX_TOTAL_BYTES = 2 * 1024 * 1024;

const CLAUDE_MD_CONTENT = `You are Joestar, Noj's Slack agent. You answer in Slack, so be brief and concrete.

This machine: Node 24, git, gh, Playwright with Chromium only.

Postgres 15 and Redis are installed but NOT running; start them only when a task needs them:

pg_ctl -o "-k /tmp -c listen_addresses=127.0.0.1" -w start
redis-server --daemonize yes --save "" --appendonly no --bind 127.0.0.1

psql and redis-cli then work with no flags.

The machine is destroyed when the run ends: nothing persists except what you push or upload. Your run has about four minutes; push partial work rather than lose it.
`;

/** Recursively collect regular, non-dotfile files under `dir`, relative to `baseDir`. */
function walkFiles(dir, baseDir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, baseDir, out);
    } else if (entry.isFile()) {
      out.push(path.relative(baseDir, full));
    }
  }
}

/**
 * Build the array of { path, data } entries for `sandbox.files.write`: the
 * persona file, plus every skill under `<toolkitDir>/skills/<name>/`.
 *
 * Never throws: a missing toolkitDir, a skill missing SKILL.md, or an
 * over-cap payload all degrade to "fewer files written", never a failed run.
 */
export function sandboxFiles({ toolkitDir } = {}) {
  const claudeMdEntry = { path: CLAUDE_MD_PATH, data: CLAUDE_MD_CONTENT };

  if (!toolkitDir) return [claudeMdEntry];

  const skillsDir = path.join(toolkitDir, 'skills');
  let skillDirs;
  try {
    skillDirs = fs
      .readdirSync(skillsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'));
  } catch {
    return [claudeMdEntry];
  }

  const entries = [];
  let totalBytes = Buffer.byteLength(CLAUDE_MD_CONTENT);

  for (const skillDir of skillDirs) {
    const name = skillDir.name;
    const dirPath = path.join(skillsDir, name);
    if (!fs.existsSync(path.join(dirPath, 'SKILL.md'))) {
      console.warn(`[sandbox-files] skipping skill "${name}": no SKILL.md`);
      continue;
    }

    const relFiles = [];
    walkFiles(dirPath, dirPath, relFiles);
    for (const rel of relFiles) {
      const data = fs.readFileSync(path.join(dirPath, rel));
      totalBytes += data.length;
      entries.push({ path: `${SKILLS_BASE_PATH}/${name}/${rel}`, data });
    }
  }

  if (totalBytes > MAX_TOTAL_BYTES) {
    console.warn(`[sandbox-files] total payload ${totalBytes} bytes exceeds ${MAX_TOTAL_BYTES}; sending CLAUDE.md only`);
    return [claudeMdEntry];
  }

  return [claudeMdEntry, ...entries];
}
