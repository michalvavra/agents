---
description: Split changes into atomic per-feature commits
argument-hint: "[notes]"
---

Commit the uncommitted changes.

- Atomic commits: one logical change per commit, grouped by feature, not by file type.
- Every commit builds, passes tests and is revertable on its own.
- Formatting, renames, dependency bumps and pure refactors get separate commits, before the feature that needs them.
- Tests and docs go with the code they cover.
- Conventional Commits; add a body only when the why isn't obvious.
- Show the plan first and wait for approval.
- Never amend, rebase, force-push or push.

$@
