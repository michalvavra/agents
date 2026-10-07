# Digest

**Use for:** roundups of tweets/X posts, blog posts, newsletters, HN/Reddit threads, release notes, arXiv listings. Mostly links, read quickly.
**Not for:** deep dives into one item (`paper-summary.md`), a researched answer (`research-brief.md`).

## Skeleton

```
h1  <Topic> digest, <period>  ("AI infra digest, 29 Sep – 5 Oct")
.lead  The 1–3 things worth your time this period, in one or two sentences
.muted small  Sources covered and the window; how many items were skimmed vs. kept
h2  Top picks  → ol.items, 3 items max, each with a 2–3 sentence takeaway
h2  <Theme>  → ol.items, one h2 per theme, 3–8 items each
h2  <Theme> …
h2  Also seen  → plain ul of links, one line each, no takeaway
```

## Components

`.items` (see `components.md`), `.tag` for topic or type (`paper`, `release`, `thread`, `opinion`), `blockquote` for a short verbatim quote from a post.

## Item format

```
<a href>Title or first line of the post</a>
.meta  author/handle · source (X, blog, arXiv, GitHub) · date · tag
p  Takeaway: what's new and why it matters to the reader, 1–2 sentences
```

## Rules

- The link goes to the original (the tweet, the post, the paper's abs page), not to an aggregator. Add the discussion link (HN, thread) in `.meta` if it's worth reading too.
- The title is the post's real title or a faithful paraphrase; never clickbait it further.
- A takeaway says something the title doesn't. If it can't, move the item to "Also seen".
- Merge duplicates: one item per story, with the other sources in `.meta`.
- Mark opinion as opinion and announcements as announcements (`.tag`).
- Quote tweets verbatim in a `blockquote` when the wording matters; keep quotes short.
- Group by theme, not by source. Order within a theme by importance, not by date.
- Use dates as `<time datetime>`, in the reader's terms ("3 Oct").

## Avoid

- More than ~25 items with takeaways. Cut, or push to "Also seen".
- Embeds and images. Text and links only; thumbnails only if the user asks (then use good-css "Image box that holds any upload").
- Summaries that repeat the headline.
