from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.utils import timezone
from decimal import Decimal

class InventoryLot(models.Model):
    SOURCE_CHOICES = [
        ('PURCHASE', 'Vendor Purchase'),
        ('HARVEST', 'Direct Harvest'),
    ]

    STATUS_CHOICES = [
        ('AVAILABLE', 'Available'),
        ('DEPLETED', 'Depleted'),
        ('REVERSED', 'Reversed'),
    ]

    lot_number = models.CharField(max_length=50, unique=True, db_index=True)
    item = models.ForeignKey('masters.Item', on_delete=models.PROTECT, related_name='inventory_lots')
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    
    # Optional links back to originating document
    purchase_line = models.ForeignKey(
        'trading.PurchaseLine',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='inventory_lots'
    )
    harvest = models.ForeignKey(
        'farming.Harvest',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='inventory_lots'
    )

    received_date = models.DateField(default=timezone.now)
    original_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal('0.001'))]
    )
    available_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal('0.000'))]
    )
    unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['received_date', 'id']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(available_quantity__gte=0),
                name='lot_available_qty_non_negative'
            )
        ]
        indexes = [
            models.Index(fields=['item', 'status', 'received_date']),
            models.Index(fields=['source_type']),
        ]

    def __str__(self):
        return f"{self.lot_number} - {self.item.name} ({self.available_quantity}/{self.original_quantity} {self.item.unit.short_name})"

class StockMovement(models.Model):
    MOVEMENT_CHOICES = [
        ('RECEIPT', 'Stock Receipt'),
        ('SALE', 'Sale Consumption'),
        ('ADJUSTMENT_IN', 'Adjustment In'),
        ('ADJUSTMENT_OUT', 'Adjustment Out'),
        ('REVERSAL', 'Transaction Reversal'),
    ]

    inventory_lot = models.ForeignKey(
        InventoryLot,
        on_delete=models.PROTECT,
        related_name='stock_movements'
    )
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_CHOICES)
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal('0.001'))]
    )
    reference_type = models.CharField(max_length=50)  # e.g., 'PURCHASE_BILL', 'HARVEST', 'SALES_BILL'
    reference_id = models.PositiveBigIntegerField()
    movement_date = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='stock_movements'
    )
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ['-movement_date', '-id']
        indexes = [
            models.Index(fields=['inventory_lot', 'movement_type']),
            models.Index(fields=['reference_type', 'reference_id']),
            models.Index(fields=['movement_date']),
        ]

    def __str__(self):
        return f"[{self.movement_type}] {self.quantity} on {self.inventory_lot.lot_number} ({self.reference_type} #{self.reference_id})"
