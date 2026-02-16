# Rohlik MCP Setup

## MCPorter config

Create a MCPorter config in `~/.mcporter/mcporter.json` (global) or `config/mcporter.json` (project):

```json
{
  "mcpServers": {
    "rohlik": {
      "description": "Rohlik.cz MCP server",
      "baseUrl": "https://mcp.rohlik.cz/mcp",
      "headers": {
        "rhl-email": "${RHL_EMAIL}",
        "rhl-pass": "${RHL_PASS}"
      }
    }
  }
}
```

## Credentials

Set credentials in your shell (do not commit them):

```bash
export RHL_EMAIL="you@example.com"
export RHL_PASS="your-password"
```

If you prefer, replace the placeholders in the config with literal values instead of using environment variables.

## Workflow and device approval

1. Confirm `RHL_EMAIL` and `RHL_PASS` are set in your environment.
2. Run `npx mcporter call rohlik.get_user_info` to trigger device approval on new devices.
3. Check your email and approve the new device if prompted.
4. Run `npx mcporter list rohlik` to discover tool names and parameters.
5. Call the relevant tools to search products, manage the cart, and submit the order.
