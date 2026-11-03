#!/bin/sh
# Link every skill in ./skills into the global skill directories of each agent.
# ~/.agents/skills is read by Pi, Codex and OpenCode; ~/.claude/skills by Claude Code.
# Only links that point into this repository are created or removed.
# Other entries (skills installed by npx skills, Plannotator, rex) are left alone.
set -eu

repo_skills="$(cd "$(dirname "$0")/../skills" && pwd)"

link_skills_into() {
  target_dir="$1"
  mkdir -p "$target_dir"

  # Remove links into this repository whose skill no longer exists.
  for entry in "$target_dir"/*; do
    [ -L "$entry" ] || continue
    link_target="$(readlink "$entry")"
    case "$link_target" in
      "$repo_skills"/*)
        if [ ! -d "$link_target" ]; then
          rm "$entry"
          echo "removed  $entry"
        fi
        ;;
    esac
  done

  # Link each skill directory that contains SKILL.md.
  for skill_dir in "$repo_skills"/*/; do
    skill_dir="${skill_dir%/}"
    [ -f "$skill_dir/SKILL.md" ] || continue
    name="$(basename "$skill_dir")"
    entry="$target_dir/$name"

    if [ -L "$entry" ]; then
      if [ "$(readlink "$entry")" = "$skill_dir" ]; then
        continue
      fi
      echo "conflict $entry links to $(readlink "$entry"), skipped"
    elif [ -e "$entry" ]; then
      echo "conflict $entry exists and is not a link, skipped"
    else
      ln -s "$skill_dir" "$entry"
      echo "linked   $entry"
    fi
  done
}

link_skills_into "$HOME/.agents/skills"
link_skills_into "$HOME/.claude/skills"
