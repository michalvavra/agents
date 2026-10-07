# Status update

**Use for:** weekly/sprint/project status, OKR check-ins, release summaries.
**Not for:** a metrics deep dive (`data-report.md`).

## Skeleton

```
h1  <Project> status, <period>
.lead  Overall state (tag: on track / at risk / off track) and the one thing the reader must know
.stats  2–4 numbers that track progress (shipped, open, % done, days to milestone)
h2  Done  → .checklist or list, each item linked (PR, issue, doc)
h2  In progress  → list with owner and expected date
h2  Blocked / at risk  → .note warn per blocker: what, impact, what's needed from whom
h2  Next  → 3–5 items for the next period
h2  Changes to plan  → scope or date changes, with reasons
```

## Components

`.stats`, `.checklist`, `.tag` (`on track` ok, `at risk` warn, `off track` bad), `.timeline` for milestones, `.note warn`.

## Rules

- The state tag is honest and matches the content.
- Asks go in "Blocked" with a named person or team.
- Link everything; don't paste issue descriptions.
- Same structure every period, so updates can be diffed.

## Avoid

- Activity lists ("had meetings"). Report outcomes.
