from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from decimal import Decimal

class Order(models.Model):
    ORDER_TYPE_CHOICES = [
        ('REGULAR', 'Regular Order'),
        ('ADVANCE', 'Advance Order'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('IN_PREPARATION', 'In Preparation'),
        ('READY', 'Ready'),
        ('DISPATCHED', 'Dispatched'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
    ]

    order_number = models.CharField(max_length=50, unique=True, db_index=True)
    order_type = models.CharField(max_length=20, choices=ORDER_TYPE_CHOICES, default='REGULAR', db_index=True)
    customer = models.ForeignKey('masters.Customer', on_delete=models.PROTECT, related_name='orders')
    order_date = models.DateField()
    delivery_date = models.DateField(db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
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
    total_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    advance_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_orders'
    )
    delivery_address = models.TextField(blank=True)
    delivery_instructions = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    fulfilled_sales_bill = models.ForeignKey(
        'sales.SalesBill',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='originating_orders'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_orders'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['delivery_date', '-id']
        indexes = [
            models.Index(fields=['order_number']),
            models.Index(fields=['order_type']),
            models.Index(fields=['delivery_date']),
            models.Index(fields=['status']),
            models.Index(fields=['customer']),
        ]

    @property
    def remaining_balance(self):
        balance = self.total_amount - self.advance_amount
        return max(Decimal('0.00'), balance)

    def update_advance_amount(self):
        total_advances = self.advances.aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
        self.advance_amount = total_advances
        self.save(update_fields=['advance_amount', 'updated_at'])

    def __str__(self):
        return f"{self.order_number} ({self.get_order_type_display()}) - {self.customer.customer_name} [{self.status}] - ₹{self.total_amount}"


class OrderLine(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='lines')
    item = models.ForeignKey('masters.Item', on_delete=models.PROTECT, related_name='order_lines')
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal('0.001'))]
    )
    unit_rate = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.item.name}: {self.quantity} @ ₹{self.unit_rate} = ₹{self.amount}"


class OrderAdvance(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('UPI', 'UPI'),
        ('CHEQUE', 'Cheque'),
        ('OTHER', 'Other'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='advances')
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
        related_name='recorded_order_advances'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-payment_date', '-id']
        indexes = [
            models.Index(fields=['order']),
            models.Index(fields=['payment_date']),
        ]

    def __str__(self):
        return f"Advance of ₹{self.amount} for {self.order.order_number} on {self.payment_date}"
