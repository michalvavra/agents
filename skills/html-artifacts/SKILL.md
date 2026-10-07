---
name: html-artifacts
description: Build self-contained single-file HTML artifacts (data reports, code reviews, technical plans, architecture plans and other docs) with a shared, quiet, typographic style. Use when asked for an HTML artifact, report page, shareable page, or Radius/trove-style output.
---

# HTML Artifacts

One HTML file, semantic markup, one shared stylesheet. The look is quiet and typographic: serif text, a bold `h1` with regular-weight section headings, thin rules, and color only where it carries meaning.

## Files

- `references/styles.css`: the kit. Paste it **verbatim** into a `<style>` tag. Don't link to it.
- `references/example.html`: a sample page that uses every kit class.
- `references/components.md`: optional components (timeline, steps, diff, matrix, checklist, diagram) to paste into the second `<style>`.
- `references/genres/*.md`: what to write for each kind of artifact. **Read the one that matches before you write.**

## Workflow

1. Pick the genre below and read its file. It gives the section order, the components and the writing rules.
2. Start from the skeleton. Put the full contents of `styles.css` into the first `<style>`.
3. Write plain semantic HTML: `main`, `h1`–`h4`, `p`, `ul`, `table`, `figure`, `details`. Most pages need only a few classes.
4. Put artifact-specific CSS in the second `<style>`: snippets from `components.md`, then your own. See [Extending](#extending).
5. Keep data inline (HTML, or JSON in `<script type="application/json" id="">`). No frameworks and no build step. The only external request allowed is syntax highlighting.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Short, specific title</title>
<style>/* contents of references/styles.css */</style>
<style>/* components.md snippets + artifact-specific additions */</style>
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

## Pick a genre

| Read | When the artifact is |
|---|---|
| `genres/data-report.md` | numbers, metrics, an analysis, an experiment or benchmark |
| `genres/code-review.md` | a review of a diff, PR or module |
| `genres/technical-plan.md` | a plan for writing code: what to change, in what order, how to verify |
| `genres/architecture.md` | a system design, RFC or ADR: options, decision, consequences |

If none fits, use the general [writing rules](#writing) below: answer first, then evidence, then method. If two fit, pick the one that matches what the reader must *do* next.

## Writing

These hold for every genre.

- The `h1` is a plain bold title: short, sentence case, no emoji, no subtitle crammed in. Put context in `.lead` or `.muted small` below it.
- **Lead with the answer.** The `.lead` says the verdict, decision, finding or takeaway. The reader should be able to stop after it.
- Then the evidence or the detail, then the method, then the appendix (`<details>`, raw data, footnotes).
- Use sentence case for headings. Use `h2` for sections and `h3` inside them. Don't skip levels.
- Make `h2`–`h4` linkable: give each a slug `id` and wrap its text in a self-link: `<h2 id="by-region"><a href="#by-region">By region</a></h2>`. Keep ids unique; don't link the `h1`.
- Tables are for comparisons. Right-align numbers with `.num`. Wrap wide tables in `.scroll`. Put body rows in `<tbody>`.
- Prefer lists and tables over paragraphs when items are parallel. Prefer a paragraph over a list when the items depend on each other.
- Every claim that came from somewhere gets a footnote. Every link is a real `<a href>` with readable text, never "here".
- Cut what the reader can't act on. A short artifact read in full beats a long one skimmed.

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
| `.scroll` | Horizontal scroll wrapper, usually for tables. Edges fade when it overflows |
| `.wide` | On a direct child of `main`: break out of the text column, up to `--wide` (72rem) |

## Layout

`main` is a content grid (good-css "Content grid with breakouts"). Every direct child sits in the text column; a direct child with `.wide` spans the wider track. `main` also owns the space between its children (`--flow-space`), so don't add top or bottom margins to top-level blocks. To change a gap, set `--flow-space` on the lower element: `<div class="note" style="--flow-space: 2rem">`.

## Tokens

All tokens are custom properties on `:root`. Override them instead of hardcoding values.

- Palette ([clrs.cc](https://clrs.cc/) in OKLCH): `--navy --blue --aqua --teal --olive --green --lime --yellow --orange --red --maroon --fuchsia --purple --black --gray --silver --white`
- Roles: `--ink --muted --line --border --surface --paper --link --link-active --highlight --tone`
- Tone-derived (on tone classes, `.tag`, `.note`): `--tone-ink --tone-bg --tone-edge --tone-shadow`
- Type: `--font` (defaults to `--serif`; `--sans` and `--mono` also exist), `--step--1` … `--step-3` (fluid scale)
- Layout: `--measure` (68ch line length), `--page` (52rem), `--wide` (72rem), `--gutter`, `--space-page`, `--flow`, `--radius`
- Motion: `--ease-out`

## Dark mode

The kit follows the OS setting through `color-scheme: light dark`. Every role token is a `light-dark()` pair, so anything built from tokens adapts automatically. Printing always uses light.

- In new CSS, use role tokens (`--ink`, `--surface`, `--line`) for neutrals. Never hardcode `white`, `black`, or `#fff`.
- For any other color, write both schemes: `color: light-dark(oklch(from var(--teal) 0.45 c h), oklch(from var(--teal) 0.82 c h));`
- Palette colors (`--blue` etc.) are mid-tone and work on both backgrounds for fills (bars, SVG), but not for text.
- To force one scheme, add `:root { color-scheme: light; }` (or `dark`) in the second `<style>`.

## Extending

The kit is inside `@layer artifact`, so **any unlayered CSS you add wins automatically**. You never need `!important` or selector tricks.

**Write all new CSS by the `good-css` skill** (Vojta Holík, <https://good-css.com>). Read its `SKILL.md` and follow the "In all CSS" rules; read its reference files only for what you are building (e.g. `layout.md` for a new grid, `text-and-media.md` for long titles or images). In short: logical properties, OKLCH with `none` hue for grays, `:hover` only inside `@media (hover: hover) and (pointer: fine)`, an `:active` state on anything pressable, motion only inside `prefers-reduced-motion: no-preference`, `overflow: clip` over `hidden`, and `min(…, 100%)` inside grid `minmax()`.

Kit-specific rules on top of that:

- **Don't edit the kit.** Add rules in the second `<style>`.
- **Reuse tokens.** Write `color: var(--muted)` and `border-color: var(--line)`, not hex values.
- **Use palette colors only.** Derive shades with relative color syntax, wrapped in `light-dark()`, or with `color-mix(in oklch, …)`. Don't add new hues:
  `background: light-dark(oklch(from var(--teal) 0.96 calc(c * 0.3) h), oklch(from var(--teal) 0.25 calc(c * 0.3) h));`
- **Add a tone** by setting `--tone`. Every tone-aware component (`.tag`, `.note`, `.stat`, `.bar`) picks it up:
  `.tone-purple { --tone: var(--purple); }` or inline `style="--tone: var(--teal)"`.
- **Use nesting** and keep new components small.
- **Restyle globally** by overriding tokens: `:root { --font: var(--sans); --page: 64rem; }`.
- **Keep it quiet.** No extra shadows (`.note` has the only one), gradients, big radii, heavy weights, or buttons. Use rules (`--line`) and whitespace to separate things.
- **Charts:** for simple cases use `.bar` or inline SVG colored with palette variables in CSS (`.series { fill: var(--blue); }`, since SVG attributes can't read `var()`). Add a chart library only when the user needs interactivity.

### Where the kit deviates from good-css, on purpose

- No `font-synthesis: none`. Artifacts can't load web fonts, and the serif stack falls back to system fonts that may lack a 600 weight or an italic; a synthesized one beats a missing one.
- No `-webkit-tap-highlight-color: transparent`. Artifacts have links and `<summary>`, not buttons, so the native tap highlight stays as press feedback (links and summary also get `--link-active`).
- Tones are derived with relative color syntax (`oklch(from …)`) rather than `color-mix()`, because they set absolute lightness per scheme.
- Tables don't set `overflow-wrap: anywhere` on cells; wide tables go in `.scroll` instead, so short columns never collapse to one letter per line.

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

Only the token spans are copied, so the kit's `pre` styling is kept. Token colors are `light-dark()` pairs, so they follow the color scheme. If the CDN fails, the code still shows as plain text. Don't run it on `pre.diff`; see `components.md`.

## Agent-readable

Other agents may read the artifact too. Keep the data easy to extract:

- Put numbers in real `<table>`s with a `<thead>`, not in divs or only in charts.
- Embed the full dataset as JSON with a descriptive `id` (`<script type="application/json" id="orders-by-day">`) when the page shows only a summary.
- Cite sources as footnotes.

## Checklist

- One file. The kit is inlined; the viewport and `color-scheme` meta tags are present.
- `lang`, `<title>`, and the `h1` agree.
- The genre file was read, and its section order is followed or deliberately changed.
- The `.lead` states the answer.
- Every `h2`–`h4` has an `id` and a self-link.
- Sources and caveats are footnotes, not a footer.
- Data lives in tables or JSON blocks, not only in prose or charts.
- Numbers use `.num`. Wide tables are wrapped in `.scroll`.
- Color always carries meaning (tone) and never decorates.
- New CSS passes the good-css "In all CSS" rules.
- Check that the page reads well at 390px and 1280px wide, in both light and dark.
