from decimal import Decimal
from uuid import uuid4

from django.db import transaction
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import (
    Cart,
    CartItem,
    CartItemProduct,
    Order,
    OrderItem,
    OrderItemProduct,
    Product,
)
from .serializers import (
    CartSerializer,
    OrderSerializer,
    ProductSerializer,
)


PACK_SIZES = {6, 12, 36}
PACK_DISCOUNT = Decimal("0.10")

MAX_CART_UNITS = 900

MAX_6_PACKS = 150
MAX_12_PACKS = 75
MAX_36_PACKS = 25


class ProductListView(generics.ListAPIView):
    permission_classes = [
        permissions.IsAuthenticated
    ]
    serializer_class = ProductSerializer

    def get_queryset(self):
        return (
            Product.objects
            .filter(
                is_active=True
            )
            .order_by(
                "category",
                "name",
            )
        )


class ProductDetailView(generics.RetrieveAPIView):
    permission_classes = [
        permissions.IsAuthenticated
    ]
    serializer_class = ProductSerializer

    def get_queryset(self):
        return Product.objects.filter(
            is_active=True
        )


class CartView(APIView):
    permission_classes = [
        permissions.IsAuthenticated
    ]

    def get(self, request):
        cart, _ = Cart.objects.get_or_create(
            user=request.user
        )

        serializer = CartSerializer(
            cart
        )

        return Response(
            serializer.data
        )


