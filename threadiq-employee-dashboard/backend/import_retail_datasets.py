"""
ThreadIQ - Repeatable Retail Dataset Import Engine
Authoritatively integrates 7 business datasets into SQLite backend:
1. products.csv (490 variants)
2. inventory.csv (2,940 records)
3. sales.csv (11,713 transactions)
4. stores.csv (6 locations)
5. suppliers.csv (490 supplier relationships)
6. purchase_orders.csv (35 orders)
7. promotions.csv (3 campaigns)

Guarantees idempotency (repeatable imports without duplicating or doubling data),
preserves demo stores safely, and connects all data to the inventory map,
forecasting, and supplier intelligence.
"""

import os
import sys
import csv
import sqlite3
import datetime
from typing import Dict, List, Tuple, Any

# Resolve paths dynamically across local and serverless Vercel environments
import tempfile
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))

def resolve_raw_data_dir() -> str:
    candidates = [
        os.path.join(PROJECT_ROOT, "data", "raw"),
        os.path.join(os.path.dirname(CURRENT_DIR), "data", "raw"),
        os.path.join(os.getcwd(), "data", "raw"),
        os.path.join(os.path.dirname(os.getcwd()), "data", "raw"),
        "/var/task/data/raw",
    ]
    for c in candidates:
        if os.path.exists(c) and os.path.exists(os.path.join(c, "products.csv")):
            return c
    return os.path.join(PROJECT_ROOT, "data", "raw")

def _resolve_db_path() -> str:
    env_path = os.environ.get("THREADIQ_DB_PATH") or os.environ.get("DATABASE_PATH")
    if env_path:
        return env_path
    if os.environ.get("VERCEL"):
        return os.path.join(tempfile.gettempdir(), "threadiq.db")
    return os.path.join(CURRENT_DIR, "threadiq.db")

RAW_DATA_DIR = resolve_raw_data_dir()
DB_PATH = _resolve_db_path()

COLOUR_HEX_MAP = {
    'Beige': '#d4b996',
    'Black': '#18181b',
    'Charcoal': '#334155',
    'Grey': '#94a3b8',
    'Khaki': '#c2a649',
    'Maroon': '#881337',
    'Navy': '#1e3a8a',
    'Olive': '#65a30d',
    'Sky Blue': '#38bdf8',
    'White': '#ffffff'
}

STORE_METADATA = {
    'Jayanagar': {
        'store_id': 'STORE_RET_JAYANAGAR',
        'store_code': 'BLR-JAY',
        'city': 'Bengaluru',
        'address': '4th Block, Jayanagar, Bengaluru, Karnataka 560011',
        'zone': 'Bengaluru South',
        'lat': 12.9299,
        'lng': 77.5838,
        'store_type': 'High street',
        'customer_profile': 'Families, 30–55, value-conscious',
        'is_warehouse': 0
    },
    'Rajajinagar': {
        'store_id': 'STORE_RET_RAJAJINAGAR',
        'store_code': 'BLR-RAJ',
        'city': 'Bengaluru',
        'address': 'Dr Rajkumar Road, Rajajinagar, Bengaluru, Karnataka 560010',
        'zone': 'Bengaluru West',
        'lat': 12.9982,
        'lng': 77.5530,
        'store_type': 'High street',
        'customer_profile': 'Older professionals, formal wear',
        'is_warehouse': 0
    },
    'Whitefield': {
        'store_id': 'STORE_RET_WHITEFIELD',
        'store_code': 'BLR-WFD',
        'city': 'Bengaluru',
        'address': 'Phoenix Marketcity, Whitefield Main Road, Bengaluru, Karnataka 560048',
        'zone': 'Bengaluru East',
        'lat': 12.9960,
        'lng': 77.6963,
        'store_type': 'Mall',
        'customer_profile': 'IT professionals, 25–40, casual wear',
        'is_warehouse': 0
    },
    'Marathahalli': {
        'store_id': 'STORE_RET_MARATHAHALLI',
        'store_code': 'BLR-MAR',
        'city': 'Bengaluru',
        'address': 'Outer Ring Road, Marathahalli, Bengaluru, Karnataka 560037',
        'zone': 'Bengaluru East',
        'lat': 12.9553,
        'lng': 77.7011,
        'store_type': 'High street',
        'customer_profile': 'Young professionals, 22–35',
        'is_warehouse': 0
    },
    'Yelahanka': {
        'store_id': 'STORE_RET_YELAHANKA',
        'store_code': 'BLR-YEL',
        'city': 'Bengaluru',
        'address': 'New Town, Yelahanka, Bengaluru, Karnataka 560064',
        'zone': 'Bengaluru North',
        'lat': 13.1007,
        'lng': 77.5963,
        'store_type': 'Standalone',
        'customer_profile': 'Families, mixed',
        'is_warehouse': 0
    },
    'Peenya WH': {
        'store_id': 'STORE_RET_PEENYA_WH',
        'store_code': 'BLR-PEE-WH',
        'city': 'Bengaluru',
        'address': 'Peenya Industrial Area, Phase 1, Bengaluru, Karnataka 560058',
        'zone': 'Bengaluru North-West Logistics Hub',
        'lat': 13.0334,
        'lng': 77.5135,
        'store_type': 'Warehouse',
        'customer_profile': 'Central Fulfilment Hub & Bulk Logistics',
        'is_warehouse': 1
    }
}

