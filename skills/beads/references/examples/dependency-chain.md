# Example: Complex Dependency Chain

Demonstrates 3-level dependency graph with automatic unblocking.

## Create Tasks

```bash
bd create "Deploy to production" -p 0
# Returns: deploy-prod

bd create "Run integration tests" -p 1
# Returns: integration-tests

bd create "Fix failing unit tests" -p 1
# Returns: fix-tests
```

## Create Dependency Chain

```bash
bd dep add deploy-prod integration-tests      # Integration blocks deploy
bd dep add integration-tests fix-tests        # Fixes block integration
```

Resulting chain: `fix-tests` → `integration-tests` → `deploy-prod`

## Check Ready Work

```bash
bd ready
# Shows: fix-tests (no blockers)
# Hides: integration-tests (blocked by fix-tests)
# Hides: deploy-prod (blocked by integration-tests)
```

## Work Through Chain

```bash
bd update fix-tests --status in_progress
# ... fix tests ...
bd close fix-tests --reason "All unit tests passing"

bd ready
# Shows: integration-tests (now unblocked!)
# Hides: deploy-prod (still blocked)

bd update integration-tests --status in_progress
# ... run tests ...
bd close integration-tests --reason "All integration tests passing"

bd ready
# Shows: deploy-prod (now unblocked!)
```

## Key Point

Dependency chain enforces correct execution order automatically.
