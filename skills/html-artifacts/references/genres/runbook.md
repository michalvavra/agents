# Runbook

**Use for:** procedures someone follows step by step: deploys, migrations, on-call actions, setup guides, how-tos.
**Not for:** explaining a concept (`explainer.md`), planning code (`technical-plan.md`).

## Skeleton

```
h1  <Action> ("Rotate the Stripe webhook secret")
.lead  When to use this, how long it takes, and the risk level
h2  Before you start  → .checklist: access, tools, approvals, maintenance window
h2  Steps  → ol.steps: h3 per step, the command in figure.code, expected output, .verify line
h2  Rollback  → steps.  Start with when to roll back.
h2  Troubleshooting  → table: symptom | likely cause | what to do
h2  After  → what to tell whom, what to check tomorrow
```

## Components

`.steps`, `.checklist`, `figure.code` (`language-bash`), `.note bad` for destructive steps, `.note warn` for waits and timeouts.

## Rules

- One action per step. Commands are complete, with placeholders in `<ANGLE_CAPS>` and a line saying where to get each value.
- Show the expected output, so the reader knows it worked.
- Mark destructive or irreversible steps with `.note bad` *before* the step.
- Rollback is written before anyone needs it, and tested.

## Avoid

- Prose between steps. If it matters, it's a step or a note.
