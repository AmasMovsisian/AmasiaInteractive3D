from django.contrib.auth.models import User
from django.db import models


class Profile(models.Model):
    """User profile linked one-to-one with the User model."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    profile_image = models.ImageField(
        upload_to="profile_images/",
        null=True,
        blank=True,
    )

    def __str__(self):
        """Return the profile's string representation."""
        return f"{self.user.username}'s Profile"