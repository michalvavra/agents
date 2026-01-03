import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { NodeHtmlMarkdown } from "node-html-markdown";

const nhm = new NodeHtmlMarkdown({
	bulletMarker: "-",
	codeBlockStyle: "fenced",
});

export function ensureProtocol(url) {
	if (!url.startsWith("http://") && !url.startsWith("https://")) {
		return "http://" + url;
	}
	return url;
}

export function htmlToMarkdown(html) {
	return nhm
		.translate(html)
		.replace(/\[\\?\[\s*\\?\]\]\([^)]*\)/g, "")
		.replace(/ +/g, " ")
		.replace(/\s+,/g, ",")
		.replace(/\s+\./g, ".")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

export function extractContent(html, url) {
	const doc = new JSDOM(html, { url });
	const reader = new Readability(doc.window.document);
	const article = reader.parse();

	if (article && article.content) {
		return {
			title: article.title,
			content: htmlToMarkdown(article.content, url),
		};
	}

	// Fallback extraction
	const fallbackDoc = new JSDOM(html, { url });
	const body = fallbackDoc.window.document;
	body.querySelectorAll("script, style, noscript, nav, header, footer, aside").forEach((el) => el.remove());

	const main = body.querySelector("main, article, [role='main'], .content, #content") || body.body;
	const fallbackHtml = main?.innerHTML || "";

	if (fallbackHtml.trim().length > 100) {
		return {
			title: body.querySelector("title")?.textContent || null,
			content: htmlToMarkdown(fallbackHtml, url),
		};
	}

	return {
		title: null,
		content: "(Could not extract content)",
	};
}
