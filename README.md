# ThreadIQ — AI-Powered Retail Inventory Intelligence

ThreadIQ is a modern, responsive React frontend designed for clothing retailers. It surfaces real-time stock balancing telemetry, multi-store demand alignment, and algorithmic AI replenishment/transfer recommendation workflows.

---

## 🎨 Visual System & Architecture

- **Visual Style**: Dark charcoal aesthetic (`#0d0e12`, `#191b22`), muted purple navigation accent (`#1c1828`, `#8b5cf6`), grey navigation sidebar (`#14151b`), and rounded cards (`14px` / `18px`).
- **Typography**: Google Fonts (*Plus Jakarta Sans* & *JetBrains Mono*).
- **Icons**: Clean, vector iconography powered by `lucide-react`.
- **Extended Sizing Focus**: Dedicated support for high-demand extended fits: **XL, XXL, XXXL, 4XL, and 5XL**.
- **Clothing Focus**: T-shirt apparel line (Heavyweight Tees, Organic Crew, Vintage Washed, Graphic Pocket Tees, Boxy Fit Henleys).

---

## 🚀 Quick Start Instructions

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### 1. Installation
```bash
cd scratch/threadiq
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
The application will launch at: **`http://localhost:5173/`**

### 3. Production Build
```bash
npm run build
npm run preview
```

---

## 📁 Application Layout & Directory Structure

```
scratch/threadiq/
├── .env.example                     # Backend API environment variables
├── package.json
├── vite.config.js
├── index.html
├── src/
│   ├── main.jsx                     # Application entry point
│   ├── App.jsx                      # Client router & navigation setup
│   ├── context/
│   │   └── AppContext.jsx           # Global state (Search, Notifications, Approvals, Settings)
│   ├── services/
│   │   └── api.js                   # Centralized API service with offline fallback
│   ├── data/
│   │   ├── mockInventory.js         # Extended size T-shirt inventory dataset
│   │   ├── mockStores.js            # Store network hubs (NY Flagship, LA Westside, etc.)
│   │   ├── mockRecommendations.js   # AI decision engine action queue (Transfer, Reorder, Markdown, Wait)
│   │   └── mockNotifications.js     # Low-stock & approval alerts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx        # Persistent application shell
│   │   │   ├── Sidebar.jsx          # Left sidebar with active route highlights & badges
│   │   │   ├── Topbar.jsx           # Top navigation with search, bell, and avatar
│   │   │   ├── SearchBar.jsx        # Global inventory search
│   │   │   └── NotificationPanel.jsx# Interactive notification dropdown
│   │   ├── common/
│   │   │   ├── StatusBadge.jsx      # Low stock, Balanced, Excess, Pending, Approved badges
│   │   │   ├── StatCard.jsx         # KPI summary cards with trends
│   │   │   ├── Toggle.jsx           # Accessible switch with keyboard navigation
│   │   │   ├── Modal.jsx            # Accessible dialog with ESC & backdrop clicks
│   │   │   ├── Toast.jsx            # User feedback notifications
│   │   │   ├── EmptyState.jsx       # Fallback visual for 0-result states
│   │   │   └── LoadingState.jsx     # Telemetry spinner
│   │   ├── inventory/
│   │   │   ├── InventoryTable.jsx   # Structured tabular view with stock meters
│   │   │   ├── InventoryFilters.jsx # Store, Size, Category, and Status filters
│   │   │   └── ProductImage.jsx     # Dynamic vector silhouette rendered per color
│   │   ├── stores/
│   │   │   ├── StoreCard.jsx        # Store metrics, shortages, excess sizing pills
│   │   │   └── StoreDetailModal.jsx # Deep-dive store stock inspector
│   │   ├── approvals/
│   │   │   ├── RecommendationCard.jsx # AI proposed action cards with confidence scores
│   │   │   └── ApprovalDialog.jsx   # Confirmation modal for Approve/Reject decisions
│   │   └── settings/
│   │       └── AccountForm.jsx      # Fictional planner profile form
│   ├── pages/
│   │   ├── Overview.jsx             # KPI dashboard, imbalance spotlight, activity feed
│   │   ├── Inventory.jsx            # Inventory catalog with multi-filter controls
│   │   ├── StoreNetwork.jsx         # Multi-store balancing map & 4XL transfer highlight
│   │   ├── Approvals.jsx            # Action queue with confirmation dialogs
│   │   ├── Settings.jsx             # Alert toggles & threshold parameter tuning
│   │   └── AccountSettings.jsx      # Fictional user profile view
│   └── styles/
│       └── index.css                # Figma-tailored design system tokens
```

---

## 🔌 Backend Integration Specification

