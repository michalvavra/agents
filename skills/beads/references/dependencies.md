# Dependency System

How bd tracks and manages task dependencies.

## Dependency Types

| Type | Meaning | Use Case |
|------|---------|----------|
| blocks | Parent must close before child becomes ready | Sequential work |
| parent-child | Hierarchical relationship | Epics and subtasks |
| discovered-from | Task A led to discovering task B | Investigation work |
| related | Tasks are related but not blocking | Cross-references |

## Adding Dependencies

```bash
# Basic: parent blocks child
bd dep add <child-id> <parent-id>

# Example: tests must pass before deploy
bd dep add deploy-task test-task
```

## Viewing Dependencies

```bash
bd dep list <task-id>
```

Output shows:
- What this task blocks (dependents)
- What blocks this task (blockers)

## Circular Dependency Prevention

bd automatically prevents circular dependencies:

```bash
bd dep add A B    # B blocks A
bd dep add B A    # ERROR: Would create cycle
```

## Finding Blocked Work

```bash
bd blocked        # All tasks with open blockers
bd ready          # All tasks with NO open blockers
```

## Common Patterns

### Sequential Chain

```bash
bd dep add deploy integration-tests
bd dep add integration-tests unit-tests
# Order: unit-tests → integration-tests → deploy
```

### Multiple Blockers

```bash
bd dep add deploy frontend-done
bd dep add deploy backend-done
# deploy only ready when BOTH complete
```

### Epic Children

```bash
bd create "Epic: Feature" --type epic  # Returns: epic-abc
bd create "Subtask 1" --parent epic-abc
bd create "Subtask 2" --parent epic-abc
# Implicit parent-child dependencies
```
