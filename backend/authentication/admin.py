from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Profile


admin.site.unregister(User)


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = (
        "username",
        "email",
        "is_staff",
        "is_active",
        "date_joined",
        "last_login",
    )

    list_filter = (
        "is_staff",
        "is_superuser",
        "is_active",
        "date_joined",
    )

    search_fields = (
        "username",
        "email",
        "first_name",
        "last_name",
    )

    ordering = (
        "-date_joined",
    )

    readonly_fields = (
        "date_joined",
        "last_login",
    )


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "profile_image",
    )

    search_fields = (
        "user__username",
        "user__email",
    )
