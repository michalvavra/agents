import assert from "node:assert/strict";
import test from "node:test";

import filterOutput, {
  redactText,
  sensitivePatterns,
} from "../agents/pi/extensions/filter-output.ts";

const redact = (text: string) => redactText(text, sensitivePatterns).text;

const cases = [
  ["Mews", `zpka_${"a".repeat(32)}_${"b".repeat(8)}`, "[MEWS_TOKEN_REDACTED]"],
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
] as const;

for (const [name, secret, replacement] of cases) {
  test(`redacts ${name}`, () => {
    const result = redact(`before ${secret} after`);
    assert.equal(result, `before ${replacement} after`);
  });
}

test("redacts quoted JSON assignments without consuming punctuation", () => {
  const result = redact(`{"token": "${"a".repeat(24)}", "enabled": true}`);
  assert.equal(result, `{"token": [REDACTED], "enabled": true}`);
});

test("redacts padded bearer credentials", () => {
  const result = redact(`Authorization: Bearer ${"a".repeat(24)}==`);
  assert.equal(result, "Authorization: Bearer [REDACTED]");
});

test("leaves prefix-like values with invalid lengths unchanged", () => {
  const text = "cfut_short zpka_deadbeef github_pat_short";
  assert.equal(redact(text), text);
});

test("redacts failed tool results", async () => {
  let toolResultHandler: ((event: any, context: any) => Promise<any>) | undefined;
  const pi = {
    on(event: string, handler: typeof toolResultHandler) {
      if (event === "tool_result") toolResultHandler = handler;
    },
  };

  filterOutput(pi as any);
  assert.ok(toolResultHandler);

  const secret = `zpka_${"a".repeat(32)}_${"b".repeat(8)}`;
  const result = await toolResultHandler(
    {
      toolName: "bash",
      input: {},
      content: [{ type: "text", text: `request failed for ${secret}` }],
      isError: true,
    },
    { hasUI: false },
  );

  assert.equal(result.content[0].text, "request failed for [MEWS_TOKEN_REDACTED]");
});
