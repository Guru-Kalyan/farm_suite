from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from masters.models import Vendor, ItemCategory, UnitOfMeasure, Item, Customer
from trading.models import PurchaseBill, VendorPayment
from trading.services.purchase_service import save_purchase_bill, post_purchase_bill, record_vendor_payment
from sales.services.billing_service import save_sales_bill, post_sales_bill

class TradingTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tradeuser", password="password")
        self.cat = ItemCategory.objects.create(name="Seeds & Grain")
        self.unit = UnitOfMeasure.objects.create(name="Quintal", short_name="QTL")
        self.item = Item.objects.create(name="Basmati Paddy", item_code="PAD-01", category=self.cat, unit=self.unit)
        self.vendor = Vendor.objects.create(vendor_name="Agri Wholesale", vendor_code="VEND-01")
        self.customer = Customer.objects.create(customer_name="Rice Millers", customer_code="CUST-01")

    def test_purchase_landed_cost_and_trade_sale_profit(self):
        # 1. Purchase 10 quintals at 2000 each = 20,000
        # Transport = 1000, Packaging = 500, Other = 500 => Total landed = 22,000 (2200 / unit)
        pur_data = {
            "vendor_id": self.vendor.id,
            "bill_number": "PB-LANDED-01",
            "bill_date": str(timezone.now().date()),
            "lines": [{"item_id": self.item.id, "quantity": "10.000", "unit_rate": "2000.00"}],
            "transport_cost": "1000.00",
            "packaging_cost": "500.00",
            "other_procurement_costs": "500.00"
        }
        bill = save_purchase_bill(pur_data, self.user)
        self.assertEqual(bill.grand_total, Decimal('20000.00'))
        self.assertEqual(bill.total_landed_cost, Decimal('22000.00'))
        line = bill.lines.first()
        self.assertEqual(line.landed_unit_cost, Decimal('2200.00'))

        # 2. Post purchase bill
        bill = post_purchase_bill(bill.id, self.user)
        lot = line.inventory_lots.first()
        self.assertEqual(lot.unit_cost, Decimal('2200.00'))

        # 3. Vendor payment: partial 10,000, then 10,000
        vpay, bill = record_vendor_payment(bill.id, {"amount": "10000.00"}, self.user)
        self.assertEqual(bill.payment_status, 'PARTIALLY_PAID')
        self.assertEqual(bill.remaining_balance, Decimal('10000.00'))

        vpay2, bill = record_vendor_payment(bill.id, {"amount": "10000.00"}, self.user)
        self.assertEqual(bill.payment_status, 'PAID')
        self.assertEqual(bill.remaining_balance, Decimal('0.00'))

        # 4. Trade Sale: Sell 5 quintals at 3000 = 15,000
        # COGS = 5 * 2200 = 11,000
        # Gross profit = 15,000 - 11,000 = 4,000
        # Selling transport: 500, Selling packaging: 300 => Net profit = 4,000 - 800 = 3,200
        # Margin % = (3200 / 15000) * 100 = 21.33%
        sale_data = {
            "customer_id": self.customer.id,
            "bill_number": "INV-TRADE-01",
            "bill_date": str(timezone.now().date()),
            "sale_type": "TRADE",
            "items": [{"item_id": self.item.id, "quantity": "5.000", "selling_rate": "3000.00"}],
            "transport_cost": "500.00",
            "packaging_cost": "300.00"
        }
        sbill = save_sales_bill(sale_data, self.user)
        sbill = post_sales_bill(sbill.id, [{"item_id": self.item.id, "quantity": "5.000", "selling_rate": "3000.00"}], self.user)

        sline = sbill.lines.first()
        self.assertEqual(sline.cost_of_goods_sold, Decimal('11000.00'))
        self.assertEqual(sline.gross_profit, Decimal('4000.00'))
        net_profit = sline.gross_profit - (sbill.transport_cost + sbill.packaging_cost)
        self.assertEqual(net_profit, Decimal('3200.00'))
