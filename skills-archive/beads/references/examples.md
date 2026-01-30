# beads Examples

## Commands

```bash
# Find work
bd ready                              # Unblocked tasks
bd list --status open                 # All open tasks
bd show <id>                          # Task details
bd blocked                            # Tasks with blockers

# Create
bd create "Title" -p 1 --type task    # Priority 0-4, type: bug/feature/task/epic
bd create "Child" --parent <epic-id>  # Child task

# Update
bd update <id> --status in_progress   # Status: open/in_progress/blocked/closed
bd update <id> --notes "Progress"     # Add notes
bd close <id> --reason "Done"         # Complete

# Dependencies
bd dep add <child> <parent>           # Parent blocks child
bd dep list <id>                      # View dependencies

# Sync
bd sync                               # Full git sync
```

## Dependency Patterns

```bash
# Sequential chain
bd dep add deploy integration-tests
bd dep add integration-tests unit-tests
# Order: unit-tests → integration-tests → deploy

# Multiple blockers
bd dep add deploy frontend-done
bd dep add deploy backend-done
# deploy ready when BOTH complete
```

## Session Resume

```bash
# Session 1
bd create "Implement auth" -p 1       # Returns: myproject-auth
bd update myproject-auth --status in_progress
bd update myproject-auth --notes "COMPLETED: JWT integrated. IN PROGRESS: Token refresh"

# Session 2 (after compaction)
bd ready                              # Shows myproject-auth
bd show myproject-auth                # Full context preserved
```

## Blocked Work

```bash
bd update <id> --status blocked
bd update <id> --notes "API returns 503, reported to backend"
bd create "Fix API 503" -p 0 --type bug   # Returns: blocker-id
bd dep add <id> blocker-id
bd ready                              # Find other work
```

## Common Errors

| Error | Solution |
|-------|----------|
| `bd: command not found` | Install from github.com/steveyegge/beads |
| `No .beads database found` | Human runs `bd init` once |
| `Task not found` | Use `bd list` to verify IDs |
| `Circular dependency` | Use `bd dep list <id>` to restructure |
