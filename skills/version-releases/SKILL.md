---
name: version-releases
description: Use when preparing, reviewing, or documenting versioned app releases, changelogs, SemVer bumps, release commits, git tags, or tag-gated production deploys
---

# Version Releases

## Overview

Lightweight app release process: keep `[Unreleased]` in `CHANGELOG.md`, move entries to a [SemVer](https://semver.org/) version and date, and deploy prod from manually pushed git tags.

Core rule: the agent may prepare and validate a release. The human user creates and pushes the git tag manually. Read-only tag inspection is fine. Never create, delete, or push tags unless the user explicitly asks in this turn.

## When to Use

Use for private apps, deployed frontends, Workers, services, and internal tools that need readable release history without package-publishing automation. Prefer the repo's native version file and tooling. For JS/TS repos, use `package.json` first.

Do not use for public multi-package libraries that already have changesets, release PR automation, or package-specific release tooling.

## Changelog Structure

Root app changelog. Include only subsection headings with entries. Do not carry empty headings into a released version.

```md
# Changelog

## [Unreleased]

### Added

- ...

## [0.2.0] - 2026-04-24

### Added

- Added version-gated production deployment.
```

Use release headings in this form: `## [x.y.z] - YYYY-MM-DD`. The bundled JS helper depends on that format.

Default subsection headings: `Breaking Changes`, `Added`, `Changed`, `Fixed`. Preserve existing subsection headings only when the changelog already has a clear style.

## Version Rules

Follow [SemVer](https://semver.org/) for stable releases tagged `vX.Y.Z`:

| Change | Bump |
| --- | --- |
| Backwards-incompatible change to a public contract | major |
| New backwards-compatible feature or behavior | minor |
| Backwards-compatible bug fix | patch |

Pre-1.0 (`0.x.y`) is unstable per the spec. There is no fixed rule for breaking changes. Propose what the change actually is and let the user decide whether to bump minor or cut `1.0.0`.

The first stable release is `1.0.0`, not a "bump". Propose it explicitly when the public contract is declared stable.

Do not bump for formatting, local-only tooling, unrelated cleanup, or generated churn unless it affects deployable behavior.

If a repo uses prerelease or build-metadata tags, follow that repo's release tooling and update validation accordingly.

## Release Workflow

1. Inspect changes since the last stable release tag.
2. Propose the SemVer bump and explain why. Stop for user confirmation unless the version was already specified.
3. Update `CHANGELOG.md`: move relevant `[Unreleased]` entries to `## [x.y.z] - YYYY-MM-DD`.
4. Update the repo's version source so it equals `x.y.z`. For JS/TS repos, update `package.json` `version`.
5. If the repo has a lockfile that records version metadata, update it using the repo's package manager.
6. Check the current branch and worktree. Stage only release files.
7. Run release metadata validation. For JS/TS with the helper: `node scripts/validate-js-release.mjs --tag vX.Y.Z --cwd .`.
8. If the helper is missing, copy it only when the repo wants it, or check tag, version source, and changelog heading manually.
9. Run the repo's normal `typecheck` / `test` / `build`.
10. Commit with `chore(release): vX.Y.Z`.
11. Confirm the release commit is pushed before showing production tag instructions.
12. Capture the release commit SHA with `git rev-parse HEAD`, then show manual tag commands pinned to that SHA. Do not run them unless the user explicitly asks.

Useful discovery commands:

```sh
git tag --merged HEAD --sort=-v:refname
git log vLAST_RELEASE..HEAD --oneline
git diff vLAST_RELEASE..HEAD
```

Use only release tags matching `^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$` unless the repo documents another release-tag pattern. If no release tag exists, inspect from the initial commit or from the first commit that should be included in the first documented release.

Manual lightweight tag commands to show as instructions only. The human user runs these outside the agent unless they explicitly ask the agent to run them.

```text
git tag vX.Y.Z <release_commit_sha>
git push origin vX.Y.Z
```

## Production Deploy Rule

Prod deploys must run from a release tag, not from `main`. Validation must check:

- tag matches `vX.Y.Z`
- tag commit is reachable from the intended release branch or protected by repo tag controls
- the repo version source equals `X.Y.Z`, such as `package.json` for JS/TS
- `CHANGELOG.md` has `## [X.Y.Z] - YYYY-MM-DD`
- tests/typecheck/build pass before deploy

For GitHub Actions, keep CI, QA deploy, and prod deploy workflows separate. Use a `production` environment approval when prod should stay manually gated after tag push.

For Cloudflare Workers, expose build metadata that includes the deployed commit SHA. Keep it separate from the app version. See [Cloudflare Workers](references/cloudflare-workers.md).

## Helper Script

The bundled `scripts/validate-js-release.mjs` helper is optional for JS/TS repos. It validates stable `vX.Y.Z` tags against `package.json` and `CHANGELOG.md`, and it does not create tags. Copy it only when the repo wants local validation. In CI, pass `--tag "$GITHUB_REF_NAME"`. For non-JS repos, use an equivalent validator.

## Common Mistakes

| Mistake | Correction |
| --- | --- |
| Agent creates, deletes, or pushes the tag | Stop. Tags are manual unless the user explicitly asks. |
| Runs `npm version` or equivalent to bump | Do not use it because it auto-creates a tag. Edit `package.json` directly. |
| Changelog version differs from the repo version source | Fix before release commit. |
| Uses dates without versions | Use versions because prod deploys are tag-gated. |
| Generates entries from commit subjects only | Inspect diffs when commit messages are vague. |

## Red Flags

- `CHANGELOG.md` has no section for the release version.
- The repo version source still has the old version.
- Prod deploy runs from `main` instead of a release tag.
- Version bump has no SemVer rationale.
- A Git SHA is treated as the release version instead of deployment metadata. See [Cloudflare Workers](references/cloudflare-workers.md).

## References

- [Cloudflare Workers](references/cloudflare-workers.md)
