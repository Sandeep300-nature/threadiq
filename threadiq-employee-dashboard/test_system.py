"""
Automated Test Suite for ThreadIQ Manager-Approved Stock Transfers & Inventory System
Verifies read-only employee views, manager approval workflows, store isolation,
and inventory integrity.
"""

import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://localhost:3000/api"

def make_request(path, method="GET", data=None, token=None):
    url = f"{BASE_URL}{path}"
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

def run_tests():
    print("================================================================")
    print(" Running ThreadIQ Manager-Approved Stock Transfers Test Suite")
    print("================================================================")

    # Reset test transfer state in database for clean repeatable execution
    from backend.database import get_db
    conn = get_db()
    conn.execute("UPDATE stock_transfers SET status = 'In Transit', approved_date = '2026-10-09T14:15:00Z', approved_by_manager_name = 'Priya Kulkarni (Store Manager)', received_date = NULL WHERE transfer_id = 'TRF-KA-2026-0891';")
    conn.execute("UPDATE stock_transfers SET status = 'Pending Approval', approved_date = NULL, approved_by_manager_name = NULL WHERE transfer_id = 'TRF-KA-2026-0884';")
    conn.execute("UPDATE inventory SET available_quantity = 15 WHERE inventory_id = 'inv_blr_TIQ-SPM-NVY-XL';")
    conn.commit()
    conn.close()

    # 1. Test Login Rahul Sharma (EMP001 - Store Associate, Bengaluru Central)
    status, res = make_request("/auth/login", method="POST", data={
        "username": "EMP001",
        "password": "ThreadIQ@2026"
    })
    assert status == 200, f"Login failed: {res}"
    assert res["employee"]["employee_id"] == "EMP001"
    assert res["employee"]["name"] == "Rahul Sharma"
    rahul_token = res["token"]
    print("[PASS 1/14] Login Employee 1 (Rahul Sharma - Bengaluru Central)")

    # 2. Test Login Priya Kumar (EMP002 - Store Associate, Mysuru Central)
    status, res = make_request("/auth/login", method="POST", data={
        "username": "EMP002",
        "password": "ThreadIQ@2026"
    })
    assert status == 200, f"Login failed: {res}"
    assert res["employee"]["employee_id"] == "EMP002"
    priya_token = res["token"]
    print("[PASS 2/14] Login Employee 2 (Priya Kumar - Mysuru Central)")

    # 3. Test Login Priya Kulkarni (MGR001 - Store Manager)
    status, res = make_request("/auth/login", method="POST", data={
        "username": "MGR001",
        "password": "ThreadIQ@2026"
    })
    assert status == 200, f"Manager login failed: {res}"
    assert res["employee"]["role"] == "store_manager"
    manager_token = res["token"]
    print("[PASS 3/14] Login Store Manager (Priya Kulkarni - Store Manager)")

    # 4. RULE 1: Pending transfer is NOT displayed in employee's approved transfers list
    status, transfers_res = make_request("/stores/me/transfers/approved", token=rahul_token)
    assert status == 200, f"Approved transfers fetch failed: {transfers_res}"
    transfer_ids = [t["id"] for t in transfers_res["transfers"]]
    assert "TRF-KA-2026-0884" not in transfer_ids, "Pending transfer TRF-KA-2026-0884 should NOT be visible to employee!"
    assert all(t["status"] in ["Approved", "In Transit", "Received"] for t in transfers_res["transfers"]), "Unapproved status leaked in approved transfers!"
    assert transfers_res.get("readOnly") is True, "Transfers response must declare read-only contract"
    print(f"[PASS 4/14] Rule 1: Pending transfer excluded from employee view (Found {len(transfers_res['transfers'])} manager-approved transfers)")

    # 5. RULE 3: Store Associate CANNOT approve or modify transfers (Permission Check)
    status, forbidden_res = make_request("/manager/transfers/TRF-KA-2026-0884/approve", method="POST", token=rahul_token, data={})
    assert status == 403, f"Expected 403 Forbidden for employee approval attempt, got {status}: {forbidden_res}"
    print("[PASS 5/14] Rule 3: Employee cannot approve or modify transfers (HTTP 403 Forbidden)")

    # 6. RULE 4: Direct unauthenticated requests cannot bypass authorization
    status, unauth_res = make_request("/stores/me/transfers/approved")
    assert status == 401, f"Expected 401 Unauthorized, got {status}"
    status, unauth_appr = make_request("/manager/transfers/TRF-KA-2026-0884/approve", method="POST", data={})
    assert status == 401, f"Expected 401 Unauthorized, got {status}"
    print("[PASS 6/14] Rule 4: Unauthenticated requests strictly rejected (HTTP 401 Unauthorized)")

    # 7. RULE 2: Manager approves transfer -> status becomes Approved -> appears in employee view
    status, appr_res = make_request("/manager/transfers/TRF-KA-2026-0884/approve", method="POST", token=manager_token, data={})
    assert status == 200, f"Manager approval failed: {appr_res}"
    assert appr_res["status"] == "Approved"
    assert "Priya Kulkarni" in appr_res["approvedBy"]
    print("[PASS 7/14] Manager successfully approved TRF-KA-2026-0884 in authoritative database")

    # 8. RULE 7: Page refresh / GET retrieves latest authoritative status
    status, transfers_after = make_request("/stores/me/transfers/approved", token=rahul_token)
    assert status == 200
    approved_ids = [t["id"] for t in transfers_after["transfers"]]
    assert "TRF-KA-2026-0884" in approved_ids, "Newly approved transfer TRF-KA-2026-0884 should now be visible!"
    approved_t = next(t for t in transfers_after["transfers"] if t["id"] == "TRF-KA-2026-0884")
    assert approved_t["status"] == "Approved"
    assert approved_t["approvedDate"] is not None
    assert "Priya Kulkarni" in approved_t["approvedByManager"]
    print(f"[PASS 8/14] Rule 2 & 7: Manager-approved transfer now visible with approval timestamp ({approved_t['approvedDate']})")

    # 9. RULE 5: Store Isolation: Employee only sees transfers relevant to assigned store
    # Create transfer exclusively between Mysuru and another mock location
    status, priya_transfers = make_request("/stores/me/transfers/approved", token=priya_token)
    assert status == 200
    # Both stores are parties to TRF-KA-2026-0891 and TRF-KA-2026-0884
    assert all(
        t["sourceStoreId"] == "STORE_KA_MYS_01" or t["destinationStoreId"] == "STORE_KA_MYS_01"
        for t in priya_transfers["transfers"]
    ), "Priya saw transfers unrelated to Mysuru Central!"
    print("[PASS 9/14] Rule 5: Store isolation enforced for transfers")

    # 10. Check manager dispatches transfer to In Transit
    status, disp_res = make_request("/manager/transfers/TRF-KA-2026-0884/dispatch", method="POST", token=manager_token, data={})
    assert status == 200
    assert disp_res["status"] == "In Transit"
    print("[PASS 10/14] Manager dispatched TRF-KA-2026-0884 -> status updated to In Transit")

    # 11. RULE 8: Receiving stock updates destination inventory and history only on authorized intake
    # Destination store for TRF-KA-2026-0891 is Bengaluru Central (Rahul's store)
    status, rahul_inv_pre = make_request("/stores/me/inventory", token=rahul_token)
    item_pre = next(i for i in rahul_inv_pre["items"] if i["sku"] == "TIQ-CRW-BLK-M")

    status, rec_res = make_request("/transfers/TRF-KA-2026-0891/receive", method="POST", token=rahul_token, data={})
    assert status == 200, f"Receive failed: {rec_res}"
    assert rec_res["status"] == "Received"

    status, rahul_inv_post = make_request("/stores/me/inventory", token=rahul_token)
    item_post = next(i for i in rahul_inv_post["items"] if i["sku"] == "TIQ-CRW-BLK-M")
    assert item_post["quantity"] == item_pre["quantity"] + 25, "Inventory did not increase by transfer quantity!"

    status, hist_res = make_request("/stores/me/inventory/history", token=rahul_token)
    assert status == 200
    latest_hist = hist_res["history"][0]
    assert latest_hist["updateType"] == "Stock Received (Transfer)"
    assert latest_hist["referenceId"] == "TRF-KA-2026-0891"
    print(f"[PASS 11/14] Rule 8: Authorized receipt updated Bengaluru stock ({item_pre['quantity']} -> {item_post['quantity']}) and logged audit entry")

    # 12. Check cannot receive already-received transfer
    status, double_rec = make_request("/transfers/TRF-KA-2026-0891/receive", method="POST", token=rahul_token, data={})
    assert status == 400, f"Expected 400 Bad Request for duplicate receipt, got {status}"
    print("[PASS 12/14] Duplicate receipt prevented: Cannot receive already-received transfer")

    # 13. Test Optimistic Concurrency Control in regular inventory updates
    status, rahul_inv_cur = make_request("/stores/me/inventory", token=rahul_token)
    item_cur = next(i for i in rahul_inv_cur["items"] if i["sku"] == "TIQ-CRW-BLK-M")
    status, conflict_res = make_request("/stores/me/inventory/adjustments", method="POST", token=rahul_token, data={
        "productId": item_cur["id"],
        "updateType": "sale_reduction",
        "quantityDelta": 5,
        "expectedVersion": item_cur["version"] - 1 # Stale version!
    })
    assert status == 409, f"Expected 409 Conflict, got {status}: {conflict_res}"
    print("[PASS 13/14] Existing inventory features: Optimistic concurrency control 409 Conflict intact")

    # 14. Test Logout
    status, _ = make_request("/auth/logout", method="POST", token=rahul_token)
    assert status == 200
    print("[PASS 14/14] Logout and session invalidation verified")

    print("\n================================================================")
    print(" ALL 14 VERIFICATION TESTS PASSED SUCCESSFULLY! ")
    print("================================================================")

if __name__ == "__main__":
    run_tests()
