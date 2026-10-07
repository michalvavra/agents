# Data report

**Use for:** metrics reviews, analyses, A/B results, experiment or benchmark results, anything where the point is a number.
**Not for:** a system design (`architecture.md`) or a plan for code (`technical-plan.md`).

## Skeleton

```
h1  What was measured, and when ("Checkout latency: March review")
.lead  The headline number and what it means, in one or two sentences
.muted small  Data source, window, who/what prepared it
.stats  3–5 KPIs; tone only on the ones that moved meaningfully
.note  Optional summary or the one caveat that changes the reading
h2  Breakdown (by region / by variant / by model …)  → table with .num, .bar
h2  What's driving it  → short prose, one chart or table per claim
h2  How we measured  → .kv (source, window, filters, sample size), query in figure.code
h2  Next steps  → ordered list
details  Raw data  + <script type="application/json" id="…">
footnotes
```

For **experiments and benchmarks**, replace "Breakdown" with:

- `h2 Setup` → `.kv` with hardware, versions, dataset, seeds, runs per config.
- `h2 Results` → main table. Bold the best value per column, put ± or CI in `.muted`, state the unit in the header (`p50 (ms)`), and say which direction is better.
- `h2 Ablations` → one row per removed piece, delta column with tone.
- `h2 Threats to validity` → list: noise, warm-up, cache, sample size.

## Rules

- Every number has a unit and a comparison (was, vs. baseline, vs. target). A bare number is not a finding.
- Round to what matters: `412 ms`, not `411.83 ms`. Keep the precision in the JSON.
- Use tone for direction of goodness, not for direction of change: a drop in latency is `.ok`.
- Use `.bar` for share or relative size inside a table; use inline SVG only for a trend over time.
- Say the sample size and the window near every headline number, or once in the `.muted small` line.
- If a result is not significant, say so in the `.lead`, not in a footnote.

## Avoid

- KPI rows with more than five stats, or stats that the text never mentions.
- Charts without the same data in a table.
- Percentages of percentages without saying "points" (`+3 pp`).
