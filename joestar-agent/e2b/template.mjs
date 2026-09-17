import { Template } from 'e2b/dist/index.mjs'; // see api/_lib/claude.js
import { PLAYWRIGHT_VERSION, POSTGRES_MAJOR, CODEX_VERSION } from '../api/_lib/versions.js';

/**
 * The machine Claude Code runs on. Node 24 plus the three tools Claude reaches
 * for constantly: curl, git, and ripgrep (its search tool shells out to rg).
 *
 * Build it with:  op run --env-file=../.env.op -- node e2b/build.mjs
 *
 * (The CLI's `template build` is deprecated and reads a Dockerfile, not this
 * SDK definition, so the build goes through Template.build() in build.mjs.)
 */
export const template = Template()
  .fromNodeImage('24')
  .aptInstall(['curl', 'git', 'ripgrep'])
  // The GitHub CLI, for lesson 08. It is NOT in the base image's apt sources, so
  // `aptInstall(['gh'])` does not resolve — it needs GitHub's own repository
  // added first, as root. gh reads GH_TOKEN from the environment, which is why
  // the sandbox never has to run `gh auth login`, a command that wants an
  // interactive TTY it does not have.
  .runCmd(
    [
      'curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg' +
        ' -o /usr/share/keyrings/githubcli-archive-keyring.gpg',
      'chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg',
      'echo "deb [arch=$(dpkg --print-architecture)' +
        ' signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg]' +
        ' https://cli.github.com/packages stable main"' +
        ' > /etc/apt/sources.list.d/github-cli.list',
      'apt-get update',
      'apt-get install -y gh',
    ].join(' && '),
    { user: 'root' },
  )
  .npmInstall('@anthropic-ai/claude-code@latest', { g: true })
  // The Codex CLI, for a second-opinion review from a different model.
  // Pinned to CODEX_VERSION, same reasoning as PLAYWRIGHT_VERSION above.
  .npmInstall(`@openai/codex@${CODEX_VERSION}`, { g: true })
  // Playwright + Chromium only (no Firefox/WebKit) for driving a headless
  // browser: screenshots, video, exercising a local dev server.
  //
  // PLAYWRIGHT_BROWSERS_PATH is set before the install runs, so the browsers
  // land in one shared, world-readable path instead of root's home directory.
  // The install itself needs root (it apt-installs Chromium's ~90 shared
  // libraries via --with-deps), but the sandbox runs commands as `user` —
  // without a shared path, `user` hits "Executable doesn't exist" at run time
  // even though the files are sitting right there.
  //
  // NODE_PATH points at npm's global install directory so `require('playwright')`
  // resolves from a script anywhere, including one in /tmp — a bare global
  // install isn't on a /tmp script's module search path otherwise.
  //
  // setEnvs only affects the commands below, during THIS build — per the e2b
  // SDK's own types, "Environment variables defined here are available only
  // during template build." They are gone by the time a sandbox actually runs.
  // That's fine for the install step itself, but the running sandbox needs
  // both variables again, set separately at runtime in Sandbox.create's `envs`
  // (api/_lib/claude.js) — build-time and run-time environments are two
  // different things and there's no build-time way to make one imply the other.
  .setEnvs({
    PLAYWRIGHT_BROWSERS_PATH: '/opt/ms-playwright',
    NODE_PATH: '/usr/local/lib/node_modules',
  })
  // Pinned, not `@latest`: the playwright npm package and the Chromium build
  // it downloads are versioned together, so they have to move in lockstep.
  .npmInstall(`playwright@${PLAYWRIGHT_VERSION}`, { g: true })
  // --with-deps pulls in Chromium's system libraries itself, instead of this
  // template hand-maintaining that list.
  .runCmd('playwright install --with-deps chromium', { user: 'root' })
  .runCmd('chmod -R a+rX /opt/ms-playwright', { user: 'root' })
  // Lesson 12: a throwaway local Postgres and Redis, installed but NOT started.
  .aptInstall([`postgresql-${POSTGRES_MAJOR}`, 'redis-server'])
  // Debian hides the server binaries in /usr/lib/postgresql/<v>/bin and wraps only
  // the client tools. Symlink the three the run needs so `pg_ctl` works as `user`.
  .runCmd(
    `ln -sf /usr/lib/postgresql/${POSTGRES_MAJOR}/bin/pg_ctl /usr/local/bin/pg_ctl` +
      ` && ln -sf /usr/lib/postgresql/${POSTGRES_MAJOR}/bin/initdb /usr/local/bin/initdb` +
      ` && ln -sf /usr/lib/postgresql/${POSTGRES_MAJOR}/bin/postgres /usr/local/bin/postgres`,
    { user: 'root' },
  )
  // Initialise the cluster at BUILD time, as `user`, so a run only has to start it.
  // Socket in /tmp because /var/run/postgresql is root-owned. Trust auth: the
  // server is loopback-only inside a machine that dies with the run.
  .runCmd(
    'initdb -D /home/user/pgdata -U user --auth=trust' +
      ' && pg_ctl -D /home/user/pgdata -o "-k /tmp -c listen_addresses=127.0.0.1" -w start' +
      ' && createdb -h /tmp -U user user' +
      ' && pg_ctl -D /home/user/pgdata -w stop',
    { user: 'user' },
  );
