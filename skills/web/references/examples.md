# web Examples

Detailed examples for common web automation tasks.

## Basic Content Extraction

```bash
# Simple page fetch
{baseDir}/scripts/web.js https://example.com

# With specific timeout
{baseDir}/scripts/web.js https://example.com --timeout 60000
```

## Screenshots

```bash
# Full page screenshot
{baseDir}/scripts/web.js https://example.com --screenshot page.png

# Screenshot with content extraction
{baseDir}/scripts/web.js https://example.com --screenshot debug.png

# Screenshot of SPA after content loads
{baseDir}/scripts/web.js https://spa.example.com --wait ".content" --screenshot loaded.png
```

## JavaScript Execution

```bash
# Get page title
{baseDir}/scripts/web.js https://example.com --js "document.title"

# Count elements
{baseDir}/scripts/web.js https://example.com --js "document.querySelectorAll('a').length"

# Extract specific data
{baseDir}/scripts/web.js https://example.com --js "Array.from(document.querySelectorAll('h2')).map(h => h.textContent)"

# Click a button before extraction
{baseDir}/scripts/web.js https://example.com --js "document.querySelector('button.load-more').click()" --wait-ms 1000

# Complex interactions
{baseDir}/scripts/web.js https://example.com --js "
  document.querySelector('#search').value = 'test';
  document.querySelector('form').submit();
"
```

## Waiting for Content

```bash
# Wait for CSS selector
{baseDir}/scripts/web.js https://spa.example.com --wait ".loaded"

# Wait fixed time after load
{baseDir}/scripts/web.js https://example.com --wait-ms 2000

# Combine both
{baseDir}/scripts/web.js https://spa.example.com --wait ".content" --wait-ms 500
```

## Session Profiles

Profiles persist cookies and authentication across calls.

```bash
# First call - login
{baseDir}/scripts/web.js https://app.example.com/login --profile myapp --js "
  document.querySelector('#email').value = 'user@example.com';
  document.querySelector('#password').value = 'secret';
  document.querySelector('form').submit();
" --wait-ms 2000

# Subsequent calls - session persists
{baseDir}/scripts/web.js https://app.example.com/dashboard --profile myapp
```

## Phoenix LiveView

LiveView pages are automatically detected. The tool waits for `.phx-connected` and tracks navigation events.

```bash
# Simple LiveView page
{baseDir}/scripts/web.js http://localhost:4000/live

# LiveView navigation - click to another page
{baseDir}/scripts/web.js https://phoenixframework.org --js "document.querySelector('a[href*=\"/blog\"]').click()" --wait-ms 1000

# LiveView navigation - click logo to return home
{baseDir}/scripts/web.js https://phoenixframework.org/blog --js "document.querySelector('a[href=\"/\"]').click()" --wait-ms 1000

# LiveView with form interaction
{baseDir}/scripts/web.js http://localhost:4000/users/log_in --js "
  document.querySelector('#user_email').value = 'admin@example.com';
  document.querySelector('#user_password').value = 'password123';
  document.querySelector('form').submit();
" --wait-ms 2000

# LiveView with click events
{baseDir}/scripts/web.js http://localhost:4000/posts --js "
  document.querySelector('[phx-click=\"load_more\"]').click();
" --wait-ms 1000
```

## Interactive Element Picker

Opens a visible browser for user to select elements. Returns CSS selectors.

```bash
# Single element selection
{baseDir}/scripts/web.js https://example.com --pick "Click the submit button"

# Output format:
# tag: button
# id: submit-btn
# class: btn btn-primary
# text: Submit
# selector: #submit-btn
# html: <button id="submit-btn" class="btn btn-primary">Submit</button>
# parents: body > div.container > form
```

**Picker controls:**
- Click: Select element and finish
- Cmd/Ctrl+Click: Add element to selection (multi-select)
- Enter: Confirm selection (when multiple selected)
- ESC: Cancel

## Cookies

```bash
# View cookies for a page
{baseDir}/scripts/web.js https://example.com --cookies

# Output format:
# session_id: abc123
#   domain: example.com
#   path: /
#   httpOnly: true
#   secure: true
```

## Raw HTML Output

```bash
# Get raw HTML instead of markdown
{baseDir}/scripts/web.js https://example.com --raw > page.html

# Raw HTML with JS execution
{baseDir}/scripts/web.js https://example.com --raw --js "document.body.innerHTML += '<div>injected</div>'"
```

## Debugging

```bash
# Visible browser for debugging
{baseDir}/scripts/web.js https://example.com --no-headless

# Visible browser with longer timeout
{baseDir}/scripts/web.js https://example.com --no-headless --timeout 120000

# Check what's being extracted
{baseDir}/scripts/web.js https://example.com --screenshot before.png --js "console.log('Page loaded')"
```

## Scraping Patterns

### Extract Links

```bash
{baseDir}/scripts/web.js https://example.com --js "
  Array.from(document.querySelectorAll('a[href]'))
    .map(a => ({ text: a.textContent.trim(), href: a.href }))
    .filter(l => l.text)
"
```

### Extract Table Data

```bash
{baseDir}/scripts/web.js https://example.com --js "
  Array.from(document.querySelectorAll('table tr'))
    .map(row => Array.from(row.querySelectorAll('td,th'))
      .map(cell => cell.textContent.trim()))
"
```

### Wait for AJAX Content

```bash
{baseDir}/scripts/web.js https://example.com --js "
  // Trigger AJAX load
  document.querySelector('#load-data').click();
" --wait "[data-loaded='true']" --wait-ms 500
```

## Error Handling

The tool exits with:
- `0` - Success
- `1` - Error (network, timeout, JS error, etc.)

Errors are written to stderr, content to stdout. This allows piping:

```bash
# Safe piping - errors don't pollute output
{baseDir}/scripts/web.js https://example.com > content.md 2> errors.log
```

## Integration with Other Tools

```bash
# Pipe to file
{baseDir}/scripts/web.js https://example.com > article.md

# Process with jq (for JS results)
{baseDir}/scripts/web.js https://example.com --js "..." --raw | jq '.items'

# Chain with grep
{baseDir}/scripts/web.js https://example.com | grep -i "important"
```
