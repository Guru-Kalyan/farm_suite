from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from masters.models import Customer, Vendor, ItemCategory, UnitOfMeasure, Item
from sales.models import SalesBill, SalesPayment
from trading.models import PurchaseBill, VendorPayment
from accounts.services.ledger_service import (
    get_customer_ledger,
    get_vendor_ledger,
    get_receivables_prioritization,
    get_payables_prioritization
)

class LedgersTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="ledgeruser", password="password")
        self.cat = ItemCategory.objects.create(name="Produce")
        self.unit = UnitOfMeasure.objects.create(name="KG", short_name="KG")
        self.item = Item.objects.create(name="Mangoes", item_code="MNG-01", category=self.cat, unit=self.unit)
        self.customer = Customer.objects.create(customer_name="Royal Supermarket", customer_code="CUST-ROYAL")
        self.vendor = Vendor.objects.create(vendor_name="Orchard Wholesale", vendor_code="VEND-ORCH")

    def test_customer_and_vendor_ledgers(self):
        # 1. Customer: Bill 5000, Payment 2000 => Receivable 3000 Dr
        bill = SalesBill.objects.create(
            bill_number="INV-ROYAL-01",
            customer=self.customer,
            bill_date=timezone.now().date(),
            grand_total=Decimal('5000.00'),
            amount_paid=Decimal('2000.00'),
            payment_status='PARTIALLY_PAID',
            status='POSTED',
            created_by=self.user
        )
        SalesPayment.objects.create(
            sales_bill=bill,
            customer=self.customer,
            payment_date=timezone.now().date(),
            amount=Decimal('2000.00'),
            recorded_by=self.user
        )

        c_ledger = get_customer_ledger(self.customer.id)
        self.assertEqual(c_ledger["summary"]["total_sales_value"], "5000.00")
        self.assertEqual(c_ledger["summary"]["total_received_value"], "2000.00")
        self.assertEqual(c_ledger["summary"]["current_receivable_balance"], "3000.00")
        self.assertEqual(c_ledger["summary"]["balance_type"], "Dr")
        self.assertEqual(len(c_ledger["statement"]), 2)

        # 2. Vendor: Purchase 8000, Payment 3000 => Payable 5000 Cr
        pbill = PurchaseBill.objects.create(
            bill_number="PB-ORCH-01",
            vendor=self.vendor,
            bill_date=timezone.now().date(),
            received_date=timezone.now().date(),
            grand_total=Decimal('8000.00'),
            total_landed_cost=Decimal('8500.00'),
            amount_paid=Decimal('3000.00'),
            payment_status='PARTIALLY_PAID',
            status='POSTED',
            accepted_by=self.user
        )
        VendorPayment.objects.create(
            purchase_bill=pbill,
            vendor=self.vendor,
            payment_date=timezone.now().date(),
            amount=Decimal('3000.00'),
            recorded_by=self.user
        )

        v_ledger = get_vendor_ledger(self.vendor.id)
        self.assertEqual(v_ledger["summary"]["total_procurement_value"], "8000.00")
        self.assertEqual(v_ledger["summary"]["total_amount_paid"], "3000.00")
        self.assertEqual(v_ledger["summary"]["current_payable_balance"], "5000.00")
        self.assertEqual(v_ledger["summary"]["balance_type"], "Cr")
        self.assertEqual(len(v_ledger["statement"]), 2)

        # Prioritization
        rec = get_receivables_prioritization()
        self.assertTrue(any(r["customer_id"] == self.customer.id and r["outstanding_receivable"] == "3000.00" for r in rec["receivables"]))

        pay = get_payables_prioritization()
        self.assertTrue(any(p["vendor_id"] == self.vendor.id and p["outstanding_payable"] == "5000.00" for p in pay["payables"]))
