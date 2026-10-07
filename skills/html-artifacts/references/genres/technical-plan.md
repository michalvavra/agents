# Technical plan

**Use for:** a plan for writing code: a feature, a refactor, a migration, a bug fix that spans several files. Something an engineer (or agent) will execute step by step.
**Not for:** choosing between designs at the system level (`architecture.md`).

## Skeleton

```
h1  Plan: <what will exist when done>
.lead  The approach in one or two sentences, and the size (≈ n files, n steps, risk level)
h2  Goal  → what done looks like, as checkable statements
h3  Non-goals  → what this deliberately doesn't do
h2  Current state  → how it works today, with file paths; .kv or a short list
h2  Approach  → one or two paragraphs; a small .diagram only if data flow changes
h2  Changes  → table: path | change (tag: new / edit / delete / move) | what
h2  Steps  → ol.steps; each step: h3, what to do, files, .verify line
h2  Tests  → what's added, what's run, what's checked by hand
h2  Risks  → .note warn per real risk, each with a mitigation
h2  Rollout  → flags, migration order, rollback (only if it ships to users)
h2  Open questions  → numbered, each with who/what can answer it
details  Alternatives considered  → one paragraph each, why not
```

## Components

`.steps`, `.checklist`, `.tag` for change types, `.diff` or `figure.code` for interface sketches, `.kv` for current-state facts, `.note warn` for risks.

## Rules

- Each step leaves the code working and is independently verifiable. If a step can't be verified, merge it with the next one.
- Each step names the files it touches and the exact command or check that proves it worked.
- Order steps so the riskiest assumption is tested first.
- Show interfaces (types, function signatures, schema) as code, not prose. Don't write full implementations in the plan.
- Name real paths, symbols and commands from the repo. Look them up; don't guess.
- Open questions must block something specific; otherwise drop them.

## Avoid

- Steps like "implement the feature" or "add tests" with no files and no check.
- Estimates in hours. Use size (S/M/L) only if asked.
- Alternatives in the main flow. Keep them in `<details>`.
