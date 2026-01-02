# Node.js CLI Implementation

Implementation patterns for Node.js CLI tools.

## Stack

- Node.js ES modules
- Prefix imports with `node:` (e.g., `import fs from "node:fs"`)
- Use `parseArgs` from `node:util` for argument parsing
- Minimal dependencies (prefer built-ins)

## Basic Structure

```javascript
#!/usr/bin/env node

import { basename } from "node:path";
import { parseArgs } from "node:util";

const NAME = basename(process.argv[1]);

let values, positionals;
try {
  ({ values, positionals } = parseArgs({
    options: {
      help: { type: "boolean", default: false },
    },
    allowPositionals: true,
  }));
} catch (err) {
  process.stderr.write(`${NAME}: ${err.message}\n\nTry '${NAME} --help'\n`);
  process.exit(2);
}

if (values.help) {
  console.log(`<help text>`);
  process.exit(0);
}

// validation, then main logic
```

## Full Example with Output Formats

```javascript
#!/usr/bin/env node

import { basename } from "node:path";
import { parseArgs } from "node:util";

const NAME = basename(process.argv[1]);

let values, positionals;
try {
  ({ values, positionals } = parseArgs({
    options: {
      help: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      csv: { type: "boolean", default: false },
      quiet: { type: "boolean", default: false },
    },
    allowPositionals: true,
  }));
} catch (err) {
  process.stderr.write(`${NAME}: ${err.message}\n\nTry '${NAME} --help'\n`);
  process.exit(2);
}

const { help, json, csv, quiet: quietFlag } = values;
const quiet = quietFlag || json || csv;

if (help) {
  console.log(`${NAME} - <one-line description>

USAGE
    ${NAME} [OPTIONS] <ARGS>

OPTIONS
    --json              Output as JSON array
    --csv               Output as CSV
    --quiet             Suppress progress messages
    --help              Show this help

EXAMPLES
    ${NAME} arg1 arg2
    ${NAME} --json > output.json`);
  process.exit(0);
}

function log(msg) {
  if (!quiet) process.stderr.write(msg + "\n");
}

function exitUsage(message) {
  process.stderr.write(`${NAME}: ${message}\nTry '${NAME} --help'\n`);
  process.exit(2);
}

async function main() {
  log("Starting...");

  const results = [];
  for (const item of positionals) {
    const result = await processItem(item);
    results.push({ col1: item, col2: result });
  }

  if (json) {
    console.log(JSON.stringify(results, null, 2));
  } else if (csv) {
    const keys = Object.keys(results[0] || {});
    console.log(keys.join(","));
    for (const row of results) {
      console.log(Object.values(row).join(","));
    }
  } else {
    console.table(results);
  }

  log("Done");
}

main().catch(err => {
  process.stderr.write(`${NAME}: ${err.message}${err.cause ? ` (${err.cause.message})` : ""}\n`);
  process.exit(1);
});
```

## Helper Functions

```javascript
function log(msg) {
  if (!quiet) process.stderr.write(msg + "\n");
}

function exitUsage(message) {
  process.stderr.write(`${NAME}: ${message}\nTry '${NAME} --help'\n`);
  process.exit(2);
}
```

## Error Handling

Include cause for debugging:

```javascript
throw new Error("Failed to process file", { cause: originalError });
```

## TTY Detection

```javascript
const isTTY = process.stdin.isTTY;

// Only prompt if interactive
if (isTTY && !values.force) {
  // show confirmation prompt
}
```

## NO_COLOR Support

```javascript
const useColor = !process.env.NO_COLOR && process.stdout.isTTY;
```

## Linting and Formatting

For linting use [tsgolint](https://github.com/oxc-project/tsgolint):

```bash
npx tsgolint src/
```

For formatting use [oxfmt](https://oxc.rs/docs/guide/usage/formatter):

```bash
npx oxfmt --write src/
```

## Style Notes

- No unnecessary comments
- No version flag unless package needs it
- Prefer async/await over callbacks
