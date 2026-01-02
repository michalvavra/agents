# Example: Session Resume After Compaction

Demonstrates how bd preserves context across conversation compaction.

## Session 1

```bash
bd create "Implement user authentication" -p 1
# Returns: myproject-auth

bd update myproject-auth --status in_progress
bd update myproject-auth --notes "COMPLETED: JWT library integrated. IN PROGRESS: Testing token refresh. NEXT: Rate limiting"
```

Conversation compacted (history deleted).

## Session 2 (weeks later)

```bash
bd ready
# Output:
# myproject-auth [P1] [task] in_progress

bd show myproject-auth
# Full context preserved:
#   Title: Implement user authentication
#   Status: in_progress
#   Notes: "COMPLETED: JWT library integrated. IN PROGRESS: Testing token refresh. NEXT: Rate limiting"

# Agent continues exactly where it left off
bd update myproject-auth --notes "COMPLETED: Token refresh working. IN PROGRESS: Rate limiting implementation"
```

## Key Points

- Notes written for future agent with zero conversation context
- Status and priority preserved across compaction
- No conversation history needed to resume work
