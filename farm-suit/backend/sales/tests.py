from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from masters.models import Customer, ItemCategory, UnitOfMeasure, Item
from sales.models import SalesBill, SalesPayment
from sales.services.billing_service import save_sales_bill, record_sales_payment
from inventory.models import InventoryLot

class SalesAndPaymentTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="password")
        self.cat = ItemCategory.objects.create(name="Vegetables")
        self.unit = UnitOfMeasure.objects.create(name="Kilogram", short_name="KG")
        self.item = Item.objects.create(name="Spinach", item_code="SPN-01", category=self.cat, unit=self.unit)
        self.customer = Customer.objects.create(customer_name="Organic Mart", customer_code="CUST-001")

        self.lot = InventoryLot.objects.create(
            lot_number="LOT-TEST-01",
            item=self.item,
            source_type="HARVEST",
            original_quantity=Decimal('100.000'),
            available_quantity=Decimal('100.000'),
            unit_cost=Decimal('20.00'),
            status='AVAILABLE'
        )

    def test_sales_bill_creation_and_partial_payments(self):
        # 1. Create a draft bill for 10 units @ 40 = 400.00
        data = {
            "customer_id": self.customer.id,
            "bill_number": "INV-TEST-001",
            "bill_date": str(timezone.now().date()),
            "items": [{"item_id": self.item.id, "quantity": "10.000", "selling_rate": "40.00"}]
        }
        bill = save_sales_bill(data, self.user)
        self.assertEqual(bill.grand_total, Decimal('400.00'))
        self.assertEqual(bill.payment_status, 'UNPAID')
        self.assertEqual(bill.amount_paid, Decimal('0.00'))
        self.assertEqual(bill.remaining_balance, Decimal('400.00'))

        # 2. Record first partial payment of 150.00
        pay1, bill = record_sales_payment(bill.id, {"amount": "150.00", "payment_method": "UPI"}, self.user)
        self.assertEqual(bill.amount_paid, Decimal('150.00'))
        self.assertEqual(bill.remaining_balance, Decimal('250.00'))
        self.assertEqual(bill.payment_status, 'PARTIALLY_PAID')

        # 3. Record second partial payment of 250.00 (completing bill)
        pay2, bill = record_sales_payment(bill.id, {"amount": "250.00", "payment_method": "CASH"}, self.user)
        self.assertEqual(bill.amount_paid, Decimal('400.00'))
        self.assertEqual(bill.remaining_balance, Decimal('0.00'))
        self.assertEqual(bill.payment_status, 'PAID')
        self.assertEqual(bill.payments.count(), 2)
