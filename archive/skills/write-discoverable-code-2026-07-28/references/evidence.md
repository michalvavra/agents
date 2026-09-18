# Evidence and provenance

Load this reference only when explaining, reviewing, or changing the skill's rules. The core skill intentionally translates the evidence into contextual heuristics instead of universal thresholds.

## Upstream provenance

- This skill is adapted from [`modem-dev/skills/write-discoverable-code`](https://github.com/modem-dev/skills/blob/edcdedb38a545f67c065f4084b3627517f0d79cf/write-discoverable-code/SKILL.md), version 4.
- The upstream commit was authored by [Ben Vinegar](https://github.com/bentlegen) and records `Cursor <cursoragent@cursor.com>` as co-author.
- Source commit: [`edcdedb38a545f67c065f4084b3627517f0d79cf`](https://github.com/modem-dev/skills/commit/edcdedb38a545f67c065f4084b3627517f0d79cf).
- Companion article: [How coding agents read your code](https://modem.dev/blog/how-coding-agents-read-your-code).
- The bundled `LICENSE` preserves the upstream MIT license and its `Copyright (c) 2026 Modem` notice verbatim.

## Retrieval and context

- [GrepRAG, arXiv:2601.23254](https://arxiv.org/abs/2601.23254) supports exact, repository-grounded search and iterative refinement. Its results motivate searchable identifiers and literal diagnostics, not any mandatory naming length.
- [RepoCoder, arXiv:2303.12570](https://arxiv.org/abs/2303.12570) reports gains from alternating retrieval and generation. This supports learning vocabulary from early hits and refining the search.
- [GraphCoder, arXiv:2406.07003](https://arxiv.org/abs/2406.07003) uses repository structure to retrieve related code. This supports following definitions, dependencies, callers, and tests when textual matches are insufficient.
- [SWE-agent, arXiv:2405.15793](https://arxiv.org/abs/2405.15793) shows the value of agent-computer interfaces with concise, bounded observations. This supports outlines and narrow source windows before large reads.
- [Long context does not always help, arXiv:2510.05381](https://arxiv.org/abs/2510.05381) cautions that more repository context can reduce performance. This supports stopping once the behavior and change surface are established.
- [CodeCrash, arXiv:2504.14119](https://arxiv.org/abs/2504.14119) finds that misleading natural-language signals can degrade code reasoning. This supports keeping names and comments truthful and verifying them against executable evidence.

## Naming, types, comments, and boundaries

- [Hofmeister et al., Shorter Identifier Names Take Longer to Comprehend](https://doi.org/10.1109/SANER.2017.7884623) and [Schankin et al., Descriptive Compound Identifier Names Improve Source Code Comprehension](https://doi.org/10.1145/3196321.3196332) support descriptive identifiers when they clarify meaning. Neither justifies a universal word count.
- [Miceli Barone et al., ACL 2023](https://aclanthology.org/2023.findings-acl.19/) shows that identifier swaps affect language-model code behavior. This supports stable domain vocabulary and cautions against gratuitous synonym churn.
- [COMPCODER, arXiv:2203.05132](https://arxiv.org/abs/2203.05132), [CoCoGen, arXiv:2403.16792](https://arxiv.org/abs/2403.16792), and [TiCoder, arXiv:2404.10100](https://arxiv.org/abs/2404.10100) support compiler, execution, and test feedback as high-value signals. This motivates repository-native validation rather than style-only review.
- [An eye-tracking study of comments, Empirical Software Engineering 2026](https://doi.org/10.1007/s10664-025-10721-2) reports context-dependent effects. This supports selective comments for intent and constraints, not comments on every export.
- [Parnas, On the Criteria To Be Used in Decomposing Systems into Modules](https://doi.org/10.1145/361598.361623) motivates boundaries around decisions likely to change. [A longitudinal study of Blob classes, arXiv:2009.02438](https://arxiv.org/abs/2009.02438) supports concern about poorly separated responsibilities, not fixed file-length limits.

## Deliberate limits

Do not turn this evidence into fixed percentages, identifier word counts, file-length thresholds, comment quotas, categorical barrel bans, blanket branded identifiers, or automatic refactors. The Modem experiment is useful evidence that code presentation affects agent behavior, but it changes several variables at once and should not be read as an isolated causal estimate for any single rule.
