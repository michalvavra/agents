# Survey

**Use for:** comparing many papers, tools, libraries, models or vendors under one question ("Vector DBs for 10M embeddings", "Approaches to speculative decoding"). Modeled on arXiv survey papers: taxonomy, comparison, gaps.
**Not for:** picking one of 2–4 options (`decision-memo.md`), one paper (`paper-summary.md`).

## Skeleton

```
h1  <Field or question>: a survey
.lead  The landscape in two sentences: the main families and which one wins for what
.muted small  Scope: what's included, cut-off date, how items were found
h2  Taxonomy  → nested list (family → subfamily → examples), each node with one line
h2  Comparison  → .matrix in .scroll (often .wide): item × criteria; link each item
h2  Families
  h3 One per family: idea, representative items (.items), strengths, weaknesses
h2  Trends  → what changed recently, with dates
h2  Gaps and open problems
h2  Recommendations  → "if you need X, start with Y" table
details  Method  → search queries, sources, inclusion criteria
<script type="application/json" id="survey-items">  full item list with fields
footnotes
```

## Components

`.matrix`, `.items`, `.tag` for maturity (`research`, `beta`, `production`) and license, `.wide` for the big matrix, `.timeline` for trends.

## Rules

- Define criteria once, above the matrix, with what each value means.
- Every row has a link and a date (paper date, last release). Staleness is a criterion.
- Use the same vocabulary for the same property across rows.
- Put the full list in JSON; the page can show a curated subset.
- The recommendations table must be derivable from the matrix.

## Avoid

- A taxonomy that's just a list. Each level must split on one property.
- Matrices wider than ~8 criteria. Split into two tables.
