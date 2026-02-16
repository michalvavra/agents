---
name: search-hexdocs
description: Search HexDocs documentation for Elixir and Erlang packages. Use when looking up package APIs or guides.
compatibility: Requires Node.js 18+. 
---

# Search hexdocs

Search [hexdocs.pm](https://hexdocs.pm) documentation.

## Usage

```bash
node {thisSkillDir}/scripts/hexdocs.js <QUERY> [OPTIONS] --json
```

## Examples

```bash
# Search all packages
node {thisSkillDir}/scripts/hexdocs.js "GenServer callbacks"

# Filter by package
node {thisSkillDir}/scripts/hexdocs.js "Ecto.Query" --packages ecto

# Multiple packages
node {thisSkillDir}/scripts/hexdocs.js "LiveView hooks" --packages phoenix_live_view,phoenix

# Limit results
node {thisSkillDir}/scripts/hexdocs.js "plug conn" --limit 5

# JSON output
node {thisSkillDir}/scripts/hexdocs.js "json encode" --packages jason --json
```

## Output Format

```
Results: 42 (showing 10)

<result index="0" package="phoenix" ref="Phoenix.Controller.html#json/2" title="json/2">
Sends JSON response...
</result>
```
