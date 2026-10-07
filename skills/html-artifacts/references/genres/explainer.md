# Explainer

**Use for:** teaching a concept, a library, an algorithm or a technique; tutorials.
**Not for:** a procedure to follow (`runbook.md`), a judgment on one paper (`paper-summary.md`).

## Skeleton

```
h1  <Concept> ("How speculative decoding works")
.lead  The idea in one or two plain sentences, with no jargon
h2  The problem  → why this exists, with a concrete example
h2  The idea  → intuition first, an analogy only if it's accurate
h2  Step by step  → h3 per step, each building on the last, one small example per step
h2  In code  → figure.code, minimal and runnable
h2  Common mistakes  → .note warn per mistake
h2  Going further  → .items of 3–5 links
```

## Components

`figure.code`, `.diagram`, `.note info` for definitions, `.note warn` for pitfalls, `<details>` for proofs or deep dives.

## Rules

- Define each term the first time it appears, then use it consistently.
- Use one running example across the whole page.
- Put the formal version (math, proof) after the intuition, often in `<details>`.

## Avoid

- Starting with history. Start with the problem.
