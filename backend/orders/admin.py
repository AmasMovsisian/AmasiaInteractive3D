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
    list_display = (
        "user",
        "created_at",
        "updated_at",
    )


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = (
        "cart",
        "product",
        "quantity",
    )


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
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
    list_display = (
        "order",
        "product_name",
        "price",
        "quantity",
        "subtotal",
    )
