# Optional components

Paste only the ones you use into the **second** `<style>`. Each one is written by the good-css rules (logical properties, hover in a media query, motion opt-in) and uses kit tokens only, so it works in light and dark.

## Timeline

Dated events, newest last. Used by investigations, status updates, digests.

```html
<ol class="timeline">
  <li><time datetime="2025-03-03">3 Mar</time><span>Tax lookup moved to a queue</span></li>
  <li><time datetime="2025-03-10">10 Mar</time><span>Rolled out to Europe, NA <span class="tag ok">done</span></span></li>
</ol>
```

```css
.timeline {
  list-style: none;
  padding: 0;
  & li { display: grid; grid-template-columns: var(--date-width, 6rem) 1fr; gap: 1rem; }
  & time { color: var(--muted); font-variant-numeric: tabular-nums; }
}
```

## Steps

Numbered steps, each with what to do and how to check it. Used by technical plans and runbooks. Each step is an `h3` so it can be linked.

```html
<ol class="steps">
  <li>
    <h3 id="step-schema"><a href="#step-schema">Add the column</a></h3>
    <p>Touches <code>db/migrations/</code>, <code>models/order.ts</code>.</p>
    <p class="verify"><code>pnpm test orders</code> passes; the column is nullable.</p>
  </li>
</ol>
```

```css
.steps {
  list-style: none;
  padding: 0;
  counter-reset: step;
  & > li {
    counter-increment: step;
    position: relative;
    padding-block: 1rem;
    padding-inline-start: 2.75rem;
    border-block-start: 1px solid var(--line);
    & + li { margin-block-start: 0; }
    &::before {
      content: counter(step);
      position: absolute;
      inset-inline-start: 0;
      font: var(--step-1) / 1.2 var(--mono);
      color: var(--muted);
    }
    & > * { margin-block: 0 0.5rem; }
    & > :last-child { margin-block-end: 0; }
    & > h3 { margin-block-start: 0; }
  }
  & .verify::before { content: "Verify: "; font-weight: 600; color: var(--ink); }
  & .verify { color: var(--muted); }
}
```

## Diff

Added and removed lines in a code block. Keep the `+`/`-` prefixes in the text so the diff still reads without CSS and copies correctly. Context lines are plain text. **Don't** put a `language-` class on a diff; the highlighter would remove the markup.

```html
<figure class="code">
  <figcaption>src/checkout/tax.ts · L42–46</figcaption>
  <pre class="diff"><code>  const order = await load(id);
<del>- const tax = await taxService.lookup(order);</del>
<ins>+ const tax = await taxQueue.enqueue(order);</ins>
  return finalize(order, tax);</code></pre>
</figure>
```

```css
.diff :is(ins, del) {
  display: inline-block;
  min-inline-size: calc(100% + 2rem);
  margin-inline: -1rem;
  padding-inline: 1rem;
  text-decoration: none;
}
.diff ins { background: light-dark(oklch(from var(--green) 0.95 calc(c * 0.25) h), oklch(from var(--green) 0.28 calc(c * 0.3) h)); }
.diff del { background: light-dark(oklch(from var(--red) 0.95 calc(c * 0.2) h), oklch(from var(--red) 0.28 calc(c * 0.3) h)); }
```

## Matrix

A comparison table where cells are judgments, not numbers. The first column stays put while the table scrolls sideways. Use tone tags in cells (`<span class="tag ok">yes</span>`, `warn` for partial, `bad` for no) and always a word, never a bare ✓ or color, so it reads in text and to screen readers.

```html
<div class="scroll">
  <table class="matrix">
    <thead><tr><th>Option</th><th>Latency</th><th>Ops cost</th><th>Reversible</th></tr></thead>
    <tbody>
      <tr><th scope="row">Queue</th><td><span class="tag ok">low</span></td><td><span class="tag warn">medium</span></td><td><span class="tag ok">yes</span></td></tr>
    </tbody>
  </table>
</div>
```

