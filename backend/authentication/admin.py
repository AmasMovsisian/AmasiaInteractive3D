from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin


admin.site.unregister(User)


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = (
        'username',
        'email',
        'is_staff',
        'is_active',
        'date_joined',
        'last_login',
    )

    list_filter = (
        'is_staff',
        'is_superuser',
        'is_active',
        'date_joined',
    )

    search_fields = (
        'username',
        'email',
        'first_name',
        'last_name',
    )

    ordering = (
        '-date_joined',
    )

    readonly_fields = (
        'date_joined',
        'last_login',
    )
