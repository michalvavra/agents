import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export type SensitivePattern = {
  pattern: RegExp;
  replacement: string;
};

export function redactText(
  text: string,
  patterns: SensitivePattern[],
): { text: string; modified: boolean } {
  let result = text;
  let modified = false;

  for (const { pattern, replacement } of patterns) {
    const redacted = result.replace(pattern, replacement);
    if (redacted !== result) {
      modified = true;
      result = redacted;
    }
  }

  return { text: result, modified };
}

/**
 * Filter or transform tool results before the LLM sees them.
 * Redacts sensitive data like API keys, tokens, passwords, etc.
 */
export const sensitivePatterns: SensitivePattern[] = [
  { pattern: /\b(sk-(?:proj|svcacct|admin)-[a-zA-Z0-9_-]{20,})\b/g, replacement: "[OPENAI_KEY_REDACTED]" },
  { pattern: /\b(sk-[a-zA-Z0-9]{20,})\b/g, replacement: "[OPENAI_KEY_REDACTED]" },
  { pattern: /\b(sk-ant-[a-zA-Z0-9_-]{20,})\b/g, replacement: "[ANTHROPIC_KEY_REDACTED]" },
  { pattern: /\b(sk-or-v1-[a-zA-Z0-9_-]{20,})\b/g, replacement: "[OPENROUTER_KEY_REDACTED]" },
  { pattern: /\b(AIza[a-zA-Z0-9_-]{30,})\b/g, replacement: "[GOOGLE_KEY_REDACTED]" },
  {
    pattern: /\b(cf(?:k|ut|at)_[a-zA-Z0-9_-]{41,})\b/g,
    replacement: "[CLOUDFLARE_TOKEN_REDACTED]",
  },
  {
    pattern: /\b(CLOUDFLARE_API_TOKEN|CF_API_TOKEN)\s*=\s*['"]?[a-zA-Z0-9_-]{40,}['"]?/gi,
    replacement: "$1=[CLOUDFLARE_TOKEN_REDACTED]",
  },
  {
    pattern: /\b(CLOUDFLARE_API_KEY|CF_API_KEY)\s*=\s*['"]?[a-f0-9]{37,45}['"]?/gi,
    replacement: "$1=[CLOUDFLARE_KEY_REDACTED]",
  },
  {
    pattern: /\bzpka_[a-f0-9]{32}_[a-f0-9]{8}\b/gi,
    replacement: "[MEWS_TOKEN_REDACTED]",
  },
  { pattern: /\b(npm_[a-zA-Z0-9]{20,})\b/g, replacement: "[NPM_TOKEN_REDACTED]" },
  {
    pattern: /\b(?:glpat|gldt|glrt|glrtr|gloas)-[a-zA-Z0-9_-]{20,}\b/g,
    replacement: "[GITLAB_TOKEN_REDACTED]",
  },
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
  {
    pattern: /\bdo[opr]_v1_[a-f0-9]{64}\b/gi,
    replacement: "[DIGITALOCEAN_TOKEN_REDACTED]",
  },
  {
    pattern: /\bpypi-AgEIcHlwaS5vcmc[a-zA-Z0-9_-]{50,}\b/g,
    replacement: "[PYPI_TOKEN_REDACTED]",
  },
  { pattern: /\bSG\.[a-zA-Z0-9_.=-]{66}\b/g, replacement: "[SENDGRID_TOKEN_REDACTED]" },
  {
    pattern: /\bshp(?:at|ca|pa|ss)_[a-f0-9]{32}\b/gi,
    replacement: "[SHOPIFY_TOKEN_REDACTED]",
  },
  {
    pattern: /\b(?:sk|rk)_(?:test|live|prod)_[a-zA-Z0-9]{10,99}\b/g,
    replacement: "[STRIPE_KEY_REDACTED]",
  },
  { pattern: /\bSK[a-f0-9]{32}\b/gi, replacement: "[TWILIO_KEY_REDACTED]" },
  {
    pattern: /(["']?\b(?:api[_-]?key|apikey)\b["']?\s*[=:]\s*)["']?[a-zA-Z0-9_./+=-]{20,}["']?/gi,
    replacement: "$1[REDACTED]",
  },
  {
    pattern: /(["']?\b(?:secret|token|password|passwd|pwd)\b["']?\s*[=:]\s*)["']?[^\s'"`,;}\]]{8,}["']?/gi,
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
  { pattern: /(mongodb(\+srv)?:\/\/[^:]+:)[^@]+(@)/gi, replacement: "$1[REDACTED]$3" },
  { pattern: /(postgres(ql)?:\/\/[^:]+:)[^@]+(@)/gi, replacement: "$1[REDACTED]$3" },
  { pattern: /(mysql:\/\/[^:]+:)[^@]+(@)/gi, replacement: "$1[REDACTED]$3" },
  { pattern: /(redis:\/\/[^:]+:)[^@]+(@)/gi, replacement: "$1[REDACTED]$3" },
  {
    pattern:
      /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----[\s\S]*?-----END \1PRIVATE KEY-----/g,
    replacement: "[PRIVATE_KEY_REDACTED]",
  },
];

export default function (pi: ExtensionAPI) {
  const sensitiveFiles = [
    /(^|\/)\.env$/,
    /(^|\/)\.env\.(?!example$)[^/]+$/,
    /(^|\/)\.dev\.vars($|\.[^/]+$)/,
    /(^|\/)secrets?\.(json|ya?ml|toml)$/i,
    /(^|\/)credentials/i,
  ];

  pi.on("tool_result", async (event, ctx) => {
    if (event.toolName === "read" && typeof event.input.path === "string") {
      const filePath = event.input.path;
      if (/(^|\/)\.env\.example$/i.test(filePath)) {
        return undefined;
      }
      for (const pattern of sensitiveFiles) {
        if (pattern.test(filePath)) {
          if (ctx.hasUI) ctx.ui.notify(`Redacted contents of sensitive file: ${filePath}`, "info");
          return {
            content: [{ type: "text", text: `[Contents of ${filePath} redacted for security]` }],
          };
        }
      }
    }

    let wasModified = false;
    const content = event.content.map((item) => {
      if (item.type !== "text") return item;
      const redacted = redactText(item.text, sensitivePatterns);
      if (redacted.modified) wasModified = true;
      return redacted.modified ? { ...item, text: redacted.text } : item;
    });

    if (wasModified) {
      if (ctx.hasUI) ctx.ui.notify("Sensitive data redacted from output", "info");
      return { content };
    }

    return undefined;
  });
}
