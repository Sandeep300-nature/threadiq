import os

MAIN_PY = os.path.abspath('threadiq-employee-dashboard/backend/main.py')

with open(MAIN_PY, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = '@app.post("/api/manager/transfers/{transfer_id}/approve")'
end_marker = '# ---------------------------------------------------------------------------\n# AI Recommendations Endpoints'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print(f"Error: Markers not found: start={start_idx}, end={end_idx}")
    exit(1)

new_section = '''async def _do_approve_transfer(transfer_id: str, payload: Optional[dict] = None, current_employee: Optional[dict] = None):
    conn = get_db()
    try:
        cur = conn.execute("SELECT * FROM stock_transfers WHERE transfer_id = ?;", (transfer_id,))
        t = cur.fetchone()
        if not t:
            raise HTTPException(status_code=404, detail=f"Transfer {transfer_id} not found.")

        # Idempotent safety: if already approved, in transit, or received, preserve current state
        if t["status"] in ("Approved", "In Transit", "Received"):
            return {
                "success": True,
                "transferId": transfer_id,
                "status": t["status"],
                "approvedDate": t["approved_date"],
                "approvedBy": t["approved_by_manager_name"]
            }

        now_iso = datetime.now(timezone.utc).isoformat()
        mgr_name = current_employee["name"] if current_employee else "Priya Kulkarni"
        mgr_id = current_employee["employee_id"] if current_employee else "MGR001"

        conn.execute("""
            UPDATE stock_transfers
            SET status = 'Approved',
                approved_date = ?,
                approved_by_manager_name = ?,
                approved_by_manager_id = ?
            WHERE transfer_id = ?;
        """, (now_iso, f"{mgr_name} (Store Manager)", mgr_id, transfer_id))

        # Synchronize linked recommendation if present
        conn.execute("""
            UPDATE recommendations
            SET status = 'approved', notes = ?
            WHERE transfer_id = ?;
        """, (payload.get("notes", "Approved by Store Manager") if payload else "Approved by Store Manager", transfer_id))

        conn.commit()

        # Broadcast real-time SSE event to all connected dashboards
        await broadcaster.broadcast("transfer_update", {
            "transferId": transfer_id,
            "status": "Approved",
            "approvedDate": now_iso,
            "approvedBy": f"{mgr_name} (Store Manager)",
            "sourceStoreId": t["source_store_id"],
            "destinationStoreId": t["destination_store_id"],
            "sku": t["sku"]
        })

        return {
            "success": True,
            "transferId": transfer_id,
            "status": "Approved",
            "approvedDate": now_iso,
            "approvedBy": f"{mgr_name} (Store Manager)"
        }
    finally:
        conn.close()

@app.post("/api/manager/transfers/{transfer_id}/approve")
async def manager_approve_transfer_strict(
    transfer_id: str,
    payload: Optional[dict] = Body(None),
    current_employee: dict = Depends(get_current_employee)
):
    """
    Authoritative manager endpoint requiring store_manager session:
    Commits approval of a pending stock transfer to SQLite and broadcasts SSE.
    """
    if current_employee.get("role") != "store_manager":
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Store Associates cannot approve transfers. Only Store Managers can authorize transfers."
        )
    return await _do_approve_transfer(transfer_id, payload, current_employee)

@app.post("/api/v1/transfers/{transfer_id}/approve")
async def v1_approve_transfer(
    transfer_id: str,
    payload: Optional[dict] = Body(None),
    current_employee: Optional[dict] = Depends(get_optional_employee)
):
    """
    Manager Dashboard API endpoint for transfer authorizations.
    """
    return await _do_approve_transfer(transfer_id, payload, current_employee)

async def _do_reject_transfer(transfer_id: str, payload: Optional[dict] = None, current_employee: Optional[dict] = None):
    conn = get_db()
    try:
        cur = conn.execute("SELECT * FROM stock_transfers WHERE transfer_id = ?;", (transfer_id,))
        t = cur.fetchone()
        if not t:
            raise HTTPException(status_code=404, detail=f"Transfer {transfer_id} not found.")

        if t["status"] in ("In Transit", "Received"):
            raise HTTPException(status_code=400, detail=f"Cannot reject transfer with status: {t['status']}.")

        reason = (payload.get("reason") or payload.get("notes") or "Rejected by Store Manager") if payload else "Rejected by Store Manager"
        conn.execute("""
            UPDATE stock_transfers
            SET status = 'Rejected', notes = ?
            WHERE transfer_id = ?;
        """, (reason, transfer_id))

        conn.execute("""
            UPDATE recommendations
            SET status = 'rejected', notes = ?
            WHERE transfer_id = ?;
        """, (reason, transfer_id))

        conn.commit()

        await broadcaster.broadcast("transfer_update", {
            "transferId": transfer_id,
            "status": "Rejected",
            "notes": reason,
            "sourceStoreId": t["source_store_id"],
            "destinationStoreId": t["destination_store_id"]
        })

        return {"success": True, "transferId": transfer_id, "status": "Rejected", "notes": reason}
    finally:
        conn.close()

@app.post("/api/manager/transfers/{transfer_id}/reject")
async def manager_reject_transfer_strict(
    transfer_id: str,
    payload: Optional[dict] = Body(None),
    current_employee: dict = Depends(get_current_employee)
):
    if current_employee.get("role") != "store_manager":
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Only Store Managers can reject transfers."
        )
    return await _do_reject_transfer(transfer_id, payload, current_employee)

@app.post("/api/v1/transfers/{transfer_id}/reject")
async def v1_reject_transfer(
    transfer_id: str,
    payload: Optional[dict] = Body(None),
    current_employee: Optional[dict] = Depends(get_optional_employee)
):
    return await _do_reject_transfer(transfer_id, payload, current_employee)

async def _do_dispatch_transfer(transfer_id: str, payload: Optional[dict] = None, current_employee: Optional[dict] = None):
    conn = get_db()
    try:
        cur = conn.execute("SELECT * FROM stock_transfers WHERE transfer_id = ?;", (transfer_id,))
        t = cur.fetchone()
        if not t:
            raise HTTPException(status_code=404, detail=f"Transfer {transfer_id} not found.")

        # If already In Transit or Received, do not deduct inventory again (idempotent guard)
        if t["status"] in ("In Transit", "Received"):
            return {
                "success": True,
                "transferId": transfer_id,
                "status": t["status"],
                "message": f"Transfer is already in state: {t['status']}. Stock deduction preserved."
            }

        now_iso = datetime.now(timezone.utc).isoformat()
        mgr_name = current_employee["name"] if current_employee else "Priya Kulkarni"
        mgr_id = current_employee["employee_id"] if current_employee else "MGR001"

        # ATOMIC BUSINESS EVENT: Deduct stock from source store inventory
        cur_inv = conn.execute("""
            SELECT inventory_id, available_quantity, version
            FROM inventory
            WHERE store_id = ? AND sku = ?;
        """, (t["source_store_id"], t["sku"]))
        src_item = cur_inv.fetchone()

        if src_item:
            prev_qty = src_item["available_quantity"]
            if prev_qty < t["quantity"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot dispatch: Source store only has {prev_qty} units available, but transfer requires {t['quantity']} units."
                )
            new_qty = prev_qty - t["quantity"]
            new_version = src_item["version"] + 1

            conn.execute("""
                UPDATE inventory
                SET available_quantity = ?,
                    version = ?,
                    last_updated_timestamp = ?,
                    last_updated_by_employee_id = ?
                WHERE inventory_id = ?;
            """, (new_qty, new_version, now_iso, mgr_id, src_item["inventory_id"]))

            # Immutable audit log
            hist_id = f"LOG-DISP-{int(datetime.now().timestamp() * 1000)}"
            conn.execute("""
                INSERT INTO inventory_history (
                    history_id, store_id, product_id, product_name, colour, size, sku,
                    previous_quantity, quantity_change, new_quantity, update_type,
                    employee_id, employee_name, timestamp, reference_id, remarks
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                hist_id, t["source_store_id"], t["product_id"] or t["sku"], t["product_name"], t["colour"], t["size"], t["sku"],
                prev_qty, -t["quantity"], new_qty, "Stock Dispatched (Transfer)",
                mgr_id, f"{mgr_name} (Store Manager)", now_iso, transfer_id,
                f"Dispatched {t['quantity']} units to {t['destination_store_id']} via logistics corridor"
            ))

            # Broadcast inventory update for source store
            await broadcaster.broadcast("inventory_update", {
                "type": "INVENTORY_CHANGED",
                "storeId": t["source_store_id"],
                "inventoryId": src_item["inventory_id"],
                "sku": t["sku"],
                "size": t["size"],
                "productName": t["product_name"],
                "previousQuantity": prev_qty,
                "newQuantity": new_qty,
                "delta": -t["quantity"],
                "timestamp": now_iso,
                "updateSource": "DISPATCH_WORKFLOW"
            })

        # Update transfer status
        deliv_mode = payload.get("deliveryMode") if payload else t.get("delivery_mode")
        conn.execute("""
            UPDATE stock_transfers
            SET status = 'In Transit',
                dispatched_date = ?,
                delivery_mode = COALESCE(?, delivery_mode)
            WHERE transfer_id = ?;
        """, (now_iso, deliv_mode, transfer_id))

        conn.commit()

        await broadcaster.broadcast("transfer_update", {
            "transferId": transfer_id,
            "status": "In Transit",
            "sourceStoreId": t["source_store_id"],
            "destinationStoreId": t["destination_store_id"],
            "dispatchedDate": now_iso
        })

        return {"success": True, "transferId": transfer_id, "status": "In Transit", "dispatchedDate": now_iso}
    finally:
        conn.close()

async def _do_receive_transfer(transfer_id: str, payload: Optional[dict] = None, current_employee: Optional[dict] = None, enforce_store: bool = False):
    conn = get_db()
    try:
        cur = conn.execute("""
            SELECT transfer_id, source_store_id, destination_store_id,
                   product_id, product_name, colour, size, sku, quantity, status
            FROM stock_transfers
            WHERE transfer_id = ?;
        """, (transfer_id,))
        t = cur.fetchone()
        if not t:
            raise HTTPException(status_code=404, detail=f"Transfer {transfer_id} not found.")

        if enforce_store and current_employee:
            if t["destination_store_id"] != current_employee["store_id"]:
                raise HTTPException(
                    status_code=403,
                    detail=f"Forbidden: You can only confirm receipt for shipments destined for {current_employee.get('store_name', current_employee['store_id'])}."
                )

        if t["status"] == "Received":
            raise HTTPException(
                status_code=400,
                detail=f"Transfer cannot be received. Current status: {t['status']}."
            )

        if enforce_store and t["status"] != "In Transit":
            raise HTTPException(
                status_code=400,
                detail=f"Transfer cannot be received. Current status: {t['status']}."
            )

        now_iso = datetime.now(timezone.utc).isoformat()
        emp_id = current_employee["employee_id"] if current_employee else "EMP002"
        emp_name = current_employee["name"] if current_employee else "Priya Kumar"

        # If transfer was not yet marked In Transit (e.g. dispatched directly to received),
        # ensure stock was deducted from source store first!
        if t["status"] not in ("In Transit", "Received"):
            cur_src = conn.execute("SELECT inventory_id, available_quantity, version FROM inventory WHERE store_id = ? AND sku = ?;", (t["source_store_id"], t["sku"]))
            src_item = cur_src.fetchone()
            if src_item:
                if src_item["available_quantity"] < t["quantity"]:
                    raise HTTPException(status_code=400, detail=f"Cannot receive: Source store inventory deficit ({src_item['available_quantity']} < {t['quantity']}).")
                conn.execute("""
                    UPDATE inventory
                    SET available_quantity = available_quantity - ?,
                        version = version + 1
                    WHERE inventory_id = ?;
                """, (t["quantity"], src_item["inventory_id"]))

        # Ingest stock into destination store inventory
        cur_dst = conn.execute("""
            SELECT inventory_id, available_quantity, version
            FROM inventory
            WHERE store_id = ? AND sku = ?;
        """, (t["destination_store_id"], t["sku"]))
        dst_item = cur_dst.fetchone()

        if dst_item:
            prev_qty = dst_item["available_quantity"]
            new_qty = prev_qty + t["quantity"]
            new_ver = dst_item["version"] + 1

            conn.execute("""
                UPDATE inventory
                SET available_quantity = ?,
                    version = ?,
                    last_updated_timestamp = ?,
                    last_updated_by_employee_id = ?
                WHERE inventory_id = ?;
            """, (new_qty, new_ver, now_iso, emp_id, dst_item["inventory_id"]))

            hist_id = f"LOG-TRF-{int(datetime.now().timestamp() * 1000)}"
            conn.execute("""
                INSERT INTO inventory_history (
                    history_id, store_id, product_id, product_name, colour, size, sku,
                    previous_quantity, quantity_change, new_quantity, update_type,
                    employee_id, employee_name, timestamp, reference_id, remarks
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                hist_id, t["destination_store_id"], t["product_id"] or t["sku"], t["product_name"], t["colour"], t["size"], t["sku"],
                prev_qty, t["quantity"], new_qty, "Stock Received (Transfer)",
                emp_id, emp_name, now_iso, transfer_id, f"Intake signed off by {emp_name}"
            ))

            await broadcaster.broadcast("inventory_update", {
                "type": "INVENTORY_CHANGED",
                "storeId": t["destination_store_id"],
                "inventoryId": dst_item["inventory_id"],
                "sku": t["sku"],
                "size": t["size"],
                "productName": t["product_name"],
                "previousQuantity": prev_qty,
                "newQuantity": new_qty,
                "delta": t["quantity"],
                "timestamp": now_iso,
                "updateSource": "TRANSFER_INTAKE"
            })

        conn.execute("""
            UPDATE stock_transfers
            SET status = 'Received',
                received_date = ?,
                received_by_employee_id = ?
            WHERE transfer_id = ?;
        """, (now_iso, emp_id, transfer_id))

        conn.commit()

        await broadcaster.broadcast("transfer_update", {
            "transferId": transfer_id,
            "status": "Received",
            "receivedDate": now_iso,
            "receivedBy": emp_name,
            "sourceStoreId": t["source_store_id"],
            "destinationStoreId": t["destination_store_id"],
            "sku": t["sku"],
            "quantity": t["quantity"]
        })

        return {
            "success": True,
            "transferId": transfer_id,
            "status": "Received",
            "receivedDate": now_iso,
            "receivedBy": emp_name
        }
    finally:
        conn.close()

@app.post("/api/manager/transfers/{transfer_id}/dispatch")
async def manager_dispatch_transfer_strict(
    transfer_id: str,
    payload: Optional[dict] = Body(None),
    current_employee: dict = Depends(get_current_employee)
):
    if current_employee.get("role") != "store_manager":
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Store Associates cannot dispatch transfers. Only Store Managers can dispatch."
        )
    return await _do_dispatch_transfer(transfer_id, payload, current_employee)

@app.post("/api/v1/transfers/{transfer_id}/dispatch")
async def v1_dispatch_transfer(
    transfer_id: str,
    payload: Optional[dict] = Body(None),
    current_employee: Optional[dict] = Depends(get_optional_employee)
):
    return await _do_dispatch_transfer(transfer_id, payload, current_employee)

@app.patch("/api/v1/transfers/{transfer_id}")
async def patch_v1_transfer(
    transfer_id: str,
    payload: Optional[dict] = Body(None),
    current_employee: Optional[dict] = Depends(get_optional_employee)
):
    """
    Manager Dashboard route: Updates transfer stage (dispatched, delivered) or mode (express, normal).
    """
    req_deliv_status = (payload.get("deliveryStatus") if payload else None)

    # 1. Advance to Delivered
    if req_deliv_status and req_deliv_status.lower() in ("delivered", "received", "completed"):
        return await _do_receive_transfer(transfer_id, payload, current_employee, enforce_store=False)

    # 2. Advance to Dispatched
    if req_deliv_status and req_deliv_status.lower() in ("dispatched", "in_transit", "in transit"):
        return await _do_dispatch_transfer(transfer_id, payload, current_employee)

    # 3. Setting deliveryMode or general metadata update
    if payload:
        conn = get_db()
        try:
            if "deliveryMode" in payload:
                conn.execute("UPDATE stock_transfers SET delivery_mode = ? WHERE transfer_id = ?;", (payload["deliveryMode"], transfer_id))
            if "status" in payload and payload["status"].lower() == "approved":
                conn.execute("UPDATE stock_transfers SET status = 'Approved' WHERE transfer_id = ?;", (transfer_id,))
            conn.commit()
            return {"success": True, "transferId": transfer_id, **payload}
        finally:
            conn.close()

    return {"success": True, "transferId": transfer_id}

@app.post("/api/transfers/{transfer_id}/receive")
async def receive_transfer(
    transfer_id: str,
    payload: Optional[TransferReceiveRequest] = None,
    current_employee: dict = Depends(get_current_employee)
):
    """
    Confirms arrival of transfer goods and automatically ingests stock
    into the destination store's persistent inventory.
    """
    return await _do_receive_transfer(
        transfer_id,
        payload.dict() if payload else None,
        current_employee,
        enforce_store=True
    )

@app.post("/api/manager/transfers/{transfer_id}/receive")
@app.post("/api/v1/transfers/{transfer_id}/receive")
async def receive_transfer_manager(
    transfer_id: str,
    payload: Optional[dict] = Body(None),
    current_employee: Optional[dict] = Depends(get_optional_employee)
):
    return await _do_receive_transfer(
        transfer_id,
        payload,
        current_employee,
        enforce_store=False
    )

'''

updated_content = content[:start_idx] + new_section + content[end_idx:]

with open(MAIN_PY, 'w', encoding='utf-8') as f:
    f.write(updated_content)

print("Successfully updated main.py transfer section!")
