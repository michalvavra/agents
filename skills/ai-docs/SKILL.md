---
name: ai-docs
description: Write AI-scannable technical documentation. Use when creating README files, API references, guides, or any docs that AI agents will consume.
---

# AI Documentation

Write documentation that is scannable, consistent, and actionable for AI agents.

## TL;DR

- Max 150 lines/file, one concept per file.
- Use tables for structured data, concrete examples for everything.
- Name files: `{noun}.md` (reference), `{verb}-{noun}.md` (how-to).
- No duplicates (define once, link elsewhere).

## Structure

- **Start with YAML frontmatter.** Include a `description` field for quick scanning (e.g., `description: How to configure authentication`). Skip tags—use directories for categorization instead.
- **Max 150 lines per file.** Split large docs into subdirectories.
- **One concept per file.** Don't mix reference with how-to.
- **Add a TL;DR section** at the top with most-needed info (parameters, commands).

## Content

- **No duplicate information.** Define once, reference elsewhere with links.
- **Use tables for structured data** (parameters, config options).
- **Provide concrete examples.** Every parameter needs a JSON example. Every how-to needs copy-pasteable commands.
- **Link to real code.** Reference actual files as templates.

## Terminology

- **Use consistent terms.** One term per concept, no synonyms.
- **Define jargon once.** Link to definitions, don't repeat them.

## Actionability

- **Group by task, not by system.** Prefer "How to add X" over "X subsystem overview".
- **Include a commands cheatsheet** in `docs/commands.md`.
- **Add troubleshooting.** Document common errors and fixes.

## File Naming Convention

| Pattern | Use For | Example |
|---------|---------|---------|
| `README.md` | Directory overview/index | `docs/README.md` |
| `{noun}.md` | Reference docs | `entities.md`, `storage.md` |
| `{verb}-{noun}.md` | How-to guides | `add-entity.md`, `configure-auth.md` |
