---
name: web
description: Browse web pages and extract content as markdown for LLM consumption. Use when fetching webpage content, scraping sites, executing JavaScript, taking screenshots, or interacting with Phoenix LiveView applications. Supports session persistence and interactive element picking.
compatibility: Requires Node.js 18+, Chrome/Chromium. macOS or Linux.
---

# web

Chrome-based web browsing toolkit for LLM agents. Extracts readable content as markdown, executes JavaScript, handles forms, and supports Phoenix LiveView applications.

## TL;DR

- `{baseDir}/scripts/web.js <url>` - fetch page as markdown
- `--screenshot FILE` - save screenshot
- `--js CODE` - execute JavaScript before extraction
- `--wait SELECTOR` - wait for dynamic content
- `--profile NAME` - persist session/cookies across calls
- LiveView pages detected and handled automatically

## Setup

Run once before first use:

```bash
cd {baseDir}/scripts
npm install
```

## Quick Reference

```bash
{baseDir}/scripts/web.js <url> [options]
```

| Option | Description |
|--------|-------------|
| `--raw` | Output raw HTML instead of markdown |
| `--screenshot FILE` | Save screenshot to FILE |
| `--js CODE` | Execute JavaScript on page |
| `--wait SELECTOR` | Wait for CSS selector before extracting |
| `--wait-ms MS` | Wait milliseconds after page load (default: 0) |
| `--timeout MS` | Navigation timeout in ms (default: 30000) |
| `--profile NAME` | Use named session profile (default: "default") |
| `--headless` | Run in headless mode (default: true) |
| `--no-headless` | Run with visible browser |
| `--pick MESSAGE` | Interactive element picker mode |
| `--cookies` | Show cookies for the page |

## Basic Usage

```bash
# Fetch page as markdown
{baseDir}/scripts/web.js https://example.com

# Screenshot
{baseDir}/scripts/web.js https://example.com --screenshot page.png

# Execute JS and get result
{baseDir}/scripts/web.js https://example.com --js "document.title"

# Wait for dynamic content
{baseDir}/scripts/web.js https://spa.example.com --wait ".content-loaded"

# Use session profile (persists cookies/auth)
{baseDir}/scripts/web.js https://example.com --profile mysite

# View cookies for a page
{baseDir}/scripts/web.js https://example.com --cookies
```

## Phoenix LiveView Support

Automatically detects LiveView pages (`[data-phx-session]`) and:
- Waits for `.phx-connected` before extracting content
- Tracks `phx:page-loading-start/stop` events for navigation
- Handles LiveView navigation and form submissions properly

```bash
# LiveView pages work automatically
{baseDir}/scripts/web.js http://localhost:4000/live-page

# Navigate between LiveView pages
{baseDir}/scripts/web.js https://phoenixframework.org --js "document.querySelector('a[href*=\"/blog\"]').click()" --wait-ms 1000

# Click logo to return to home
{baseDir}/scripts/web.js https://phoenixframework.org/blog --js "document.querySelector('a[href=\"/\"]').click()" --wait-ms 1000
```

## Interactive Element Picker

When you need specific CSS selectors from a page:

```bash
{baseDir}/scripts/web.js https://example.com --pick "Select the login button"
```

This opens a visible browser where the user can click elements. Returns CSS selectors for selected elements. Use Cmd/Ctrl+Click for multiple selections, Enter to confirm.

## Content Extraction

Uses Mozilla Readability for article extraction with fallbacks:
1. Readability parser for article content
2. Main content area (`main`, `article`, `[role='main']`)
3. Full body with nav/header/footer removed

## Tips

- Use `--profile` for authenticated sites to maintain sessions across calls
- Use `--wait` for SPAs that load content dynamically
- Use `--js` to interact with page before extraction
- Use `--no-headless` when debugging or when user interaction is needed
- LiveView detection is automatic, no special flags needed

## Output Format

```
URL: https://example.com
Title: Page Title

[Extracted markdown content...]

--- Console Output ---
[Any console.log/warn/error messages]
```

See [references/examples.md](references/examples.md) for detailed examples including form submission and LiveView interactions.
