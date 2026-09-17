import { Template } from 'e2b/dist/index.mjs'; // see api/_lib/claude.js

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
  .setEnvs({
    PLAYWRIGHT_BROWSERS_PATH: '/opt/ms-playwright',
    NODE_PATH: '/usr/local/lib/node_modules',
  })
  // Pinned, not `@latest`: the playwright npm package and the Chromium build
  // it downloads are versioned together, so they have to move in lockstep.
  .npmInstall('playwright@1.63.0', { g: true })
  // --with-deps pulls in Chromium's system libraries itself, instead of this
  // template hand-maintaining that list.
  .runCmd('playwright install --with-deps chromium', { user: 'root' })
  .runCmd('chmod -R a+rX /opt/ms-playwright', { user: 'root' });
