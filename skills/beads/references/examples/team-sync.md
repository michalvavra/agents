# Example: Team Collaboration with Git Sync

Demonstrates multi-user workflow using git sync.

## Alice's Session

```bash
bd create "Refactor database layer" -p 1
# Returns: db-refactor

bd update db-refactor --status in_progress
bd update db-refactor --notes "Started: Migrating to Prisma ORM"

# End of day
bd sync
# Commits to git, pushes to remote
```

## Bob's Session (next day)

```bash
# Start of day
bd sync
# Pulls latest tasks from remote

bd ready
# Shows: db-refactor [P1] [in_progress] (Alice's task)

bd show db-refactor
# Sees Alice's notes: "Started: Migrating to Prisma ORM"

# Bob works on different task
bd create "Add API rate limiting" -p 2
# Returns: rate-limit

bd update rate-limit --status in_progress

# End of day
bd sync
# Both Alice's and Bob's tasks synchronized
```

## Key Points

- `bd sync` is all-in-one: export, commit, pull, merge, import, push
- Team members see each other's tasks and progress
- Conflict resolution handled automatically for JSONL format
- Use at: end of session, before handoff, after major progress
