import sqlite3

conn = sqlite3.connect(r'C:\Users\S.SANDEEP\.gemini\antigravity-ide\scratch\threadiq\threadiq-employee-dashboard\backend\threadiq.db')
cursor = conn.cursor()

print('=== MYSURU CENTRAL INVENTORY ===')
cursor.execute("SELECT sku, product_name, colour, size, available_quantity, minimum_stock_threshold FROM inventory WHERE store_id = 'STORE_KA_MYS_01' ORDER BY sku")
mys_rows = cursor.fetchall()
for r in mys_rows:
    print(r)
print(f'Total Mysuru items: {len(mys_rows)}')

print('\n=== BRIGADE ROAD FLAGSHIP INVENTORY ===')
cursor.execute("SELECT sku, product_name, colour, size, available_quantity, minimum_stock_threshold FROM inventory WHERE store_id = 'STORE_KA_BLR_01' ORDER BY sku")
blr_rows = cursor.fetchall()
for r in blr_rows:
    print(r)
print(f'Total Brigade Road items: {len(blr_rows)}')

mys_skus = set(r[0] for r in mys_rows)
blr_skus = set(r[0] for r in blr_rows)
print('\nMissing in BLR:', mys_skus - blr_skus)
print('Missing in MYS:', blr_skus - mys_skus)
conn.close()
