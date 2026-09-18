# ast-grep navigation and advisory checks

Use ast-grep for structural navigation and narrow syntax checks. It complements `rg`, the type checker, the linter, tests, and repository knowledge. It does not provide type resolution, reference graphs, control flow, or data flow.

## Navigate before reading large files

Confirm the binary is available:

```sh
command -v ast-grep
```

Prefer the current `ast-grep` command name. For a large file or directory, inspect a compact outline before reading whole files:

```sh
ast-grep outline path/to/file.ts --items structure --view digest
ast-grep outline src --items exports --view names
```

If the installed version lacks `outline`, use a structural query and then open only the relevant spans:

```sh
ast-grep run -l ts -k 'program > :is(import_statement, export_statement, function_declaration, class_declaration)' path/to/file.ts
```

Follow the outline with `rg` for exact identifiers, imports, callers, tests, configuration, diagnostics, and generated contracts. Verify semantic claims in executable evidence.

## Run the bundled hints narrowly

The bundled rules live under `scripts/ast-grep/rules`. They are advisory and contain no fixes. Run them only on explicit changed production paths, after excluding generated code, declarations, fixtures, and tests. Skip a rule when the repository already enforces the same condition with ESLint, Oxlint, Biome, or another native tool.

From this skill directory:

```sh
ast-grep scan -c scripts/ast-grep/sgconfig.yml path/to/changed-file.ts
```

The active hints flag:

- anonymous default function, class, and arrow exports, which are difficult to search and discuss;
- wildcard re-exports, which deserve review when they form a public boundary;
- `as any` assertions, when no equivalent repository linter already handles them.

A match is a review prompt, not proof of a defect. Classify it as relevant, a justified framework or boundary exception, or outside the requested scope. Do not auto-fix, add suppressions, or expand the change merely to clear a hint.

## Experimental review prompts

Use custom queries only when the task makes them relevant:

- Look for exported functions with several same-primitive identifiers when investigating transposition risk. Syntax alone cannot tell whether parameters are semantically distinct, so do not make this a generic rule.
- Review generic exported names such as `process`, `handle`, or `data` in their repository context. The same names can be precise inside a well-named module, so do not flag them categorically.

## Maintain the rule pack

When changing a rule, add valid, invalid, multiline, and meaningful exception cases. TypeScript and TSX use separate language configurations even when their rule bodies match. Test the package from `scripts/ast-grep`:

```sh
ast-grep test -c sgconfig.yml --skip-snapshot-tests
```

Keep rules local and syntax-based. Type-aware, cross-file, or policy-enforcing checks belong in the repository's compiler, linter, or tests.

Official references: [rule configuration](https://astgrep.com/reference/yaml.html), [project configuration](https://astgrep.com/guide/project/project-config.html), [testing rules](https://astgrep.com/guide/test-rule.html), and [outline CLI reference](https://astgrep.com/reference/cli/outline.html).
