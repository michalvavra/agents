# Codebase tour

**Use for:** onboarding to a repo or subsystem, "how does X work here", handover docs.
**Not for:** a plan to change it (`technical-plan.md`).

## Skeleton

```
h1  <Repo or subsystem>: a tour
.lead  What it does and the one idea that makes the code make sense
h2  Map  → .kv: path → responsibility (top-level dirs, then the 5–10 key files)
h2  How a request flows  → numbered walkthrough, each step names file:symbol (linked)
h2  Key concepts  → h3 per concept: definition, where it lives, a short code excerpt
h2  Conventions  → naming, error handling, testing, where config lives
h2  Running it  → commands in figure.code: install, dev, test, lint
h2  Gotchas  → .note warn per trap
h2  Read next  → 3–5 files in reading order, one line why
```

## Components

`.kv` with `<code>` paths, `.diagram` for the flow, `figure.code` with file names in `figcaption`, `.note warn`.

## Rules

- Link paths and symbols to the repo at a fixed commit.
- Explain *why* the structure is the way it is when it isn't obvious.
- Commands must be copy-pasteable and tested.

## Avoid

- Listing every directory. Map what a newcomer will touch in their first week.
