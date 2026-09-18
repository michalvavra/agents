---
name: write-discoverable-code
description: Make changed code easy for agents and humans to find, understand, and verify through search-oriented naming, precise types, truthful local guidance, coherent module boundaries, bounded repository navigation, and repository-native validation. Use when writing, renaming, refactoring, or reviewing code, especially across modules or integrations. Apply only to touched scope unless the user requests a broader audit.
---

# Write Discoverable Code

Make changed code retrievable by its domain terms, cheap to inspect in bounded structural units, and hard to misuse through precise types and truthful local guidance.

## Respect authority and scope

- Follow the user's scope and the nearest `AGENTS.md` before this skill. Follow established repository vocabulary, architecture, and validation commands.
- Inspect before editing. Identify the owning module, generated or read-only areas, callers, tests, and external contracts.
- Apply these rules to code changed for the current task and to explicit reviews. Do not initiate unrelated renaming, decomposition, or cleanup solely for discoverability.
- Preserve intentional framework conventions and public boundaries. Treat every rule as contextual, not universal.

## Retrieve context efficiently

1. Read the repository instructions and map the relevant directories and ownership boundaries.
2. Start with `rg` over filenames and domain terms. Search exact identifiers once the repository reveals them.
3. Before opening a source file whose full read would consume unnecessary context, use `ast-grep outline` when available. Read [references/ast-grep.md](references/ast-grep.md) for commands, fallbacks, and limitations.
4. Find the definition, direct callers, tests, and relevant configuration or generated contract. Use structural queries when text results are ambiguous.
5. Open narrow windows around the best hits. Expand only when the evidence requires it.
6. Refine searches with terminology learned from the code. Stop when the behavior and change surface are established.

Treat names, comments, and paths as navigation clues. Confirm their claims against implementation, types, call sites, tests, and external contracts.

## Write searchable names

- Reuse recognizable repository and domain vocabulary. Name important symbols for the concept plus their role, effect, or lifecycle state.
- Prefer the shortest name that is unambiguous in its search scope. Do not impose a word count or expand familiar local abbreviations mechanically.
- Give generic verbs their object when the symbol crosses a module boundary. Prefer `reconcileProviderPayment` over `process` when that is the actual responsibility.
- Keep one spelling for one concept within the touched flow. Do not introduce synonyms or local aliases that split future searches.
- Keep names truthful when behavior changes. Rename stale identifiers in the same scoped change.
- Use concept-bearing filenames when the surrounding convention does not already supply the context. Do not ban `index`, `types`, `utils`, or barrels categorically.
- Keep stable diagnostic text or a literal prefix at the source so an observed error can be searched directly.

## Preserve useful types

- Preserve repository-native domain types at public, persistence, workflow, and provider boundaries.
- Model meaningful states explicitly, using discriminated unions or equivalent native constructs when they prevent invalid combinations.
- Consider distinct ID types or an options object when several same-primitive identifiers can be transposed. Do not brand every ID by default.
- Allow clear local inference. Add annotations where they expose a contract, constraint, unit, ownership boundary, or otherwise prevent misuse.
- Do not introduce `any`, broad casts, or suppression merely to silence feedback. Investigate the mismatch and keep unavoidable boundary shims narrow and explained.

## Put guidance where work lands

- Comment non-obvious intent, invariants, units, time zones, ordering, provider behavior, security constraints, and consequential tradeoffs near the relevant definition.
- Do not narrate obvious mechanics or require comments on every export.
- Update or remove touched comments that no longer match behavior. Misleading guidance is worse than missing guidance.
- Record deliberate absences or unsupported behavior where a maintainer would naturally search for them.

## Create coherent boundaries

- Keep related behavior together. Extract a module when it creates a coherent responsibility, hides a change-prone decision, or separates architectural layers.
- Do not split solely because a file or function crosses a line threshold. Do not fragment one concept into tiny helpers that force extra reads.
- Keep orchestrators readable as a sequence of well-named domain operations. Move transport, persistence, mapping, and provider details behind their owning boundaries.
- Keep tests easy to find from the behavior they specify, following the repository's test-location convention.

For TypeScript backend or integration services, read [references/typescript-service-patterns.md](references/typescript-service-patterns.md). For TypeScript React or Astro applications, read [references/typescript-frontend-patterns.md](references/typescript-frontend-patterns.md). Load only the relevant reference.

## Validate with repository feedback

1. For code changes, run the repository-prescribed formatter, compiler or type checker, linter, and relevant tests. If no single check command is documented, inspect the package scripts and choose focused checks for the touched area. For review-only work, do not run write-capable formatters; use read-only checks only when they materially support the review.
2. Use diagnostics to retrieve the exact declaration or contract that the change violated. Do not patch around feedback without understanding it.
3. Review the diff for stale names, duplicated moved code, widened casts, misleading comments, and accidental architectural leakage.
4. If `ast-grep` is available, run applicable advisory checks only on changed production files. Skip a bundled check when the repository already has equivalent linting.
5. Triage each advisory match as relevant, a justified boundary or framework exception, or outside the current scope. Do not auto-fix or add suppression comments.
6. State any behavior that could not be verified.

## Review questions

- Can the changed concept be found using the terms a maintainer would naturally search?
- Do its name, type, diagnostic text, and nearby guidance agree with its behavior?
- Can a reader reach its definition, callers, tests, and contract without opening unrelated modules?
- Does each new boundary own a coherent responsibility rather than merely reducing file size?
- Did repository-native validation confirm the change?

Read [references/evidence.md](references/evidence.md) only when explaining, challenging, or maintaining these rules. It records the research, caveats, and upstream attribution without consuming normal task context.

## Upstream

Adapted from Modem's `write-discoverable-code` skill v4, authored by Ben Vinegar and co-authored by Cursor. Preserve the bundled MIT license and see the evidence reference for source details.