class AddToCartView(APIView):
    permission_classes = [
        permissions.IsAuthenticated
    ]

    def post(self, request):
        item_type = request.data.get(
            "item_type",
            "INDIVIDUAL",
        )

        if item_type == "INDIVIDUAL":
            return self.add_individual(
                request
            )

        if item_type == "PACK":
            return self.add_pack(
                request
            )

        return Response(
            {
                "detail": (
                    "item_type must be "
                    "INDIVIDUAL or PACK."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    def get_cart_units(self, cart):
        total_units = 0

        for item in cart.items.all():
            if (
                item.item_type
                == CartItem.ItemType.INDIVIDUAL
            ):
                total_units += item.quantity
            else:
                total_units += (
                    item.pack_size
                    * item.quantity
                )

        return total_units

    def get_pack_count(
        self,
        cart,
        pack_size,
    ):
        return sum(
            item.quantity
            for item in cart.items.filter(
                item_type=CartItem.ItemType.PACK,
                pack_size=pack_size,
            )
        )

    def validate_cart_limit(
        self,
        cart,
        additional_units,
    ):
        current_units = (
            self.get_cart_units(cart)
        )

        if (
            current_units
            + additional_units
            > MAX_CART_UNITS
        ):
            return Response(
                {
                    "detail": (
                        "The maximum order "
                        "quantity is 900 drinks."
                    ),
                    "current_units": current_units,
                    "requested_units": additional_units,
                    "maximum_units": MAX_CART_UNITS,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return None

    def add_individual(
        self,
        request,
    ):
        product_id = request.data.get(
            "product_id"
        )

        quantity = request.data.get(
            "quantity",
            1,
        )

        try:
            quantity = int(
                quantity
            )
        except (
            TypeError,
            ValueError,
        ):
            return Response(
                {
                    "detail": (
                        "Quantity must be a number."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quantity < 1:
            return Response(
                {
                    "detail": (
                        "Quantity must be at least 1."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            product = Product.objects.get(
                id=product_id,
                is_active=True,
            )
        except Product.DoesNotExist:
            return Response(
                {
                    "detail": "Product not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        cart, _ = Cart.objects.get_or_create(
            user=request.user
        )

        limit_error = (
            self.validate_cart_limit(
                cart,
                quantity,
            )
        )

        if limit_error:
            return limit_error

        item, created = (
            CartItem.objects.get_or_create(
                cart=cart,
                item_type=(
                    CartItem.ItemType.INDIVIDUAL
                ),
                product=product,
                pack_size=None,
                defaults={
                    "quantity": quantity,
                    "unit_price": product.price,
                },
            )
        )

        if not created:
            new_quantity = (
                item.quantity
                + quantity
            )

            if (
                self.get_cart_units(cart)
                - item.quantity
                + new_quantity
                > MAX_CART_UNITS
            ):
                return Response(
                    {
                        "detail": (
                            "The maximum order "
                            "quantity is 900 drinks."
                        ),
                        "maximum_units": MAX_CART_UNITS,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            item.quantity = (
                new_quantity
            )
            item.unit_price = (
                product.price
            )

            item.save(
                update_fields=[
                    "quantity",
                    "unit_price",
                    "updated_at",
                ]
            )

        cart.save(
            update_fields=[
                "updated_at"
            ]
        )

        return Response(
            CartSerializer(
                cart
            ).data,
            status=status.HTTP_200_OK,
        )

    def validate_pack_composition(
        self,
        category,
        pack_size,
        validated_products,
    ):
        product_count = len(
            validated_products
        )

        if category == Product.Category.SIGNATURE:
            if product_count != 1:
                return (
                    "Signature packs can "
                    "contain only one flavor."
                )

            if (
                validated_products[0]["quantity"]
                != pack_size
            ):
                return (
                    "Signature packs must "
                    "contain one flavor "
                    "in the full pack quantity."
                )

            return None

        if product_count == 1:
            if (
                validated_products[0]["quantity"]
                != pack_size
            ):
                return (
                    "A single-flavor pack "
                    "must contain exactly "
                    f"{pack_size} drinks."
                )

            return None

        if product_count == 2:
            if pack_size == 6:
                return (
                    "6-packs cannot be split "
                    "between two flavors."
                )

            half = pack_size // 2

            quantities = sorted(
                item["quantity"]
                for item in validated_products
            )

            if quantities != [
                half,
                half,
            ]:
                return (
                    f"A {pack_size}-pack split "
                    "between two flavors must "
                    f"contain {half} of each flavor."
                )

            return None

        return (
            f"A {pack_size}-pack can contain "
            "either one flavor or exactly "
            "two flavors split 50/50."
        )

    def add_pack(
        self,
        request,
    ):
        pack_size = request.data.get(
            "pack_size"
        )

        try:
            pack_size = int(
                pack_size
            )
        except (
            TypeError,
            ValueError,
        ):
            return Response(
                {
                    "detail": (
                        "pack_size must be "
                        "6, 12 or 36."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if pack_size not in PACK_SIZES:
            return Response(
                {
                    "detail": (
                        "pack_size must be "
                        "6, 12 or 36."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        products_data = request.data.get(
            "products"
        )

        if not isinstance(
            products_data,
            list,
        ):
            return Response(
                {
                    "detail": (
                        "products must be a list."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not products_data:
            return Response(
                {
                    "detail": (
                        "A pack needs at least "
                        "one product."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(products_data) > 2:
            return Response(
                {
                    "detail": (
                        "A pack can contain "
                        "at most two flavors."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        cart, _ = Cart.objects.get_or_create(
            user=request.user
        )

        if pack_size == 6:
            max_packs = MAX_6_PACKS
        elif pack_size == 12:
            max_packs = MAX_12_PACKS
        else:
            max_packs = MAX_36_PACKS

        current_pack_count = (
            self.get_pack_count(
                cart,
                pack_size,
            )
        )

        if (
            current_pack_count + 1
            > max_packs
        ):
            return Response(
                {
                    "detail": (
                        f"You can add a maximum "
                        f"of {max_packs} "
                        f"{pack_size}-packs."
                    ),
                    "current_packs": current_pack_count,
                    "maximum_packs": max_packs,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        limit_error = (
            self.validate_cart_limit(
                cart,
                pack_size,
            )
        )

        if limit_error:
            return limit_error

        validated_products = []
        total_units = 0
        category = None
        product_ids = set()

        for entry in products_data:
            if not isinstance(
                entry,
                dict,
            ):
                return Response(
                    {
                        "detail": (
                            "Each product entry "
                            "must be an object."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            product_id = entry.get(
                "product_id"
            )

            quantity = entry.get(
                "quantity"
            )

            try:
                quantity = int(
                    quantity
                )
            except (
                TypeError,
                ValueError,
            ):
                return Response(
                    {
                        "detail": (
                            "Each product quantity "
                            "must be a number."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if quantity < 1:
                return Response(
                    {
                        "detail": (
                            "Product quantities "
                            "must be at least 1."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if product_id in product_ids:
                return Response(
                    {
                        "detail": (
                            "The same flavor "
                            "cannot appear more "
                            "than once in a pack."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                product = Product.objects.get(
                    id=product_id,
                    is_active=True,
                )
            except Product.DoesNotExist:
                return Response(
                    {
                        "detail": (
                            f"Product {product_id} "
                            "not found."
                        )
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            product_ids.add(
                product_id
            )

            if category is None:
                category = (
                    product.category
                )
            elif (
                product.category
                != category
            ):
                return Response(
                    {
                        "detail": (
                            "All products in a pack "
                            "must belong to the same "
                            "category."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            total_units += quantity

            validated_products.append(
                {
                    "product": product,
                    "quantity": quantity,
                }
            )

        if total_units != pack_size:
            return Response(
                {
                    "detail": (
                        f"A {pack_size}-pack must "
                        f"contain exactly {pack_size} "
                        "drinks."
                    ),
                    "total_units": total_units,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        composition_error = (
            self.validate_pack_composition(
                category,
                pack_size,
                validated_products,
            )
        )

        if composition_error:
            return Response(
                {
                    "detail": composition_error
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        base_price = sum(
            (
                item["product"].price
                * item["quantity"]
                for item in validated_products
            ),
            start=Decimal("0.00"),
        )

        discount = (
            base_price
            * PACK_DISCOUNT
        )

        pack_price = (
            base_price - discount
        ).quantize(
            Decimal("0.01")
        )

        item = CartItem.objects.create(
            cart=cart,
            item_type=(
                CartItem.ItemType.PACK
            ),
            product=None,
            pack_size=pack_size,
            quantity=1,
            unit_price=pack_price,
        )

        for item_data in validated_products:
            CartItemProduct.objects.create(
                cart_item=item,
                product=item_data["product"],
                quantity=item_data["quantity"],
            )

        cart.save(
            update_fields=[
                "updated_at"
            ]
        )

        return Response(
            CartSerializer(
                cart
            ).data,
            status=status.HTTP_201_CREATED,
        )


class UpdateCartItemView(APIView):
    permission_classes = [
        permissions.IsAuthenticated
    ]

    def get_cart_units(self, cart):
        total_units = 0

        for item in cart.items.all():
            if (
                item.item_type
                == CartItem.ItemType.INDIVIDUAL
            ):
                total_units += item.quantity
            else:
                total_units += (
                    item.pack_size
                    * item.quantity
                )

        return total_units

    def patch(
        self,
        request,
        pk,
    ):
        try:
            quantity = int(
                request.data.get(
                    "quantity"
                )
            )
        except (
            TypeError,
            ValueError,
        ):
            return Response(
                {
                    "detail": (
                        "Quantity must be a number."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            item = CartItem.objects.get(
                id=pk,
                cart__user=request.user,
            )
        except CartItem.DoesNotExist:
            return Response(
                {
                    "detail": (
                        "Cart item not found."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if quantity <= 0:
            cart = item.cart

            item.delete()

            return Response(
                CartSerializer(
                    cart
                ).data
            )

        if (
            item.item_type
            == CartItem.ItemType.PACK
        ):
            return Response(
                {
                    "detail": (
                        "Pack quantity cannot be "
                        "changed. Remove the pack "
                        "and add a new one."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        cart = item.cart

        other_units = (
            self.get_cart_units(cart)
            - item.quantity
        )

        if (
            other_units
            + quantity
            > 900
        ):
            return Response(
                {
                    "detail": (
                        "The maximum order "
                        "quantity is 900 drinks."
                    ),
                    "maximum_units": 900,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        item.quantity = quantity

        item.save(
            update_fields=[
                "quantity",
                "updated_at",
            ]
        )

        return Response(
            CartSerializer(
                cart
            ).data
        )


class RemoveCartItemView(APIView):
    permission_classes = [
        permissions.IsAuthenticated
    ]

    def delete(
        self,
        request,
        pk,
    ):
        try:
            item = CartItem.objects.get(
                id=pk,
                cart__user=request.user,
            )
        except CartItem.DoesNotExist:
            return Response(
                {
                    "detail": (
                        "Cart item not found."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        cart = item.cart

        item.delete()

        return Response(
            CartSerializer(
                cart
            ).data,
            status=status.HTTP_200_OK,
        )


class CheckoutView(APIView):
    permission_classes = [
        permissions.IsAuthenticated
    ]

    @transaction.atomic
    def post(
        self,
        request,
    ):
        cart, _ = Cart.objects.get_or_create(
            user=request.user
        )

        items = list(
            cart.items
            .select_related(
                "product"
            )
            .prefetch_related(
                "pack_products__product"
            )
        )

        if not items:
            return Response(
                {
                    "detail": (
                        "Your cart is empty."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        total_units = 0
        individual_units = 0

        for cart_item in items:
            if (
                cart_item.item_type
                == CartItem.ItemType.INDIVIDUAL
            ):
                total_units += (
                    cart_item.quantity
                )
                individual_units += (
                    cart_item.quantity
                )
            else:
                total_units += (
                    cart_item.pack_size
                    * cart_item.quantity
                )

        if total_units > 900:
            return Response(
                {
                    "detail": (
                        "The maximum order "
                        "quantity is 900 drinks."
                    ),
                    "total_units": total_units,
                    "maximum_units": 900,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            individual_units > 0
            and individual_units < 4
        ):
            return Response(
                {
                    "detail": (
                        "Individual orders must "
                        "contain at least 4 drinks "
                        "in total."
                    ),
                    "individual_units": individual_units,
                    "minimum_units": 4,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        order = Order.objects.create(
            user=request.user,
            order_number=(
                f"ORD-{uuid4().hex[:10].upper()}"
            ),
        )

        total = Decimal("0.00")

        for cart_item in items:
            if (
                cart_item.item_type
                == CartItem.ItemType.INDIVIDUAL
            ):
                product = (
                    cart_item.product
                )

                price = product.price

                subtotal = (
                    price
                    * cart_item.quantity
                )

                OrderItem.objects.create(
                    order=order,
                    item_type=(
                        OrderItem.ItemType.INDIVIDUAL
                    ),
                    product=product,
                    product_name=product.name,
                    category=product.category,
                    quantity=cart_item.quantity,
                    price=price,
                    subtotal=subtotal,
                    pack_size=None,
                )

                total += subtotal

            else:
                subtotal = (
                    cart_item.unit_price
                )

                first_product = (
                    cart_item
                    .pack_products
                    .first()
                )

                if first_product:
                    product = (
                        first_product.product
                    )

                    product_name = (
                        f"{cart_item.pack_size}-Pack"
                    )

                    category = (
                        product.category
                    )
                else:
                    product = None

                    product_name = (
                        f"{cart_item.pack_size}-Pack"
                    )

                    category = ""

                order_item = (
                    OrderItem.objects.create(
                        order=order,
                        item_type=(
                            OrderItem.ItemType.PACK
                        ),
                        product=product,
                        product_name=product_name,
                        category=category,
                        quantity=1,
                        price=subtotal,
                        subtotal=subtotal,
                        pack_size=(
                            cart_item.pack_size
                        ),
                    )
                )

                for pack_product in (
                    cart_item
                    .pack_products
                    .all()
                ):
                    product_price = (
                        pack_product
                        .product
                        .price
                    )

                    product_subtotal = (
                        product_price
                        * pack_product.quantity
                    )

                    OrderItemProduct.objects.create(
                        order_item=order_item,
                        product=(
                            pack_product.product
                        ),
                        product_name=(
                            pack_product
                            .product
                            .name
                        ),
                        quantity=(
                            pack_product.quantity
                        ),
                        price=product_price,
                        subtotal=product_subtotal,
                    )

                total += subtotal

        order.total = total

        order.save(
            update_fields=[
                "total"
            ]
        )

        cart.items.all().delete()

        return Response(
            OrderSerializer(
                order
            ).data,
            status=status.HTTP_201_CREATED,
        )


class OrderListView(
    generics.ListAPIView
):
    permission_classes = [
        permissions.IsAuthenticated
    ]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return (
            Order.objects
            .filter(
                user=self.request.user
            )
            .prefetch_related(
                "items__pack_products"
            )
        )


class OrderDetailView(
    generics.RetrieveAPIView
):
    permission_classes = [
        permissions.IsAuthenticated
    ]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return (
            Order.objects
            .filter(
                user=self.request.user
            )
            .prefetch_related(
                "items__pack_products"
            )
        )


class CancelOrderView(APIView):
    permission_classes = [
        permissions.IsAuthenticated
    ]

    def post(
        self,
        request,
        pk,
    ):
        try:
            order = Order.objects.get(
                id=pk,
                user=request.user,
            )
        except Order.DoesNotExist:
            return Response(
                {
                    "detail": (
                        "Order not found."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if (
            order.status
            == Order.Status.CANCELLED
        ):
            return Response(
                {
                    "detail": (
                        "Order is already "
                        "cancelled."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            order.status
            == Order.Status.DELIVERED
        ):
            return Response(
                {
                    "detail": (
                        "Delivered orders "
                        "cannot be cancelled."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        from datetime import timedelta

        delivery_date = (
            order.created_at
            + timedelta(days=3)
        )

        if timezone.now() >= delivery_date:
            order.status = (
                Order.Status.DELIVERED
            )

            order.save(
                update_fields=[
                    "status"
                ]
            )

            return Response(
                {
                    "detail": (
                        "This order has already "
                        "been delivered and "
                        "cannot be cancelled."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = (
            Order.Status.CANCELLED
        )

        order.save(
            update_fields=[
                "status"
            ]
        )

        return Response(
            OrderSerializer(
                order
            ).data,
            status=status.HTTP_200_OK,
        )
