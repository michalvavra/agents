# Error Handling

Common errors and their solutions.

## Installation Errors

### `bd: command not found`

**Cause**: bd CLI not installed or not in PATH

**Solution**:
```bash
# macOS/Linux
curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash

# npm
npm install -g @beads/bd

# Homebrew
brew install steveyegge/beads/bd
```

### Version mismatch

**Check version**:
```bash
bd --version  # Should be 0.34.0 or later
```

## Database Errors

### `No .beads database found`

**Cause**: beads not initialized in this repository

**Solution**: Humans run once:
```bash
bd init  # Creates .beads/ directory
```

### `Database is locked`

**Cause**: Daemon or another process has exclusive lock

**Solution**:
```bash
bd daemon --stop
bd daemon --start
```

## Task Errors

### `Task not found: <id>`

**Cause**: Invalid task ID or task doesn't exist

**Solution**:
```bash
bd list                    # See all tasks
bd search <partial-title>  # Find by title
```

### `Circular dependency detected`

**Cause**: Attempting to create dependency cycle (A blocks B, B blocks A)

**Solution**:
```bash
bd dep list <id>  # View current dependencies
# Restructure to avoid cycle
```

## Sync Errors

### Git merge conflicts in `.beads/issues.jsonl`

**Cause**: Multiple users modified same issue

**Solution**:
```bash
bd sync --merge  # Attempt auto-resolution
```

If manual intervention needed:
```bash
git status       # View conflict
# Resolve manually, then:
bd sync
```

### Network/auth failures

**Cause**: Git remote access issues

**Solution**:
```bash
git fetch  # Test connectivity
git status # Verify repo state
```

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `BEADS_DIR` | Alternate database location | `.beads/` |

Use for multiple databases:
```bash
export BEADS_DIR=/path/to/alternate/beads
bd ready  # Uses alternate database
```
