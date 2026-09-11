from django.contrib import admin

from .models import (
    Cart,
    CartItem,
    Order,
    OrderItem,
    Product,
)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Admin configuration for the Product model."""

    list_display = (
        "name",
        "category",
        "price",
        "is_active",
    )
    list_filter = (
        "category",
        "is_active",
    )
    search_fields = (
        "name",
        "slug",
    )
    prepopulated_fields = {
        "slug": ("name",),
    }


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    """Admin configuration for the Cart model."""

    list_display = (
        "user",
        "created_at",
        "updated_at",
    )


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    """Admin configuration for the CartItem model."""

    list_display = (
        "cart",
        "product",
        "quantity",
    )


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    """Admin configuration for the Order model."""

    list_display = (
        "order_number",
        "user",
        "status",
        "total",
        "created_at",
    )
    list_filter = (
        "status",
        "created_at",
    )
    search_fields = (
        "order_number",
        "user__username",
    )


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    """Admin configuration for the OrderItem model."""

    list_display = (
        "order",
        "product_name",
        "price",
        "quantity",
        "subtotal",
    )
