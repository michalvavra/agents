# Code review

**Use for:** reviewing a PR, a diff, a branch or a module.
**Not for:** proposing how to build something (`technical-plan.md`).

## Skeleton

```
h1  Review: <PR title or module>  (e.g. "Review: queue tax lookups #482")
.lead  Verdict tag + one sentence: what the change does and whether it can merge
       <span class="tag bad">changes needed</span> / <span class="tag warn">approve with nits</span> / <span class="tag ok">approve</span>
.muted small  Repo, branch or PR link, commit SHA reviewed, files/lines touched
.stats  blocking · should fix · nits · files
h2  Findings  → table: severity tag | location (file:line, linked) | one-line summary (links to #finding-id)
h2  Blocking
  h3 One per finding (id = slug): what, why it matters, evidence, suggested fix
     figure.code with the current code or a .diff with the proposed change
h2  Should fix
h2  Nits  → a plain list is fine; one line each
h2  What's good  → 2–4 bullets, specific (what to keep doing)
h2  Not reviewed  → scope you skipped, assumptions, what you didn't run
footnotes  Links to docs, issues, prior incidents
```

## Components

`.tag` for severity, `figure.code` + `.diff` (see `components.md`), `.stats`, `.checklist` if the team has a review checklist, `.note warn` for a risk that isn't a line of code (migration order, rollout).

## Rules

- Severity scale, used consistently: **blocking** (bug, data loss, security, breaks contract), **should fix** (correctness risk, missing test, confusing API), **nit** (style, naming). Tone: `bad`, `warn`, neutral.
- Each finding is self-contained: location, the problem in one sentence, *why* (impact or failure scenario), a concrete fix. Link `file:line` to the exact lines at the reviewed SHA.
- Show the smallest code excerpt that proves the point, 3–15 lines. Show the fix as a `.diff` when it fits.
- Say how sure you are when it matters: "I think", "verified by running X", "not verified".
- Order findings by severity, then by file order.
- The findings table must match the sections below it one-to-one.

## Avoid

- Restating what the diff does line by line. One sentence in the lead is enough.
- Findings without a reason ("rename this").
- Praise padding. "What's good" is for things worth repeating, or skip it.
