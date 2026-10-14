import os
import sys
import datetime
import django

sys.stdout.reconfigure(encoding='utf-8')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from decimal import Decimal
from django.contrib.auth.models import User
from django.utils import timezone
from masters.models import Customer, Vendor, Item, ItemCategory, UnitOfMeasure
from sales.models import SalesBill, SalesPayment
from sales.services.billing_service import save_sales_bill, post_sales_bill, record_sales_payment
from trading.models import PurchaseBill, VendorPayment
from trading.services.purchase_service import save_purchase_bill, post_purchase_bill, record_vendor_payment
from orders.models import Order, OrderLine, OrderAdvance
from orders.services.order_service import create_order, record_order_advance, fulfill_order_to_sale
from accounts.services.ledger_service import get_customer_ledger, get_vendor_ledger, get_receivables_prioritization, get_payables_prioritization

def run_tests():
    print("=== STARTING FARM SUIT COMPREHENSIVE VERIFICATION ===")

    # Ensure admin user exists
    user, _ = User.objects.get_or_create(username="admin", defaults={"is_superuser": True, "is_staff": True})

    # Ensure masters exist
    cat, _ = ItemCategory.objects.get_or_create(name="Produce", defaults={"description": "Farm produce"})
    unit_kg = UnitOfMeasure.objects.filter(name__iexact="Kilogram").first() or UnitOfMeasure.objects.first()
    item, _ = Item.objects.get_or_create(
        item_code="TEST-TOMATO-01",
        defaults={"name": "Roma Tomatoes", "category": cat, "unit": unit_kg}
    )
    customer, _ = Customer.objects.get_or_create(
        customer_code="CUST-TEST-001",
        defaults={"customer_name": "Fresh Market Retailers", "phone": "9876543210"}
    )
    vendor, _ = Vendor.objects.get_or_create(
        vendor_code="VEND-TEST-001",
        defaults={"vendor_name": "Kaveri Agro Suppliers", "phone": "9876501234"}
    )

    # -------------------------------------------------------------------------
    # TEST 1: Trade Purchase & Landed Cost Allocation
    # -------------------------------------------------------------------------
    print("\n--- TEST 1: Trade Purchase & Landed Cost ---")
    pur_num = f"PB-TEST-{timezone.now().strftime('%H%M%S')}"
    pur_data = {
        "vendor_id": vendor.id,
        "bill_number": pur_num,
        "bill_date": str(timezone.now().date()),
        "lines": [{
            "item_id": item.id,
            "quantity": "100.000",
            "unit_rate": "50.00"  # Base subtotal: 100 * 50 = 5000.00
        }],
        "transport_cost": "300.00",
        "packaging_cost": "150.00",
        "other_procurement_costs": "50.00",
        "tax_amount": "0.00",
        "discount": "0.00"
    }
    pur_bill = save_purchase_bill(pur_data, user)
    assert pur_bill.subtotal == Decimal('5000.00'), f"Expected subtotal 5000, got {pur_bill.subtotal}"
    assert pur_bill.grand_total == Decimal('5000.00'), f"Expected payable 5000, got {pur_bill.grand_total}"
    # Total landed cost = 5000 + 300 + 150 + 50 = 5500.00
    assert pur_bill.total_landed_cost == Decimal('5500.00'), f"Expected landed 5500, got {pur_bill.total_landed_cost}"
    # Line landed unit cost = 5500 / 100 = 55.00
    line = pur_bill.lines.first()
    assert line.landed_unit_cost == Decimal('55.00'), f"Expected line landed unit cost 55.00, got {line.landed_unit_cost}"
    assert pur_bill.payment_status == 'UNPAID'
    print(f"✓ Purchase draft created. Landed cost per unit: ₹{line.landed_unit_cost} (Base: ₹50.00 + Procurement overhead: ₹5.00)")

    # Post purchase bill to generate inventory lots
    pur_bill = post_purchase_bill(pur_bill.id, user)
    lot = line.inventory_lots.first()
    assert lot is not None, "Inventory lot was not created"
    assert lot.unit_cost == Decimal('55.00'), f"Inventory lot unit cost should be 55.00, got {lot.unit_cost}"
    print(f"✓ Purchase bill posted. InventoryLot {lot.lot_number} generated with landed unit cost: ₹{lot.unit_cost}")

    # -------------------------------------------------------------------------
    # TEST 2: Vendor Partial & Final Payments
    # -------------------------------------------------------------------------
    print("\n--- TEST 2: Vendor Partial & Final Payments ---")
    vpay1, pur_bill = record_vendor_payment(pur_bill.id, {
        "amount": "2000.00",
        "payment_method": "BANK_TRANSFER",
        "reference_number": "NEFT12345"
    }, user)
    assert pur_bill.amount_paid == Decimal('2000.00')
    assert pur_bill.remaining_balance == Decimal('3000.00')
    assert pur_bill.payment_status == 'PARTIALLY_PAID'
    print(f"✓ Partial vendor payment recorded: ₹2,000. Remaining payable: ₹{pur_bill.remaining_balance}. Status: {pur_bill.payment_status}")

    vpay2, pur_bill = record_vendor_payment(pur_bill.id, {
        "amount": "3000.00",
        "payment_method": "UPI",
        "reference_number": "UPI98765"
    }, user)
    assert pur_bill.amount_paid == Decimal('5000.00')
    assert pur_bill.remaining_balance == Decimal('0.00')
    assert pur_bill.payment_status == 'PAID'
    print(f"✓ Final vendor payment recorded: ₹3,000. Remaining payable: ₹{pur_bill.remaining_balance}. Status: {pur_bill.payment_status}")

    # -------------------------------------------------------------------------
    # TEST 3: Trade Sale & Profitability Calculation
    # -------------------------------------------------------------------------
    print("\n--- TEST 3: Trade Sale & Profitability Calculation ---")
    sale_num = f"INV-TRADE-{timezone.now().strftime('%H%M%S')}"
    # Sell 50 units at 90.00 each (Revenue = 4500.00)
    # COGS = 50 * 55.00 = 2750.00
    # Gross Profit = 4500 - 2750 = 1750.00
    # Selling transport: 150.00, Selling packaging: 50.00, Other: 50.00 (Total selling expenses = 250.00)
    # Net Trade Profit = 1750 - 250 = 1500.00
    # Margin % = (1500 / 4500) * 100 = 33.33%
    sale_data = {
        "customer_id": customer.id,
        "bill_number": sale_num,
        "bill_date": str(timezone.now().date()),
        "sale_type": "TRADE",
        "items": [{
            "item_id": item.id,
            "quantity": "50.000",
            "selling_rate": "90.00"
        }],
        "transport_cost": "150.00",
        "packaging_cost": "50.00",
        "other_selling_expenses": "50.00"
    }
    sales_bill = save_sales_bill(sale_data, user)
    assert sales_bill.payment_status == 'UNPAID'
    assert sales_bill.grand_total == Decimal('4500.00')

    # Post sales bill (consumes 50 units from the lot created in Test 1)
    sales_bill = post_sales_bill(sales_bill.id, [{
        "item_id": item.id,
        "quantity": "50.000",
        "selling_rate": "90.00"
    }], user)

    sales_line = sales_bill.lines.first()
    assert sales_line.cost_of_goods_sold == Decimal('2750.00'), f"Expected COGS 2750, got {sales_line.cost_of_goods_sold}"
    assert sales_line.gross_profit == Decimal('1750.00'), f"Expected Gross Profit 1750, got {sales_line.gross_profit}"

    selling_expenses = sales_bill.transport_cost + sales_bill.packaging_cost + sales_bill.other_selling_expenses
    net_profit = sales_line.gross_profit - selling_expenses
    assert net_profit == Decimal('1500.00'), f"Expected Net Trade Profit 1500, got {net_profit}"
    margin_pct = round((net_profit / sales_bill.grand_total) * 100, 2)
    assert margin_pct == Decimal('33.33'), f"Expected margin 33.33%, got {margin_pct}%"
    print(f"✓ Trade Sale posted: Revenue: ₹{sales_bill.grand_total}, COGS: ₹{sales_line.cost_of_goods_sold}, Gross Profit: ₹{sales_line.gross_profit}, Selling Expenses: ₹{selling_expenses}, Net Profit: ₹{net_profit} ({margin_pct}%)")

    # -------------------------------------------------------------------------
    # TEST 4: Customer Partial Payments Against Sales Bill
    # -------------------------------------------------------------------------
    print("\n--- TEST 4: Customer Partial Payments ---")
    # Pay 1500 first
    spay1, sales_bill = record_sales_payment(sales_bill.id, {
        "amount": "1500.00",
        "payment_method": "UPI",
        "reference_number": "UPI-CUST-1"
    }, user)
    assert sales_bill.amount_paid == Decimal('1500.00')
    assert sales_bill.remaining_balance == Decimal('3000.00')
    assert sales_bill.payment_status == 'PARTIALLY_PAID'
    print(f"✓ First customer payment: ₹1,500. Remaining balance: ₹{sales_bill.remaining_balance}. Status: {sales_bill.payment_status}")

    # Pay 2000 second
    spay2, sales_bill = record_sales_payment(sales_bill.id, {
        "amount": "2000.00",
        "payment_method": "CASH",
        "reference_number": "CASH-CUST-2"
    }, user)
    assert sales_bill.amount_paid == Decimal('3500.00')
    assert sales_bill.remaining_balance == Decimal('1000.00')
    assert sales_bill.payment_status == 'PARTIALLY_PAID'
    print(f"✓ Second customer payment: ₹2,000. Remaining balance: ₹{sales_bill.remaining_balance}. Status: {sales_bill.payment_status}")

    # Pay final 1000
    spay3, sales_bill = record_sales_payment(sales_bill.id, {
        "amount": "1000.00",
        "payment_method": "BANK_TRANSFER",
        "reference_number": "NEFT-CUST-3"
    }, user)
    assert sales_bill.amount_paid == Decimal('4500.00')
    assert sales_bill.remaining_balance == Decimal('0.00')
    assert sales_bill.payment_status == 'PAID'
    print(f"✓ Final customer payment: ₹1,000. Remaining balance: ₹{sales_bill.remaining_balance}. Status: {sales_bill.payment_status}")

    # -------------------------------------------------------------------------
    # TEST 5: Advance Orders & Fulfillment Workflow
    # -------------------------------------------------------------------------
    print("\n--- TEST 5: Advance Orders & Fulfillment ---")
    delivery_date = timezone.now().date() + datetime.timedelta(days=3)
    order_data = {
        "customer_id": customer.id,
        "order_type": "ADVANCE",
        "delivery_date": str(delivery_date),
        "items": [{
            "item_id": item.id,
            "quantity": "20.000",
            "unit_rate": "90.00"  # 20 * 90 = 1800.00
        }],
        "advance_amount": "500.00",
        "payment_method": "UPI",
        "payment_reference": "ADV-INIT-1"
    }
    order = create_order(order_data, user)
    assert order.total_amount == Decimal('1800.00')
    assert order.advance_amount == Decimal('500.00')
    assert order.remaining_balance == Decimal('1300.00')
    assert order.status == 'PENDING'
    print(f"✓ Advance Order {order.order_number} booked: Total: ₹1,800, Advance: ₹500, Remaining: ₹1,300")

    # Record second advance of ₹300
    adv2, order = record_order_advance(order.id, {
        "amount": "300.00",
        "payment_method": "CASH",
        "reference_number": "ADV-PART-2"
    }, user)
    assert order.advance_amount == Decimal('800.00')
    assert order.remaining_balance == Decimal('1000.00')
    print(f"✓ Additional advance recorded: ₹300. Total advances: ₹800. Remaining: ₹{order.remaining_balance}")

    # Fulfill order into sales bill (transfers advances without duplicate cash entries)
    fulfilled_bill, order = fulfill_order_to_sale(order.id, user, post_immediately=True)
    assert order.status == 'DELIVERED'
    assert fulfilled_bill.grand_total == Decimal('1800.00')
    assert fulfilled_bill.amount_paid == Decimal('800.00'), f"Expected ₹800 applied from advances, got {fulfilled_bill.amount_paid}"
    assert fulfilled_bill.remaining_balance == Decimal('1000.00')
    assert fulfilled_bill.payment_status == 'PARTIALLY_PAID'
    print(f"✓ Order fulfilled into Sales Bill {fulfilled_bill.bill_number}. Status: {order.status}. Advances applied: ₹{fulfilled_bill.amount_paid}. Remaining: ₹{fulfilled_bill.remaining_balance}")

    # -------------------------------------------------------------------------
    # TEST 6: Customer & Vendor Account Ledgers
    # -------------------------------------------------------------------------
    print("\n--- TEST 6: Customer & Vendor Account Ledgers ---")
    cust_ledger = get_customer_ledger(customer.id)
    assert cust_ledger is not None
    print(f"✓ Customer Ledger computed: {cust_ledger['customer']['customer_name']}")
    print(f"  Total Billed: ₹{cust_ledger['summary']['total_sales_value']}, Total Received: ₹{cust_ledger['summary']['total_received_value']}, Net Receivable: ₹{cust_ledger['summary']['current_receivable_balance']} {cust_ledger['summary']['balance_type']}")
    print(f"  Statement lines count: {len(cust_ledger['statement'])}")

    vend_ledger = get_vendor_ledger(vendor.id)
    assert vend_ledger is not None
    print(f"✓ Vendor Ledger computed: {vend_ledger['vendor']['vendor_name']}")
    print(f"  Total Procured: ₹{vend_ledger['summary']['total_procurement_value']}, Total Paid: ₹{vend_ledger['summary']['total_amount_paid']}, Net Payable: ₹{vend_ledger['summary']['current_payable_balance']} {vend_ledger['summary']['balance_type']}")
    print(f"  Statement lines count: {len(vend_ledger['statement'])}")

    # -------------------------------------------------------------------------
    # TEST 7: Receivables & Payables Prioritization
    # -------------------------------------------------------------------------
    print("\n--- TEST 7: Receivables & Payables Prioritization ---")
    rec_prior = get_receivables_prioritization()
    assert len(rec_prior["receivables"]) > 0
    top_rec = rec_prior["receivables"][0]
    print(f"✓ Top Customer Receivable: {top_rec['customer_name']} (Outstanding: ₹{top_rec['outstanding_receivable']}, Unpaid bills: {top_rec['unpaid_bills_count']})")

    pay_prior = get_payables_prioritization()
    assert len(pay_prior["payables"]) > 0
    print(f"✓ Payables portfolio summary: Total payables liability: ₹{pay_prior['portfolio_summary']['total_payables']}")

    print("\n=======================================================")
    print(" ALL 7 BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY! ")
    print("=======================================================")

if __name__ == "__main__":
    run_tests()
