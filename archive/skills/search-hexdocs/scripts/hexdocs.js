#!/usr/bin/env node

import { basename } from "node:path";
import { parseArgs } from "node:util";

const NAME = basename(process.argv[1]);

let values, positionals;
try {
  ({ values, positionals } = parseArgs({
    options: {
      packages: { type: "string" },
      limit: { type: "string", default: "10" },
      json: { type: "boolean", default: false },
      quiet: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    allowPositionals: true,
  }));
} catch (err) {
  process.stderr.write(`${NAME}: ${err.message}\n\nTry '${NAME} --help'\n`);
  process.exit(2);
}

const { packages, json, help } = values;
const limit = parseInt(values.limit, 10);
const quiet = values.quiet || json;

if (help) {
  console.log(`${NAME} - Search Hex package documentation

USAGE
    ${NAME} <QUERY> [OPTIONS]

OPTIONS
    --packages <LIST>   Comma-separated package names to filter (e.g. phoenix,ecto)
    --limit <N>         Maximum results [default: 10]
    --json              Output as JSON
    --quiet             Suppress progress messages
    --help              Show this help

EXAMPLES
    ${NAME} "GenServer callbacks"
    ${NAME} "Ecto.Query" --packages ecto
    ${NAME} "LiveView hooks" --packages phoenix_live_view,phoenix
    ${NAME} "plug conn" --limit 5
    ${NAME} "json encode" --packages jason --json`);
  process.exit(0);
}

function log(msg) {
  if (!quiet) process.stderr.write(msg + "\n");
}

function exitUsage(message) {
  process.stderr.write(`${NAME}: ${message}\nTry '${NAME} --help'\n`);
  process.exit(2);
}

if (positionals.length === 0) {
  exitUsage("missing required argument: <QUERY>");
}

if (positionals.length > 1) {
  exitUsage("too many arguments (use quotes around multi-word queries)");
}

if (isNaN(limit) || limit < 1) {
  exitUsage(`invalid --limit: '${values.limit}'`);
}

const query = positionals[0];

async function fetchLatestVersion(packageName) {
  const url = `https://hex.pm/api/packages/${packageName}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for package ${packageName}`);
  }

  const data = await response.json();

  const versions = data.releases
    .map((r) => {
      const match = r.version.match(/^(\d+)\.(\d+)\.(\d+)$/);
      if (!match) return null;
      return {
        version: r.version,
        major: parseInt(match[1], 10),
        minor: parseInt(match[2], 10),
        patch: parseInt(match[3], 10),
      };
    })
    .filter(Boolean);

  if (versions.length === 0) {
    throw new Error(`no stable versions found for ${packageName}`);
  }

  versions.sort((a, b) => {
    if (a.major !== b.major) return b.major - a.major;
    if (a.minor !== b.minor) return b.minor - a.minor;
    return b.patch - a.patch;
  });

  return versions[0].version;
}

async function buildPackageFilter(packageNames) {
  const filters = [];

  for (const name of packageNames) {
    try {
      log(`Fetching version for ${name}...`);
      const version = await fetchLatestVersion(name);
      filters.push(`${name}-${version}`);
      log(`  ${name}-${version}`);
    } catch (err) {
      log(`warning: skipping ${name}: ${err.message}`);
    }
  }

  if (filters.length === 0) {
    throw new Error("no valid packages found");
  }

  return `package:=[${filters.join(", ")}]`;
}

async function searchHexDocs(query, filterBy) {
  const params = new URLSearchParams({
    q: query,
    query_by: "doc,title",
  });

  if (filterBy) {
    params.set("filter_by", filterBy);
  }

  const url = `https://search.hexdocs.pm/?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from hexdocs search`);
  }

  return response.json();
}

function formatResultsText(body, maxResults) {
  const { found, hits } = body;
  const limited = hits.slice(0, maxResults);

  let result = `Results: ${found} (showing ${limited.length})`;

  for (let i = 0; i < limited.length; i++) {
    const hit = limited[i];
    const { doc, package: pkg, ref, title } = hit.document;

    result += "\n\n";
    result += `<result index="${i}" package="${pkg}" ref="${ref}" title="${title}">\n`;
    result += doc;
    result += "\n</result>";
  }

  return result;
}

function formatResultsJson(body, maxResults) {
  const { found, hits } = body;
  const limited = hits.slice(0, maxResults);

  return {
    found,
    showing: limited.length,
    results: limited.map((hit, index) => ({
      index,
      package: hit.document.package,
      ref: hit.document.ref,
      title: hit.document.title,
      doc: hit.document.doc,
    })),
  };
}

async function main() {
  let filterBy = null;

  if (packages) {
    const packageNames = packages
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (packageNames.length === 0) {
      exitUsage("--packages requires at least one package name");
    }
    filterBy = await buildPackageFilter(packageNames);
  }

  log(`Searching hexdocs for: "${query}"${filterBy ? ` (filtered)` : ""}...\n`);

  const body = await searchHexDocs(query, filterBy);

  if (json) {
    console.log(JSON.stringify(formatResultsJson(body, limit), null, 2));
  } else {
    console.log(formatResultsText(body, limit));
  }

  log(`\nDone`);
}

main().catch((err) => {
  process.stderr.write(`${NAME}: ${err.message}${err.cause ? ` (${err.cause.message})` : ""}\n`);
  process.exit(1);
});
