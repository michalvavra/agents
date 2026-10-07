import assert from "node:assert/strict";
import test from "node:test";

import filterOutput, { redactText } from "../agents/pi/extensions/filter-output.ts";

const mewsToken = `zpka_${"a".repeat(32)}_${"b".repeat(8)}`;

const cases = [
	["Mews", mewsToken, "[MEWS_TOKEN_REDACTED]"],
	["Cloudflare global key", `cfk_${"a".repeat(48)}`, "[CLOUDFLARE_TOKEN_REDACTED]"],
	["Cloudflare user token", `cfut_${"a".repeat(48)}`, "[CLOUDFLARE_TOKEN_REDACTED]"],
	["Cloudflare account token", `cfat_${"a".repeat(48)}`, "[CLOUDFLARE_TOKEN_REDACTED]"],
	["GitHub fine-grained PAT", `github_pat_${"a".repeat(82)}`, "[GITHUB_TOKEN_REDACTED]"],
	[
		"GitHub stateless installation token",
		`ghs_12345_eyJ${"a".repeat(12)}.${"b".repeat(16)}.${"c".repeat(16)}`,
		"[GITHUB_TOKEN_REDACTED]",
	],
	["GitLab OAuth secret", `gloas-${"a".repeat(64)}`, "[GITLAB_TOKEN_REDACTED]"],
	["Slack app token", `xapp-1-${"a".repeat(24)}`, "[SLACK_TOKEN_REDACTED]"],
	["AWS temporary access key", `ASIA${"A".repeat(16)}`, "[AWS_KEY_REDACTED]"],
	["Hugging Face token", `hf_${"a".repeat(34)}`, "[HUGGINGFACE_TOKEN_REDACTED]"],
	["Linear API key", `lin_api_${"a".repeat(40)}`, "[LINEAR_KEY_REDACTED]"],
	["Databricks token", `dapi${"a".repeat(32)}`, "[DATABRICKS_TOKEN_REDACTED]"],
	["DigitalOcean token", `dop_v1_${"a".repeat(64)}`, "[DIGITALOCEAN_TOKEN_REDACTED]"],
	["PyPI token", `pypi-AgEIcHlwaS5vcmc${"a".repeat(50)}`, "[PYPI_TOKEN_REDACTED]"],
	["SendGrid token", `SG.${"a".repeat(66)}`, "[SENDGRID_TOKEN_REDACTED]"],
	["Shopify token", `shpat_${"a".repeat(32)}`, "[SHOPIFY_TOKEN_REDACTED]"],
	["Stripe key", `sk_live_${"a".repeat(24)}`, "[STRIPE_KEY_REDACTED]"],
	["Twilio key", `SK${"a".repeat(32)}`, "[TWILIO_KEY_REDACTED]"],
	["Anthropic key", `sk-ant-api03-${"a".repeat(32)}`, "[ANTHROPIC_KEY_REDACTED]"],
	["Postgres URL password", "postgres://app:hunter2@db:5432/app", "postgres://app:[REDACTED]@db:5432/app"],
	["MongoDB SRV URL password", "mongodb+srv://app:hunter2@cluster", "mongodb+srv://app:[REDACTED]@cluster"],
	["Redis TLS URL password", "rediss://default:hunter2@cache:6380", "rediss://default:[REDACTED]@cache:6380"],
	[
		"encrypted private key",
		"-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIIE\n-----END ENCRYPTED PRIVATE KEY-----",
		"[PRIVATE_KEY_REDACTED]",
	],
] as const;

for (const [name, secret, replacement] of cases) {
	test(`redacts ${name}`, () => {
		assert.equal(redactText(`before ${secret} after`), `before ${replacement} after`);
	});
}

test("redacts quoted JSON assignments without consuming punctuation", () => {
	assert.equal(
		redactText(`{"token": "${"a".repeat(24)}", "enabled": true}`),
		`{"token": [REDACTED], "enabled": true}`,
	);
});

test("redacts padded bearer credentials", () => {
	assert.equal(redactText(`Authorization: Bearer ${"a".repeat(24)}==`), "Authorization: Bearer [REDACTED]");
});

test("leaves prefix-like values with invalid lengths unchanged", () => {
	const text = "cfut_short zpka_deadbeef github_pat_short";
	assert.equal(redactText(text), text);
});

test("is stable on already redacted output", () => {
	for (const text of [`token=${"a".repeat(24)}`, `password: ${"a".repeat(12)}`, `{"secret": "${"a".repeat(12)}"}`]) {
		const once = redactText(text);
		assert.equal(redactText(once), once);
	}
});

test("does not redact past a database URL without credentials", () => {
	const text = "DATABASE_URL=postgres://localhost:5432/app\nnotify admin@example.com";
	assert.equal(redactText(text), text);
});

function setup() {
	let handler: ((event: any, ctx: any) => Promise<any>) | undefined;
	const notifications: string[] = [];
	filterOutput({
		on: (name: string, fn: typeof handler) => {
			if (name === "tool_result") handler = fn;
		},
	} as any);
	assert.ok(handler);
	const ctx = { ui: { notify: (message: string) => notifications.push(message) } };
	const run = (event: object) =>
		handler!({ type: "tool_result", toolName: "bash", input: {}, content: [], isError: false, ...event }, ctx);
	return { run, notifications };
}

test("redacts failed tool results", async () => {
	const { run, notifications } = setup();
	const result = await run({ content: [{ type: "text", text: `request failed for ${mewsToken}` }], isError: true });
	assert.equal(result.content[0].text, "request failed for [MEWS_TOKEN_REDACTED]");
	assert.deepEqual(notifications, ["Sensitive data redacted from output"]);
});

test("leaves clean results and images untouched", async () => {
	const { run, notifications } = setup();
	const image = { type: "image", data: mewsToken, mimeType: "image/png" };
	assert.equal(await run({ content: [{ type: "text", text: "all good" }, image] }), undefined);
	assert.deepEqual(notifications, []);
});

test("redacts structured content", async () => {
	const { run } = setup();
	const structuredContent = { ok: true, items: [{ name: "a", key: mewsToken }] };
	const result = await run({ content: [{ type: "text", text: "1 item" }], structuredContent });
	assert.deepEqual(result.structuredContent, { ok: true, items: [{ name: "a", key: "[MEWS_TOKEN_REDACTED]" }] });
	assert.equal(result.content[0].text, "1 item");
});

test("hides sensitive files read with the read tool", async () => {
	const { run } = setup();
	for (const path of [".env", "app/.env.local", ".dev.vars", "config/secrets.yaml", "aws/credentials"]) {
		const result = await run({ toolName: "read", input: { path }, content: [{ type: "text", text: "A=1" }] });
		assert.deepEqual(result.content, [{ type: "text", text: `[Contents of ${path} redacted for security]` }]);
		assert.equal("structuredContent" in result, false);
	}
});

test("still scans .env.example for secrets", async () => {
	const { run } = setup();
	const clean = await run({
		toolName: "read",
		input: { path: ".env.example" },
		content: [{ type: "text", text: "A=" }],
	});
	assert.equal(clean, undefined);
	const leaked = await run({
		toolName: "read",
		input: { path: ".env.example" },
		content: [{ type: "text", text: `MEWS=${mewsToken}` }],
	});
	assert.equal(leaked.content[0].text, "MEWS=[MEWS_TOKEN_REDACTED]");
});
