# web Examples

## JavaScript Patterns

```bash
# Get data from page
{baseDir}/scripts/web.js https://example.com --js "document.querySelectorAll('a').length"
{baseDir}/scripts/web.js https://example.com --js "Array.from(document.querySelectorAll('h2')).map(h => h.textContent)"

# Click then wait
{baseDir}/scripts/web.js https://example.com --js "document.querySelector('button.load-more').click()" --wait-ms 1000
```

## Scraping Patterns

```bash
# Extract links
{baseDir}/scripts/web.js https://example.com --js "Array.from(document.querySelectorAll('a[href]')).map(a => ({ text: a.textContent.trim(), href: a.href }))"

# Extract table
{baseDir}/scripts/web.js https://example.com --js "Array.from(document.querySelectorAll('table tr')).map(row => Array.from(row.querySelectorAll('td,th')).map(cell => cell.textContent.trim()))"
```

## Picker Output Format

```
tag: button
id: submit-btn
class: btn btn-primary
text: Submit
selector: #submit-btn
html: <button id="submit-btn" class="btn btn-primary">Submit</button>
parents: body > div.container > form
```

Controls: Click (select), Cmd/Ctrl+Click (multi-select), Enter (confirm), ESC (cancel)

## Cookies Output Format

```
session_id: abc123
  domain: example.com
  path: /
  httpOnly: true
  secure: true
```
