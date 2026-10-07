# Paper summary

**Use for:** one paper (arXiv, conference, tech report, long blog post) explained and judged.
**Not for:** many papers at once (`survey.md`), a link roundup (`digest.md`).

## Skeleton

Mirrors the paper's own structure, reordered for a reader who has two minutes.

```
h1  Paper title (shortened if long; full title in .kv)
.lead  TL;DR: the claim and the evidence in two sentences, plus your one-line verdict
.kv  Authors · Venue/arXiv id (linked to abs page) · Date · Code link · Tags
h2  Contributions  → 2–4 bullets, as the paper claims them
h2  Problem  → what was hard before, one paragraph
h2  Method  → the core idea in plain words first, then specifics; one figure.code or .diagram if it helps
h2  Results  → the key table re-typed: best in bold, baselines named, units, ± in .muted
h2  Limitations  → what the authors admit + what you noticed (marked as yours)
h2  My take  → does the evidence support the claim? what would convince you? who should care?
h2  Related work  → 3–5 linked papers with one line on how they differ
footnotes  Page/section references for specific claims ("§4.2, Table 3")
```

## Components

`.kv`, tables with `.num`, `.tag` for verdicts (`solid`, `promising`, `weak evidence`), `.note info` for a definition the reader needs, `blockquote` for a key sentence from the paper.

## Rules

- Separate what the paper says from what you think. "The authors claim…" vs. "In my reading…".
- Re-type only the result rows that support the claim, with the baselines that matter. Link the full table by section number.
- Give numbers their context: dataset, metric, direction of better.
- Explain the method so a practitioner could sketch it; skip proofs unless they are the contribution.
- Cite sections and tables in footnotes so claims can be checked.

## Avoid

- Copying the abstract into the lead.
- Calling a result "state of the art" without the benchmark and date.
- Judging without saying what evidence would change your mind.
