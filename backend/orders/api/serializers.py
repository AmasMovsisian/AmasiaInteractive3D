from datetime import timedelta
from django.utils import timezone
from rest_framework import serializers
from ..models import (
    Cart,
    CartItem,
    CartItemProduct,
    Order,
    OrderItem,
    OrderItemProduct,
    Product,
)


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "category",
            "description",
            "price",
            "image",
        ]


class CartItemProductSerializer(serializers.ModelSerializer):
    product = ProductSerializer(
        read_only=True,
    )

    class Meta:
        model = CartItemProduct
        fields = [
            "id",
            "product",
            "quantity",
        ]


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(
        read_only=True,
    )
    pack_products = CartItemProductSerializer(
        many=True,
        read_only=True,
    )
    subtotal = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = CartItem
        fields = [
            "id",
            "item_type",
            "product",
            "pack_size",
            "quantity",
            "unit_price",
            "subtotal",
            "pack_products",
        ]


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(
        many=True,
        read_only=True,
    )
    total = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = [
            "id",
            "items",
            "total",
        ]

    def get_total(self, obj):
        return sum(
            (
                item.subtotal
                for item in obj.items.all()
            ),
            start=0,
        )


class OrderItemProductSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = OrderItemProduct
        fields = [
            "id",
            "product",
            "product_name",
            "quantity",
            "price",
            "subtotal",
        ]


class OrderItemSerializer(
    serializers.ModelSerializer
):
    pack_products = OrderItemProductSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "item_type",
            "product",
            "product_name",
            "category",
            "quantity",
            "price",
            "subtotal",
            "pack_size",
            "pack_products",
        ]


class OrderSerializer(
    serializers.ModelSerializer
):
    items = OrderItemSerializer(
        many=True,
        read_only=True,
    )
    status = serializers.SerializerMethodField()
    estimated_delivery = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "total",
            "items",
            "created_at",
            "estimated_delivery",
        ]

    DELIVERY_DAYS = 3

    def get_status(self, obj):
        if obj.status == Order.Status.CANCELLED:
            return Order.Status.CANCELLED
        delivery_date = (
            obj.created_at
            + timedelta(
                days=self.DELIVERY_DAYS
            )
        )
        now = timezone.now()
        if now >= delivery_date:
            return Order.Status.DELIVERED
        return Order.Status.CONFIRMED

    def get_estimated_delivery(self, obj):
        if obj.status == Order.Status.CANCELLED:
            return None
        delivery_date = (
            obj.created_at
            + timedelta(
                days=self.DELIVERY_DAYS
            )
        )
        return delivery_date