EXPECTED_HEADERS = {
    'products.csv': ['sku', 'product', 'category', 'style', 'colour', 'size', 'season', 'selling_price'],
    'inventory.csv': ['sku', 'store', 'stock', 'ageing_days'],
    'sales.csv': ['date', 'sku', 'store', 'qty_sold', 'selling_price'],
    'stores.csv': ['store', 'location', 'store_type', 'customer_profile'],
    'suppliers.csv': ['supplier', 'sku', 'purchase_price', 'lead_time_days', 'moq'],
    'purchase_orders.csv': ['po', 'supplier', 'sku', 'qty', 'expected_date', 'status'],
    'promotions.csv': ['product_or_category', 'store', 'promotion', 'start_date', 'end_date', 'discount', 'expected_uplift']
}


def get_db_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


def apply_schema_migrations(conn: sqlite3.Connection):
    """Ensures all necessary tables and columns exist in threadiq.db."""
    with conn:
        # 1. Update stores table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS stores (
                store_id TEXT PRIMARY KEY,
                store_code TEXT NOT NULL UNIQUE,
                store_name TEXT NOT NULL,
                city TEXT NOT NULL,
                address TEXT NOT NULL,
                zone TEXT NOT NULL,
                lat REAL DEFAULT 12.9716,
                lng REAL DEFAULT 77.5946,
                store_type TEXT DEFAULT 'High street',
                customer_profile TEXT,
                is_warehouse INTEGER DEFAULT 0,
                is_imported INTEGER DEFAULT 0
            );
        """)
        # Ensure new columns exist in existing stores table
        cur = conn.execute("PRAGMA table_info(stores);")
        store_cols = [c[1] for c in cur.fetchall()]
        if 'store_type' not in store_cols:
            conn.execute("ALTER TABLE stores ADD COLUMN store_type TEXT DEFAULT 'High street';")
        if 'customer_profile' not in store_cols:
            conn.execute("ALTER TABLE stores ADD COLUMN customer_profile TEXT;")
        if 'is_warehouse' not in store_cols:
            conn.execute("ALTER TABLE stores ADD COLUMN is_warehouse INTEGER DEFAULT 0;")
        if 'is_imported' not in store_cols:
            conn.execute("ALTER TABLE stores ADD COLUMN is_imported INTEGER DEFAULT 0;")

        # 2. Products table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS products (
                sku TEXT PRIMARY KEY,
                product_name TEXT NOT NULL,
                category TEXT NOT NULL,
                style TEXT NOT NULL,
                colour TEXT NOT NULL,
                colour_hex TEXT NOT NULL,
                size TEXT NOT NULL,
                season TEXT NOT NULL,
                selling_price INTEGER NOT NULL
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_products_style ON products(style);")

        # 3. Inventory table column additions
        cur = conn.execute("PRAGMA table_info(inventory);")
        inv_cols = [c[1] for c in cur.fetchall()]
        if 'ageing_days' not in inv_cols:
            conn.execute("ALTER TABLE inventory ADD COLUMN ageing_days INTEGER DEFAULT 0;")
        if 'daily_sales_velocity' not in inv_cols:
            conn.execute("ALTER TABLE inventory ADD COLUMN daily_sales_velocity REAL DEFAULT 0.0;")
        if 'is_imported' not in inv_cols:
            conn.execute("ALTER TABLE inventory ADD COLUMN is_imported INTEGER DEFAULT 0;")

        # 4. Sales table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sales (
                sale_id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                sku TEXT NOT NULL,
                store_id TEXT NOT NULL,
                store_name TEXT NOT NULL,
                qty_sold INTEGER NOT NULL,
                selling_price INTEGER NOT NULL,
                revenue INTEGER NOT NULL,
                FOREIGN KEY (sku) REFERENCES products(sku),
                FOREIGN KEY (store_id) REFERENCES stores(store_id)
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sales_sku_store ON sales(sku, store_name);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sales_store ON sales(store_id);")

        # 5. Suppliers table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS suppliers (
                supplier_sku_id TEXT PRIMARY KEY,
                supplier_name TEXT NOT NULL,
                sku TEXT NOT NULL,
                purchase_price INTEGER NOT NULL,
                lead_time_days INTEGER NOT NULL,
                moq INTEGER NOT NULL,
                FOREIGN KEY (sku) REFERENCES products(sku)
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_suppliers_sku ON suppliers(sku);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(supplier_name);")

        # 6. Purchase Orders table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS purchase_orders (
                po_id TEXT PRIMARY KEY,
                supplier_name TEXT NOT NULL,
                sku TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                expected_date TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (sku) REFERENCES products(sku)
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_po_sku ON purchase_orders(sku);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);")

        # 7. Promotions table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS promotions (
                promotion_id TEXT PRIMARY KEY,
                product_or_category TEXT NOT NULL,
                store TEXT NOT NULL,
                promotion_name TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                discount TEXT NOT NULL,
                expected_uplift REAL NOT NULL
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_promotions_cat ON promotions(product_or_category);")


def read_csv_safely(filepath: str) -> List[List[str]]:
    """Reads CSV file handling UTF-8 and CP1252 encodings gracefully."""
    for enc in ['utf-8', 'cp1252', 'latin1']:
        try:
            with open(filepath, 'r', encoding=enc) as f:
                reader = csv.reader(f)
                return [row for row in reader if row and any(cell.strip() for cell in row)]
        except UnicodeDecodeError:
            continue
    raise ValueError(f"Could not decode CSV file: {filepath}")


def validate_file_headers(raw_dir: str = RAW_DATA_DIR) -> Dict[str, bool]:
    """Validates that all expected CSV files exist and match their required column headers."""
    results = {}
    for filename, expected_cols in EXPECTED_HEADERS.items():
        path = os.path.join(raw_dir, filename)
        if not os.path.exists(path):
            raise FileNotFoundError(f"Missing required CSV file: {path}")
        rows = read_csv_safely(path)
        if not rows:
            raise ValueError(f"CSV file is empty: {path}")
        actual_cols = [c.strip() for c in rows[0]]
        if actual_cols != expected_cols:
            raise ValueError(f"Header mismatch in {filename}: expected {expected_cols}, got {actual_cols}")
        results[filename] = True
    return results


def import_all_datasets(raw_dir: str = None, db_path: str = None) -> Dict[str, Any]:
    """
    Executes a complete, repeatable import of all 7 retail datasets into SQLite.
    Returns an execution report detailing imported and rejected rows.
    """
    if raw_dir is None:
        raw_dir = resolve_raw_data_dir()
    if db_path is None:
        db_path = _resolve_db_path()

    summary = {
        'files_validated': 0,
        'stores_imported': 0,
        'products_imported': 0,
        'inventory_imported': 0,
        'sales_imported': 0,
        'suppliers_imported': 0,
        'purchase_orders_imported': 0,
        'promotions_imported': 0,
        'rejected_rows': 0,
        'rejection_reasons': []
    }

    # Step 1: Validate headers
    validate_file_headers(raw_dir)
    summary['files_validated'] = len(EXPECTED_HEADERS)

    conn = get_db_connection(db_path)
    apply_schema_migrations(conn)

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    try:
        # Step 2: Import STORES
        stores_rows = read_csv_safely(os.path.join(raw_dir, 'stores.csv'))[1:]
        store_map = {} # store_name -> store_id
        for row in stores_rows:
            store_name = row[0].strip()
            location = row[1].strip()
            store_type = row[2].strip()
            profile = row[3].strip()

            meta = STORE_METADATA.get(store_name)
            if not meta:
                summary['rejected_rows'] += 1
                summary['rejection_reasons'].append(f"Unknown store in stores.csv: {store_name}")
                continue

            store_id = meta['store_id']
            store_map[store_name] = store_id

            conn.execute("""
                INSERT INTO stores (
                    store_id, store_code, store_name, city, address, zone,
                    lat, lng, store_type, customer_profile, is_warehouse, is_imported
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                ON CONFLICT(store_id) DO UPDATE SET
                    store_name=excluded.store_name,
                    store_code=excluded.store_code,
                    address=excluded.address,
                    lat=excluded.lat,
                    lng=excluded.lng,
                    store_type=excluded.store_type,
                    customer_profile=excluded.customer_profile,
                    is_warehouse=excluded.is_warehouse,
                    is_imported=1;
            """, (
                store_id, meta['store_code'], store_name, meta['city'],
                meta['address'], meta['zone'], meta['lat'], meta['lng'],
                store_type, profile if profile != '—' else meta['customer_profile'],
                meta['is_warehouse']
            ))
            summary['stores_imported'] += 1

        # Step 2B: Seed System and Store Employees for ForeignKey Integrity
        conn.execute("""
            INSERT INTO employees (
                employee_id, name, email, password_hash, password_salt, assigned_store_id, role, account_status
            ) VALUES (
                'SYSTEM_IMPORT', 'ThreadIQ System Importer', 'system@threadiq.in', 'sys_hash', 'sys_salt', 'STORE_RET_PEENYA_WH', 'system_admin', 'active'
            ) ON CONFLICT(employee_id) DO NOTHING;
        """)

        # Seed dedicated associates for the new retail locations (password: ThreadIQ@2026)
        p_hash, p_salt = ("c51323b6b1cb1a16b9b1e956daee0ff9e19d146c2688f4e24eb224ea1ee255e3", "salt_emp_ka_2026")
        new_store_employees = [
            ("EMP_BLR_JAY", "Kavya Ramesh", "kavya.ramesh@threadiq.in", "STORE_RET_JAYANAGAR", "store_associate"),
            ("EMP_BLR_RAJ", "Suresh Patil", "suresh.patil@threadiq.in", "STORE_RET_RAJAJINAGAR", "store_associate"),
            ("EMP_BLR_WFD", "Ananya Sen", "ananya.sen@threadiq.in", "STORE_RET_WHITEFIELD", "store_associate"),
            ("EMP_BLR_MAR", "Vikram Reddy", "vikram.reddy@threadiq.in", "STORE_RET_MARATHAHALLI", "store_associate"),
            ("EMP_BLR_YEL", "Deepa Gowda", "deepa.gowda@threadiq.in", "STORE_RET_YELAHANKA", "store_associate"),
            ("EMP_BLR_PEE", "Manjunath Hegde", "manjunath.hegde@threadiq.in", "STORE_RET_PEENYA_WH", "warehouse_manager"),
        ]
        for emp_id, emp_name, emp_email, emp_store, emp_role in new_store_employees:
            conn.execute("""
                INSERT INTO employees (
                    employee_id, name, email, password_hash, password_salt, assigned_store_id, role, account_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
                ON CONFLICT(employee_id) DO NOTHING;
            """, (emp_id, emp_name, emp_email, p_hash, p_salt, emp_store, emp_role))

        # Step 3: Import PRODUCTS
        products_rows = read_csv_safely(os.path.join(raw_dir, 'products.csv'))[1:]
        product_skus = set()
        product_catalogue = {}
        for row in products_rows:
            sku, prod_name, cat, style, colour, size, season, price = [c.strip() for c in row]
            try:
                price_val = int(price)
            except ValueError:
                summary['rejected_rows'] += 1
                summary['rejection_reasons'].append(f"Invalid price in products.csv: {sku} -> {price}")
                continue

            hex_val = COLOUR_HEX_MAP.get(colour, '#64748b')
            product_skus.add(sku)
            product_catalogue[sku] = {
                'product_name': prod_name,
                'category': cat,
                'style': style,
                'colour': colour,
                'size': size,
                'selling_price': price_val
            }

            conn.execute("""
                INSERT INTO products (
                    sku, product_name, category, style, colour, colour_hex, size, season, selling_price
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(sku) DO UPDATE SET
                    product_name=excluded.product_name,
                    category=excluded.category,
                    style=excluded.style,
                    colour=excluded.colour,
                    colour_hex=excluded.colour_hex,
                    size=excluded.size,
                    season=excluded.season,
                    selling_price=excluded.selling_price;
            """, (sku, prod_name, cat, style, colour, hex_val, size, season, price_val))
            summary['products_imported'] += 1

        # Step 4: Import INVENTORY
        inv_rows = read_csv_safely(os.path.join(raw_dir, 'inventory.csv'))[1:]
        for row in inv_rows:
            sku, store_name, stock_str, ageing_str = [c.strip() for c in row]
            if sku not in product_skus:
                summary['rejected_rows'] += 1
                summary['rejection_reasons'].append(f"Inventory SKU not in products: {sku}")
                continue
            if store_name not in store_map:
                summary['rejected_rows'] += 1
                summary['rejection_reasons'].append(f"Inventory store not in stores: {store_name}")
                continue

            try:
                stock_val = int(stock_str)
                ageing_val = int(ageing_str)
            except ValueError:
                summary['rejected_rows'] += 1
                summary['rejection_reasons'].append(f"Invalid numeric value in inventory: {sku} at {store_name}")
                continue

            store_id = store_map[store_name]
            p_info = product_catalogue[sku]
            colour_hex = COLOUR_HEX_MAP.get(p_info['colour'], '#64748b')
            colour_id = p_info['colour'].lower().replace(' ', '_')
            store_code = STORE_METADATA[store_name]['store_code']
            inv_id = f"inv_{store_code.lower()}_{sku.lower().replace('-', '_')}"

            # Set minimum stock threshold: 3 for retail stores, 10 for warehouse
            min_thresh = 10 if store_name == 'Peenya WH' else 3

            conn.execute("""
                INSERT INTO inventory (
                    inventory_id, store_id, product_id, product_name, category,
                    colour, colour_hex, colour_id, size, sku,
                    available_quantity, minimum_stock_threshold, unit_price,
                    last_updated_timestamp, last_updated_by_employee_id, version,
                    ageing_days, is_imported
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYSTEM_IMPORT', 1, ?, 1)
                ON CONFLICT(store_id, sku) DO UPDATE SET
                    available_quantity=excluded.available_quantity,
                    ageing_days=excluded.ageing_days,
                    unit_price=excluded.unit_price,
                    product_name=excluded.product_name,
                    category=excluded.category,
                    colour=excluded.colour,
                    colour_hex=excluded.colour_hex,
                    size=excluded.size,
                    minimum_stock_threshold=excluded.minimum_stock_threshold,
                    last_updated_timestamp=excluded.last_updated_timestamp,
                    is_imported=1;
            """, (
                inv_id, store_id, f"prod_{sku.lower()}", p_info['product_name'], p_info['category'],
                p_info['colour'], colour_hex, colour_id, p_info['size'], sku,
                stock_val, min_thresh, p_info['selling_price'], now_iso, ageing_val
            ))
            summary['inventory_imported'] += 1

        # Step 5: Import SALES
        sales_rows = read_csv_safely(os.path.join(raw_dir, 'sales.csv'))[1:]
        sales_velocity_tracker = {} # (store_name, sku) -> total_qty_sold
        for row in sales_rows:
            date_str, sku, store_name, qty_str, price_str = [c.strip() for c in row]
            if sku not in product_skus:
                summary['rejected_rows'] += 1
                summary['rejection_reasons'].append(f"Sales SKU not in products: {sku}")
                continue
            if store_name not in store_map:
                summary['rejected_rows'] += 1
                summary['rejection_reasons'].append(f"Sales store not in stores: {store_name}")
                continue

            try:
                qty_val = int(qty_str)
                price_val = int(price_str)
            except ValueError:
                summary['rejected_rows'] += 1
                summary['rejection_reasons'].append(f"Invalid sales numeric value: {row}")
                continue

            store_id = store_map[store_name]
            sale_id = f"SALE-{date_str}-{store_name}-{sku}"
            revenue = qty_val * price_val

            sales_velocity_tracker[(store_name, sku)] = sales_velocity_tracker.get((store_name, sku), 0) + qty_val

            conn.execute("""
                INSERT INTO sales (
                    sale_id, date, sku, store_id, store_name, qty_sold, selling_price, revenue
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(sale_id) DO UPDATE SET
                    qty_sold=excluded.qty_sold,
                    selling_price=excluded.selling_price,
                    revenue=excluded.revenue;
            """, (sale_id, date_str, sku, store_id, store_name, qty_val, price_val, revenue))
            summary['sales_imported'] += 1

        # Update daily sales velocity in inventory table (60 day period)
        for (store_name, sku), total_qty in sales_velocity_tracker.items():
            store_id = store_map[store_name]
            velocity = round(total_qty / 60.0, 3)
            conn.execute("""
                UPDATE inventory
                SET daily_sales_velocity = ?
                WHERE store_id = ? AND sku = ?;
            """, (velocity, store_id, sku))

        # Step 6: Import SUPPLIERS
        supp_rows = read_csv_safely(os.path.join(raw_dir, 'suppliers.csv'))[1:]
        for row in supp_rows:
            supp_name, sku, price_str, lead_str, moq_str = [c.strip() for c in row]
            if sku not in product_skus:
                summary['rejected_rows'] += 1
                summary['rejection_reasons'].append(f"Supplier SKU not in products: {sku}")
                continue

            try:
                purchase_price = int(price_str)
                lead_time = int(lead_str)
                moq = int(moq_str)
            except ValueError:
                summary['rejected_rows'] += 1
                summary['rejection_reasons'].append(f"Invalid supplier numeric value: {row}")
                continue

            supp_id = f"{supp_name}_{sku}"
            conn.execute("""
                INSERT INTO suppliers (
                    supplier_sku_id, supplier_name, sku, purchase_price, lead_time_days, moq
                ) VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(supplier_sku_id) DO UPDATE SET
                    purchase_price=excluded.purchase_price,
                    lead_time_days=excluded.lead_time_days,
                    moq=excluded.moq;
            """, (supp_id, supp_name, sku, purchase_price, lead_time, moq))
            summary['suppliers_imported'] += 1

        # Step 7: Import PURCHASE ORDERS
        po_rows = read_csv_safely(os.path.join(raw_dir, 'purchase_orders.csv'))[1:]
        for row in po_rows:
            po_id, supp_name, sku, qty_str, exp_date, status = [c.strip() for c in row]
            if sku not in product_skus:
                summary['rejected_rows'] += 1
                summary['rejection_reasons'].append(f"Purchase Order SKU not in products: {sku}")
                continue

            try:
                qty_val = int(qty_str)
            except ValueError:
                summary['rejected_rows'] += 1
                summary['rejection_reasons'].append(f"Invalid PO quantity: {row}")
                continue

            conn.execute("""
                INSERT INTO purchase_orders (
                    po_id, supplier_name, sku, quantity, expected_date, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(po_id) DO UPDATE SET
                    supplier_name=excluded.supplier_name,
                    sku=excluded.sku,
                    quantity=excluded.quantity,
                    expected_date=excluded.expected_date,
                    status=excluded.status;
            """, (po_id, supp_name, sku, qty_val, exp_date, status, now_iso))
            summary['purchase_orders_imported'] += 1

        # Step 8: Import PROMOTIONS
        promo_rows = read_csv_safely(os.path.join(raw_dir, 'promotions.csv'))[1:]
        promo_idx = 1
        for row in promo_rows:
            target, store, promo_name, start_date, end_date, discount, uplift_str = [c.strip() for c in row]
            try:
                uplift_val = float(uplift_str)
            except ValueError:
                summary['rejected_rows'] += 1
                summary['rejection_reasons'].append(f"Invalid promotion uplift: {row}")
                continue

            promo_id = f"PROMO-{promo_idx:03d}"
            promo_idx += 1

            conn.execute("""
                INSERT INTO promotions (
                    promotion_id, product_or_category, store, promotion_name,
                    start_date, end_date, discount, expected_uplift
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(promotion_id) DO UPDATE SET
                    product_or_category=excluded.product_or_category,
                    store=excluded.store,
                    promotion_name=excluded.promotion_name,
                    start_date=excluded.start_date,
                    end_date=excluded.end_date,
                    discount=excluded.discount,
                    expected_uplift=excluded.expected_uplift;
            """, (promo_id, target, store, promo_name, start_date, end_date, discount, uplift_val))
            summary['promotions_imported'] += 1

        # Step 9: Seed Grounded Recommendations Based on Imported Datasets
        # For critical shortages, check: (1) Peenya WH surplus, (2) other stores surplus, (3) outstanding POs, (4) supplier MOQ
        conn.commit()
        generate_grounded_recommendations(conn)

        conn.commit()
    finally:
        conn.close()

    return summary


def generate_grounded_recommendations(conn: sqlite3.Connection):
    """
    Generates deterministic recommendations grounded in actual database records:
    1. Shortage stores check Peenya WH warehouse first for available stock.
    2. Check open/confirmed purchase orders.
    3. Check matching suppliers for purchase orders respecting MOQ and lead time.
    """
    # Find critical shortage variants (stock <= 1 and velocity > 0) in retail stores
    cur = conn.execute("""
        SELECT i.store_id, s.store_name, i.sku, i.product_name, i.size, i.colour,
               i.available_quantity, i.daily_sales_velocity, i.unit_price
        FROM inventory i
        JOIN stores s ON i.store_id = s.store_id
        WHERE s.is_warehouse = 0 AND i.available_quantity <= 1 AND i.daily_sales_velocity > 0.05
        ORDER BY i.daily_sales_velocity DESC, i.available_quantity ASC
        LIMIT 6;
    """)
    shortages = cur.fetchall()

    rec_idx = 201
    for sh in shortages:
        store_id, store_name, sku, prod_name, size, colour, stock, velocity, price = sh

        # Check Peenya WH inventory for surplus
        cur_wh = conn.execute("""
            SELECT available_quantity FROM inventory
            WHERE store_id = 'STORE_RET_PEENYA_WH' AND sku = ?;
        """, (sku,))
        wh_row = cur_wh.fetchone()
        wh_stock = wh_row[0] if wh_row else 0

        # Check existing Open/Confirmed POs
        cur_po = conn.execute("""
            SELECT po_id, supplier_name, quantity, expected_date, status
            FROM purchase_orders
            WHERE sku = ? AND status IN ('Open', 'Confirmed');
        """, (sku,))
        po_row = cur_po.fetchone()

        # Check supplier info
        cur_sup = conn.execute("""
            SELECT supplier_name, purchase_price, lead_time_days, moq
            FROM suppliers
            WHERE sku = ?;
        """, (sku,))
        sup_row = cur_sup.fetchone()

        rec_id = f"REC-IMPORT-{rec_idx}"
        rec_idx += 1

        if wh_stock >= 10:
            # Transfer from Peenya WH
            proposed_qty = min(15, wh_stock - 5)
            action = "Transfer"
            priority = "Critical" if stock == 0 else "High"
            source_store = "Peenya WH (Central Warehouse)"
            source_id = "STORE_RET_PEENYA_WH"
            revenue_est = f"+₹{proposed_qty * price:,} potential revenue protected"
            reasoning = (
                f"{store_name} has {stock} units of {sku} ({prod_name}, {colour}, {size}) with daily velocity "
                f"{velocity} units/day. Peenya WH holds {wh_stock} units surplus in central storage. "
                f"Transferring {proposed_qty} units balances in-store customer demand without external procurement."
            )
        elif po_row:
            # Outstanding PO incoming
            action = "Wait"
            priority = "Medium"
            source_store = f"{po_row['supplier_name']} (In-Transit PO)"
            source_id = None
            proposed_qty = 0
            revenue_est = f"PO {po_row['po_id']} arriving on {po_row['expected_date']}"
            reasoning = (
                f"{store_name} stock is low ({stock} units), but Purchase Order {po_row['po_id']} "
                f"for {po_row['quantity']} units from {po_row['supplier_name']} is {po_row['status']} "
                f"and expected on {po_row['expected_date']}. Additional order is not required to prevent double-ordering."
            )
        elif sup_row:
            # Supplier procurement recommendation respecting MOQ
            action = "Reorder"
            priority = "High"
            source_store = f"{sup_row['supplier_name']} (Factory Mill)"
            source_id = "supplier-procurement"
            proposed_qty = sup_row['moq']
            revenue_est = f"+₹{proposed_qty * price:,} seasonal capture"
            reasoning = (
                f"Stock depleted at {store_name} ({stock} units left, velocity {velocity}/day). No central warehouse surplus available. "
                f"Recommended procurement with registered SKU supplier {sup_row['supplier_name']}. "
                f"Lead time: {sup_row['lead_time_days']} days, MOQ: {sup_row['moq']} units at unit cost ₹{sup_row['purchase_price']}."
            )
        else:
            continue

        conn.execute("""
            INSERT INTO recommendations (
                id, sku_id, product_name, size, colour, action, priority,
                source_store, source_store_id, dest_store, dest_store_id,
                proposed_qty, estimated_impact_revenue, reasoning, status,
                notes, created_at, confidence_score, transfer_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, 'Just now', 94, NULL)
            ON CONFLICT(id) DO UPDATE SET
                sku_id=excluded.sku_id,
                product_name=excluded.product_name,
                size=excluded.size,
                colour=excluded.colour,
                action=excluded.action,
                priority=excluded.priority,
                source_store=excluded.source_store,
                source_store_id=excluded.source_store_id,
                dest_store=excluded.dest_store,
                dest_store_id=excluded.dest_store_id,
                proposed_qty=excluded.proposed_qty,
                estimated_impact_revenue=excluded.estimated_impact_revenue,
                reasoning=excluded.reasoning;
        """, (
            rec_id, sku, prod_name, size, colour, action, priority,
            source_store, source_id, store_name, store_id,
            proposed_qty, revenue_est, reasoning
        ))


if __name__ == "__main__":
    print("=================================================================")
    print(" Starting ThreadIQ Repeatable Retail Dataset Import Engine...")
    print(f" Source Directory: {RAW_DATA_DIR}")
    print(f" Database Target:  {DB_PATH}")
    print("=================================================================")

    report = import_all_datasets()

    print("\n================== IMPORT SUMMARY REPORT ==================")
    print(f" 1. CSV Files Validated:         {report['files_validated']} / 7")
    print(f" 2. Authoritative Stores:        {report['stores_imported']} / 6")
    print(f" 3. Products & SKUs:             {report['products_imported']} / 490")
    print(f" 4. Inventory Records:           {report['inventory_imported']} / 2,940")
    print(f" 5. Sales Transactions:          {report['sales_imported']} / 11,713")
    print(f" 6. Supplier Records:            {report['suppliers_imported']} / 490")
    print(f" 7. Purchase Orders:             {report['purchase_orders_imported']} / 35")
    print(f" 8. Promotional Campaigns:       {report['promotions_imported']} / 3")
    print(f" 9. Invalid / Rejected Rows:     {report['rejected_rows']}")
    if report['rejection_reasons']:
        print("    Rejection Details:")
        for r in report['rejection_reasons']:
            print(f"    - {r}")
    print("===========================================================")
    print(" Import completed successfully with ACID transaction integrity.")
