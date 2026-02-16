# rohlik-grocery Examples

## Favorites

```bash
npx mcporter call rohlik.get_all_user_favorites
npx mcporter call rohlik.get_user_favorites_from_categories category_ids='[300105000]'
```

## Shopping Lists

```bash
npx mcporter call rohlik.get_user_shopping_lists_preview
npx mcporter call rohlik.get_user_shopping_list_detail shopping_list_id=12345
npx mcporter call rohlik.create_shopping_list name="Weekly Groceries"
npx mcporter call rohlik.add_products_to_shopping_list list_id=12345 product_id=1234567 amount=2
```

## Order History

```bash
npx mcporter call rohlik.fetch_orders limit=2
npx mcporter call rohlik.fetch_orders date_from=2025-12-01 date_to=2025-12-31
npx mcporter call rohlik.repeat_order order_id=12345678
```

## End to End Flow

```bash
# 1) Check favorites
npx mcporter call rohlik.get_all_user_favorites

# 2) Preview shopping lists
npx mcporter call rohlik.get_user_shopping_lists_preview

# 3) Create a list and add an item
npx mcporter call rohlik.create_shopping_list name="Weekly Groceries"
npx mcporter call rohlik.add_products_to_shopping_list list_id=12345 product_id=1234567 amount=2

# 4) Find items
npx mcporter call rohlik.search_products keyword="milk" include_fields='["productId","productName","price","inStock","textualAmount"]'

# 5) Add to cart
npx mcporter call rohlik.add_items_to_cart items='[{"productId":1234567,"quantity":2}]'

# 6) Review cart
npx mcporter call rohlik.get_cart

# 7) Check past orders and repeat
npx mcporter call rohlik.fetch_orders limit=1
npx mcporter call rohlik.repeat_order order_id=12345678
```
