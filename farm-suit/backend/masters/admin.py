from django.contrib import admin
from .models import ItemCategory, UnitOfMeasure, Item, Vendor, Customer, FarmPlot

@admin.register(ItemCategory)
class ItemCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'created_at')
    search_fields = ('name',)

@admin.register(UnitOfMeasure)
class UnitOfMeasureAdmin(admin.ModelAdmin):
    list_display = ('name', 'short_name', 'is_active')
    search_fields = ('name', 'short_name')

@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ('item_code', 'name', 'category', 'unit', 'minimum_stock', 'is_active')
    list_filter = ('category', 'unit', 'is_active')
    search_fields = ('item_code', 'name')

@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ('vendor_code', 'vendor_name', 'phone', 'email', 'is_active')
    search_fields = ('vendor_code', 'vendor_name', 'phone')

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('customer_code', 'customer_name', 'phone', 'email', 'is_active')
    search_fields = ('customer_code', 'customer_name', 'phone')

@admin.register(FarmPlot)
class FarmPlotAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'area', 'area_unit', 'is_active')
    search_fields = ('name', 'location')
