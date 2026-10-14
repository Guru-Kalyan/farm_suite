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

    PAYMENT_STATUS_CHOICES = [
        ('UNPAID', 'Unpaid'),
        ('PARTIALLY_PAID', 'Partially Paid'),
        ('PAID', 'Paid'),
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
    # Landed cost breakdown components
    transport_cost = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    packaging_cost = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    other_procurement_costs = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    total_landed_cost = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    # Vendor Payment Tracking
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='UNPAID', db_index=True)
    amount_paid = models.DecimalField(
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
            models.Index(fields=['payment_status']),
        ]

    @property
    def remaining_balance(self):
        balance = self.grand_total - self.amount_paid
        return max(Decimal('0.00'), balance)

    def update_payment_status(self):
        """Calculates total valid payments and updates amount_paid and payment_status."""
        total_paid = self.payments.aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
        self.amount_paid = total_paid
        if total_paid <= Decimal('0.00'):
            self.payment_status = 'UNPAID'
        elif total_paid >= self.grand_total:
            self.payment_status = 'PAID'
        else:
            self.payment_status = 'PARTIALLY_PAID'
        self.save(update_fields=['amount_paid', 'payment_status', 'updated_at'])

    def __str__(self):
        return f"{self.bill_number} - {self.vendor.vendor_name} ({self.status}/{self.payment_status}) - Landed: ₹{self.total_landed_cost}"


class VendorPayment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('UPI', 'UPI'),
        ('CHEQUE', 'Cheque'),
        ('OTHER', 'Other'),
    ]

    purchase_bill = models.ForeignKey(PurchaseBill, on_delete=models.CASCADE, related_name='payments')
    vendor = models.ForeignKey('masters.Vendor', on_delete=models.PROTECT, related_name='vendor_payments')
    payment_date = models.DateField()
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='CASH')
    reference_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='recorded_vendor_payments'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-payment_date', '-id']
        indexes = [
            models.Index(fields=['purchase_bill']),
            models.Index(fields=['vendor']),
            models.Index(fields=['payment_date']),
        ]

    def __str__(self):
        return f"Payment of ₹{self.amount} for {self.purchase_bill.bill_number} on {self.payment_date}"

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
    allocated_procurement_cost = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    landed_cost = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    landed_unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
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
