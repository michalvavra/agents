---
name: html-artifacts
description: Build self-contained single-file HTML artifacts (reports, analyses, comparisons, docs) with a shared, quiet, typographic style. Use when asked for an HTML artifact, report page, shareable page, or Radius/trove-style output.
---

# HTML Artifacts

One HTML file, semantic markup, one shared stylesheet. The look is quiet and typographic: serif text, a bold `h1` with regular-weight section headings, thin rules, and color only where it carries meaning.

## Files

- `references/artifact.css`: the kit. Paste it **verbatim** into a `<style>` tag. Don't link to it.
- `references/example.html`: a sample page that uses every class. Copy patterns from it.

## Workflow

1. Start from the skeleton below. Put the full contents of `artifact.css` into the first `<style>`.
2. Write plain semantic HTML: `main`, `h1`–`h4`, `p`, `ul`, `table`, `figure`, `details`. Most pages need only a few classes.
3. Put artifact-specific CSS in the second `<style>`. See [Extending](#extending).
4. Keep data inline (HTML, or JSON in `<script type="application/json" id="">`). No frameworks and no build step. The only external request allowed is syntax highlighting.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Short, specific title</title>
<style>/* contents of references/artifact.css */</style>
<style>/* artifact-specific additions */</style>
</head>
<body>
<main>
  <h1>Short, specific title</h1>
  <p class="lead">The answer in one or two sentences.</p>
  …
  <!-- optional: footnotes, see below -->
</main>
</body>
</html>
```

## Writing

- The `h1` is a plain bold title: short, sentence case, no emoji, no subtitle crammed in. Put context in `.lead` or `.muted small` below it.
- Lead with the answer, then the evidence, then the method.
- Use sentence case for headings. Use `h2` for sections and `h3` inside them. Don't skip levels.
- Make `h2`–`h4` linkable: give each a slug `id` and wrap its text in a self-link: `<h2 id="by-region"><a href="#by-region">By region</a></h2>`. The kit styles it as plain heading text with a muted `#` on hover. No JS needed. Keep ids unique; don't link the `h1`.
- Tables are for comparisons. Right-align numbers with `.num`. Wrap wide tables in `.scroll`. Body rows highlight on hover on pointer devices; put rows in `<tbody>` to get it.

## Classes

| Class | Use |
|---|---|
| `.lead` | Intro paragraph under the `h1` |
| `h2[id] > a[href="#id"]` | Heading anchor (no class needed). See [Writing](#writing) |
| `.muted`, `.small`, `.mono`, `.nowrap` | Text utilities |
| `.num` | Numeric cell or text: right-aligned, tabular figures |
| `.ok` `.warn` `.bad` `.info` | Tones. On their own they color text. On components they set the component's color |
| `.tag` | Small inline label: `<span class="tag ok">fixed</span>` |
| `.note` | Callout card with a tone corner and offset shadow: `<div class="note warn"><p>…</p></div>` |
| `.footnote-ref`, `.footnotes` | Hugo-style footnotes. See [Footnotes](#footnotes) |
| `.stats` > `.stat` | KPI row: `<div class="stat ok"><b>−33%</b><span>label</span></div>` |
| `.bar` | Inline bar: `<span class="bar" style="--value: 42%"></span>` |
| `.kv` | Key-value `<dl>` in two columns |
| `.grid` | Responsive columns. Tune with `style="--min: 18rem; --gap: 2rem"` |
| `figure.code` | Code block with a `<figcaption>` file name header |
| `.scroll` | Horizontal scroll wrapper, usually for tables |
| `.wide` | Break out of the text column, up to `--wide` (72rem) |

## Tokens

All tokens are custom properties on `:root`. Override them instead of hardcoding values.

- Palette ([clrs.cc](https://clrs.cc/) in OKLCH): `--navy --blue --aqua --teal --olive --green --lime --yellow --orange --red --maroon --fuchsia --purple --black --gray --silver --white`
- Roles: `--ink --muted --line --border --surface --paper --link --highlight --tone`
- Tone-derived (on tone classes, `.tag`, `.note`): `--tone-ink --tone-bg --tone-edge --tone-shadow`

## Dark mode

The kit follows the OS setting through `color-scheme: light dark`. Every role token is a `light-dark()` pair, so anything built from tokens adapts automatically. Printing always uses light.

- In new CSS, use role tokens (`--ink`, `--surface`, `--line`) for neutrals. Never hardcode `white`, `black`, or `#fff`.
- For any other color, write both schemes: `color: light-dark(oklch(from var(--teal) 0.45 c h), oklch(from var(--teal) 0.82 c h));`
- Palette colors (`--blue` etc.) are mid-tone and work on both backgrounds for fills (bars, SVG), but not for text.
- To force one scheme, add `:root { color-scheme: light; }` (or `dark`) in the second `<style>`.
- Type: `--font` (defaults to `--serif`; `--sans` and `--mono` also exist), `--step--1` … `--step-3` (fluid scale)
- Layout: `--measure` (68ch line length), `--page` (52rem), `--wide`, `--flow` (vertical rhythm), `--radius`

## Extending

The kit is inside `@layer artifact`, so **any unlayered CSS you add wins automatically**. You never need `!important` or selector tricks.

- **Don't edit the kit.** Add rules in the second `<style>`.
- **Reuse tokens.** Write `color: var(--muted)` and `border-color: var(--line)`, not hex values.
- **Use palette colors only.** Derive shades with relative color syntax, wrapped in `light-dark()`. Don't add new hues:
  `background: light-dark(oklch(from var(--teal) 0.96 calc(c * 0.3) h), oklch(from var(--teal) 0.25 calc(c * 0.3) h));`
- **Add a tone** by setting `--tone`. Every tone-aware component (`.tag`, `.note`, `.stat`, `.bar`) picks it up:
  `.tone-purple { --tone: var(--purple); }` or inline `style="--tone: var(--teal)"`.
- **Use nesting** and keep new components small:
  ```css
  .timeline {
    list-style: none; padding: 0;
    & li { display: grid; grid-template-columns: 6rem 1fr; gap: 1rem; }
    & time { color: var(--muted); }
  }
  ```
- **Restyle globally** by overriding tokens: `:root { --font: var(--sans); --page: 64rem; }`.
- **Keep it quiet.** No extra shadows (`.note` has the only one), gradients, big radii, heavy weights, or buttons. Use rules (`--line`) and whitespace to separate things.
- **Charts:** for simple cases use `.bar` or inline SVG colored with palette variables in CSS (`.series { fill: var(--blue); }`, since SVG attributes can't read `var()`). Add a chart library only when the user needs interactivity.

## Footnotes

Use footnotes for sources, citations, and caveats. Don't add a footer or a "generated on" line. The markup matches Hugo/Goldmark output:

```html
<p>Median fell by a third.<sup id="fnref:1"><a href="#fn:1" class="footnote-ref" role="doc-noteref">1</a></sup></p>
…
<div class="footnotes" role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn:1"><p>Source: <a href="…">checkout_events</a>, 1–31 March. <a href="#fnref:1" class="footnote-backref" role="doc-backlink">↩︎</a></p></li>
  </ol>
</div>
```

Number footnotes in order of first reference and put the block last in `main`. A footnote can be referenced more than once: reuse `href="#fn:1"`, but give each extra ref its own id (`fnref1:1`). The footnote you jump to is highlighted.

## Code highlighting

Use [`@pierre/highlights`](https://www.jsdelivr.com/package/npm/@pierre/highlights). **Don't pin a version.** The unversioned jsDelivr URL always serves the latest release. Mark code with `class="language-…"` and put this before `</body>`:

```html
<script type="module">
  const cdn = "https://cdn.jsdelivr.net/npm/@pierre/highlights/dist";
  const { codeToHtml, isSupportedLanguage } = await import(`${cdn}/browser.js`);
  const [{ default: light }, { default: dark }] = await Promise.all([
    import(`${cdn}/themes/pierre-light.js`),
    import(`${cdn}/themes/pierre-dark.js`),
  ]);
  const decoder = new TextDecoder();
  for (const code of document.querySelectorAll('pre > code[class*="language-"]')) {
    const lang = code.className.match(/language-(\S+)/)[1];
    if (!isSupportedLanguage(lang)) continue;
    const html = decoder.decode(codeToHtml(code.textContent, { lang, themes: { light, dark }, defaultColor: "light-dark()" }));
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    code.innerHTML = tpl.content.querySelector("code").innerHTML;
  }
</script>
```

Only the token spans are copied, so the kit's `pre` styling is kept. Token colors are `light-dark()` pairs, so they follow the color scheme. If the CDN fails, the code still shows as plain text.

## Agent-readable

Other agents may read the artifact too. Keep the data easy to extract:

- Put numbers in real `<table>`s with a `<thead>`, not in divs or only in charts.
- Embed the full dataset as JSON with a descriptive `id` (`<script type="application/json" id="orders-by-day">`) when the page shows only a summary.
- Cite sources as footnotes.

## Checklist

- One file. The kit is inlined and the viewport meta tag is present.
- `lang`, `<title>`, and the `h1` agree.
- Every `h2`–`h4` has an `id` and a self-link.
- Sources and caveats are footnotes, not a footer.
- Data lives in tables or JSON blocks, not only in prose or charts.
- Numbers use `.num`. Wide tables are wrapped in `.scroll`.
- Color always carries meaning (tone) and never decorates.
- Check that the page reads well at 390px and 1280px wide, in both light and dark.
