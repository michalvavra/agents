# Agent Configuration

Configuration for AI coding agents.

## Setup

```bash
git clone https://github.com/michalvavra/agents.git
cd agents
```

### Skills

```bash
mkdir -p ~/.agents
ln -sf {thisDir}/skills ~/.agents/skills
```

### [Pi][pi-coding-agent]

```bash
ln -sf {thisDir}/AGENTS.md ~/.pi/agent/AGENTS.md
ln -sf {thisDir}/agents/pi/prompts ~/.pi/agent/prompts
ln -sf {thisDir}/agents/pi/extensions ~/.pi/agent/extensions
```

Create settings in `~/.pi/agent/settings.json` (global) or `.pi/settings.json` (project). Example:

```json
{
  "defaultProvider": "openai-codex",
  "defaultModel": "gpt-5.3-codex",
  "defaultThinkingLevel": "medium",
  "skills": [
    "~/.agents/skills"
  ],
  "packages": ["npm:pi-qmd"]
}
```

### [Codex](https://developers.openai.com/codex)

```bash
ln -sf {thisDir}/AGENTS.md ~/.codex/AGENTS.md
```

### [Claude Code](https://code.claude.com/)

```bash
ln -sf {thisDir}/AGENTS.md ~/.claude/CLAUDE.md
ln -sf {thisDir}/skills ~/.claude/skills
```

## Credits

- [badlogic/pi-skills](https://github.com/badlogic/pi-skills)
- [steipete/agent-scripts](https://github.com/steipete/agent-scripts)
- [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff)
- [trancong12102/pi-skills](https://github.com/trancong12102/pi-skills)
- [hjanuschka/shitty-extensions](https://github.com/hjanuschka/shitty-extensions)
- [nbbaier/agent-skills](https://github.com/nbbaier/agent-skills)

[pi-coding-agent]: https://pi.dev/
