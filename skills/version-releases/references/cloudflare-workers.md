# Cloudflare Workers

## Purpose

For Cloudflare Workers release deploys, expose one `build` string:

- format: `<version>+<env>.<short_sha>`
- example: `0.2.0+prod.abc1234`

This uses SemVer build metadata style and keeps the value compact for humans and agents. The version is the release, the environment is the deploy target, and the short SHA traces the deployed source.

For unreleased QA or dev deploys from `main`, do not label the build as a released version unless the repo bumps its version before QA deploys. Use a repo-defined dev or prerelease build value instead.

## Runtime Metadata

Expose `build` from a health or metadata endpoint.

```ts
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "my-worker",
    build: c.env.BUILD,
  });
});
```

## Wrangler Vars

Keep local fallbacks in `wrangler.jsonc`. Cloudflare Workers `vars` are runtime bindings available on `env`. Environment-specific `vars` are not inherited, so define them for each environment that needs them.

```jsonc
{
  "vars": {
    "BUILD": "<version>+<env>.<short_sha>" // local fallback, replaced by the deploy script
  },
  "env": {
    "qa": {
      "vars": {
        "BUILD": "<version>+<env>.<short_sha>" // fallback, replaced by deploy script
      }
    },
    "prod": {
      "vars": {
        "BUILD": "<version>+<env>.<short_sha>" // fallback, replaced by deploy:prod
      }
    }
  }
}
```

The `BUILD` value in `wrangler.jsonc` is only a fallback. Deploy scripts prepopulate the real value with the package version, environment name, and current short Git SHA.

Override `BUILD` during deploy. Wrangler `deploy` supports `--var KEY:VALUE`. Use config defaults for local/dev values and deploy overrides for the actual release value.

Example `package.json` script for tag-gated prod:

```jsonc
{
  "scripts": {
    "deploy:prod": "wrangler deploy --env=prod --var BUILD:$(node -p \"require('./package.json').version\")+prod.$(git rev-parse --short HEAD)"
  }
}
```

The `$(...)` syntax is POSIX-shell oriented. Before copying it, verify the repo's Wrangler version, package manager, existing deploy scripts, and CI shell conventions.

## Tag-Gated Prod Deploy

For versioned releases, prod should deploy from a tag:

Adapt this template to the repo's package manager, runtime version, release branch, and existing CI commands.

```yaml
on:
  push:
    tags:
      - "v*.*.*"

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v6
        with:
          ref: ${{ github.ref_name }}
          fetch-depth: 0
      - run: echo "$GITHUB_REF_NAME" | grep -Eq '^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'
      - run: git fetch origin main
      - run: git merge-base --is-ancestor "$GITHUB_SHA" origin/main
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      # Replace this step if the repo does not copy the optional JS helper.
      - run: node scripts/validate-js-release.mjs --tag "$GITHUB_REF_NAME" --cwd .
      - run: pnpm test
      - run: pnpm run typecheck
      - run: pnpm run build
      - run: pnpm run deploy:prod
```

The deploy script can still use `git rev-parse --short HEAD`. When Actions checks out the tag, `HEAD` is the tagged release commit.

## Rules

- Use `BUILD` for compact runtime release metadata in the `<version>+<env>.<short_sha>` format.
- Keep `build` visible from `/health` or an equivalent endpoint.
- Do not use a raw Git SHA as the app version.

Tag, changelog, and tag-creation rules are governed by the parent skill.
