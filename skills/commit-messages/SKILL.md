---
name: commit-messages
description: Write well-structured commit messages and change descriptions. Use when committing code with git, jj, or other VCS.
---

# Commit Messages

Write clear, consistent commit messages following established conventions.

## TL;DR

- Subject: 50 chars max, capitalized, no period (see Subject Line Rules)
- Blank line between subject and body
- Body: wrap at 72 chars, explain what and why (not how)
- Check repo's existing commits first to match local conventions

## Workflow

1. **Check repo conventions.** Review recent history to see existing style.
   - git: `git log --oneline -20`
   - jj: `jj log -n 20`
2. **Match the pattern.** If repo uses prefixes (feat/fix/docs), follow them.
3. **Write subject first.** Complete the sentence: "If applied, this commit will..."
4. **Add body if needed.** For non-trivial changes, explain context.

## Subject Line Rules

| Rule | Example |
|------|---------|
| Use imperative mood | `Add validation` not `Added validation` |
| Max 50 characters | Short enough to scan in log views |
| Capitalize first word | `Fix bug` not `fix bug` |
| No trailing period | `Update README` not `Update README.` |
| No issue numbers in subject | Put references in body or footer |

## Body Guidelines

- Wrap lines at 72 characters (hard limit)
- Explain **what** changed and **why**, not how (code shows how)
- Use blank line to separate paragraphs
- Use bullet points for multiple related changes

## Format Template

```
<Subject line - imperative, 50 chars max>

<Body - wrap at 72 chars>

Explain the motivation for the change. What problem does this solve?
Why is this approach better than alternatives?

- Bullet points are fine for listing related changes
- Keep each point concise

<Footer - optional>
Fixes #123
Co-authored-by: Name <email>
```

## Common Prefixes

If the repo uses conventional commits, apply these prefixes:

| Prefix | Use For |
|--------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `refactor:` | Code change (no feature/fix) |
| `test:` | Adding/updating tests |
| `chore:` | Maintenance (deps, config) |

Note: Only use prefixes if the repo already uses them.

## Examples

**Simple change:**
```
Add input validation for email field
```

**With body:**
```
Refactor authentication to use JWT

Session-based auth required sticky sessions, which complicated
horizontal scaling. JWT tokens are stateless and can be verified
by any server instance.

Trade-off: tokens cannot be invalidated before expiry. Added
a token blacklist for logout and password changes.
```

**Bug fix with reference:**
```
Fix race condition in queue processor

Multiple workers could claim the same job when polling
simultaneously. Added row-level locking to prevent duplicates.

Fixes #847
```

## Anti-Patterns

- `Fix stuff` (too vague)
- `WIP` (squash before merging)
- `Update file.js` (say what the update does)
- `Fixed the bug where users couldn't log in when...` (past tense, too long)
- Mixing unrelated changes in one commit
