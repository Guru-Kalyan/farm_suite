from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from masters.models import Customer, ItemCategory, UnitOfMeasure, Item
from inventory.models import InventoryLot
from orders.models import Order, OrderAdvance
from orders.services.order_service import create_order, record_order_advance, fulfill_order_to_sale

class OrdersTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="orderuser", password="password")
        self.cat = ItemCategory.objects.create(name="Dairy & Poultry")
        self.unit = UnitOfMeasure.objects.create(name="Crate", short_name="CRT")
        self.item = Item.objects.create(name="Farm Eggs", item_code="EGG-01", category=self.cat, unit=self.unit)
        self.customer = Customer.objects.create(customer_name="Sunrise Bakers", customer_code="CUST-SB-01")

        # Inventory lot to fulfill sale
        self.lot = InventoryLot.objects.create(
            lot_number="LOT-EGG-01",
            item=self.item,
            source_type="HARVEST",
            original_quantity=Decimal('50.000'),
            available_quantity=Decimal('50.000'),
            unit_cost=Decimal('100.00'),
            status='AVAILABLE'
        )

    def test_order_creation_advances_and_fulfillment(self):
        # 1. Create advance order for 10 crates @ 150 = 1500
        order_data = {
            "customer_id": self.customer.id,
            "order_type": "ADVANCE",
            "delivery_date": str(timezone.now().date()),
            "items": [{"item_id": self.item.id, "quantity": "10.000", "unit_rate": "150.00"}],
            "advance_amount": "400.00"
        }
        order = create_order(order_data, self.user)
        self.assertEqual(order.total_amount, Decimal('1500.00'))
        self.assertEqual(order.advance_amount, Decimal('400.00'))
        self.assertEqual(order.remaining_balance, Decimal('1100.00'))

        # 2. Record additional advance
        adv, order = record_order_advance(order.id, {"amount": "200.00"}, self.user)
        self.assertEqual(order.advance_amount, Decimal('600.00'))
        self.assertEqual(order.remaining_balance, Decimal('900.00'))

        # 3. Fulfill order into sales bill
        bill, order = fulfill_order_to_sale(order.id, self.user, post_immediately=True)
        self.assertEqual(order.status, 'DELIVERED')
        self.assertEqual(bill.grand_total, Decimal('1500.00'))
        self.assertEqual(bill.amount_paid, Decimal('600.00'))
        self.assertEqual(bill.remaining_balance, Decimal('900.00'))
        self.assertEqual(bill.payment_status, 'PARTIALLY_PAID')
        self.assertEqual(bill.payments.count(), 2)
