# Architecture plan

**Use for:** system design, RFCs, ADRs, "how should we build X", replacing a component, choosing a storage or messaging approach.
**Not for:** the file-by-file plan once the design is decided (`technical-plan.md`).

## Skeleton

```
h1  <Decision as a noun phrase> ("Queue-based tax lookup")
.lead  The decision (or recommendation) and the main reason, in two sentences
.kv  Status (proposed / accepted / superseded) · Owner · Date · Related links
h2  Context  → the problem, what forces the change now, scale numbers
h2  Requirements and constraints  → two lists: must / nice to have; plus hard constraints
h2  Options  → .matrix: one row per option, one column per criterion, + a short h3 per option
h2  Decision  → what we chose and why it wins on the criteria that matter most
h2  Design
  h3 Components and data flow → .diagram + the same info as a list or table
  h3 Interfaces → API, events, schema as figure.code
  h3 Failure modes → table: failure | effect | detection | mitigation
  h3 Security and privacy (only what changes)
h2  Consequences  → what gets easier, what gets harder, what we now owe (ADR style)
h2  Migration and rollout  → phases, reversibility, kill switch
h2  Cost  → infra, ops load, team time; numbers with units
h2  Open questions
footnotes  Benchmarks, docs, prior art
```

## Components

`.matrix`, `.diagram`, `.kv`, `.tag` for status and option verdicts, `figure.code` for interfaces, `.wide` for a big matrix or diagram, `.note warn` for irreversible steps.

## Rules

- Write criteria before options, and weight them. The decision must follow from the matrix; if it doesn't, the criteria are wrong.
- Include the "do nothing" option with its real cost.
- Every diagram is backed by text: a list of components with their responsibility, and of edges with protocol and sync/async.
- Put numbers on scale claims (requests/s, data size, latency budget), with a footnote for where they came from.
- Name what's hard to reverse. Reversibility is a first-class criterion.
- Keep the design at the level of components and contracts. File paths belong in the technical plan.

## Avoid

- Matrices with ✓/✗ only. Use words in tags: `low`, `partial`, `no`.
- Diagrams with more than ~8 boxes. Split into a context diagram and a detail diagram.
- Listing technologies without saying what each one is responsible for.
