---
name: hexdocs
description: Search Hex package documentation. Use when looking up Elixir/Erlang library docs, finding module references, or exploring API usage examples.
compatibility: Requires Node.js 18+. Run `npm install` in {baseDir}/scripts first.
---

# hexdocs

Search [hexdocs.pm](https://hexdocs.pm) documentation for Elixir/Erlang packages.

## TL;DR

- `{baseDir}/scripts/hexdocs.js "query"` - search all packages
- `{baseDir}/scripts/hexdocs.js "query" --packages ecto,phoenix` - filter by packages
- `--json` for parseable output, `--limit N` to cap results
- Returns: package, ref (URL path), title, doc excerpt

## Usage

```bash
{baseDir}/scripts/hexdocs.js <QUERY> [OPTIONS]
```

| Option | Description |
|--------|-------------|
| `--packages LIST` | Comma-separated package names to filter |
| `--limit N` | Maximum results (default: 10) |
| `--json` | Output as JSON |
| `--quiet` | Suppress progress messages |

## Examples

```bash
{baseDir}/scripts/hexdocs.js "GenServer callbacks"                      # Search all packages
{baseDir}/scripts/hexdocs.js "Ecto.Query" --packages ecto               # Filter by package
{baseDir}/scripts/hexdocs.js "LiveView hooks" --packages phoenix_live_view,phoenix
{baseDir}/scripts/hexdocs.js "plug conn" --limit 5                      # Limit results
{baseDir}/scripts/hexdocs.js "json encode" --packages jason --json      # JSON output
```

## Output Format

Default output uses XML-like blocks for easy parsing:

```
Results: 42 (showing 10)

<result index="0" package="phoenix" ref="Phoenix.Controller.html#json/2" title="json/2">
Sends JSON response...
</result>

<result index="1" package="jason" ref="Jason.html#encode/2" title="encode/2">
Encodes a value to JSON string...
</result>
```

## Tips

- Without `--packages`, searches all hexdocs (useful for discovery)
- With `--packages`, fetches latest stable version automatically
- Results include package name, ref (URL path), title, and doc content
- Use `--json` when piping to other tools
