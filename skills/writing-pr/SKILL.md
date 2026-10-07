---
name: writing-pr
description: Use when writing or editing a pull request title or body.
metadata:
  author: Luke Parker
  source: https://x.com/LukeParkerDev/status/2096769160021979571
---

# Writing a PR body/title

- Don't write essays. Write a concise body.
- Don't say that you ran tests. "Validation" or "I ran tests" sections are not needed.
- Focus on mermaid code block diagrams and code samples or snippets. They can show internals or sample usage.
- Use bullet points for the text you do write.
- For visual changes, direct or indirect, show a before/after table with uploaded images or videos.
- For benchmarks, always show before/after tables. The baseline comes from the target branch and the candidate from the PR.
- Don't mention intermediate PR details. For example, if the PR shrank from +6k to +1k lines, or moved from one refactor to another, don't mention it. Only the final squash-merge commit matters for commentary.
- For truly impressive, difficult, or high-risk, wide-scoped changes, you may write the body like a technical blog post: context, storytelling, code samples, before/after diagrams, images.
- Feel free to use code refs.
