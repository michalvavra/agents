# agents

Configuration for AI coding agents.

## Layout

- `AGENTS.md`: shared instructions, symlinked into every agent.
- `skills/`: shared skills, symlinked to `~/.agents/skills`. Pi, Codex and fx read this directory.
- `agents/pi/`: Pi extensions (`extensions/`) and prompt templates (`prompts/`).
- `archive/`: retired skills and extensions, kept for reference and not loaded.
- `tests/`: tests for the Pi extensions.
- Agent-specific skills stay in each agent's own skills directory (`~/.pi/agent/skills`, `~/.codex/skills`, `~/.claude/skills`, `~/.fx/skills`) and are not tracked here.

## Setup

```bash
git clone https://github.com/michalvavra/agents.git
cd agents
```

Run the commands below from the repository root. Back up any existing `AGENTS.md`/`CLAUDE.md` first; `ln -sf` replaces it. Move existing `~/.agents/skills` or `~/.pi/agent/prompts` directories away too; `ln -sfn` does not replace a real directory and puts the link inside it instead.

### Skills

```bash
ln -sfn "$PWD/skills" ~/.agents/skills
```

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
- `save-md.ts`: `/save-md <name>` saves the latest assistant response as Markdown.
- `session-breakdown.ts`: `/session-breakdown` shows usage over the last 7/30/90 days (sessions, messages, tokens, cost by model).
- `todos.ts`: file-based todos in `.pi/todos` via the `todo` tool and `/todos` command.

### [Codex][codex]

```bash
ln -sf "$PWD/AGENTS.md" ~/.codex/AGENTS.md
```

### [Claude Code][claude-code]

Claude Code does not read `~/.agents/skills`, so link each shared skill.

```bash
ln -sf "$PWD/AGENTS.md" ~/.claude/CLAUDE.md
for d in skills/*/; do ln -sfn "$PWD/${d%/}" ~/.claude/skills/; done
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
