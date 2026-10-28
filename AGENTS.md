# AGENTS.md

- Do not start implementation, design work, commits, or code changes unless the user explicitly asks for them.

## Rex (only when $REX_SESSION is set)

- Never background long-running commands in bash (`&`, `nohup`). Run dev servers, watchers, backfills and `gh run watch` in a labelled Rex pane (`dev`, `logs`, `job`):
  `rex run -s "$REX_SESSION" -c "$PWD" --label dev --keep-open --focus=false --json -- npm run dev`
- Before starting, `rex block ls -s "$REX_SESSION"` for a pane with that label. To restart: `rex block close <id>`, then `rex run` again.
- Read output with `rex capture`. Wait with `rex wait` or `rex run --wait` (finite jobs), never `sleep`.
