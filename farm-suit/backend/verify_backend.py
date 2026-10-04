import os
import sys
import django
import json
from decimal import Decimal

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from django.contrib.auth.models import User
from masters.models import ItemCategory, UnitOfMeasure, Item, Vendor, Customer, FarmPlot
from inventory.models import InventoryLot, StockMovement
from trading.models import PurchaseBill, PurchaseLine
from farming.models import CultivationBatch, Harvest
from sales.models import SalesBill, SalesLine
from audit.models import AuditLog

def run_tests():
    print("==================================================")
    print("STARTING FARM SUIT COMPREHENSIVE BACKEND TEST SUITE")
    print("==================================================")

    client = Client()
    admin_user = User.objects.get(username='admin')
    client.force_login(admin_user)

    # 1. Clean test state
    SalesLine.objects.all().delete()
    SalesBill.objects.all().delete()
    StockMovement.objects.all().delete()
    InventoryLot.objects.all().delete()
    Harvest.objects.all().delete()
    CultivationBatch.objects.all().delete()
    PurchaseLine.objects.all().delete()
    PurchaseBill.objects.all().delete()

    # 2. Master Setup
    fruit_cat, _ = ItemCategory.objects.get_or_create(name="Fruits", defaults={"description": "Fresh orchard fruits"})
    kg_unit, _ = UnitOfMeasure.objects.get_or_create(name="Kilogram", defaults={"short_name": "Kg"})
    mango_item, _ = Item.objects.get_or_create(
        item_code="MANGO-ALPHANSO",
        defaults={"name": "Alphonso Mango", "category": fruit_cat, "unit": kg_unit, "minimum_stock": Decimal("50.000")}
    )
    vendor1, _ = Vendor.objects.get_or_create(
        vendor_code="VEND-001",
        defaults={"vendor_name": "Ratnagiri Mango Traders", "phone": "9876543210"}
    )
    cust1, _ = Customer.objects.get_or_create(
        customer_code="CUST-001",
        defaults={"customer_name": "Fresh Basket Supermarket", "phone": "9123456789"}
    )
    plot1, _ = FarmPlot.objects.get_or_create(
        name="North Orchard Plot A",
        defaults={"location": "Sector 4", "area": Decimal("5.50"), "area_unit": "Acre"}
    )

    print("Master Data Verified.")

    # ---------------- TEST CASE 1: PURCHASE ----------------
    print("\n[TEST 1] Purchase 500 Kg Mango @ ₹80")
    p_data = {
        "vendor_id": vendor1.id,
        "bill_number": "FS-PB-2026-001",
        "bill_date": "2026-10-01",
        "lines": [{
            "item_id": mango_item.id,
            "quantity": "500.000",
            "unit_rate": "80.00"
        }]
    }
    r = client.post('/api/purchases/', json.dumps(p_data), content_type='application/json')
    assert r.status_code == 201, f"Purchase create failed: {r.json()}"
    p_id = r.json()['data']['id']

    # Post purchase
    r_post = client.post(f'/api/purchases/{p_id}/post/')
    assert r_post.status_code == 200, f"Purchase post failed: {r_post.json()}"

    # Verify inventory lot
    lot1 = InventoryLot.objects.get(purchase_line__purchase_bill_id=p_id)
    assert lot1.original_quantity == Decimal('500.000')
    assert lot1.available_quantity == Decimal('500.000')
    assert lot1.unit_cost == Decimal('80.00')
    assert lot1.source_type == 'PURCHASE'
    print(f"-> PASSED: Created Lot {lot1.lot_number}: {lot1.available_quantity} {mango_item.unit.short_name} @ ₹{lot1.unit_cost}, Source={lot1.source_type}")

    # ---------------- TEST CASE 2: HARVEST ----------------
    print("\n[TEST 2] Harvest 300 Kg Mango @ ₹55")
    batch_data = {
        "batch_number": "BATCH-MANGO-2026",
        "item_id": mango_item.id,
        "farm_plot_id": plot1.id,
        "start_date": "2026-04-01",
        "expected_harvest_date": "2026-10-02"
    }
    r_b = client.post('/api/farming/cultivation/', json.dumps(batch_data), content_type='application/json')
    assert r_b.status_code == 201, f"Batch create failed: {r_b.json()}"
    b_id = r_b.json()['data']['id']

    h_data = {
        "harvest_number": "HARV-2026-001",
        "cultivation_batch_id": b_id,
        "harvest_date": "2026-10-02",
        "quantity": "300.000",
        "unit_cost": "55.00"
    }
    r_h = client.post('/api/farming/harvest/', json.dumps(h_data), content_type='application/json')
    assert r_h.status_code == 201, f"Harvest create failed: {r_h.json()}"
    h_id = r_h.json()['data']['id']

    # Post harvest
    r_hpost = client.post(f'/api/farming/harvest/{h_id}/post/')
    assert r_hpost.status_code == 200, f"Harvest post failed: {r_hpost.json()}"

    lot2 = InventoryLot.objects.get(harvest_id=h_id)
    assert lot2.original_quantity == Decimal('300.000')
    assert lot2.available_quantity == Decimal('300.000')
    assert lot2.unit_cost == Decimal('55.00')
    assert lot2.source_type == 'HARVEST'
    print(f"-> PASSED: Created Lot {lot2.lot_number}: {lot2.available_quantity} {mango_item.unit.short_name} @ ₹{lot2.unit_cost}, Source={lot2.source_type}")

    # Check Total Stock Overview
    r_inv = client.get('/api/inventory/')
    assert r_inv.status_code == 200
    inv_items = r_inv.json()['data']['inventory']
    mango_inv = next(it for it in inv_items if it['item_id'] == mango_item.id)
    assert Decimal(mango_inv['available_stock']) == Decimal('800.000')
    assert Decimal(mango_inv['purchased_stock']) == Decimal('500.000')
    assert Decimal(mango_inv['harvested_stock']) == Decimal('300.000')
    print(f"-> Unified Inventory Total Stock: {mango_inv['available_stock']} Kg (Purchased: {mango_inv['purchased_stock']} Kg, Harvested: {mango_inv['harvested_stock']} Kg)")

    # ---------------- TEST CASE 3: FIFO SALE ----------------
    # Setup test 3 exact numbers from Section 22:
    # Lot A = 100 Kg @ ₹50
    # Lot B = 200 Kg @ ₹60
    # Customer buys: 150 Kg
    # Expected COGS = (100 * 50) + (50 * 60) = ₹8,000
    print("\n[TEST 3] FIFO Sale: Lot A (100 Kg @ ₹50), Lot B (200 Kg @ ₹60), Sale: 150 Kg @ ₹120")
    # Create distinct item for isolated FIFO testing
    fifo_item, _ = Item.objects.get_or_create(
        item_code="MANGO-FIFO-TEST",
        defaults={
            "name": "FIFO Alphonso Mango",
            "category": fruit_cat,
            "unit": kg_unit,
            "minimum_stock": Decimal("10.000")
        }
    )

    SalesLine.objects.filter(item=fifo_item).delete()
    StockMovement.objects.filter(inventory_lot__item=fifo_item).delete()
    InventoryLot.objects.filter(item=fifo_item).delete()

    lotA = InventoryLot.objects.create(
        lot_number="LOT-FIFO-A",
        item=fifo_item,
        source_type='PURCHASE',
        received_date="2026-09-01",
        original_quantity=Decimal('100.000'),
        available_quantity=Decimal('100.000'),
        unit_cost=Decimal('50.00'),
        status='AVAILABLE'
    )
    lotB = InventoryLot.objects.create(
        lot_number="LOT-FIFO-B",
        item=fifo_item,
        source_type='HARVEST',
        received_date="2026-09-05",
        original_quantity=Decimal('200.000'),
        available_quantity=Decimal('200.000'),
        unit_cost=Decimal('60.00'),
        status='AVAILABLE'
    )

    s_data = {
        "customer_id": cust1.id,
        "bill_number": "FS-INV-000001",
        "bill_date": "2026-10-04",
        "items": [{
            "item_id": fifo_item.id,
            "quantity": "150.000",
            "selling_rate": "120.00"
        }]
    }
    r_s = client.post('/api/sales/', json.dumps(s_data), content_type='application/json')
    assert r_s.status_code == 201, f"Sales create failed: {r_s.json()}"
    s_id = r_s.json()['data']['id']

    # Post Sale
    r_spost = client.post(f'/api/sales/{s_id}/post/', json.dumps({
        "items": [{
            "item_id": fifo_item.id,
            "quantity": "150.000",
            "selling_rate": "120.00"
        }]
    }), content_type='application/json')
    assert r_spost.status_code == 200, f"Sales post failed: {r_spost.json()}"

    # Verify Lot A is depleted and Lot B has 150 Kg left
    lotA.refresh_from_db()
    lotB.refresh_from_db()
    assert lotA.available_quantity == Decimal('0.000')
    assert lotA.status == 'DEPLETED'
    assert lotB.available_quantity == Decimal('150.000')
    assert lotB.status == 'AVAILABLE'

    # Verify SalesLines and COGS
    s_lines = SalesLine.objects.filter(sales_bill_id=s_id).order_by('id')
    assert s_lines.count() == 2
    line1, line2 = s_lines[0], s_lines[1]
    assert line1.quantity == Decimal('100.000') and line1.cost_of_goods_sold == Decimal('5000.00')
    assert line2.quantity == Decimal('50.000') and line2.cost_of_goods_sold == Decimal('3000.00')

    total_cogs = line1.cost_of_goods_sold + line2.cost_of_goods_sold
    total_rev = line1.revenue + line2.revenue
    total_profit = line1.gross_profit + line2.gross_profit
    assert total_cogs == Decimal('8000.00'), f"COGS mismatch: expected 8000.00, got {total_cogs}"
    assert total_rev == Decimal('18000.00')
    assert total_profit == Decimal('10000.00')
    print(f"-> PASSED: FIFO correctly allocated across Lot A & Lot B! COGS = ₹{total_cogs}, Revenue = ₹{total_rev}, Gross Profit = ₹{total_profit}")

    # ---------------- TEST CASE 4: INSUFFICIENT STOCK ----------------
    print("\n[TEST 4] Insufficient Stock Rejection: Available = 150 Kg, Attempt = 200 Kg")
    s_insuf_data = {
        "customer_id": cust1.id,
        "bill_number": "FS-INV-INSUF",
        "bill_date": "2026-10-04",
        "items": [{
            "item_id": fifo_item.id,
            "quantity": "200.000",
            "selling_rate": "120.00"
        }]
    }
    r_insuf = client.post('/api/sales/', json.dumps(s_insuf_data), content_type='application/json')
    insuf_id = r_insuf.json()['data']['id']
    r_insuf_post = client.post(f'/api/sales/{insuf_id}/post/', json.dumps({
        "items": [{
            "item_id": fifo_item.id,
            "quantity": "200.000",
            "selling_rate": "120.00"
        }]
    }), content_type='application/json')
    assert r_insuf_post.status_code == 400
    assert "Insufficient stock" in r_insuf_post.json()['message']
    print(f"-> PASSED: Sale rejected properly with message: '{r_insuf_post.json()['message']}'")

    # ---------------- TEST CASE 5: SERVER-SIDE PDF GENERATION ----------------
    print("\n[TEST 5] PDF Generation: GET /api/sales/<id>/pdf/")
    r_pdf = client.get(f'/api/sales/{s_id}/pdf/')
    assert r_pdf.status_code == 200
    assert r_pdf['Content-Type'] == 'application/pdf'
    assert 'FarmSuit_SalesBill_FS-INV-000001.pdf' in r_pdf['Content-Disposition']
    assert r_pdf.content.startswith(b'%PDF'), "PDF content did not start with PDF magic bytes"
    print(f"-> PASSED: Generated valid PDF attachment: {r_pdf['Content-Disposition']}, Size: {len(r_pdf.content)} bytes")

    # ---------------- TEST CASE 6: AUDIT TRAIL ----------------
    print("\n[TEST 6] Audit Trail: Field Changes & Timeline")
    # Update item minimum_stock from 50 to 120
    r_upd = client.put(f'/api/masters/items/{mango_item.id}/', json.dumps({"minimum_stock": "120.000"}), content_type='application/json')
    assert r_upd.status_code == 200
    r_aud = client.get(f'/api/audit/Item/{mango_item.id}/')
    assert r_aud.status_code == 200
    timeline = r_aud.json()['data']['timeline']
    assert len(timeline) >= 1
    last_change = timeline[0]
    assert "minimum_stock" in last_change['changed_fields']
    assert last_change['old_values']['minimum_stock'] == '50.000'
    assert last_change['new_values']['minimum_stock'] == '120.000'
    print(f"-> PASSED: Audit Log captured 50.000 -> 120.000 change by {last_change['user']} at {last_change['timestamp']}")

    # ---------------- TEST CASE 7: PROFIT REPORTING ----------------
    print("\n[TEST 7] Derived Profit Report: GET /api/reports/profit/")
    r_prof = client.get('/api/reports/profit/')
    assert r_prof.status_code == 200
    prof_data = r_prof.json()['data']
    assert Decimal(prof_data['summary']['total_gross_profit']) == Decimal('10000.00')
    print(f"-> PASSED: Derived profit verified: Revenue = ₹{prof_data['summary']['total_revenue']}, COGS = ₹{prof_data['summary']['total_cogs']}, Profit = ₹{prof_data['summary']['total_gross_profit']}")

    print("\n==================================================")
    print("ALL TEST CASES PASSED SUCCESSFULLY WITH ZERO REGRESSIONS!")
    print("==================================================")

if __name__ == '__main__':
    run_tests()