```css
.matrix {
  & th[scope="row"] {
    position: sticky;
    inset-inline-start: 0;
    background: var(--paper);
    font-weight: 400;
  }
  & td { white-space: nowrap; }
}
@media (hover: hover) and (pointer: fine) {
  .matrix tbody tr:hover > th[scope="row"] { background: var(--surface); }
}
```

## Items

A dense list of links with a source line and a takeaway. Used by digests, research briefs and surveys. The title is the link; one per item.

```html
<ol class="items">
  <li>
    <a href="https://…">Speculative decoding without a draft model</a>
    <p class="meta">@karpathy · X · <time datetime="2025-10-03">3 Oct</time> <span class="tag info">LLMs</span></p>
    <p>Why it matters, in one or two sentences.</p>
  </li>
</ol>
```

```css
.items {
  list-style: none;
  padding: 0;
  & > li {
    padding-block: 0.75rem;
    border-block-start: 1px solid var(--line);
    & + li { margin-block-start: 0; }
    & > * { margin-block: 0; }
    & > * + * { margin-block-start: 0.2rem; }
    & > a:first-child { font-weight: 600; text-decoration: none; }
  }
  & .meta { color: var(--muted); font-size: var(--step--1); }
}
@media (hover: hover) and (pointer: fine) {
  .items > li > a:first-child:hover { text-decoration: underline; }
}
```

## Checklist

Status of a list of tasks or review criteria. The state is a word in a tag, so it reads without color.

```html
<ul class="checklist">
  <li><span class="tag ok">done</span> Migration merged</li>
  <li><span class="tag warn">open</span> Backfill old orders</li>
</ul>
```

```css
.checklist {
  list-style: none;
  padding: 0;
  & .tag:first-child { min-inline-size: 4.5em; text-align: center; margin-inline-end: 0.4em; }
}
```

## Diagram

Boxes and arrows as inline SVG, for architecture and data flow. SVG attributes can't read `var()`, so color comes from classes. Give the SVG a `viewBox` and a `width` equal to the viewBox width (so it never scales text up), a `role="img"` and an `aria-label` that says what the diagram shows. Put a wide diagram in `.scroll` with a `min-inline-size` so its text stays readable on a phone, and put the same information in a table or list nearby.

```html
<figure>
  <div class="scroll">
    <svg class="diagram" width="560" viewBox="0 0 560 120" role="img" aria-label="API sends orders to a queue, a worker calls the tax service">
      <defs><marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="head" d="M0 0 10 5 0 10z"/></marker></defs>
      <rect class="node" x="10" y="40" width="120" height="44" rx="3"/><text x="70" y="67">API</text>
      <rect class="node hl" x="220" y="40" width="120" height="44" rx="3"/><text x="280" y="67">Queue</text>
      <rect class="node" x="430" y="40" width="120" height="44" rx="3"/><text x="490" y="67">Tax worker</text>
      <path class="edge" d="M130 62H220" marker-end="url(#arrow)"/>
      <path class="edge" d="M340 62H430" marker-end="url(#arrow)"/>
    </svg>
  </div>
  <figcaption>Order flow after the change. The queue (highlighted) is new.</figcaption>
</figure>
```

```css
.diagram {
  min-inline-size: var(--diagram-min, 30rem); /* scroll below this on phones */
  block-size: auto;
  & .node { fill: var(--surface); stroke: var(--border); }
  & .node.hl { stroke: var(--blue); stroke-width: 2; }
  & .node.bad { stroke: var(--red); stroke-width: 2; }
  & .edge { fill: none; stroke: var(--muted); stroke-width: 1.5; }
  & .edge.dashed { stroke-dasharray: 5 4; }
  & .head { fill: var(--muted); }
  & text { fill: var(--ink); font: 14px var(--sans); text-anchor: middle; }
}
```
