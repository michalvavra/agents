---
name: rohlik-grocery
description: Shop on Rohlik.cz via MCPorter. Use to search products, manage cart, and place orders with explicit confirmation.
compatibility: Requires Node.js, MCPorter, and Rohlik.cz credentials (RHL_EMAIL, RHL_PASS).
---

# Rohlik Grocery

Shop via the Rohlik.cz MCP server using MCPorter.

## Usage

```bash
npx mcporter list rohlik
npx mcporter list rohlik --schema
npx mcporter call rohlik.search_products keyword="milk" include_fields='["productId","productName","price","inStock","textualAmount"]'
npx mcporter call rohlik.add_items_to_cart items='[{"productId":1234567,"quantity":1}]'
npx mcporter call rohlik.get_cart
npx mcporter call rohlik.<checkout_tool> key=value
```

Use `mcporter list rohlik --schema` to identify the exact checkout tool name and required parameters.

## Workflow

1. List tools with `mcporter list rohlik` and inspect schemas.
2. Search products and capture `productId` values.
3. Add items to cart with `add_items_to_cart`.
4. Review cart contents and fees using `get_cart`.
5. If checkout requires a slot, use the slot tool from the schema.
6. Ask for explicit confirmation before checkout.

## Common Tasks

Favorites:

```bash
npx mcporter call rohlik.get_all_user_favorites
npx mcporter call rohlik.get_user_favorites_from_categories category_ids='[300105000]'
```

Shopping lists:

```bash
npx mcporter call rohlik.get_user_shopping_lists_preview
npx mcporter call rohlik.get_user_shopping_list_detail shopping_list_id=12345
npx mcporter call rohlik.create_shopping_list name="Weekly Groceries"
npx mcporter call rohlik.add_products_to_shopping_list list_id=12345 product_id=1234567 amount=2
```

Order history:

```bash
npx mcporter call rohlik.fetch_orders limit=2
npx mcporter call rohlik.fetch_orders date_from=2025-12-01 date_to=2025-12-31
npx mcporter call rohlik.repeat_order order_id=12345678
```

## Examples

Search, add, and review cart:

```bash
npx mcporter call rohlik.search_products keyword="eggs" include_fields='["productId","productName","price","inStock"]'
npx mcporter call rohlik.add_items_to_cart items='[{"productId":1234567,"quantity":2}]'
npx mcporter call rohlik.get_cart
```

## Output

MCPorter returns JSON by default. Pipe through `jq` when you need structured filtering.

## Safety

Never run checkout or order submission without explicit user confirmation.

---

See [references/setup.md](references/setup.md) for setup details and device approval on first use.
See [references/examples.md](references/examples.md) for favorites, lists, and order flows.
