# Research brief

**Use for:** answering a question from web, doc or internal sources ("What changed in X 4.0?", "Is Y allowed under Z?", "What do we know about…").
**Not for:** a recommendation between options (`decision-memo.md`), a broad landscape (`survey.md`).

## Skeleton

```
h1  The question, as a short statement ("Postgres 18 async I/O")
.lead  The answer, with a confidence word (confirmed / likely / unclear)
h2  Key findings  → 3–7 bullets, each one claim + footnote
h2  Details  → h3 per sub-question, prose with footnotes
h2  Where sources disagree  → table: claim | source A | source B | what we think
h2  Unknowns  → what couldn't be confirmed and what would settle it
h2  Sources  → ol.items: title link, publisher · date, one line on what it contributed and how reliable
footnotes
```

## Components

`.items`, `.tag` for confidence and source type (`primary`, `docs`, `blog`, `forum`), `.note warn` for time-sensitive facts.

## Rules

- Every factual claim has a footnote to a specific source. Prefer primary sources (spec, docs, changelog, paper) over commentary.
- Date every source, and say the date the research was done when facts move fast.
- State confidence per finding when it varies.
- Quote exact wording for legal, policy or API-contract questions.

## Avoid

- Answers that hedge everything. Say what's known plainly, then the caveats.
- A source list of links nobody used. Only cited sources go in.
