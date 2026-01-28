---
name: brave-search
description: Web search via the Brave Search API. Use to retrieve search results from Brave when web lookups are needed.
compatibility: Requires BRAVE_SEARCH_API_KEY and uv with Python 3.12+ for scripts/brave-search.py.
---

# Brave Search

## Quick start

```bash
export BRAVE_SEARCH_API_KEY="your-token"
{baseDir}/scripts/brave-search.py "pi coding agent" --search-lang en --country US
```

## Usage

```bash
{baseDir}/scripts/brave-search.py "QUERY" [OPTIONS]
uv run --script {baseDir}/scripts/brave-search.py "QUERY" [OPTIONS]
```

## Options

- `--count <N>`: Maximum results to return (default: 5)
- `--offset <N>`: Offset into the result set (default: 0)
- `--country <CODE>`: Two letter country code
- `--search-lang <CODE>`: Search language code
- `--safesearch <off|moderate|strict>`: Safe search mode
- `--freshness <day|week|month>`: Filter by recency
- `--json`: Output normalized JSON
- `--raw`: Output raw API response
- `--help`: Show help

## Environment variables

```bash
BRAVE_SEARCH_API_KEY="your-token"
```

## Examples

```bash
{baseDir}/scripts/brave-search.py "observability tools" --count 3
```
