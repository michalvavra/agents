# Example: Tracking Blocked Work

Demonstrates handling blocked tasks and switching to ready work.

## Discover Blocker

Agent discovers API is down during implementation:

```bash
bd update myproject-xyz --status blocked
bd update myproject-xyz --notes "API endpoint /auth returns 503, reported to backend team"
```

## Create Blocker Task

```bash
bd create "Fix /auth endpoint 503 error" -p 0 --type bug
# Returns: myproject-blocker
```

## Link Dependency

```bash
bd dep add myproject-xyz myproject-blocker
# myproject-blocker must close before myproject-xyz becomes ready
```

## Find Other Ready Work

```bash
bd ready
# Shows tasks that aren't blocked
# Agent can switch to productive work
```

## When Blocker Resolves

```bash
bd close myproject-blocker --reason "Fixed: Database connection pool exhausted, increased pool size"

bd ready
# myproject-xyz now appears (no longer blocked)
```
