#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    cwd: { type: "string", short: "C" },
    help: { type: "boolean", short: "h" },
    tag: { type: "string", short: "t" },
  },
});

if (values.help) {
  console.log(`Usage: node scripts/validate-js-release.mjs --tag vX.Y.Z [--cwd path]

Validates release metadata:
  --tag, -t   Release tag to validate. Defaults to GITHUB_REF_NAME.
  --cwd, -C   Repository root. Defaults to current working directory.
  --help, -h  Show this help.
`);
  process.exit(0);
}

const tag = values.tag || process.env.GITHUB_REF_NAME;
const cwd = values.cwd || process.cwd();

function fail(message) {
  console.error(`release validation failed: ${message}`);
  process.exitCode = 1;
}

if (!tag) {
  fail("missing tag, expected --tag vX.Y.Z");
  process.exit(1);
}

const match = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(tag);
if (!match) {
  fail(`tag "${tag}" must match vX.Y.Z`);
  process.exit(1);
}

const version = tag.slice(1);
const packageJsonPath = join(cwd, "package.json");
const changelogPath = join(cwd, "CHANGELOG.md");

if (!existsSync(packageJsonPath)) {
  fail("package.json not found");
  process.exit(1);
}

if (!existsSync(changelogPath)) {
  fail("CHANGELOG.md not found");
  process.exit(1);
}

let packageJson;
try {
  packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
} catch (error) {
  fail(`package.json is invalid JSON: ${error.message}`);
  process.exit(1);
}

if (packageJson.version !== version) {
  fail(`package.json version is "${packageJson.version}", expected "${version}"`);
}

const changelog = readFileSync(changelogPath, "utf8");
const heading = new RegExp(
  `^## \\[${version.replaceAll(".", "\\.")}\\] - \\d{4}-\\d{2}-\\d{2}$`,
  "m",
);

if (!heading.test(changelog)) {
  fail(`CHANGELOG.md missing heading "## [${version}] - YYYY-MM-DD"`);
}

if (process.exitCode) {
  process.exit(1);
}

console.log(`release metadata valid for ${tag}`);
