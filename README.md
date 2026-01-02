# Agent Configuration

Configuration for AI coding agents.

## Credits

- [badlogic/pi-skills](https://github.com/badlogic/pi-skills)
- [steipete/agent-scripts](https://github.com/steipete/agent-scripts)

## Setup

### [pi](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent)

```bash
ln -sf {baseDir}/skills ~/.pi/agent/skills
ln -sf {baseDir}/agents/pi/toplevel-AGENTS.md ~/.pi/agent/AGENTS.md
ln -sf {baseDir}/agents/pi/commands ~/.pi/agent/commands
ln -sf {baseDir}/agents/pi/hooks ~/.pi/agent/hooks
```

## Skills

Skills provide specialized instructions for specific tasks. They follow the [Agent Skills Specification](https://agentskills.io/specification).
