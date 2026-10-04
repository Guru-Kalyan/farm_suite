from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from decimal import Decimal

class SalesBill(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('POSTED', 'Posted'),
        ('CANCELLED', 'Cancelled'),
        ('REVERSED', 'Reversed'),
    ]

    bill_number = models.CharField(max_length=50, unique=True, db_index=True)
    customer = models.ForeignKey('masters.Customer', on_delete=models.PROTECT, related_name='sales_bills')
    bill_date = models.DateField()
    subtotal = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    tax_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    discount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    grand_total = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='sales_bills'
    )
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-bill_date', '-id']
        indexes = [
            models.Index(fields=['bill_number']),
            models.Index(fields=['status']),
            models.Index(fields=['bill_date']),
        ]

    def __str__(self):
        return f"{self.bill_number} - {self.customer.customer_name} ({self.status}) - ₹{self.grand_total}"

class SalesLine(models.Model):
    sales_bill = models.ForeignKey(SalesBill, on_delete=models.CASCADE, related_name='lines')
    item = models.ForeignKey('masters.Item', on_delete=models.PROTECT, related_name='sales_lines')
    inventory_lot = models.ForeignKey(
        'inventory.InventoryLot',
        on_delete=models.PROTECT,
        related_name='sales_lines'
    )
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal('0.001'))]
    )
    selling_rate = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    revenue = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    cost_of_goods_sold = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    gross_profit = models.DecimalField(
        max_digits=14,
        decimal_places=2
    )

    class Meta:
        ordering = ['id']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0),
                name='sales_line_quantity_gt_zero'
            )
        ]

    def __str__(self):
        return f"{self.item.name} from {self.inventory_lot.lot_number}: {self.quantity} @ ₹{self.selling_rate} | COGS: ₹{self.cost_of_goods_sold} | Profit: ₹{self.gross_profit}"
