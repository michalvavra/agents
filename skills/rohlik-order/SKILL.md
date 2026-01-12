---
name: rohlik-order
description: Order from Rohlik.cz via the Rohlik MCP server using MCPorter. Use when browsing products, managing the cart, or placing Rohlik orders.
compatibility: Requires Node.js and network access to https://mcp.rohlik.cz/mcp/. Uses MCPorter (npx mcporter) and Rohlik credentials via RHL_EMAIL and RHL_PASS environment variables.
---

# Rohlik Order

Use MCPorter to call the Rohlik MCP server without an MCP client.

## Usage

```bash
npx mcporter list rohlik
npx mcporter list rohlik --schema
npx mcporter call rohlik.<tool> key=value other=value
```

Use `mcporter list rohlik` to see the available tools and their required parameters, then call the appropriate tool.
See `references/setup.md` for setup and device approval workflow.

### Example: order a beer

```bash
npx mcporter call rohlik.search_products query=beer limit=5
npx mcporter call rohlik.add_to_cart product_id=<product_id> quantity=1
npx mcporter call rohlik.get_cart
```

