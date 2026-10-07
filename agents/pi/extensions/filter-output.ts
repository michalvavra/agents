/**
 * Filter Output Extension
 *
 * Redacts secrets from tool results before the model sees them:
 * - known token formats (OpenAI, Anthropic, GitHub, AWS, Stripe, ...)
 * - generic `token=...`, `password: ...`, `Authorization: Bearer ...` assignments
 * - passwords in database URLs and PEM private keys
 * - the whole contents of sensitive files (.env, secrets.json, credentials, ...) read with `read`
 *
 * Usage:
 *   pi --extension agents/pi/extensions/filter-output.ts
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export type SensitivePattern = {
	pattern: RegExp;
	replacement: string;
};

export const sensitivePatterns: SensitivePattern[] = [
	{ pattern: /\bsk-(?:proj|svcacct|admin)-[a-zA-Z0-9_-]{20,}\b/g, replacement: "[OPENAI_KEY_REDACTED]" },
	{ pattern: /\bsk-[a-zA-Z0-9]{20,}\b/g, replacement: "[OPENAI_KEY_REDACTED]" },
	{ pattern: /\bsk-ant-[a-zA-Z0-9_-]{20,}\b/g, replacement: "[ANTHROPIC_KEY_REDACTED]" },
	{ pattern: /\bsk-or-v1-[a-zA-Z0-9_-]{20,}\b/g, replacement: "[OPENROUTER_KEY_REDACTED]" },
	{ pattern: /\bAIza[a-zA-Z0-9_-]{30,}\b/g, replacement: "[GOOGLE_KEY_REDACTED]" },
	{ pattern: /\bcf(?:k|ut|at)_[a-zA-Z0-9_-]{41,}\b/g, replacement: "[CLOUDFLARE_TOKEN_REDACTED]" },
	{
		pattern: /\b(CLOUDFLARE_API_TOKEN|CF_API_TOKEN)\s*=\s*['"]?[a-zA-Z0-9_-]{40,}['"]?/gi,
		replacement: "$1=[CLOUDFLARE_TOKEN_REDACTED]",
	},
	{
		pattern: /\b(CLOUDFLARE_API_KEY|CF_API_KEY)\s*=\s*['"]?[a-f0-9]{37,45}['"]?/gi,
		replacement: "$1=[CLOUDFLARE_KEY_REDACTED]",
	},
	{ pattern: /\bzpka_[a-f0-9]{32}_[a-f0-9]{8}\b/gi, replacement: "[MEWS_TOKEN_REDACTED]" },
	{ pattern: /\bnpm_[a-zA-Z0-9]{20,}\b/g, replacement: "[NPM_TOKEN_REDACTED]" },
	{ pattern: /\b(?:glpat|gldt|glrt|glrtr|gloas)-[a-zA-Z0-9_-]{20,}\b/g, replacement: "[GITLAB_TOKEN_REDACTED]" },
	{
		pattern: /\b(?:gh[pousr]_[a-zA-Z0-9]{36,}|github_pat_[a-zA-Z0-9_]{20,})\b/g,
		replacement: "[GITHUB_TOKEN_REDACTED]",
	},
	{
		pattern: /\bghs_[a-zA-Z0-9]+_[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g,
		replacement: "[GITHUB_TOKEN_REDACTED]",
	},
	{
		pattern: /\b(?:xox[baprs]-[a-zA-Z0-9-]{10,}|xapp-[a-zA-Z0-9-]{20,}|xoxe(?:\.xox[bp])?-[a-zA-Z0-9-]{20,})\b/gi,
		replacement: "[SLACK_TOKEN_REDACTED]",
	},
	{
		pattern: /https:\/\/hooks\.slack\.com\/(?:services|workflows|triggers)\/[a-zA-Z0-9+/_-]{20,}/gi,
		replacement: "[SLACK_WEBHOOK_REDACTED]",
	},
	{ pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, replacement: "[AWS_KEY_REDACTED]" },
	{ pattern: /\bhf_[a-zA-Z]{34}\b/g, replacement: "[HUGGINGFACE_TOKEN_REDACTED]" },
	{ pattern: /\bapi_org_[a-zA-Z]{34}\b/g, replacement: "[HUGGINGFACE_TOKEN_REDACTED]" },
	{ pattern: /\blin_api_[a-zA-Z0-9]{40}\b/g, replacement: "[LINEAR_KEY_REDACTED]" },
	{ pattern: /\bdapi[a-f0-9]{32}(?:-\d)?\b/gi, replacement: "[DATABRICKS_TOKEN_REDACTED]" },
	{ pattern: /\bdo[opr]_v1_[a-f0-9]{64}\b/gi, replacement: "[DIGITALOCEAN_TOKEN_REDACTED]" },
	{ pattern: /\bpypi-AgEIcHlwaS5vcmc[a-zA-Z0-9_-]{50,}\b/g, replacement: "[PYPI_TOKEN_REDACTED]" },
	{ pattern: /\bSG\.[a-zA-Z0-9_.=-]{66}\b/g, replacement: "[SENDGRID_TOKEN_REDACTED]" },
	{ pattern: /\bshp(?:at|ca|pa|ss)_[a-f0-9]{32}\b/gi, replacement: "[SHOPIFY_TOKEN_REDACTED]" },
	{ pattern: /\b(?:sk|rk)_(?:test|live|prod)_[a-zA-Z0-9]{10,99}\b/g, replacement: "[STRIPE_KEY_REDACTED]" },
	{ pattern: /\bSK[a-f0-9]{32}\b/gi, replacement: "[TWILIO_KEY_REDACTED]" },
	{
		pattern: /(["']?\b(?:api[_-]?key|apikey)\b["']?\s*[=:]\s*)["']?[a-zA-Z0-9_./+=-]{20,}["']?/gi,
		replacement: "$1[REDACTED]",
	},
	{
		// (?!\[) keeps already-redacted values like `token=[REDACTED]` stable.
		pattern: /(["']?\b(?:secret|token|password|passwd|pwd)\b["']?\s*[=:]\s*)["']?(?!\[)[^\s'"`,;}\]]{8,}["']?/gi,
		replacement: "$1[REDACTED]",
	},
	{
		pattern: /\bBearer\s+[a-zA-Z0-9._~+/=-]{20,}(?=$|[\s'"`,;}\]])/gi,
		replacement: "Bearer [REDACTED]",
	},
	{
		pattern: /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g,
		replacement: "[JWT_REDACTED]",
	},
	{
		// Only user:password@ inside one URL, so a host:port URL never swallows text up to a later "@".
		pattern: /\b((?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|rediss?|amqps?):\/\/[^\s:/@]+:)[^\s/@]+@/gi,
		replacement: "$1[REDACTED]@",
	},
	{
		pattern: /-----BEGIN ([A-Z ]*)PRIVATE KEY-----[\s\S]*?-----END \1PRIVATE KEY-----/g,
		replacement: "[PRIVATE_KEY_REDACTED]",
	},
];

const SENSITIVE_FILES = [
	/(^|\/)\.env$/,
	/(^|\/)\.env\.(?!example$)[^/]+$/,
	/(^|\/)\.dev\.vars($|\.[^/]+$)/,
	/(^|\/)secrets?\.(json|ya?ml|toml)$/i,
	/(^|\/)credentials/i,
];

export function redactText(text: string, patterns: SensitivePattern[] = sensitivePatterns): string {
	return patterns.reduce((result, { pattern, replacement }) => result.replace(pattern, replacement), text);
}

/** Redacts every string inside a JSON value; returns the same reference when nothing changed. */
function redactJson(value: unknown): unknown {
	if (typeof value === "string") return redactText(value);
	if (Array.isArray(value)) {
		const items = value.map(redactJson);
		return items.some((item, index) => item !== value[index]) ? items : value;
	}
	if (value && typeof value === "object") {
		const entries = Object.entries(value).map(([key, item]) => [key, redactJson(item)] as const);
		const changed = entries.some(([key, item]) => item !== (value as Record<string, unknown>)[key]);
		return changed ? Object.fromEntries(entries) : value;
	}
	return value;
}

export default function (pi: ExtensionAPI) {
	pi.on("tool_result", async (event, ctx) => {
		const path = event.input.path;
		if (event.toolName === "read" && typeof path === "string" && SENSITIVE_FILES.some((file) => file.test(path))) {
			ctx.ui.notify(`Redacted contents of sensitive file: ${path}`, "info");
			// Replacing content without structuredContent drops it.
			return { content: [{ type: "text", text: `[Contents of ${path} redacted for security]` }] };
		}

		const content = event.content.map((item) => {
			if (item.type !== "text") return item;
			const text = redactText(item.text);
			return text === item.text ? item : { ...item, text };
		});
		const structuredContent = redactJson(event.structuredContent);
		const contentChanged = content.some((item, index) => item !== event.content[index]);
		if (!contentChanged && structuredContent === event.structuredContent) return undefined;

		ctx.ui.notify("Sensitive data redacted from output", "info");
		return { content, structuredContent: structuredContent as typeof event.structuredContent };
	});
}
