# agents

Configuration for AI coding agents.

## Layout

- `AGENTS.md`: shared instructions, symlinked into every agent.
- `skills/`: my own skills. `scripts/link-skills.sh` links each one into `~/.agents/skills` (Pi, Codex, OpenCode, fx) and `~/.claude/skills` (Claude Code).
- `scripts/`: setup scripts.
- `agents/pi/`: Pi extensions (`extensions/`) and prompt templates (`prompts/`).
- `archive/`: retired skills and extensions, kept for reference and not loaded.
- `tests/`: tests for the Pi extensions.
- Third-party skills are not tracked here. `~/.agents/skills` is managed by Vercel's [skills][skills] CLI: install with `npx skills add <source> -g`, update with `npx skills update -g` (installs are recorded in `~/.agents/.skill-lock.json`). The Plannotator installer and `rex skill setup` also install skills there.
- Agent-specific skills stay in each agent's own skills directory (`~/.pi/agent/skills`, `~/.codex/skills`, `~/.claude/skills`, `~/.fx/skills`) and are not tracked here.

## Setup

```bash
git clone https://github.com/michalvavra/agents.git
cd agents
```

Run the commands below from the repository root. Back up any existing `AGENTS.md`/`CLAUDE.md` first; `ln -sf` replaces it. Move an existing `~/.pi/agent/prompts` directory away too; `ln -sfn` does not replace a real directory and puts the link inside it instead.

### Skills

```bash
./scripts/link-skills.sh
```

The script links each skill in `skills/` into `~/.agents/skills` and `~/.claude/skills`, and removes links to skills that no longer exist. It touches only links into this repository, so installed third-party skills stay. Run it again after adding or removing a skill. `~/.agents/skills` must be a real directory, not a link to `skills/`.

### [Pi][pi-coding-agent]

```bash
ln -sf "$PWD/AGENTS.md" ~/.pi/agent/AGENTS.md
ln -sfn "$PWD/agents/pi/prompts" ~/.pi/agent/prompts
```

This repository is a Pi package. Add it to `~/.pi/agent/settings.json` to load the extensions, replacing `<repo>` with the absolute path to this repository:

```json
{
  "packages": [{ "source": "<repo>", "skills": [] }]
}
```

`"skills": []` skips the package's skills because Pi already reads them from `~/.agents/skills`; loading both produces name-collision warnings.

Extensions in `agents/pi/extensions/`:

- `cf-deploy-allowlist.ts`: blocks Cloudflare deployments unless allowed by `$XDG_CONFIG_HOME/pi-ext-cf-deploy-allowlist.json` (default `~/.config/pi-ext-cf-deploy-allowlist.json`). Create the policy file before enabling it: without one, the guard blocks many shell commands, not just deployments.
- `filter-output.ts`: redacts secrets (API tokens, passwords, private keys, `.env` contents) from tool results.
- `google-workspace.ts`: `/google-workspace [email]|status|logout|refresh` connects Google accounts (Radius broker by default, or your own OAuth client from `~/.pi/google-workspace/config.json` with `email`, `client_id`, `client_secret`, `scopes`). The `google_workspace` tool calls any `https://*.googleapis.com` API as a connected account, refreshes tokens itself, and returns `{ account, status, headers, bodyEncoding, body }` to codemode scripts.
- `microsoft-365.ts`: `/microsoft-365 [email]|status|logout|refresh` connects Microsoft 365 accounts (OAuth PKCE with a public Entra app). The `microsoft_graph` tool calls Microsoft Graph as a connected account, refreshes tokens itself, and returns `{ account, status, headers, bodyEncoding, body }` to codemode scripts. Accounts are configured in `~/.pi/microsoft-365/config.json` (or `$MICROSOFT_365_CONFIG`); see below.
- `save-md.ts`: `/save-md <name>` saves the latest assistant response as Markdown.
- `session-breakdown.ts`: `/session-breakdown` shows usage over the last 7/30/90 days (sessions, messages, tokens, cost by model).
- `todos.ts`: file-based todos in `.pi/todos` via the `todo` tool and `/todos` command.

Google and Microsoft sign-in also work from another device, such as a phone or a laptop when Pi runs on a remote machine. The sign-in command prints the URL (and copies it to the clipboard). Open it anywhere and sign in. The browser then ends on a `localhost` page that does not load. Copy that page's URL from the address bar and paste it into Pi. When the browser runs on the same machine, the local callback finishes sign-in on its own.

`~/.pi/microsoft-365/config.json` has one entry per account:

```json
{
  "accounts": [
    { "email": "you@company.com", "client_id": "<entra app id>", "tenant": "<tenant id>" },
    {
      "email": "you@other.com",
      "client_id": "<entra app id>",
      "tenant": "<tenant id>",
      "redirect_uri": "http://localhost:53134/callback",
      "scopes": ["offline_access", "User.Read", "Mail.ReadWrite", "Chat.ReadWrite"]
    }
  ]
}
```

- Required: `email`, `client_id`.
- `tenant` defaults to `common`.
- `redirect_uri` defaults to `http://localhost:53134/callback`.
- `scopes` defaults to `offline_access User.Read Mail.ReadWrite Mail.Send Calendars.ReadWrite`. `offline_access` is always added.
- Each Entra app must be a public client with the redirect URI registered.
- `$MICROSOFT_365_TOKENS_DIR` overrides the tokens directory.

### [Codex][codex]

```bash
ln -sf "$PWD/AGENTS.md" ~/.codex/AGENTS.md
```

### [Claude Code][claude-code]

Claude Code does not read `~/.agents/skills`; `scripts/link-skills.sh` links the skills into `~/.claude/skills`.

```bash
ln -sf "$PWD/AGENTS.md" ~/.claude/CLAUDE.md
```

### [fx][fx]

```bash
ln -sf "$PWD/AGENTS.md" ~/.fx/AGENTS.md
```

## Development

```bash
npm install
npm test
npm run format:check
```

## Credits

- [badlogic/pi-skills](https://github.com/badlogic/pi-skills)
- [steipete/agent-scripts](https://github.com/steipete/agent-scripts)
- [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff)
- [trancong12102/pi-skills](https://github.com/trancong12102/pi-skills)
- [hjanuschka/shitty-extensions](https://github.com/hjanuschka/shitty-extensions)
- [nbbaier/agent-skills](https://github.com/nbbaier/agent-skills)
- [dmmulroy/.dotfiles](https://github.com/dmmulroy/.dotfiles)
- [mattpocock/skills](https://github.com/mattpocock/skills)
- [modem-dev/skills](https://github.com/modem-dev/skills)
- [humanlayer/skills](https://github.com/humanlayer/skills)

[pi-coding-agent]: https://pi.dev/
[codex]: https://developers.openai.com/codex
[claude-code]: https://code.claude.com/
[fx]: https://fx.sh/
[skills]: https://skills.sh/
