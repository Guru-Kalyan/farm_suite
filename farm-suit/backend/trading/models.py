from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from decimal import Decimal

class PurchaseBill(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('POSTED', 'Posted'),
        ('CANCELLED', 'Cancelled'),
        ('REVERSED', 'Reversed'),
    ]

    bill_number = models.CharField(max_length=50, unique=True, db_index=True)
    vendor = models.ForeignKey('masters.Vendor', on_delete=models.PROTECT, related_name='purchase_bills')
    bill_date = models.DateField()
    received_date = models.DateField()
    accepted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='accepted_purchases'
    )
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
        return f"{self.bill_number} - {self.vendor.vendor_name} ({self.status})"

class PurchaseLine(models.Model):
    purchase_bill = models.ForeignKey(PurchaseBill, on_delete=models.CASCADE, related_name='lines')
    item = models.ForeignKey('masters.Item', on_delete=models.PROTECT, related_name='purchase_lines')
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal('0.001'))]
    )
    unit_rate = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ['id']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0),
                name='purchase_line_quantity_gt_zero'
            )
        ]

    def __str__(self):
        return f"{self.item.name}: {self.quantity} @ ₹{self.unit_rate} = ₹{self.amount}"
