from decimal import Decimal
from uuid import uuid4

from django.conf import settings
from django.db import models


class Product(models.Model):
    """Product available for purchase."""

    class Category(models.TextChoices):
        MAIN = "MAIN", "Main"
        PREMIUM = "PREMIUM", "Premium"
        SIGNATURE = "SIGNATURE", "Signature"

    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
    )
    description = models.TextField(blank=True)
    price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
    )
    image = models.ImageField(
        upload_to="products/",
        blank=True,
        null=True,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category", "name"]

    def __str__(self):
        """Return the product name."""
        return self.name


class Cart(models.Model):
    """Shopping cart linked one-to-one with a user."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cart",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        """Return the cart owner's username."""
        return f"Cart of {self.user.username}"


class CartItem(models.Model):
    """Item inside a cart, either individual or pack."""

    class ItemType(models.TextChoices):
        INDIVIDUAL = "INDIVIDUAL", "Individual"
        PACK = "PACK", "Pack"

    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name="items",
    )
    item_type = models.CharField(
        max_length=20,
        choices=ItemType.choices,
        default=ItemType.INDIVIDUAL,
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="cart_items",
        null=True,
        blank=True,
    )
    pack_size = models.PositiveIntegerField(null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        """Return a readable representation of the cart item."""
        if self.item_type == self.ItemType.PACK:
            return f"{self.cart.user.username} - {self.pack_size} Pack"

        if self.product:
            return (
                f"{self.cart.user.username} - "
                f"{self.product.name} x{self.quantity}"
            )

        return f"{self.cart.user.username} - Cart Item"

    @property
    def subtotal(self):
        """Return the subtotal for this cart item."""
        return self.unit_price * self.quantity


class CartItemProduct(models.Model):
    """Product entry inside a pack cart item."""

    cart_item = models.ForeignKey(
        CartItem,
        on_delete=models.CASCADE,
        related_name="pack_products",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="cart_pack_items",
    )
    quantity = models.PositiveIntegerField()

    def __str__(self):
        """Return product name and quantity."""
        return f"{self.product.name} x{self.quantity}"


class Order(models.Model):
    """Order placed by a user."""

    class Status(models.TextChoices):
        CONFIRMED = "CONFIRMED", "Confirmed"
        DELIVERED = "DELIVERED", "Delivered"
        CANCELLED = "CANCELLED", "Cancelled"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="orders",
    )
    order_number = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CONFIRMED,
    )
    total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        """Generate an order number if not set."""
        if not self.order_number:
            self.order_number = f"ORD-{uuid4().hex[:10].upper()}"

        super().save(*args, **kwargs)

    def __str__(self):
        """Return the order number."""
        return self.order_number


class OrderItem(models.Model):
    """Item inside an order, either individual or pack."""

    class ItemType(models.TextChoices):
        INDIVIDUAL = "INDIVIDUAL", "Individual"
        PACK = "PACK", "Pack"

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )
    item_type = models.CharField(
        max_length=20,
        choices=ItemType.choices,
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="order_items",
        null=True,
        blank=True,
    )
    product_name = models.CharField(max_length=100)
    category = models.CharField(max_length=20)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )
    pack_size = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        """Return product name and quantity."""
        return f"{self.product_name} x{self.quantity}"


class OrderItemProduct(models.Model):
    """Product entry inside a pack order item."""

    order_item = models.ForeignKey(
        OrderItem,
        on_delete=models.CASCADE,
        related_name="pack_products",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="order_pack_items",
    )
    product_name = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    def __str__(self):
        """Return product name and quantity."""
        return f"{self.product_name} x{self.quantity}"
