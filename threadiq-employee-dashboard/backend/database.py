"""
ThreadIQ Database Engine & Seed System
Persistent SQLite database with ACID transactions, foreign keys, and optimistic locking concurrency.
"""

import sqlite3
import hashlib
import os
import secrets
from datetime import datetime, timezone

import tempfile

def _resolve_db_path() -> str:
    env_path = os.environ.get("THREADIQ_DB_PATH") or os.environ.get("DATABASE_PATH")
    if env_path:
        return env_path
    if os.environ.get("VERCEL"):
        return os.path.join(tempfile.gettempdir(), "threadiq.db")
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "threadiq.db")

DB_PATH = _resolve_db_path()

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn

def hash_password(password: str, salt: str = None) -> tuple[str, str]:
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return hashed, salt

def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    hashed, _ = hash_password(password, salt)
    return secrets.compare_digest(hashed, stored_hash)

def init_db():
    """Initializes tables and seeds the database with Rahul Sharma (Bengaluru) and Priya Kumar (Mysuru)."""
    conn = get_db()
    with conn:
        # 1. Stores Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS stores (
                store_id TEXT PRIMARY KEY,
                store_code TEXT NOT NULL UNIQUE,
                store_name TEXT NOT NULL,
                city TEXT NOT NULL,
                address TEXT NOT NULL,
                zone TEXT NOT NULL
            );
        """)

        # 2. Employees Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS employees (
                employee_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                password_salt TEXT NOT NULL,
                assigned_store_id TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'store_associate',
                account_status TEXT NOT NULL DEFAULT 'active',
                FOREIGN KEY (assigned_store_id) REFERENCES stores(store_id)
            );
        """)

        # 3. Inventory Table (with version column for concurrency control)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS inventory (
                inventory_id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL,
                product_id TEXT NOT NULL,
                product_name TEXT NOT NULL,
                category TEXT NOT NULL,
                colour TEXT NOT NULL,
                colour_hex TEXT NOT NULL,
                colour_id TEXT NOT NULL,
                size TEXT NOT NULL,
                sku TEXT NOT NULL,
                available_quantity INTEGER NOT NULL CHECK (available_quantity >= 0),
                minimum_stock_threshold INTEGER NOT NULL,
                unit_price INTEGER NOT NULL DEFAULT 899,
                last_updated_timestamp TEXT NOT NULL,
                last_updated_by_employee_id TEXT NOT NULL,
                version INTEGER NOT NULL DEFAULT 1,
                FOREIGN KEY (store_id) REFERENCES stores(store_id),
                FOREIGN KEY (last_updated_by_employee_id) REFERENCES employees(employee_id),
                UNIQUE (store_id, sku)
            );
        """)

        # 4. Inventory History (Audit Log)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS inventory_history (
                history_id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL,
                product_id TEXT NOT NULL,
                product_name TEXT NOT NULL,
                colour TEXT NOT NULL,
                size TEXT NOT NULL,
                sku TEXT NOT NULL,
                previous_quantity INTEGER NOT NULL,
                quantity_change INTEGER NOT NULL,
                new_quantity INTEGER NOT NULL,
                update_type TEXT NOT NULL,
                employee_id TEXT NOT NULL,
                employee_name TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                reference_id TEXT,
                remarks TEXT,
                FOREIGN KEY (store_id) REFERENCES stores(store_id),
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
            );
        """)

        # 5. Stock Transfers Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS stock_transfers (
                transfer_id TEXT PRIMARY KEY,
                source_store_id TEXT NOT NULL,
                destination_store_id TEXT NOT NULL,
                product_id TEXT NOT NULL,
                product_name TEXT NOT NULL,
                colour TEXT NOT NULL,
                size TEXT NOT NULL,
                sku TEXT NOT NULL,
                quantity INTEGER NOT NULL CHECK (quantity > 0),
                request_date TEXT NOT NULL,
                estimated_arrival TEXT,
                status TEXT NOT NULL, -- 'Pending Approval', 'Approved', 'In Transit', 'Received', 'Rejected'
                approved_date TEXT,
                approved_by_manager_name TEXT,
                approved_by_manager_id TEXT,
                received_date TEXT,
                received_by_employee_id TEXT,
                notes TEXT,
                FOREIGN KEY (source_store_id) REFERENCES stores(store_id),
                FOREIGN KEY (destination_store_id) REFERENCES stores(store_id)
            );
        """)

        # Migration check for existing databases
        cur = conn.execute("PRAGMA table_info(stock_transfers);")
        existing_cols = [c[1] for c in cur.fetchall()]
        if "approved_date" not in existing_cols:
            conn.execute("ALTER TABLE stock_transfers ADD COLUMN approved_date TEXT;")
        if "approved_by_manager_name" not in existing_cols:
            conn.execute("ALTER TABLE stock_transfers ADD COLUMN approved_by_manager_name TEXT;")
        if "approved_by_manager_id" not in existing_cols:
            conn.execute("ALTER TABLE stock_transfers ADD COLUMN approved_by_manager_id TEXT;")
        if "dispatched_date" not in existing_cols:
            conn.execute("ALTER TABLE stock_transfers ADD COLUMN dispatched_date TEXT;")
        if "delivery_mode" not in existing_cols:
            conn.execute("ALTER TABLE stock_transfers ADD COLUMN delivery_mode TEXT DEFAULT 'normal';")
        if "recommendation_id" not in existing_cols:
            conn.execute("ALTER TABLE stock_transfers ADD COLUMN recommendation_id TEXT;")

        # Migration check for inventory table: daily_sales_velocity and approval tracking
        cur_inv = conn.execute("PRAGMA table_info(inventory);")
        existing_inv_cols = [c[1] for c in cur_inv.fetchall()]
        if "daily_sales_velocity" not in existing_inv_cols:
            conn.execute("ALTER TABLE inventory ADD COLUMN daily_sales_velocity REAL NOT NULL DEFAULT 2.5;")
        if "approval_status" not in existing_inv_cols:
            conn.execute("ALTER TABLE inventory ADD COLUMN approval_status TEXT;")
        if "approval_notes" not in existing_inv_cols:
            conn.execute("ALTER TABLE inventory ADD COLUMN approval_notes TEXT;")
        if "approval_decided_at" not in existing_inv_cols:
            conn.execute("ALTER TABLE inventory ADD COLUMN approval_decided_at TEXT;")

        # Recommendations Table for AI Rebalance & Manager Authorizations
        conn.execute("""
            CREATE TABLE IF NOT EXISTS recommendations (
                id TEXT PRIMARY KEY,
                sku_id TEXT NOT NULL,
                product_name TEXT NOT NULL,
                size TEXT NOT NULL,
                colour TEXT NOT NULL,
                action TEXT NOT NULL,
                priority TEXT NOT NULL,
                source_store TEXT,
                source_store_id TEXT,
                dest_store TEXT,
                dest_store_id TEXT,
                proposed_qty INTEGER NOT NULL,
                estimated_impact_revenue TEXT,
                reasoning TEXT,
                status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
                notes TEXT,
                created_at TEXT NOT NULL,
                confidence_score INTEGER DEFAULT 90,
                transfer_id TEXT
            );
        """)

        # Migration check for stores table: lat, lng
        cur_st = conn.execute("PRAGMA table_info(stores);")
        existing_st_cols = [c[1] for c in cur_st.fetchall()]
        if "lat" not in existing_st_cols:
            conn.execute("ALTER TABLE stores ADD COLUMN lat REAL DEFAULT 12.9716;")
        if "lng" not in existing_st_cols:
            conn.execute("ALTER TABLE stores ADD COLUMN lng REAL DEFAULT 77.5946;")
        if "store_type" not in existing_st_cols:
            conn.execute("ALTER TABLE stores ADD COLUMN store_type TEXT DEFAULT 'High street';")
        if "customer_profile" not in existing_st_cols:
            conn.execute("ALTER TABLE stores ADD COLUMN customer_profile TEXT;")
        if "is_warehouse" not in existing_st_cols:
            conn.execute("ALTER TABLE stores ADD COLUMN is_warehouse INTEGER DEFAULT 0;")
        if "is_imported" not in existing_st_cols:
            conn.execute("ALTER TABLE stores ADD COLUMN is_imported INTEGER DEFAULT 0;")

        # Apply schema migrations for imported retail tables (products, sales, suppliers, purchase_orders, promotions)
        try:
            from backend.import_retail_datasets import apply_schema_migrations, import_all_datasets
            apply_schema_migrations(conn)
            cur_p = conn.execute("SELECT COUNT(*) FROM products;")
            if cur_p.fetchone()[0] == 0:
                import_all_datasets(db_path=DB_PATH)
        except Exception as e:
            pass

        # Seed all Karnataka Retail Stores
        stores_data = [
            ("STORE_KA_BLR_01", "BLR-FLAG-01", "Brigade Road Flagship", "Bengaluru", "88 Brigade Road, Ashok Nagar, Bengaluru, Karnataka 560025", "Karnataka South Metro", 12.9716, 77.5946),
            ("STORE_KA_MYS_01", "KA-MYS-01", "Mysuru Central", "Mysuru", "D. Devaraj Urs Road, Mysuru, Karnataka 570001", "Karnataka Heritage Zone", 12.2958, 76.6394),
            ("STORE_KA_MNG_01", "KA-MNG-03", "Coastal City Pavilion", "Mangaluru", "KS Rao Road, Hampankatta, Mangaluru, Karnataka 575001", "Coastal Karnataka", 12.9141, 74.8560),
            ("STORE_KA_HUB_01", "KA-HUB-04", "North Karnataka Hub", "Hubballi-Dharwad", "Gokul Road, Vidyanagar, Hubballi, Karnataka 580030", "North Karnataka", 15.3647, 75.1240),
            ("STORE_KA_BEL_01", "KA-BEL-05", "Cantonment Galleria", "Belagavi", "Congress Road, Tilakwadi, Belagavi, Karnataka 590006", "North Karnataka", 15.8497, 74.4977),
            ("STORE_KA_KLB_01", "KA-KLB-06", "Gulbarga Central Plaza", "Kalaburagi", "Main Road, Super Market, Kalaburagi, Karnataka 585101", "Hyderabad-Karnataka", 17.3297, 76.8343),
            ("STORE_KA_SMG_01", "KA-SMG-07", "Malnad Centre Boutique", "Shivamogga", "Nehru Road, Durgigudi, Shivamogga, Karnataka 577201", "Central Karnataka", 13.9299, 75.5681),
            ("STORE_KA_DVG_01", "KA-DVG-08", "Cotton City Emporium", "Davanagere", "PB Road, Davanagere, Karnataka 577002", "Central Karnataka", 14.4644, 75.9218)
        ]
        for s in stores_data:
            conn.execute("""
                INSERT INTO stores (store_id, store_code, store_name, city, address, zone, lat, lng)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(store_id) DO UPDATE SET
                    store_code=excluded.store_code,
                    store_name=excluded.store_name,
                    city=excluded.city,
                    address=excluded.address,
                    zone=excluded.zone,
                    lat=excluded.lat,
                    lng=excluded.lng;
            """, s)

        # Seed Employees: EMP001 (Rahul Sharma), EMP002 (Priya Kumar), and Manager MGR001 (Priya Kulkarni)
        # Default password for all demonstration accounts: "ThreadIQ@2026"
        p_hash1, p_salt1 = hash_password("ThreadIQ@2026", "salt_emp001_blr")
        p_hash2, p_salt2 = hash_password("ThreadIQ@2026", "salt_emp002_mys")
        p_hash_mgr, p_salt_mgr = hash_password("ThreadIQ@2026", "salt_mgr001_blr")

        conn.execute("""
            INSERT OR REPLACE INTO employees (employee_id, name, email, password_hash, password_salt, assigned_store_id, role, account_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, ("EMP001", "Rahul Sharma", "rahul.sharma@threadiq.in", p_hash1, p_salt1, "STORE_KA_MYS_01", "store_associate", "active"))

        conn.execute("""
            INSERT OR REPLACE INTO employees (employee_id, name, email, password_hash, password_salt, assigned_store_id, role, account_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, ("EMP002", "Priya Kumar", "priya.kumar@threadiq.in", p_hash2, p_salt2, "STORE_KA_BLR_01", "store_associate", "active"))

        conn.execute("""
            INSERT OR REPLACE INTO employees (employee_id, name, email, password_hash, password_salt, assigned_store_id, role, account_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, ("MGR001", "Priya Kulkarni", "priya.kulkarni@threadiq.in", p_hash_mgr, p_salt_mgr, "STORE_KA_BLR_01", "store_manager", "active"))

        # Seed Benchmark Item from Test Specification: Vintage Washed Heavyweight Tee 4XL
        now_seed_iso = datetime.now(timezone.utc).isoformat()
        benchmark_items = [
            ("inv_blr_TSHIRT-4XL-BLK", "STORE_KA_BLR_01", "prod_vintage-washed-heavyweight-tee", "Vintage Washed Heavyweight Tee", "T-Shirts", "Black", "#18181b", "black", "4XL", "TSHIRT-4XL-BLK", 25, 15, 899, now_seed_iso, "EMP001", 8.0),
            ("inv_mys_TSHIRT-4XL-BLK", "STORE_KA_MYS_01", "prod_vintage-washed-heavyweight-tee", "Vintage Washed Heavyweight Tee", "T-Shirts", "Black", "#18181b", "black", "4XL", "TSHIRT-4XL-BLK", 45, 15, 899, now_seed_iso, "EMP002", 2.0),
            ("inv_mng_TSHIRT-4XL-BLK", "STORE_KA_MNG_01", "prod_vintage-washed-heavyweight-tee", "Vintage Washed Heavyweight Tee", "T-Shirts", "Black", "#18181b", "black", "4XL", "TSHIRT-4XL-BLK", 8, 10, 899, now_seed_iso, "EMP001", 1.5),
            ("inv_hub_TSHIRT-4XL-BLK", "STORE_KA_HUB_01", "prod_vintage-washed-heavyweight-tee", "Vintage Washed Heavyweight Tee", "T-Shirts", "Black", "#18181b", "black", "4XL", "TSHIRT-4XL-BLK", 45, 12, 899, now_seed_iso, "EMP001", 2.2),
        ]
        for b in benchmark_items:
            conn.execute("""
                INSERT OR IGNORE INTO inventory (
                    inventory_id, store_id, product_id, product_name, category,
                    colour, colour_hex, colour_id, size, sku,
                    available_quantity, minimum_stock_threshold, unit_price,
                    last_updated_timestamp, last_updated_by_employee_id, daily_sales_velocity, version
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1);
            """, b)

        # Seed Inventory for Bengaluru Central and Mysuru Central if table is empty
        cur = conn.execute("SELECT COUNT(*) FROM inventory;");
        count = cur.fetchone()[0]
        if count == 0:
            now_iso = datetime.now(timezone.utc).isoformat()
            
            # 20 Variants across 4 colours and 5 sizes
            variants_spec = [
                # Essential Heavyweight Crew Neck (Black)
                ("Essential Heavyweight Crew Neck", "Heavyweight Cotton", "Black", "#18181b", "black", "S", "TIQ-CRW-BLK-S", 18, 15, 899, 15),
                ("Essential Heavyweight Crew Neck", "Heavyweight Cotton", "Black", "#18181b", "black", "M", "TIQ-CRW-BLK-M", 0, 20, 899, 35),  # BLR: 0, MYS: 35
                ("Essential Heavyweight Crew Neck", "Heavyweight Cotton", "Black", "#18181b", "black", "L", "TIQ-CRW-BLK-L", 26, 15, 899, 20),
                ("Essential Heavyweight Crew Neck", "Heavyweight Cotton", "Black", "#18181b", "black", "XL", "TIQ-CRW-BLK-XL", 14, 15, 899, 12),
                ("Essential Heavyweight Crew Neck", "Heavyweight Cotton", "Black", "#18181b", "black", "XXL", "TIQ-CRW-BLK-XXL", 8, 10, 949, 18),

                # Essential Heavyweight Crew Neck (White)
                ("Essential Heavyweight Crew Neck", "Heavyweight Cotton", "White", "#ffffff", "white", "S", "TIQ-CRW-WHT-S", 32, 15, 899, 16),
                ("Essential Heavyweight Crew Neck", "Heavyweight Cotton", "White", "#ffffff", "white", "M", "TIQ-CRW-WHT-M", 24, 20, 899, 28),
                ("Essential Heavyweight Crew Neck", "Heavyweight Cotton", "White", "#ffffff", "white", "L", "TIQ-CRW-WHT-L", 4, 15, 899, 22),   # BLR: 4, MYS: 22
                ("Essential Heavyweight Crew Neck", "Heavyweight Cotton", "White", "#ffffff", "white", "XL", "TIQ-CRW-WHT-XL", 19, 15, 899, 14),
                ("Essential Heavyweight Crew Neck", "Heavyweight Cotton", "White", "#ffffff", "white", "XXL", "TIQ-CRW-WHT-XXL", 0, 10, 949, 10),

                # Supima Relaxed Fit (Navy Blue)
                ("Supima Relaxed Fit Tee", "Supima Cotton", "Navy Blue", "#1e3a8a", "navy", "S", "TIQ-SPM-NVY-S", 21, 15, 1099, 19),
                ("Supima Relaxed Fit Tee", "Supima Cotton", "Navy Blue", "#1e3a8a", "navy", "M", "TIQ-SPM-NVY-M", 38, 20, 1099, 25),
                ("Supima Relaxed Fit Tee", "Supima Cotton", "Navy Blue", "#1e3a8a", "navy", "L", "TIQ-SPM-NVY-L", 29, 15, 1099, 15),
                ("Supima Relaxed Fit Tee", "Supima Cotton", "Navy Blue", "#1e3a8a", "navy", "XL", "TIQ-SPM-NVY-XL", 12, 15, 1099, 5),   # BLR: 12, MYS: 5 (Low in MYS!)
                ("Supima Relaxed Fit Tee", "Supima Cotton", "Navy Blue", "#1e3a8a", "navy", "XXL", "TIQ-SPM-NVY-XXL", 15, 10, 1149, 11),

                # Performance Dry-Fit (Grey)
                ("Performance Dry-Fit Athletic Tee", "Activewear Dry-Fit", "Grey", "#64748b", "grey", "S", "TIQ-PRF-GRY-S", 17, 15, 799, 20),
                ("Performance Dry-Fit Athletic Tee", "Activewear Dry-Fit", "Grey", "#64748b", "grey", "M", "TIQ-PRF-GRY-M", 42, 20, 799, 30),
                ("Performance Dry-Fit Athletic Tee", "Activewear Dry-Fit", "Grey", "#64748b", "grey", "L", "TIQ-PRF-GRY-L", 27, 15, 799, 18),
                ("Performance Dry-Fit Athletic Tee", "Activewear Dry-Fit", "Grey", "#64748b", "grey", "XL", "TIQ-PRF-GRY-XL", 11, 15, 799, 14),
                ("Performance Dry-Fit Athletic Tee", "Activewear Dry-Fit", "Grey", "#64748b", "grey", "XXL", "TIQ-PRF-GRY-XXL", 35, 10, 849, 0) # BLR: 35, MYS: 0 (Out in MYS!)
            ]

            for name, cat, col, hex_c, col_id, sz, sku, blr_qty, thold, price, mys_qty in variants_spec:
                # Bengaluru inventory
                conn.execute("""
                    INSERT INTO inventory (
                        inventory_id, store_id, product_id, product_name, category,
                        colour, colour_hex, colour_id, size, sku,
                        available_quantity, minimum_stock_threshold, unit_price,
                        last_updated_timestamp, last_updated_by_employee_id, version
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1);
                """, (
                    f"inv_blr_{sku}", "STORE_KA_BLR_01", f"prod_{sku.lower()}", name, cat,
                    col, hex_c, col_id, sz, sku,
                    blr_qty, thold, price, now_iso, "EMP001"
                ))

                # Mysuru inventory
                conn.execute("""
                    INSERT INTO inventory (
                        inventory_id, store_id, product_id, product_name, category,
                        colour, colour_hex, colour_id, size, sku,
                        available_quantity, minimum_stock_threshold, unit_price,
                        last_updated_timestamp, last_updated_by_employee_id, version
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1);
                """, (
                    f"inv_mys_{sku}", "STORE_KA_MYS_01", f"prod_{sku.lower()}", name, cat,
                    col, hex_c, col_id, sz, sku,
                    mys_qty, thold, price, now_iso, "EMP002"
                ))

            # Initial transfers
            conn.execute("""
                INSERT OR IGNORE INTO stock_transfers (
                    transfer_id, source_store_id, destination_store_id,
                    product_id, product_name, colour, size, sku, quantity,
                    request_date, estimated_arrival, status,
                    approved_date, approved_by_manager_name, approved_by_manager_id,
                    received_date, received_by_employee_id, notes
                ) VALUES
                ('TRF-KA-2026-0891', 'STORE_KA_MYS_01', 'STORE_KA_BLR_01', 'prod_tiq-crw-blk-m', 'Essential Heavyweight Crew Neck', 'Black', 'M', 'TIQ-CRW-BLK-M', 25, '2026-10-09T14:00:00Z', 'Today, 4:30 PM (Via Hub Logistics Van #KA-04)', 'In Transit', '2026-10-09T14:15:00Z', 'Priya Kulkarni (Store Manager)', 'MGR001', NULL, NULL, 'Stock redistribution from Mysuru surplus to Bengaluru Central.'),
                ('TRF-KA-2026-0895', 'STORE_KA_BLR_01', 'STORE_KA_MYS_01', 'prod_tiq-spm-wht-l', 'Supima Relaxed Fit Tee', 'White', 'L', 'TIQ-SPM-WHT-L', 15, '2026-10-10T04:00:00Z', 'Today, 6:00 PM (Express Hub Courier)', 'Approved', '2026-10-10T04:30:00Z', 'Priya Kulkarni (Store Manager)', 'MGR001', NULL, NULL, 'Manager-approved inter-store redistribution request.'),
                ('TRF-KA-2026-0884', 'STORE_KA_BLR_01', 'STORE_KA_MYS_01', 'prod_tiq-spm-nvy-xl', 'Supima Relaxed Fit Tee', 'Navy Blue', 'XL', 'TIQ-SPM-NVY-XL', 10, '2026-10-09T18:30:00Z', 'Tomorrow, 11:30 AM', 'Pending Approval', NULL, NULL, NULL, NULL, NULL, 'Replenishment for Mysuru Central store.'),
                ('TRF-KA-2026-0870', 'STORE_KA_BLR_01', 'STORE_KA_MYS_01', 'prod_tiq-ath-gry-l', 'Athletic Tech Tee', 'Grey', 'L', 'TIQ-ATH-GRY-L', 12, '2026-10-08T09:00:00Z', 'Delivered', 'Received', '2026-10-08T09:30:00Z', 'Priya Kulkarni (Store Manager)', 'MGR001', '2026-10-08T17:45:00Z', 'EMP002', 'Completed seasonal rebalancing between stores.')
            """)

            # Initial history records
            conn.execute("""
                INSERT OR IGNORE INTO inventory_history (
                    history_id, store_id, product_id, product_name, colour, size, sku,
                    previous_quantity, quantity_change, new_quantity, update_type,
                    employee_id, employee_name, timestamp, reference_id, remarks
                ) VALUES
                ('LOG-8841-01', 'STORE_KA_BLR_01', 'prod_tiq-crw-wht-l', 'Essential Heavyweight Crew Neck', 'White', 'L', 'TIQ-CRW-WHT-L', 10, -6, 4, 'Sale / Stock Reduction', 'EMP001', 'Rahul Sharma', '2026-10-09T22:05:00Z', 'POS-REC-99420', 'Evening batch sale reconciliation at counter 2.'),
                ('LOG-8842-01', 'STORE_KA_MYS_01', 'prod_tiq-crw-blk-m', 'Essential Heavyweight Crew Neck', 'Black', 'M', 'TIQ-CRW-BLK-M', 45, -10, 35, 'Stock Received (Transfer)', 'EMP002', 'Priya Kumar', '2026-10-09T17:30:00Z', 'TRF-KA-2026-0701', 'Outward transfer staged for Bengaluru Central.')
            """)

        # Seed recommendations if empty
        cur_rec = conn.execute("SELECT COUNT(*) FROM recommendations;")
        rec_count = cur_rec.fetchone()[0]
        if rec_count == 0:
            rec_seed = [
                ("rec-101", "sku-ts-001", "Vintage Washed Oversized Heavyweight Tee", "4XL", "Jet Black", "Transfer", "Critical", "Heritage Mall Hub (MYS)", "STORE_KA_MYS_01", "Brigade Road Flagship (BLR)", "STORE_KA_BLR_01", 45, "+$1,980 potential revenue saved", "Brigade Road Flagship stockout anticipated within 10 operating hours (3 units left, velocity 7.2 units/day). Heritage Mall Hub holds surplus. Rebalancing balances customer demand without new procurement expense.", "pending", None, "15 mins ago", 96, "TRF-KA-2026-0884"),
                ("rec-102", "sku-ts-007", "Drop-Shoulder Boxy Pocket Tee", "5XL", "Sand Dune", "Reorder", "High", "Central Supplier / Supplier Mill", "supplier-main", "Brigade Road Flagship (BLR)", "STORE_KA_BLR_01", 60, "+$2,760 seasonal demand capture", "Network-wide availability for size 5XL in Sand Dune has dipped below 12 units. Lead time is 4 days. Supplier has stock in warehouse ready for fast shipment.", "pending", None, "42 mins ago", 91, None),
                ("rec-103", "sku-ts-009", "Boxy Fit Minimalist Henley", "XL", "Olive Drab", "Markdown", "Medium", "Coastal City Pavilion (IXE)", "STORE_KA_MNG_01", "N/A (In-Store Promotional Display)", None, 110, "$5,720 inventory liquidity release", "Inventory ageing has reached 62 days with persistent low velocity (0.9 units/day). Recommended 15% markdown will accelerate turnaround before seasonal drop-off.", "pending", None, "2 hours ago", 84, None),
                ("rec-104", "sku-ts-004", "Organic Supima Crew Neck Tee", "XXL", "Navy Ink", "Wait", "Low", "North Karnataka Hub (HBX)", "STORE_KA_HUB_01", "Coastal City Pavilion (IXE)", "STORE_KA_MNG_01", 0, "Prevents $240 unnecessary shipping fees", "Stock at Metro Centre Mall is temporarily low (6 units), but 35 units are already en route on a scheduled delivery batch arriving tomorrow. Additional transfer is not required.", "pending", None, "3 hours ago", 88, None),
            ]
            for r in rec_seed:
                conn.execute("""
                    INSERT INTO recommendations (
                        id, sku_id, product_name, size, colour, action, priority,
                        source_store, source_store_id, dest_store, dest_store_id,
                        proposed_qty, estimated_impact_revenue, reasoning, status,
                        notes, created_at, confidence_score, transfer_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, r)

    conn.close()

if __name__ == "__main__":
    init_db()
    print("ThreadIQ persistent database initialized successfully.")
