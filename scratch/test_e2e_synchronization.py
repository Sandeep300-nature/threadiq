import urllib.request
import json
import sqlite3
import os
import sys

BASE_URL = "http://localhost:3000/api"
V1_URL = "http://localhost:3000/api/v1"
DB_PATH = os.path.abspath("threadiq-employee-dashboard/backend/threadiq.db")

def api_call(url, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(error_body)
        except:
            return e.code, {"detail": error_body}

def run_e2e_test():
    print("=" * 70)
    print("THREADIQ END-TO-END SYNCHRONIZATION TEST SUITE")
    print("=" * 70)

    # 0. Check SQLite connection
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    print(f"[STEP 0] Connected to authoritative SQLite database at: {DB_PATH}")

    # Check baseline inventory for TIQ-CRW-BLK-L
    cur = conn.execute("SELECT available_quantity FROM inventory WHERE store_id = 'STORE_KA_BLR_01' AND sku = 'TIQ-CRW-BLK-L';")
    blr_initial = cur.fetchone()["available_quantity"]

    cur = conn.execute("SELECT available_quantity FROM inventory WHERE store_id = 'STORE_KA_MYS_01' AND sku = 'TIQ-CRW-BLK-L';")
    mys_initial = cur.fetchone()["available_quantity"]
    conn.close()

    print(f"  Baseline Bengaluru Central (Source) Stock: {blr_initial}")
    print(f"  Baseline Mysuru Central (Dest) Stock:    {mys_initial}")

    # Login Rahul (EMP001) & Priya Kumar (EMP002) & Manager (MGR001)
    _, rahul = api_call(f"{BASE_URL}/auth/login", "POST", {"username": "EMP001", "password": "ThreadIQ@2026"})
    rahul_token = rahul["token"]

    _, priya = api_call(f"{BASE_URL}/auth/login", "POST", {"username": "EMP002", "password": "ThreadIQ@2026"})
    priya_token = priya["token"]

    _, mgr = api_call(f"{BASE_URL}/auth/login", "POST", {"username": "MGR001", "password": "ThreadIQ@2026"})
    mgr_token = mgr["token"]

    # 1. Create a transfer request
    print("\n[STEP 1] Creating inter-store transfer request: BLR -> MYS, 10 units of TIQ-CRW-BLK-L...")
    transfer_payload = {
        "sourceStoreId": "STORE_KA_BLR_01",
        "destinationStoreId": "STORE_KA_MYS_01",
        "sku": "TIQ-CRW-BLK-L",
        "quantity": 10,
        "deliveryMode": "normal",
        "notes": "E2E Automated Sync Verification Transfer"
    }
    status, create_res = api_call(f"{BASE_URL}/transfers/request", "POST", transfer_payload, token=rahul_token)
    assert status == 200, f"Transfer creation failed: {create_res}"
    transfer_id = create_res["transferId"]
    assert create_res["status"] == "Pending Approval", f"Expected Pending Approval, got {create_res['status']}"
    print(f"  --> Transfer created with ID: {transfer_id}, status: {create_res['status']}")

    # 2. Verify it appears as pending on both dashboards
    print("\n[STEP 2] Verifying pending status on both Employee and Manager dashboards...")
    # Employee dashboard check
    status, emp_transfers = api_call(f"{BASE_URL}/stores/me/transfers", token=rahul_token)
    assert status == 200
    emp_t = next((t for t in emp_transfers["transfers"] if t["id"] == transfer_id or t.get("transferId") == transfer_id), None)
    assert emp_t is not None, f"Transfer {transfer_id} not visible in Employee Dashboard!"
    assert emp_t["status"] in ("Pending Approval", "Pending"), f"Employee status mismatch: {emp_t['status']}"
    print(f"  --> [PASS] Employee Dashboard reflects request as: {emp_t['status']}")

    # Manager dashboard transfers check
    status, mgr_transfers = api_call(f"{V1_URL}/transfers")
    assert status == 200
    mgr_t = next((t for t in mgr_transfers if t["transferId"] == transfer_id), None)
    assert mgr_t is not None, f"Transfer {transfer_id} not visible in Manager Dashboard transfers!"
    assert mgr_t["deliveryStatus"] == "pending_approval", f"Manager transfer deliveryStatus mismatch: {mgr_t['deliveryStatus']}"
    print(f"  --> [PASS] Manager Dashboard reflects transfer as: {mgr_t['deliveryStatus']}")

    # Manager recommendations check
    status, recs = api_call(f"{V1_URL}/recommendations")
    assert status == 200
    rec_match = next((r for r in recs if r.get("transferId") == transfer_id or r.get("id") == f"rec-{transfer_id}"), None)
    assert rec_match is not None, f"Recommendation for {transfer_id} not found in manager queue!"
    assert rec_match["status"] == "pending", f"Manager recommendation status mismatch: {rec_match['status']}"
    print(f"  --> [PASS] Manager Approvals queue reflects proposal as: {rec_match['status']}")

    # 3. Approve it from manager dashboard
    print(f"\n[STEP 3] Approving transfer {transfer_id} from Manager Dashboard API...")
    status, approve_res = api_call(f"{V1_URL}/transfers/{transfer_id}/approve", "POST", {"notes": "E2E Manager Sign-off"})
    assert status == 200, f"Manager approval failed: {approve_res}"
    assert approve_res["status"] == "Approved"
    print(f"  --> [PASS] Manager approval committed successfully: {approve_res['status']}")

    # 4. Verify same request ID shows APPROVED on both dashboards
    print("\n[STEP 4] Verifying synchronized APPROVED state across both dashboards...")
    status, emp_after_appr = api_call(f"{BASE_URL}/stores/me/transfers", token=rahul_token)
    emp_t_appr = next(t for t in emp_after_appr["transfers"] if t["id"] == transfer_id or t.get("transferId") == transfer_id)
    assert emp_t_appr["status"] == "Approved", f"Employee view expected Approved, got: {emp_t_appr['status']}"
    print(f"  --> [PASS] Employee Dashboard displays status: {emp_t_appr['status']}")

    status, mgr_after_appr = api_call(f"{V1_URL}/transfers")
    mgr_t_appr = next(t for t in mgr_after_appr if t["transferId"] == transfer_id)
    assert mgr_t_appr["status"] == "Approved"
    assert mgr_t_appr["deliveryStatus"] == "approved"
    print(f"  --> [PASS] Manager Dashboard displays status: {mgr_t_appr['status']} / {mgr_t_appr['deliveryStatus']}")

    # 5 & 6. Reload / Direct SQLite validation (persistence check)
    print("\n[STEP 5 & 6] Reload / Direct SQLite query to verify persistence...")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.execute("SELECT transfer_id, status, approved_date, approved_by_manager_name FROM stock_transfers WHERE transfer_id = ?;", (transfer_id,))
    db_t = cur.fetchone()
    assert db_t is not None
    assert db_t["status"] == "Approved"
    assert db_t["approved_date"] is not None
    print(f"  --> [PASS] SQLite Authoritative Record: transfer_id={db_t['transfer_id']}, status={db_t['status']}, approved_date={db_t['approved_date']}")

    cur_rec = conn.execute("SELECT status FROM recommendations WHERE transfer_id = ?;", (transfer_id,))
    db_rec = cur_rec.fetchone()
    assert db_rec is not None and db_rec["status"] == "approved"
    print(f"  --> [PASS] SQLite Authoritative Recommendation: status={db_rec['status']}")
    conn.close()

    # 7 & 8. Dispatch transfer and verify inventory changes occur AT DISPATCH STAGE
    print("\n[STEP 7 & 8] Dispatching transfer via Manager Radar dispatch action...")
    status, disp_res = api_call(f"{V1_URL}/transfers/{transfer_id}", "PATCH", {"deliveryStatus": "dispatched"})
    assert status == 200, f"Dispatch action failed: {disp_res}"
    assert disp_res["status"] == "In Transit"
    print(f"  --> [PASS] Transfer advanced to status: {disp_res['status']}")

    # Verify inventory changes: Source store deducted, Dest store UNCHANGED
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.execute("SELECT available_quantity FROM inventory WHERE store_id = 'STORE_KA_BLR_01' AND sku = 'TIQ-CRW-BLK-L';")
    blr_dispatched = cur.fetchone()["available_quantity"]

    cur = conn.execute("SELECT available_quantity FROM inventory WHERE store_id = 'STORE_KA_MYS_01' AND sku = 'TIQ-CRW-BLK-L';")
    mys_dispatched = cur.fetchone()["available_quantity"]
    conn.close()

    assert blr_dispatched == blr_initial - 10, f"Source stock was not decremented! Expected {blr_initial - 10}, got {blr_dispatched}"
    assert mys_dispatched == mys_initial, f"Dest stock should NOT change at dispatch! Expected {mys_initial}, got {mys_dispatched}"
    print(f"  --> [PASS] Source store stock deducted at dispatch: {blr_initial} -> {blr_dispatched} (-10)")
    print(f"  --> [PASS] Destination store stock NOT altered yet (goods physically in transit): {mys_dispatched}")

    # 9. Complete the transfer and verify destination stock changes
    print("\n[STEP 9] Receiving transfer at destination store (Mysuru Central intake)...")
    status, rec_res = api_call(f"{BASE_URL}/transfers/{transfer_id}/receive", "POST", {}, token=priya_token)
    assert status == 200, f"Receive failed: {rec_res}"
    assert rec_res["status"] == "Received"
    print(f"  --> [PASS] Transfer status updated to: {rec_res['status']}")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.execute("SELECT available_quantity FROM inventory WHERE store_id = 'STORE_KA_BLR_01' AND sku = 'TIQ-CRW-BLK-L';")
    blr_final = cur.fetchone()["available_quantity"]

    cur = conn.execute("SELECT available_quantity FROM inventory WHERE store_id = 'STORE_KA_MYS_01' AND sku = 'TIQ-CRW-BLK-L';")
    mys_final = cur.fetchone()["available_quantity"]

    cur_hist = conn.execute("SELECT update_type, quantity_change, reference_id FROM inventory_history WHERE reference_id = ? ORDER BY timestamp DESC;", (transfer_id,))
    hist_entries = cur_hist.fetchall()
    conn.close()

    assert blr_final == blr_initial - 10
    assert mys_final == mys_initial + 10, f"Destination stock did not increment! Expected {mys_initial + 10}, got {mys_final}"
    assert len(hist_entries) >= 2, f"Expected at least 2 audit entries (dispatch + receive), got {len(hist_entries)}"

    print(f"  --> [PASS] Final Bengaluru Stock: {blr_final} (correctly -10 net)")
    print(f"  --> [PASS] Final Mysuru Stock:    {mys_final} (correctly +10 net)")
    print(f"  --> [PASS] Audit Trail Verified:  {len(hist_entries)} persistent log entries recorded for {transfer_id}")

    # 10. Confirm duplicate dispatch and duplicate receipt cannot apply changes twice
    print("\n[STEP 10] Testing duplicate events / repeated actions (idempotency guard)...")
    status, dup_disp = api_call(f"{V1_URL}/transfers/{transfer_id}", "PATCH", {"deliveryStatus": "dispatched"})
    assert status == 200 and "already in state" in dup_disp.get("message", "")

    status, dup_rec = api_call(f"{BASE_URL}/transfers/{transfer_id}/receive", "POST", {}, token=priya_token)
    assert status == 400, f"Expected 400 Bad Request for duplicate receipt, got {status}"

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.execute("SELECT available_quantity FROM inventory WHERE store_id = 'STORE_KA_BLR_01' AND sku = 'TIQ-CRW-BLK-L';")
    blr_dup_check = cur.fetchone()["available_quantity"]
    cur = conn.execute("SELECT available_quantity FROM inventory WHERE store_id = 'STORE_KA_MYS_01' AND sku = 'TIQ-CRW-BLK-L';")
    mys_dup_check = cur.fetchone()["available_quantity"]
    conn.close()

    assert blr_dup_check == blr_final, "Duplicate action illegally deducted source inventory again!"
    assert mys_dup_check == mys_final, "Duplicate action illegally added destination inventory again!"
    print("  --> [PASS] Idempotency confirmed: No double deduction or double addition occurred.")

    # 11. Test rejected request workflow
    print("\n[STEP 11] Testing Rejected Request flow...")
    status, rej_create = api_call(f"{BASE_URL}/transfers/request", "POST", {
        "sourceStoreId": "STORE_KA_MYS_01",
        "destinationStoreId": "STORE_KA_BLR_01",
        "sku": "TIQ-CRW-WHT-S",
        "quantity": 5,
        "notes": "Transfer request to be rejected"
    }, token=priya_token)
    rej_id = rej_create["transferId"]

    status, rej_res = api_call(f"{V1_URL}/transfers/{rej_id}/reject", "POST", {"reason": "Insufficient stock at source"})
    assert status == 200, f"Rejection failed: {rej_res}"
    assert rej_res["status"] == "Rejected"

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.execute("SELECT status FROM stock_transfers WHERE transfer_id = ?;", (rej_id,))
    assert cur.fetchone()["status"] == "Rejected"
    cur_r = conn.execute("SELECT status FROM recommendations WHERE transfer_id = ?;", (rej_id,))
    assert cur_r.fetchone()["status"] == "rejected"
    conn.close()

    status, emp_rej_view = api_call(f"{BASE_URL}/stores/me/transfers", token=priya_token)
    emp_rej = next(t for t in emp_rej_view["transfers"] if t["id"] == rej_id or t.get("transferId") == rej_id)
    assert emp_rej["status"] == "Rejected"

    print(f"  --> [PASS] Rejection confirmed: {rej_id} remains Rejected in SQLite and both dashboards.")

    print("\n" + "=" * 70)
    print("ALL 11 END-TO-END SYNCHRONIZATION TESTS PASSED PERFECTLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_e2e_test()
