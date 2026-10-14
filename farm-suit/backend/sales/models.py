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

    SALE_TYPE_CHOICES = [
        ('REGULAR', 'Regular Farm Sale'),
        ('TRADE', 'Trade Sale'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('UNPAID', 'Unpaid'),
        ('PARTIALLY_PAID', 'Partially Paid'),
        ('PAID', 'Paid'),
    ]

    bill_number = models.CharField(max_length=50, unique=True, db_index=True)
    sale_type = models.CharField(max_length=20, choices=SALE_TYPE_CHOICES, default='REGULAR', db_index=True)
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
    # Trade sale attributable selling expenses
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
    other_selling_expenses = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    # Payment tracking
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='UNPAID', db_index=True)
    amount_paid = models.DecimalField(
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
            models.Index(fields=['payment_status']),
            models.Index(fields=['sale_type']),
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
        return f"{self.bill_number} - {self.customer.customer_name} ({self.status}/{self.payment_status}) - ₹{self.grand_total}"


class SalesPayment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('UPI', 'UPI'),
        ('CHEQUE', 'Cheque'),
        ('OTHER', 'Other'),
    ]

    sales_bill = models.ForeignKey(SalesBill, on_delete=models.CASCADE, related_name='payments')
    customer = models.ForeignKey('masters.Customer', on_delete=models.PROTECT, related_name='sales_payments')
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
        related_name='recorded_sales_payments'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-payment_date', '-id']
        indexes = [
            models.Index(fields=['sales_bill']),
            models.Index(fields=['customer']),
            models.Index(fields=['payment_date']),
        ]

    def __str__(self):
        return f"Payment of ₹{self.amount} for {self.sales_bill.bill_number} on {self.payment_date}"

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
