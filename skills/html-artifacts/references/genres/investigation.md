# Investigation

**Use for:** debugging logs, root-cause analysis, "why is X slow/broken", performance hunts.
**Not for:** a metrics review without a mystery (`data-report.md`).

## Skeleton

```
h1  <Symptom> ("Intermittent 502s on /checkout")
.lead  Root cause and fix in two sentences, or the current best hypothesis if unresolved
.kv  Status (resolved / mitigated / open) · First seen · Affected · Fix (PR link)
h2  Symptom  → what was observed, with numbers and how to reproduce
h2  Timeline  → .timeline of what was tried, when (optional for short hunts)
h2  Hypotheses
  h3 One per hypothesis: tag (confirmed / ruled out / open), the test, the evidence (logs, code, numbers)
h2  Root cause  → mechanism, step by step, with code or log excerpts
h2  Fix  → .diff or PR link, and why it fixes the mechanism
h2  Follow-ups  → .checklist: guards, alerts, tests that would have caught it
footnotes  Links to logs, dashboards, issues
```

## Components

`.tag ok` (confirmed), `.tag bad` (ruled out), `.tag warn` (open), `figure.code` for log excerpts (`language-log` or none), `.diff`, `.timeline`, `.checklist`.

## Rules

- Keep ruled-out hypotheses; they save the next person time. Say what evidence ruled each out.
- Quote logs and errors verbatim, trimmed, with timestamps.
- Explain the mechanism, not just the trigger: why did this input cause that failure.
- Separate the fix from the follow-ups that prevent recurrence.

## Avoid

- Narrating every command. Show the decisive evidence.
