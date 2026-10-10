# ThreadIQ — Employee Dashboard Integration Contract & Foundation

This folder provides the integration layer, data contracts, and simulation hooks connecting the **ThreadIQ Manager Dashboard** to the upcoming **Employee Dashboard**.

> **IMPORTANT ARCHITECTURE NOTE:**
> This directory is an **integration foundation**, NOT a complete employee dashboard application.
> The employee dashboard UI is under active development. This module decouples the Manager Dashboard and AI Stock Intelligence from the Employee UI so that the Manager Dashboard can:
> 1. Consume standardized inventory telemetry today using controlled simulation.
> 2. Validate Groq AI stockout predictions and low-stock risk detection.
> 3. Seamlessly connect to the real Employee Dashboard backend tomorrow **without rewriting any Manager UI or stock analysis algorithms**.

---

## 1. Directory Structure

```
employee-dashboard/
├── README.md                           # This integration documentation
├── data/
│   └── sample-inventory.json           # Demonstration dataset with diverse stock scenarios
└── integration/
    ├── inventoryDataProvider.js        # Abstract provider interface contract
    ├── inventorySchema.js              # Schema validator, normalizer, and staleness checker
    └── mockInventoryProvider.js        # Stateful test provider with simulation hooks
```

---

## 2. Inventory Data Contract Specification

Every inventory record submitted by the employee dashboard or ingested by ThreadIQ must conform to this JSON schema:

```json
{
  "storeId": "BLR-FLAG-01",
  "storeName": "Brigade Road Flagship",
  "productId": "TSHIRT-4XL-BLK",
  "productName": "Vintage Washed Heavyweight Tee",
  "size": "4XL",
  "quantityAvailable": 12,
  "minimumStockThreshold": 15,
  "dailySalesVelocity": 8.0,
  "lastUpdated": "2026-10-10T03:45:00.000Z"
}
```

### Field Definitions & Requirements

| Field | Type | Required for Low Stock? | Required for Stockout Forecast? | Description |
| :--- | :--- | :---: | :---: | :--- |
| `storeId` | String | **Yes** | **Yes** | Unique identifier of the retail hub (e.g., `BLR-FLAG-01`). |
| `storeName` | String | No (Fallback to ID) | No (Fallback to ID) | Human-readable name of retail location. |
| `productId` | String | **Yes** | **Yes** | Apparel SKU or product identifier. |
| `productName` | String | No (Fallback) | No (Fallback) | Garment style name. |
| `size` | String | **Yes** | **Yes** | Garment size (e.g., `4XL`, `3XL`, `2XL`, `XL`, `L`). |
| `quantityAvailable` | Number | **Yes** | **Yes** | Physical units on rack/backroom available for sale. |
| `minimumStockThreshold` | Number | **Yes** | No | Safety buffer limit. If missing, low-stock cannot be evaluated. |
| `dailySalesVelocity` | Number | No | **Yes** | Average daily units sold. If missing or 0, forecast is marked limited. |
| `lastUpdated` | ISO-8601 String | Recommended | Recommended | UTC timestamp of last physical cycle count or barcode scan. |

---

## 3. Handling Edge Cases and Incomplete Data

In practical retail operations, floor associates do not always have historical velocity data:

1. **Missing `minimumStockThreshold`**:
   - The system does not guess or invent arbitrary buffers.
   - The item is marked as `Threshold undefined`. Low-stock alert is withheld.
2. **Missing or Null `dailySalesVelocity`**:
   - The system calculates on-hand stock status deterministically.
   - The stockout forecast is flagged as `Forecast Limited: Velocity Unavailable` rather than inventing an artificial projection.
3. **Zero `dailySalesVelocity` (`0.0`)**:
   - Avoids division by zero.
   - Classified as `Quiescent Stock (0 sales/day)`.
4. **Negative `quantityAvailable`**:
   - Flagged as `Count Anomaly / Data Corruption`.
5. **Data Staleness (> 24 hours)**:
   - Evaluated by `inventorySchema.js`.
   - Items where `ageHours > 24` are flagged with a staleness badge.

---

## 4. How the Future Employee Dashboard Will Connect

> **SECURITY & DATA ISOLATION PRINCIPLE:**
> The frontend manager dashboard **cannot and will not** read directly from another browser tab's private memory or local storage.
> All production communication must route through the central backend or synchronized datastore.

### Proposed Backend Integration Endpoint

When the employee dashboard backend is ready, it should expose:

```http
POST /api/v1/inventory/telemetry
Content-Type: application/json

{
  "storeId": "BLR-FLAG-01",
  "productId": "TSHIRT-4XL-BLK",
  "size": "4XL",
  "quantityAvailable": 12,
  "lastUpdated": "2026-10-10T04:00:00Z"
}
```

### Swapping the Data Provider in ThreadIQ

To transition ThreadIQ from Mock to Live mode:

1. Create `employee-dashboard/integration/remoteHttpInventoryProvider.js` extending `InventoryDataProvider`.
2. Implement `fetchInventory()` to call `GET /api/v1/inventory`.
3. In `src/services/stockAnalysisService.js`, point the data source to the remote provider.
4. **Zero changes are required to the Manager Dashboard UI, KPI cards, or Groq AI analysis pipeline.**

---

## 5. Built-in Deterministic Test Scenarios

The integration includes 3 pre-configured scenarios runnable today:

- **TEST A: Low Stock**
  - Store: `Brigade Road Flagship` | SKU: `T-shirt (4XL)` | Available: `12` | Threshold: `15`
  - *Expected*: Current low-stock is flagged (`12 < 15`).
- **TEST B: Predicted Stockout**
  - Store: `Brigade Road Flagship` | SKU: `T-shirt (4XL)` | Available: `24` | Velocity: `12/day` | Threshold: `10` | Horizon: `3 days`
  - *Expected*: Stock duration = `2.0 days`. Flagged under 3-day horizon even though available > threshold.
- **TEST C: Healthy Stock**
  - Store: `Mysuru Central` | SKU: `T-shirt (4XL)` | Available: `100` | Threshold: `20` | Velocity: `2/day`
  - *Expected*: Duration = `50 days`. Evaluated as Healthy.
