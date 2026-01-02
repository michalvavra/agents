# Example: Epic with Child Tasks

Demonstrates creating an epic with child tasks and dependencies.

## Create Epic

```bash
bd create "Epic: OAuth Implementation" -p 0 --type epic
# Returns: myproject-abc
```

## Create Child Tasks

```bash
bd create "Research OAuth providers (Google, GitHub, Microsoft)" -p 1 --parent myproject-abc
# Returns: myproject-abc.1

bd create "Implement backend auth endpoints" -p 1 --parent myproject-abc
# Returns: myproject-abc.2

bd create "Add frontend login UI components" -p 2 --parent myproject-abc
# Returns: myproject-abc.3
```

## Add Dependencies Between Children

Backend must complete before frontend:

```bash
bd dep add myproject-abc.3 myproject-abc.2
```

## Work on Ready Tasks

```bash
bd ready
# Shows: myproject-abc.1 (research, no blockers)
# Shows: myproject-abc.2 (backend, no blockers)
# Hides: myproject-abc.3 (frontend, blocked by backend)

bd update myproject-abc.1 --status in_progress
```

## Close Epic When Children Complete

```bash
bd epic close-eligible
# Automatically closes epics where all children are closed
```
