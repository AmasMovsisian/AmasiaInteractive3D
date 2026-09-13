from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.db import IntegrityError

from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from ..models import Profile


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )

    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "password2",
        ]

    def validate(self, attrs):
        """Validate registration data."""

        username = attrs.get("username", "").strip()
        email = attrs.get("email", "").strip()

        attrs["username"] = username
        attrs["email"] = email

        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError(
                {"password": "Passwords do not match."}
            )

        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError(
                {"username": "This username is already taken."}
            )

        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                {"email": "This email address is already registered."}
            )

        return attrs

    def create(self, validated_data):
        """Create a new user and profile."""

        validated_data.pop("password2")

        try:
            user = User.objects.create_user(
                username=validated_data["username"],
                email=validated_data["email"],
                password=validated_data["password"],
            )

            Profile.objects.create(user=user)

        except IntegrityError:
            raise serializers.ValidationError(
                {
                    "detail": (
                        "A user with this username or email address "
                        "already exists."
                    )
                }
            )

        return user


class CaseInsensitiveTokenObtainPairSerializer(
    TokenObtainPairSerializer
):
    """JWT serializer with case-insensitive username login."""

    def validate(self, attrs):
        """Find the user case-insensitively before authenticating."""

        username = attrs.get(self.username_field)

        if not username:
            raise AuthenticationFailed(
                "No active account found with the given credentials."
            )

        user = User.objects.filter(
            username__iexact=username.strip()
        ).first()

        if user is None:
            raise AuthenticationFailed(
                "No active account found with the given credentials."
            )

        attrs[self.username_field] = user.get_username()

        return super().validate(attrs)


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user details and profile image."""

    profile_image = serializers.ImageField(
        source="profile.profile_image",
        required=False,
        allow_null=True,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "profile_image",
        ]

    def validate(self, attrs):
        """Validate username and email updates."""

        username = attrs.get("username")
        email = attrs.get("email")

        if username is not None:
            username = username.strip()

            if not username:
                raise serializers.ValidationError(
                    {"username": "Username cannot be empty."}
                )

            if User.objects.filter(
                username__iexact=username
            ).exclude(
                pk=self.instance.pk
            ).exists():
                raise serializers.ValidationError(
                    {"username": "This username is already taken."}
                )

            attrs["username"] = username

        if email is not None:
            email = email.strip()

            if User.objects.filter(
                email__iexact=email
            ).exclude(
                pk=self.instance.pk
            ).exists():
                raise serializers.ValidationError(
                    {"email": "This email address is already registered."}
                )

            attrs["email"] = email

        return attrs

    def update(self, instance, validated_data):
        """Update user and related profile data."""

        profile_data = validated_data.pop("profile", {})

        try:
            instance = super().update(instance, validated_data)

            if profile_data:
                profile, created = Profile.objects.get_or_create(
                    user=instance
                )

                if "profile_image" in profile_data:
                    profile.profile_image = profile_data["profile_image"]
                    profile.save()

        except IntegrityError:
            raise serializers.ValidationError(
                {
                    "detail": (
                        "A user with this username or email address "
                        "already exists."
                    )
                }
            )

        return instance


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing the user password."""

    old_password = serializers.CharField(
        write_only=True,
        required=True,
    )

    new_password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
    )

    new_password2 = serializers.CharField(
        write_only=True,
        required=True,
    )

    def validate(self, attrs):
        """Validate old password and ensure new passwords match."""

        user = self.context["request"].user

        if not user.check_password(attrs["old_password"]):
            raise serializers.ValidationError(
                {"old_password": "Current password is incorrect."}
            )

        if attrs["new_password"] != attrs["new_password2"]:
            raise serializers.ValidationError(
                {"new_password": "Passwords do not match."}
            )

        return attrs

