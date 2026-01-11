# Agent Configuration

Configuration for AI coding agents.

## Setup

### [pi](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent)

```bash
ln -sf {baseDir}/AGENTS.md ~/.pi/agent/AGENTS.md
ln -sf {baseDir}/agents/pi/settings.json ~/.pi/agent/settings.json
ln -sf {baseDir}/agents/pi/models.json ~/.pi/agent/models.json
ln -sf {baseDir}/skills ~/.pi/agent/skills
ln -sf {baseDir}/agents/pi/prompts ~/.pi/agent/prompts
ln -sf {baseDir}/agents/pi/extensions ~/.pi/agent/extensions
```

### [Codex](https://developers.openai.com/codex)

Copy skills (Codex [ignores symlinked directories](https://developers.openai.com/codex/skills/create-skill#skill-doesnt-appear))

```bash
ln -sf {baseDir}/AGENTS.md ~/.codex/AGENTS.md
cp -r {baseDir}/skills/ ~/.codex/skills/
```

See OpenAI's [Skills](https://developers.openai.com/codex/skills) and [AGENTS.md](https://developers.openai.com/codex/guides/agents-md) documentation for details.

## Skills

Skills provide specialized instructions for specific tasks. They follow the [Agent Skills Specification](https://agentskills.io/specification).

## Credits

- [badlogic/pi-skills](https://github.com/badlogic/pi-skills)
- [steipete/agent-scripts](https://github.com/steipete/agent-scripts)
- [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff)
