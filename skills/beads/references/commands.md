# Complete Command Reference

All bd commands organized by category.

## Find Commands

| Command | Description | Example |
|---------|-------------|---------|
| `bd ready` | Tasks with no open blockers | `bd ready` |
| `bd list` | All tasks with filters | `bd list --status open --type bug` |
| `bd show <id>` | Task details + history | `bd show myproject-abc` |
| `bd search <query>` | Text search | `bd search "authentication"` |
| `bd blocked` | Tasks with open blockers | `bd blocked` |
| `bd stats` | Project metrics | `bd stats` |

## Create Commands

| Command | Description | Example |
|---------|-------------|---------|
| `bd create` | New task | `bd create "Title" -p 1 --type task` |
| `bd template create` | From template | `bd template create bug` |
| `bd init` | Initialize beads (humans only) | `bd init` |

### Create Options

| Option | Description | Values |
|--------|-------------|--------|
| `-p, --priority` | Priority level | 0=critical, 1=high, 2=medium, 3=low, 4=backlog |
| `--type` | Issue type | bug, feature, task, epic, chore |
| `--description` | Full description | text |
| `--parent` | Parent task ID | task-id |

## Update Commands

| Command | Description | Example |
|---------|-------------|---------|
| `bd update <id>` | Modify task | `bd update abc --status in_progress` |
| `bd dep add` | Add dependency | `bd dep add child parent` |
| `bd dep list` | View dependencies | `bd dep list abc` |
| `bd label add` | Add label | `bd label add abc backend` |
| `bd comments add` | Add comment | `bd comments add abc "Comment"` |
| `bd reopen <id>` | Reopen closed task | `bd reopen abc` |

### Update Options

| Option | Description | Values |
|--------|-------------|--------|
| `--status` | Change status | open, in_progress, blocked, closed |
| `--notes` | Add notes (appends) | text |
| `-p, --priority` | Change priority | 0-4 |

## Complete Commands

| Command | Description | Example |
|---------|-------------|---------|
| `bd close <id>` | Mark task done | `bd close abc --reason "Done"` |
| `bd epic close-eligible` | Auto-close complete epics | `bd epic close-eligible` |

## Sync Commands

| Command | Description | Example |
|---------|-------------|---------|
| `bd sync` | Full git sync | `bd sync` |
| `bd export` | Export to JSONL | `bd export -o backup.jsonl` |
| `bd import` | Import from JSONL | `bd import -i backup.jsonl` |
| `bd daemon` | Background sync | `bd daemon --start` |

## Cleanup Commands

| Command | Description | Example |
|---------|-------------|---------|
| `bd delete <id>` | Delete issue | `bd delete abc --force` |
| `bd admin compact` | Archive old issues | `bd admin compact` |

## Advanced Commands

| Command | Description | Example |
|---------|-------------|---------|
| `bd prime` | Refresh AI context | `bd prime` |
| `bd restore <id>` | Restore compacted issue | `bd restore abc` |
| `bd rename-prefix` | Change issue prefix | `bd rename-prefix oldpfx newpfx` |
| `bd version` | Version check | `bd version` |
