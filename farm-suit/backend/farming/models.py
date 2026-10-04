from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from decimal import Decimal

class CultivationBatch(models.Model):
    STATUS_CHOICES = [
        ('PLANNED', 'Planned'),
        ('ACTIVE', 'Active'),
        ('HARVESTED', 'Harvested'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]

    batch_number = models.CharField(max_length=50, unique=True, db_index=True)
    item = models.ForeignKey('masters.Item', on_delete=models.PROTECT, related_name='cultivation_batches')
    farm_plot = models.ForeignKey('masters.FarmPlot', on_delete=models.PROTECT, related_name='cultivation_batches')
    start_date = models.DateField()
    expected_harvest_date = models.DateField(null=True, blank=True)
    actual_harvest_date = models.DateField(null=True, blank=True)
    cultivated_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=Decimal('0.000'),
        validators=[MinValueValidator(Decimal('0.000'))]
    )
    area = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PLANNED')
    remarks = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='cultivation_batches'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Cultivation Batches"
        ordering = ['-start_date', '-id']
        indexes = [
            models.Index(fields=['batch_number']),
            models.Index(fields=['status']),
            models.Index(fields=['start_date']),
        ]

    def __str__(self):
        return f"{self.batch_number} - {self.item.name} on {self.farm_plot.name} ({self.status})"

class Harvest(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('POSTED', 'Posted'),
        ('CANCELLED', 'Cancelled'),
    ]

    GRADE_CHOICES = [
        ('GRADE_A', 'Grade A / Premium'),
        ('GRADE_B', 'Grade B / Standard'),
        ('GRADE_C', 'Grade C / Economy'),
    ]

    harvest_number = models.CharField(max_length=50, unique=True, db_index=True)
    cultivation_batch = models.ForeignKey(
        CultivationBatch,
        on_delete=models.PROTECT,
        related_name='harvests'
    )
    harvest_date = models.DateField()
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal('0.001'))]
    )
    unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    total_cost = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    quality_grade = models.CharField(max_length=20, choices=GRADE_CHOICES, default='GRADE_A', blank=True)
    accepted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='accepted_harvests'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-harvest_date', '-id']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0),
                name='harvest_quantity_gt_zero'
            )
        ]
        indexes = [
            models.Index(fields=['harvest_number']),
            models.Index(fields=['status']),
            models.Index(fields=['harvest_date']),
        ]

    def __str__(self):
        return f"{self.harvest_number} - {self.cultivation_batch.item.name} ({self.quantity} {self.cultivation_batch.item.unit.short_name}) @ ₹{self.unit_cost}"
