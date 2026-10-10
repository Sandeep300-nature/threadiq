# ThreadIQ — Multi-Employee Real-Time Inventory & Stock Redistribution Grid

An enterprise-grade retail inventory management platform for clothing stores across Karnataka, India, featuring multi-employee accounts, persistent database transactions, optimistic concurrency control, and real-time Server-Sent Events (SSE) synchronization.

---

## 1. Demo Employee Credentials

The platform includes two pre-configured, securely authenticated employee accounts:

| Employee Name | Employee ID | Assigned Store | Store Code | Demo Password | Role |
|---|---|---|---|---|---|
| **Rahul Sharma** | `EMP001` | **Mysuru Central** | `KA-MYS-01` | `ThreadIQ@2026` | Store Associate |
| **Priya Kumar** | `EMP002` | **Brigade Road Flagship** | `BLR-FLAG-01` | `ThreadIQ@2026` | Store Associate |

> **Security Note:** Passwords are never stored in plain text. They are hashed using **PBKDF2 with HMAC-SHA256 and unique cryptographic salts** in the SQLite database (`backend/threadiq.db`).

---

## 2. Key Architecture Upgrades

### A. Two Separate Employee Accounts & Individual Sessions
- **Dedicated Login Screen**: ThreadIQ branding, Employee ID / Email input, password visibility toggle (show/hide), and **Quick Autofill Switcher** chips for one-click testing of Rahul Sharma and Priya Kumar.
- **Session Tokens**: Generates 256-bit cryptographically secure session tokens (`Authorization: Bearer <token>`) stored in `sessionStorage` so that multiple independent browser tabs or private windows can operate simultaneously as different employees.

### B. Persistent Shared Database (SQLite / PostgreSQL Ready)
- Located at `backend/threadiq.db` with WAL mode enabled for high-concurrency transactions.
- **Entities**:
  - `stores`: `store_id`, `store_code`, `store_name`, `city`, `address`, `zone`.
  - `employees`: `employee_id`, `name`, `email`, `password_hash`, `password_salt`, `assigned_store_id`, `role`, `account_status`.
  - `inventory`: `inventory_id`, `store_id`, `product_id`, `product_name`, `colour`, `size`, `sku`, `available_quantity`, `minimum_stock_threshold`, `version` (for optimistic concurrency control).
  - `inventory_history`: `history_id`, `store_id`, `product_id`, `previous_quantity`, `quantity_change`, `new_quantity`, `update_type`, `employee_id`, `employee_name`, `timestamp`, `reference_id`, `remarks`.
  - `stock_transfers`: `transfer_id`, `source_store_id`, `destination_store_id`, `sku`, `quantity`, `status`, `request_date`, `estimated_arrival`, `notes`.

### C. Real-Time Synchronization (Server-Sent Events)
- **Endpoint**: `GET /api/realtime/events?token=<token>`
- Connected browser dashboards receive instant live event broadcasts (`inventory_update`, `transfer_update`) without manual page refreshes.
- Live Connection Indicator in Topbar:
  - **Connected** (pulsing green dot)
  - **Reconnecting** (amber dot)
  - **Offline** (red dot)

### D. Optimistic Concurrency Control (Conflict Prevention)
- Every inventory row maintains an integer `version`.
- When submitting an update, the client transmits `expectedVersion`.
- If another session modified the row in the interim, the database transaction rejects the update with **HTTP 409 Conflict** and rolls back, preventing silent data overwrites.

### E. Role-Based Store Security
- The backend strictly derives the store ID from the validated session token.
- **Store Isolation**: Employees can only view, filter, and adjust inventory for their assigned store.
- **Transfer Permissions**: Employees can only confirm receipt of shipments destined for their assigned store (cross-store intake attempts return **HTTP 403 Forbidden**).

---

## 3. How to Run Locally

### Start the Unified FastAPI + SSE Server
```powershell
cd "C:\Users\SUMEDHA G\.gemini\antigravity-ide\scratch\threadiq-employee-dashboard"
python server.py
```

Open your browser at:
```
http://localhost:3000
```

### Running the Verification Test Suite
To execute the automated 12-step test suite validating authentication, isolation, concurrency control, and transfer security:
```powershell
python test_system.py
```

---

## 4. Multi-Tab Demonstration Workflow

1. Open **Tab 1** in normal browser window:
   - Click **Rahul Sharma (EMP001)** chip -> Sign in -> Opens **Bengaluru Central**.
2. Open **Tab 2** in an incognito / private browser window:
   - Click **Priya Kumar (EMP002)** chip -> Sign in -> Opens **Mysuru Central**.
3. In **Tab 1 (Rahul)**:
   - Click **+ Update Stock** on Black Crew Neck M -> Record `Stock Received` (+25 units).
   - Commit update -> Bengaluru Central stock updates to 25 units.
4. In **Tab 2 (Priya)**:
   - Notice that Mysuru Central stock remains completely isolated.
5. In **Tab 3** (open Rahul in another tab):
   - Notice that real-time SSE immediately reflects the new stock in both of Rahul's tabs without pressing refresh!
