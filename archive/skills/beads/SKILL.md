---
name: beads
description: Persistent task tracking with dependency graphs via bd CLI. Use for multi session work that must survive compaction.
compatibility: Requires bd CLI v0.34.0+ and git repository.
---

# Beads

Graph-based task tracker that survives conversation compaction.

## When to Use

Use bd (not TodoWrite) when:
- Context needed across sessions or after compaction
- Tasks have blockers/dependencies

## Session Start

```bash
bd ready                              # Find unblocked tasks
bd show <id>                          # Get context
bd update <id> --status in_progress   # Start work
```

## Common Commands

```bash
bd create "Title" -p 1                # Create task (priority 0-4)
bd update <id> --notes "Progress"     # Add notes (survives compaction)
bd close <id> --reason "Done"         # Complete task
bd dep add <child> <parent>           # Add dependency
bd sync                               # Sync with git remote
```

## Notes Format

```
COMPLETED: Specific deliverables
IN PROGRESS: Current state + next step
BLOCKERS: What's preventing progress
```

---

Use `bd --help` or see [references/examples.md](references/examples.md) for all commands.
