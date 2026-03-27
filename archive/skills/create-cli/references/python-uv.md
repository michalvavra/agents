# Python CLI Implementation with uv

Implementation patterns for Python CLI tools using uv's inline script dependencies.

## Stack

- Python 3.12+
- uv for dependency management and execution
- PEP 723 inline script metadata for dependencies
- `argparse` from standard library for argument parsing
- Minimal dependencies (prefer built-ins)

## Basic Structure

```python
#!/usr/bin/env -S uv run --script
#
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///

import argparse
import sys
from pathlib import Path

NAME = Path(sys.argv[0]).name


def parse_args():
    parser = argparse.ArgumentParser(
        prog=NAME,
        description="One-line description",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("positionals", nargs="*", help="Input items")
    return parser.parse_args()


def main():
    args = parse_args()
    # validation, then main logic


if __name__ == "__main__":
    main()
```

Make executable with `chmod +x script.py`.

## Full Example with Output Formats

```python
#!/usr/bin/env -S uv run --script
#
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///

import argparse
import csv
import json
import sys
from pathlib import Path

NAME = Path(sys.argv[0]).name


def parse_args():
    parser = argparse.ArgumentParser(
        prog=NAME,
        description="One-line description",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
EXAMPLES
    {NAME} arg1 arg2
    {NAME} --json > output.json
""",
    )
    parser.add_argument("items", nargs="*", help="Input items")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--csv", action="store_true", help="Output as CSV")
    parser.add_argument("--quiet", action="store_true", help="Suppress progress")
    return parser.parse_args()


def log(msg: str, quiet: bool):
    if not quiet:
        print(msg, file=sys.stderr)


def exit_error(msg: str, code: int = 1):
    print(f"{NAME}: {msg}", file=sys.stderr)
    sys.exit(code)


def main():
    args = parse_args()
    quiet = args.quiet or args.json or args.csv

    log("Starting...", quiet)

    results = []
    for item in args.items:
        result = process_item(item)
        results.append({"col1": item, "col2": result})

    if args.json:
        print(json.dumps(results, indent=2))
    elif args.csv:
        if results:
            writer = csv.DictWriter(sys.stdout, fieldnames=results[0].keys())
            writer.writeheader()
            writer.writerows(results)
    else:
        # Human-readable table
        if results:
            headers = list(results[0].keys())
            print("\t".join(headers))
            for row in results:
                print("\t".join(str(v) for v in row.values()))

    log("Done", quiet)


def process_item(item: str) -> str:
    return item.upper()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
    except Exception as e:
        exit_error(str(e))
```

## With External Dependencies

```python
#!/usr/bin/env -S uv run --script
#
# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "httpx>=0.27",
#     "rich>=13",
# ]
# ///

import argparse
import sys
from pathlib import Path

import httpx
from rich.console import Console
from rich.table import Table

NAME = Path(sys.argv[0]).name
console = Console(stderr=True)


def parse_args():
    parser = argparse.ArgumentParser(prog=NAME, description="Fetch and display data")
    parser.add_argument("url", help="URL to fetch")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--quiet", action="store_true", help="Suppress progress")
    return parser.parse_args()


def log(msg: str, quiet: bool):
    if not quiet:
        console.print(msg)


def main():
    args = parse_args()
    quiet = args.quiet or args.json

    log(f"Fetching {args.url}...", quiet)
    response = httpx.get(args.url)
    response.raise_for_status()

    if args.json:
        print(response.text)
    else:
        table = Table()
        table.add_column("Status")
        table.add_column("Length")
        table.add_row(str(response.status_code), str(len(response.content)))
        Console().print(table)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
    except Exception as e:
        print(f"{NAME}: {e}", file=sys.stderr)
        sys.exit(1)
```

## Reproducibility

Lock versions with `exclude-newer` for reproducible builds:

```python
# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "httpx>=0.27",
# ]
# [tool.uv]
# exclude-newer = "2024-12-01T00:00:00Z"
# ///
```

Or create a lockfile:

```bash
uv lock --script example.py
```

## Helper Functions

```python
def log(msg: str, quiet: bool):
    if not quiet:
        print(msg, file=sys.stderr)


def exit_error(msg: str, code: int = 1):
    print(f"{NAME}: {msg}", file=sys.stderr)
    sys.exit(code)


def exit_usage(msg: str):
    print(f"{NAME}: {msg}", file=sys.stderr)
    print(f"Try '{NAME} --help'", file=sys.stderr)
    sys.exit(2)
```

## Error Handling

```python
try:
    main()
except KeyboardInterrupt:
    sys.exit(130)
except FileNotFoundError as e:
    exit_error(f"File not found: {e.filename}")
except httpx.HTTPStatusError as e:
    exit_error(f"HTTP {e.response.status_code}: {e.request.url}")
except Exception as e:
    exit_error(str(e))
```

## TTY Detection

```python
is_tty = sys.stdin.isatty()

# Only prompt if interactive
if is_tty and not args.force:
    response = input("Continue? [y/N] ")
    if response.lower() != "y":
        sys.exit(0)
```

## NO_COLOR Support

```python
import os

use_color = not os.environ.get("NO_COLOR") and sys.stdout.isatty()
```

With rich:

```python
from rich.console import Console

console = Console(no_color=bool(os.environ.get("NO_COLOR")))
```

## Reading from stdin

```python
def get_input(args):
    if args.input:
        return Path(args.input).read_text()
    elif not sys.stdin.isatty():
        return sys.stdin.read()
    else:
        exit_usage("No input provided (use --input or pipe data)")
```

## Adding Dependencies

Use uv to manage inline dependencies:

```bash
# Add dependencies to script
uv add --script example.py 'httpx>=0.27' 'rich>=13'

# Initialize new script with Python version
uv init --script example.py --python 3.12
```

## Linting and Formatting

```bash
# Format with ruff
uv run ruff format script.py

# Lint with ruff
uv run ruff check script.py --fix

# Type check with pyright
uv run pyright script.py
```

## Style Notes

- No unnecessary comments
- Type hints for function signatures
- Prefer `pathlib.Path` over `os.path`
- Use `httpx` over `requests` (async-capable, modern API)
- Prefer `sys.exit()` over `exit()` for explicit exit codes
