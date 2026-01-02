---
name: tech-comparison
description: Compare technologies with weighted scoring matrix. Use when evaluating libraries, frameworks, SaaS products, or infrastructure options.
---

# Tech Comparison

Produce rigorous, unbiased comparisons with quantified scoring.

## TL;DR

- 5-8 weighted criteria (must total 100 pts), score 1-5 per option
- Use tables, stay neutral, cite sources for contested claims
- Output: At a Glance table → Weighted Comparison → Key Differentiators → Recommendation
- Confidence level (High/Medium/Low) + caveat when another option wins

## Workflow

1. **Clarify scope** — Confirm options to compare and primary use case (skip if obvious)
2. **Define criteria** — Select 5-8 evaluation dimensions relevant to use case
3. **Assign weights** — Distribute 100 points across criteria based on stated priorities
4. **Score options** — Rate each option 1-5 per criterion with brief justification
5. **Calculate totals** — Weighted score = Σ(weight × score) / 5
6. **Recommend** — State winner with confidence level and caveats

## Output Guidelines

- **Format** — Always output as Markdown
- **Be concise** — Use the template format strictly. Avoid expanding into full reports or prose sections beyond the template structure.
- **Stay neutral** — Use third-person ("the system", "the service") not second-person ("you", "your")
- **Keep tech-agnostic** — Use general terms ("deployed in cloud", "concurrent requests", "caching") instead of framework/language-specific jargon unless user explicitly requests implementation details
- **Abstract context** — Generalize deployment details (e.g., "Next.js on Cloudflare" → "cloud deployment") unless the specific stack affects the comparison scoring

## Output Template

```markdown
# [Option A] vs [Option B] vs [Option N]

**Use Case:** [One sentence describing evaluation context]

## At a Glance

| | [A] | [B] | [N] |
|---|---|---|---|
| **Docs** | [A](https://docs.example.com) | [B](https://docs.example.com) | [N](https://docs.example.com) |
| **Type** | [category, e.g. "ORM", "Framework", "BaaS"] | [category] | [category] |
| **License** | [MIT/Apache/Commercial] | [license] | [license] |

## Weighted Comparison

| Criterion | Weight | [A] | [B] | [N] | Notes |
|-----------|-------:|:---:|:---:|:---:|-------|
| [criterion] | XX | X | X | X | [key differentiator] |
| ... | | | | | |
| **Total** | **100** | **XX** | **XX** | **XX** | |

*Scoring: 1=Poor, 2=Below Avg, 3=Adequate, 4=Good, 5=Excellent*

## Key Differentiators

- **[A]:** [Primary strength/weakness in ≤15 words]
- **[B]:** [Primary strength/weakness in ≤15 words]

## Recommendation

**Winner:** [Option] ([XX] pts)
**Confidence:** [High/Medium/Low]
**Caveat:** [When another option might be better]
```

## At a Glance Guidelines

The "At a Glance" section provides quick orientation before the detailed analysis:

- **Docs link** — Link to official documentation (prefer `/docs` or `/getting-started` pages)
- **Type** — One-word category (e.g., "ORM", "Framework", "CLI", "BaaS", "Library")
- **License** — SPDX identifier or "Commercial" / "Freemium"

Keep this table to 2-3 rows max. Omit rows if not relevant (e.g., skip License for all-MIT comparisons).

## Criteria Selection Guide

| Domain | Typical Criteria |
|--------|-----------------|
| **SaaS/Apps** | Pricing, UX, integrations, support, security, scalability |
| **Dev Tools** | DX, docs, community, performance, learning curve, ecosystem |
| **Infrastructure** | Cost, reliability, latency, compliance, vendor lock-in |
| **Libraries** | Bundle size, maintenance, API design, TypeScript support |

## Weighting Principles

- **Must-haves:** 15-25 pts each (dealbreakers if unmet)
- **Should-haves:** 10-15 pts each (strong preference)
- **Nice-to-haves:** 5-10 pts each (tiebreakers)
- Sum must equal 100

## Scoring Rules

- Base scores on verifiable facts, not marketing
- Cite sources for contested claims
- Flag scores based on limited/outdated data
- Use 3 as baseline; justify deviations

## Anti-Patterns

- Avoid criteria that favor a predetermined winner
- Never score without justification in Notes column
- Skip vanity metrics (GitHub stars alone, logo walls)
- Don't conflate "most features" with "best fit"
- Don't write extended prose sections between tables
- Don't include code snippets or specific language features unless explicitly requested
