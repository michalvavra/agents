---
name: agent-browser
description: Headless browser CLI for navigation, snapshots, and element actions.
compatibility: Requires Node.js 18+, agent-browser CLI, and Chromium download via `agent-browser install`. Linux may require `agent-browser install --with-deps`.
---

# Agent Browser

Headless browser automation CLI optimized for AI workflows using snapshots and refs.

## Usage

```bash
agent-browser open https://example.com
agent-browser snapshot -i --json
agent-browser click @e2
agent-browser fill @e3 "user@example.com"
agent-browser get text @e1
agent-browser screenshot page.png
agent-browser close
```

## Workflow

1. Open a URL with `open`.
2. Create a snapshot with `snapshot -i --json` and identify refs.
3. Act using refs with `click`, `fill`, or `get text`.
4. Capture output with `screenshot` or `get` commands.
5. Close the session with `close`.

## Selectors

- Prefer refs from `snapshot` like `@e2` for deterministic selection.
- CSS selectors and semantic locators also work.

## Sessions

Use isolated sessions when working with multiple sites:

```bash
agent-browser --session agent1 open https://example.com
AGENT_BROWSER_SESSION=agent1 agent-browser click @e2
agent-browser session list
```

---

See [references/commands.md](references/commands.md) for command coverage and options.
