---
name: create-cli
description: Design command-line interfaces. Use when creating CLI tools, designing arguments/flags, help text, output formats, error handling, or refactoring CLI surface area.
---

# Create CLI

Design CLI surface area (syntax + behavior), human-first, script-friendly.

## TL;DR

- Long options preferred (`--from`, not `-f`)
- stdout for data, stderr for progress/errors
- Exit codes: 0=success, 1=runtime error, 2=usage error
- Include `--help`, `--json`, `--quiet` flags
- Validate early, fail fast

## Clarify First

Ask minimum questions, proceed with best-guess defaults if unclear:

- Command name + one-sentence purpose
- Primary user: humans, scripts, or both
- Input sources: args vs stdin; files vs URLs
- Output contract: human text, `--json`, `--csv`
- Destructive operations needing confirmation?

## Arguments

- Long options only (`--from`, not `-f`) unless very common (`-h`, `-v`)
- Support positional args where natural
- Validate early, fail fast with clear messages

## Output Flags

| Flag | Behavior |
|------|----------|
| (default) | Human-readable tabular output |
| `--json` | JSON output, implies quiet |
| `--csv` | CSV output, implies quiet |
| `--quiet` | Suppress progress messages |
| `--verbose` | More detailed output |

- Data to stdout (pipeable)
- Progress/warnings to stderr
- Respect `NO_COLOR` env and `--no-color` flag

## Help Format

```
<name> - <one-line description>

USAGE
    <name> [OPTIONS] <ARGS>

OPTIONS
    --option <VALUE>    Description [default: X]
    --flag              Description
    --help              Show this help

EXAMPLES
    <name> arg1 arg2
    <name> --json | jq '.[]'
```

## Error Handling

- Print: `<name>: <message>` to stderr
- Add: `Try '<name> --help'` for usage errors
- Exit codes: 0=success, 1=runtime error, 2=usage error

## Safety Rules

For destructive operations:
- Interactive confirmation when stdin is TTY
- `--force` to skip confirmation in scripts
- `--dry-run` to preview changes without executing
- `--no-input` disables all prompts (fail if input needed)

## Default Conventions

- `-h/--help` always shows help and exits
- `--version` prints version to stdout (if applicable)
- Handle Ctrl-C gracefully (bounded cleanup)
- TTY detection: prompts only when stdin is TTY

## CLI Spec Template

When designing a CLI, produce:

1. **Name + one-liner**
2. **USAGE synopsis**
3. **Arguments/flags table** (types, defaults, required/optional)
4. **Subcommands** (if applicable)
5. **Output contract** (stdout vs stderr, formats)
6. **Exit codes**
7. **Env vars / config** (if applicable)
8. **5-10 example invocations**

## Style

- No colors by default (or respect NO_COLOR)
- Minimal dependencies
- Prefer built-in argument parsing

## Implementation References

- [references/node-js.md](references/node-js.md) - Node.js with built-in `parseArgs`
- [references/python-uv.md](references/python-uv.md) - Python with uv inline dependencies

When unsure about CLI design, refer to [Command Line Interface Guidelines](https://clig.dev/).
