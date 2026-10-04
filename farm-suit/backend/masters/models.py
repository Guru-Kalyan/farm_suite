from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal

class ItemCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Item Categories"
        ordering = ['name']

    def __str__(self):
        return self.name

class UnitOfMeasure(models.Model):
    name = models.CharField(max_length=50, unique=True)
    short_name = models.CharField(max_length=20, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Units of Measure"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.short_name})"

class Item(models.Model):
    item_code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=150)
    category = models.ForeignKey(ItemCategory, on_delete=models.PROTECT, related_name='items')
    unit = models.ForeignKey(UnitOfMeasure, on_delete=models.PROTECT, related_name='items')
    description = models.TextField(blank=True)
    minimum_stock = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=Decimal('0.000'),
        validators=[MinValueValidator(Decimal('0.000'))]
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} [{self.item_code}]"

class Vendor(models.Model):
    vendor_code = models.CharField(max_length=50, unique=True, db_index=True)
    vendor_name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=25, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    gst_number = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['vendor_name']

    def __str__(self):
        return f"{self.vendor_name} ({self.vendor_code})"

class Customer(models.Model):
    customer_code = models.CharField(max_length=50, unique=True, db_index=True)
    customer_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=25, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    gst_number = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['customer_name']

    def __str__(self):
        return f"{self.customer_name} ({self.customer_code})"

class FarmPlot(models.Model):
    name = models.CharField(max_length=100, unique=True)
    location = models.CharField(max_length=200, blank=True)
    area = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    area_unit = models.CharField(max_length=20, default='Acre')
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.area} {self.area_unit})"
