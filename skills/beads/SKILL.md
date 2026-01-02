---
name: beads
description: Persistent task memory for AI agents using dependency graphs. Use for multi-session work, complex dependencies, or context that must survive compaction.
compatibility: Requires bd CLI v0.34.0+ and git repository.
allowed-tools: "Read,Bash(bd:*)"
license: "MIT (Steve Yegge <https://github.com/steveyegge>)"
---

# Beads - Persistent Task Memory

Graph-based issue tracker that survives conversation compaction.

## TL;DR

- `bd ready` - find unblocked tasks
- `bd create "Title" -p 1` - create task (priority 0-4)
- `bd show <id>` - view details
- `bd update <id> --status in_progress` - start work
- `bd update <id> --notes "Progress"` - add notes (critical for compaction survival)
- `bd close <id> --reason "Done"` - complete task
- `bd sync` - sync with git remote

## When to Use bd vs TodoWrite

| Question | YES → bd | NO → TodoWrite |
|----------|----------|----------------|
| Will I need this context in 2 weeks? | ✓ | |
| Could conversation history get compacted? | ✓ | |
| Does this have blockers/dependencies? | ✓ | |
| Will this be done in this session? | | ✓ |

**Decision Rule**: If resuming in 2 weeks would be hard without bd, use bd.

## Prerequisites

- **bd CLI** v0.34.0+ installed and in PATH
- **Git repository**: Current directory must be a git repo
- **Initialization**: `bd init` run once (humans do this, not agents)

## Session Start Protocol

Every session, follow this sequence:

1. **Find ready work**: `bd ready`
2. **Pick highest priority** (P0 > P1 > P2 > P3 > P4)
3. **Get context**: `bd show <task-id>`
4. **Start work**: `bd update <task-id> --status in_progress`
5. **Add notes as you work** (critical for compaction survival)

**Note Format** (for compaction survival):
```
COMPLETED: Specific deliverables
IN PROGRESS: Current state + next step
BLOCKERS: What's preventing progress
KEY DECISIONS: Important context
```

## Essential Commands

| Command | Purpose |
|---------|---------|
| `bd ready` | Show tasks ready to work on |
| `bd create "Title" -p 1 --type task` | Create task |
| `bd show <id>` | View task details + history |
| `bd update <id> --status <status>` | Change status (open/in_progress/blocked/closed) |
| `bd update <id> --notes "..."` | Add progress notes |
| `bd close <id> --reason "..."` | Complete task |
| `bd dep add <child> <parent>` | Add dependency (parent blocks child) |
| `bd list` | View all tasks |
| `bd search <query>` | Find tasks by keyword |
| `bd sync` | Sync with git remote |

See [references/commands.md](references/commands.md) for complete command reference.

## Task Creation

```bash
# Basic task
bd create "Fix auth bug" -p 0 --type bug

# Task with description
bd create "Implement OAuth" -p 1 --description "Add OAuth2 for Google, GitHub"

# Epic with children
bd create "Epic: OAuth" -p 0 --type epic
# Returns: myproject-abc
bd create "Research providers" -p 1 --parent myproject-abc
bd create "Implement endpoints" -p 1 --parent myproject-abc
```

## Dependencies

```bash
# Add dependency (parent must complete before child)
bd dep add <child-id> <parent-id>

# View dependencies
bd dep list <task-id>

# Check blocked work
bd blocked
```

See [references/dependencies.md](references/dependencies.md) for dependency types and patterns.

## Git Sync

```bash
bd sync  # Export, commit, pull, import, push (all-in-one)
```

Use at: end of session, before handoff, after major progress.

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `bd: command not found` | CLI not installed | Install from github.com/steveyegge/beads |
| `No .beads database found` | Not initialized | Human runs `bd init` once |
| `Task not found` | Invalid ID | Use `bd list` to verify IDs |
| `Circular dependency` | Dependency cycle | Restructure with `bd dep list <id>` |

See [references/errors.md](references/errors.md) for complete troubleshooting.

## Examples

See [references/examples/](references/examples/) for detailed walkthroughs:

- [session-resume.md](references/examples/session-resume.md) - Resuming after compaction
- [epic-workflow.md](references/examples/epic-workflow.md) - Epic with child tasks
- [blocked-work.md](references/examples/blocked-work.md) - Tracking blocked work
- [dependency-chain.md](references/examples/dependency-chain.md) - Complex dependencies
- [team-sync.md](references/examples/team-sync.md) - Multi-user git sync

## Resources

- Full documentation: https://github.com/steveyegge/beads
- [references/commands.md](references/commands.md) - Complete command reference
- [references/dependencies.md](references/dependencies.md) - Dependency system
- [references/errors.md](references/errors.md) - Error handling
