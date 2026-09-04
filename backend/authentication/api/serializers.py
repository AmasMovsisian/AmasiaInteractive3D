from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password

from rest_framework import serializers

from ..models import Profile


class RegisterSerializer(serializers.ModelSerializer):
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
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError(
                {"password": "Passwords do not match."}
            )

        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")

        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )

        Profile.objects.create(user=user)

        return user


class UserSerializer(serializers.ModelSerializer):
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

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})

        instance = super().update(instance, validated_data)

        if profile_data:
            profile, created = Profile.objects.get_or_create(
                user=instance
            )

            if "profile_image" in profile_data:
                profile.profile_image = profile_data["profile_image"]
                profile.save()

        return instance


class ChangePasswordSerializer(serializers.Serializer):
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
        user = self.context["request"].user

        if not user.check_password(attrs["old_password"]):
            raise serializers.ValidationError(
                {
                    "old_password": "Current password is incorrect."
                }
            )

        if attrs["new_password"] != attrs["new_password2"]:
            raise serializers.ValidationError(
                {
                    "new_password": "Passwords do not match."
                }
            )

        return attrs
