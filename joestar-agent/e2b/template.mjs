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
  .npmInstall('@anthropic-ai/claude-code@latest', { g: true });
