# Challenge 03 – The Wrong Sizes
**BigFit Apparel**  ·  Data snapshot: morning of 2026-11-16 (stock); history up to 2026-11-15

## Files

### `inventory.csv`  (2,940 rows)

`sku`, `store`, `stock`, `ageing_days`

### `products.csv`  (490 rows)

`sku`, `product`, `category`, `style`, `colour`, `size`, `season`, `selling_price`

### `promotions.csv`  (3 rows)

`product_or_category`, `store`, `promotion`, `start_date`, `end_date`, `discount`, `expected_uplift`

### `purchase_orders.csv`  (35 rows)

`po`, `supplier`, `sku`, `qty`, `expected_date`, `status`

### `sales.csv`  (11,713 rows)

`date`, `sku`, `store`, `qty_sold`, `selling_price`

### `stores.csv`  (6 rows)

`store`, `location`, `store_type`, `customer_profile`

### `suppliers.csv`  (490 rows)

`supplier`, `sku`, `purchase_price`, `lead_time_days`, `moq`

## Notes

- SKU format is STYLE-COLOUR-SIZE, e.g. `S101-NAV-XXL`.
- Five stores plus `Peenya WH`.
- `promotions.csv` has a `store` column (`All` = every store); `expected_uplift` is a fraction.
- A style that a store has never stocked or sold is not ranged there.

At hour 14 an updated version of one of these files will be released. Same columns, same format.