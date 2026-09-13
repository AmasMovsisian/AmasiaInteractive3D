from django.db import transaction

from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from ..models import Profile

from .serializers import (
    CaseInsensitiveTokenObtainPairSerializer,
    ChangePasswordSerializer,
    RegisterSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    """API view for user registration."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class LoginView(TokenObtainPairView):
    """JWT login view with case-insensitive usernames."""

    serializer_class = CaseInsensitiveTokenObtainPairSerializer


class MeView(APIView):
    """API view to retrieve or update the authenticated user."""

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        """Return the authenticated user's data."""

        Profile.objects.get_or_create(user=request.user)

        serializer = UserSerializer(request.user)

        return Response(serializer.data)

    def patch(self, request):
        """Partially update the authenticated user's data."""

        Profile.objects.get_or_create(user=request.user)

        serializer = UserSerializer(
            request.user,
            data=request.data,
            partial=True,
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)


class DeleteAccountView(APIView):
    """API view to delete the authenticated user's account."""

    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def delete(self, request):
        """Delete the authenticated user."""

        user = request.user

        user.delete()

        return Response(
            {"detail": "Account deleted successfully."},
            status=status.HTTP_204_NO_CONTENT,
        )


class ChangePasswordView(APIView):
    """API view to change the authenticated user's password."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Change the authenticated user's password."""

        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)

        user = request.user

        user.set_password(
            serializer.validated_data["new_password"]
        )

        user.save()

        return Response(
            {"detail": "Password changed successfully."},
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """API view to log out and blacklist the refresh token."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """Blacklist the refresh token if provided."""

        refresh_token = request.data.get("refresh")

        if not refresh_token:
            return Response(
                {"detail": "Successfully logged out."},
                status=status.HTTP_205_RESET_CONTENT,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response(
                {"detail": "Successfully logged out."},
                status=status.HTTP_205_RESET_CONTENT,
            )

        except TokenError:
            return Response(
                {"detail": "Successfully logged out."},
                status=status.HTTP_205_RESET_CONTENT,
            )