The frontend connects via `src/services/api.js`. If the backend is unreachable or offline, the application seamlessly operates in prototype mock mode without UI degradation.

| Endpoint | Method | Parameters / Body | Description |
|---|---|---|---|
| `/api/v1/inventory` | `GET` | `?store=&size=&category=&status=&search=` | Returns filtered clothing items |
| `/api/v1/stores` | `GET` | — | Returns list of store hubs with shortage/excess data |
| `/api/v1/recommendations` | `GET` | — | Returns queue of AI proposals |
| `/api/v1/recommendations/generate` | `POST`| — | Triggers batch calculation |
| `/api/v1/recommendations/:id/approve` | `POST`| `{ notes?: string, timestamp: string }` | Finalizes approval decision |
| `/api/v1/recommendations/:id/reject` | `POST` | `{ reason?: string, timestamp: string }` | Finalizes rejection decision |
| `/api/v1/settings` | `GET` | — | Returns alert configuration & thresholds |
| `/api/v1/settings` | `PUT` | `{ lowStockThreshold: number, ... }` | Persists updated settings |
| `/api/v1/notifications` | `GET` | — | Returns alert notifications |

---

---

## 🤖 Groq AI Stock Intelligence Integration

ThreadIQ features a server-side Groq AI copilot embedded directly into the **Manager Dashboard (Overview)**:

- **Current Low-Stock Identification**: Evaluates items with available stock below configured minimum thresholds (`quantityAvailable < minimumStockThreshold`).
- **Predicted Stockout Estimation**: Deterministically estimates duration (`daysUntilStockout = quantityAvailable / dailySalesVelocity`) and flags items projected to deplete within the configurable prediction horizon (default 3 days).
- **Groq AI Narrative Interpretations**: Pre-calculated arithmetic and risk classifications are sent to Groq Cloud (models: `openai/gpt-oss-120b`, `qwen/qwen3.8-27b`) to generate operational assessments and manager rebalance recommendations.
- **Workflow Integrity Guarantee**: Groq acts strictly as a decision-support advisory system. It **never** automatically approves transfers, alters inventory records, or executes dispatches.

### 🔑 Configuring Your Groq API Key Locally

1. Create a `.env` file in the project root:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```
2. **Security Architecture**:
   - The key is **strictly server-side** (never prefixed with `VITE_` and never bundled into client JavaScript).
   - `.env` and `.env.*` are excluded by `.gitignore`.
   - The Vite dev server proxies requests via `POST /api/groq/stock-intelligence` and `GET /api/groq/status`.
   - If `GROQ_API_KEY` is omitted or invalid, the manager dashboard's numerical stock analysis remains **100% operational** with an informative banner indicating that AI narrative interpretations are disabled.

---

## 📦 Employee Dashboard Integration Foundation (`employee-dashboard/`)

The full Employee Dashboard UI is in active development. ThreadIQ provides a dedicated integration module in `employee-dashboard/`:

```
employee-dashboard/
├── README.md                           # Detailed contract specifications & backend guide
├── data/
│   └── sample-inventory.json           # Demonstration stock records with diverse test cases
└── integration/
    ├── inventoryDataProvider.js        # Abstract data provider interface contract
    ├── inventorySchema.js              # Schema validator, normalizer & staleness checker
    └── mockInventoryProvider.js        # Stateful test provider with simulation hooks
```

### Future Backend Connection
When the real employee dashboard is ready, simply implement `RemoteHttpInventoryProvider` extending `InventoryDataProvider`. Zero changes are needed to the Manager Dashboard UI or stock analysis service.

---

## 🧪 Testing Stock Intelligence (Deterministic Scenarios)

In the Manager Dashboard, expand the **Employee Feed Simulator** to execute 1-click deterministic tests:

1. **TEST A: Low Stock**
   - Store: `Brigade Road Flagship` | SKU: `T-shirt (4XL)` | Available: `12` | Minimum Threshold: `15`
   - *Expected*: Detected as `Current Low Stock` / `Critical Depletion`.
2. **TEST B: Predicted Stockout**
   - Store: `Brigade Road Flagship` | SKU: `T-shirt (4XL)` | Available: `24` | Velocity: `12 units/day` | Minimum Threshold: `10` | Horizon: `3 days`
   - *Expected*: Current stock is above threshold, but 2.0-day duration is flagged as a `Predicted Stockout` within the 3-day horizon.
3. **TEST C: Healthy Stock**
   - Store: `Mysuru Central` | SKU: `T-shirt (4XL)` | Available: `100` | Minimum Threshold: `20` | Velocity: `2 units/day`
   - *Expected*: Evaluated as `Healthy` / `Surplus Donor` (50 days duration, no risk).

