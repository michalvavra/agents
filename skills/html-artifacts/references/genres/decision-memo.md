# Decision memo

**Use for:** a recommendation between 2–4 options: which library, which vendor, which plan, which laptop. Technical or not.
**Not for:** a system design (`architecture.md`), a broad market scan (`survey.md`).

## Skeleton

```
h1  <Decision> ("Which error tracker to adopt")
.lead  Recommendation and the deciding reason, in two sentences
h2  Options  → table: option | cost | key strengths | key weaknesses | verdict tag
h2  What decided it  → 2–4 factors, ranked, each with the evidence
h2  Trade-offs we accept  → what the recommended option is worse at
h2  What would change my mind  → concrete conditions or numbers
h2  Next steps  → ordered list, first step doable today
footnotes  Pricing pages, docs, reviews, with dates
```

## Components

Tables with `.num` for prices, `.tag` verdicts (`recommended`, `fallback`, `no`), `.matrix` if criteria > 4, `.note info` for assumptions (budget, team size).

## Rules

- The recommendation is in the first sentence. No build-up.
- Same criteria for every option; same units for every price (per month, per seat).
- Say the assumptions that the choice depends on.
- Short: aim for one screen plus the table.

## Avoid

- Even-handedness that refuses to pick. Pick, then show the cost of picking.
