import sqlite3

conn = sqlite3.connect('backend/threadiq.db')
c = conn.cursor()

c.execute("""
    UPDATE stock_transfers 
    SET approved_date = '2026-10-09T14:15:00Z', 
        approved_by_manager_name = 'Priya Kulkarni (Store Manager)', 
        approved_by_manager_id = 'MGR001' 
    WHERE transfer_id = 'TRF-KA-2026-0891';
""")

c.execute("""
    INSERT OR REPLACE INTO stock_transfers (
        transfer_id, source_store_id, destination_store_id,
        product_id, product_name, colour, size, sku, quantity,
        request_date, estimated_arrival, status,
        approved_date, approved_by_manager_name, approved_by_manager_id,
        received_date, received_by_employee_id, notes
    ) VALUES
    ('TRF-KA-2026-0895', 'STORE_KA_BLR_01', 'STORE_KA_MYS_01', 'prod_tiq-spm-wht-l', 'Supima Relaxed Fit Tee', 'White', 'L', 'TIQ-SPM-WHT-L', 15, '2026-10-10T04:00:00Z', 'Today, 6:00 PM (Express Hub Courier)', 'Approved', '2026-10-10T04:30:00Z', 'Priya Kulkarni (Store Manager)', 'MGR001', NULL, NULL, 'Manager-approved inter-store redistribution request.'),
    ('TRF-KA-2026-0870', 'STORE_KA_BLR_01', 'STORE_KA_MYS_01', 'prod_tiq-ath-gry-l', 'Athletic Tech Tee', 'Grey', 'L', 'TIQ-ATH-GRY-L', 12, '2026-10-08T09:00:00Z', 'Delivered', 'Received', '2026-10-08T09:30:00Z', 'Priya Kulkarni (Store Manager)', 'MGR001', '2026-10-08T17:45:00Z', 'EMP002', 'Completed seasonal rebalancing between stores.');
""")

conn.commit()
rows = c.execute('SELECT transfer_id, status, approved_date, approved_by_manager_name FROM stock_transfers;').fetchall()
for r in rows:
    print(r)
conn.close()
