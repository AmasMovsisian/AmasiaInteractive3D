import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { environment } from '../../../../../../environments/environment';

import { AuthService } from '../../../../../core/services/backend/authentication/auth.service';
import {
  User,
  ChangePasswordRequest,
} from '../../../../../core/services/backend/authentication/models/auth.models';

import { ImageCropModalComponent } from '../image-crop-modal/image-crop-modal';

/**
 * Dialog component for managing profile settings.
 */
@Component({
  selector: 'app-profile-settings-dialog',
  standalone: true,
  imports: [FormsModule, ImageCropModalComponent],
  templateUrl: './profile-settings-dialog.html',
  styleUrl: './profile-settings-dialog.scss',
})
export class ProfileSettingsDialogComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() user!: User;

  @Output() close = new EventEmitter<void>();
  @Output() userUpdated = new EventEmitter<User>();

  @ViewChild(ImageCropModalComponent)
  private imageCropModal?: ImageCropModalComponent;

  isUpdatingProfile = false;
  isDeletingAccount = false;

  profileUpdateMessage = '';
  profileUpdateError = false;

  editingSetting: 'username' | 'password' | null = null;

  usernameEditValue = '';
  readonly maxUsernameLength = 9;

  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  isImageCropOpen = false;
  isDeleteConfirmationOpen = false;
  isAccountDeleted = false;

  accountDeletedMessage = 'Your account has been successfully deleted.';

  private accountDeletionNavigationTimer?: ReturnType<typeof setTimeout>;

  /**
   * Initialize form values from the current user.
   */
  ngOnInit(): void {
    this.usernameEditValue = this.user?.username ?? '';
    this.resetPasswordForm();
  }

  /**
   * Clean up timers and body styles on destroy.
   */
  ngOnDestroy(): void {
    document.body.style.overflow = '';

    if (this.accountDeletionNavigationTimer) {
      clearTimeout(this.accountDeletionNavigationTimer);
      this.accountDeletionNavigationTimer = undefined;
    }
  }

  /**
   * Build an absolute URL for the profile image.
   */
  getProfileImageUrl(profileImage: string | null | undefined): string {
    if (!profileImage) {
      return '';
    }

    const image = profileImage.trim();

    if (!image) {
      return '';
    }

    if (
      image.startsWith('http://') ||
      image.startsWith('https://') ||
      image.startsWith('blob:') ||
      image.startsWith('data:')
    ) {
      return image;
    }

    try {
      const backendOrigin = new URL(environment.apiUrl).origin;
      const normalizedPath = image.startsWith('/') ? image : `/${image}`;

      return `${backendOrigin}${normalizedPath}`;
    } catch {
      return image;
    }
  }

  /**
   * Hide the image when it fails to load.
   */
  onProfileImageError(event: Event): void {
    const img = event.target as HTMLImageElement | null;

    if (img) {
      img.style.display = 'none';
    }
  }

  /**
   * Open the image crop modal and trigger the file picker.
   */
  openImageCrop(): void {
    if (this.isUpdatingProfile || this.isDeletingAccount || this.isAccountDeleted) {
      return;
    }

    this.profileUpdateMessage = '';
    this.profileUpdateError = false;

    this.isImageCropOpen = true;

    document.body.style.overflow = 'hidden';

    this.cdr.detectChanges();

    requestAnimationFrame(() => {
      this.imageCropModal?.triggerFileUpload();
    });
  }

  /**
   * Close the dialog and reset its state.
   */
  closeDialog(): void {
    if (this.isUpdatingProfile || this.isDeletingAccount || this.isAccountDeleted) {
      return;
    }

    if (this.isImageCropOpen) {
      this.closeImageCrop();
    }

    this.editingSetting = null;
    this.isDeleteConfirmationOpen = false;

    this.usernameEditValue = this.user?.username ?? '';

    this.resetPasswordForm();

    this.profileUpdateMessage = '';
    this.profileUpdateError = false;

    document.body.style.overflow = '';

    this.close.emit();
  }

  /**
   * Close the image crop modal.
   */
  closeImageCrop(): void {
    if (this.isUpdatingProfile || this.isDeletingAccount || this.isAccountDeleted) {
      return;
    }

    this.isImageCropOpen = false;

    document.body.style.overflow = 'hidden';

    this.cdr.detectChanges();
  }

  /**
   * Handle a successful profile image upload.
   */
  onImageUploaded(user: User): void {
    this.user = user;

    this.userUpdated.emit(user);

    this.closeImageCrop();

    this.showProfileMessage('Profile image updated successfully.');
  }

  /**
   * Enter username editing mode.
   */
  editName(): void {
    if (this.isUpdatingProfile || this.isDeletingAccount || this.isAccountDeleted || !this.user) {
      return;
    }

    this.usernameEditValue = this.user.username;

    this.editingSetting = 'username';

    this.profileUpdateMessage = '';
    this.profileUpdateError = false;

    this.cdr.detectChanges();
  }

  /**
   * Save the new username.
   */
  saveUsername(username?: string): void {
    if (!this.user || this.isUpdatingProfile || this.isDeletingAccount || this.isAccountDeleted) {
      return;
    }

    const value = username ?? this.usernameEditValue;

    const trimmedUsername = value.trim().slice(0, this.maxUsernameLength);

    if (!trimmedUsername) {
      this.showProfileMessage('Username cannot be empty.', true);
      return;
    }

    if (trimmedUsername.length < 3) {
      this.showProfileMessage('Username must contain at least 3 characters.', true);
      return;
    }

    if (trimmedUsername === this.user.username) {
      this.editingSetting = null;

      this.showProfileMessage('Username unchanged.');

      return;
    }

    this.isUpdatingProfile = true;

    this.profileUpdateMessage = '';
    this.profileUpdateError = false;

    this.authService
      .updateProfile({
        username: trimmedUsername,
      })
      .subscribe({
        next: (user) => {
          this.user = user;

          this.userUpdated.emit(user);

          this.usernameEditValue = user.username;

          this.isUpdatingProfile = false;
          this.editingSetting = null;

          this.showProfileMessage('Username updated successfully.');

          this.cdr.detectChanges();
        },

        error: (error) => {
          console.error('[ProfileSettings] Username update failed:', error);

          this.isUpdatingProfile = false;

          this.showProfileMessage(
            this.getBackendErrorMessage(error, 'Unable to update your username.'),
            true,
          );

          this.cdr.detectChanges();
        },
      });
  }

  /**
   * Enter password editing mode.
   */
  editPassword(): void {
    if (this.isUpdatingProfile || this.isDeletingAccount || this.isAccountDeleted) {
      return;
    }

    this.editingSetting = 'password';

    this.resetPasswordForm();

    this.profileUpdateMessage = '';
    this.profileUpdateError = false;

    this.cdr.detectChanges();
  }

  /**
   * Validate and submit the password change.
   */
  savePassword(): void {
    if (this.isUpdatingProfile || this.isDeletingAccount || this.isAccountDeleted) {
      return;
    }

    const currentPassword = this.passwordForm.currentPassword.trim();
    const newPassword = this.passwordForm.newPassword.trim();
    const confirmPassword = this.passwordForm.confirmPassword.trim();

    if (!currentPassword) {
      this.showProfileMessage('Please enter your current password.', true);
      return;
    }

    if (!newPassword) {
      this.showProfileMessage('Please enter a new password.', true);
      return;
    }

    if (newPassword.length < 8) {
      this.showProfileMessage('New password must contain at least 8 characters.', true);
      return;
    }

    if (!confirmPassword) {
      this.showProfileMessage('Please confirm your new password.', true);
      return;
    }

    if (newPassword !== confirmPassword) {
      this.showProfileMessage('New passwords do not match.', true);
      return;
    }

    this.isUpdatingProfile = true;

    this.profileUpdateMessage = '';
    this.profileUpdateError = false;

    const payload: ChangePasswordRequest = {
      old_password: currentPassword,
      new_password: newPassword,
      new_password2: confirmPassword,
    };

    this.authService.changePassword(payload).subscribe({
      next: (response) => {
        this.isUpdatingProfile = false;
        this.editingSetting = null;

        this.resetPasswordForm();

        this.showProfileMessage(response?.detail || 'Password changed successfully.');

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('[ProfileSettings] Password change failed:', error);

        this.isUpdatingProfile = false;

        this.showProfileMessage(
          this.getBackendErrorMessage(error, 'Unable to change your password.'),
          true,
        );

        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Cancel the current setting edit.
   */
  cancelSettingEdit(): void {
    if (this.isUpdatingProfile || this.isDeletingAccount || this.isAccountDeleted) {
      return;
    }

    this.editingSetting = null;

    this.usernameEditValue = this.user?.username ?? '';

    this.resetPasswordForm();

    this.profileUpdateMessage = '';
    this.profileUpdateError = false;

    this.cdr.detectChanges();
  }

  /**
   * Open the delete account confirmation.
   */
  startDeleteAccount(): void {
    if (
      this.isUpdatingProfile ||
      this.isDeletingAccount ||
      this.isImageCropOpen ||
      this.isAccountDeleted
    ) {
      return;
    }

    this.editingSetting = null;

    this.resetPasswordForm();

    this.profileUpdateMessage = '';
    this.profileUpdateError = false;

    this.isDeleteConfirmationOpen = true;

    this.cdr.detectChanges();
  }

  /**
   * Cancel the delete account confirmation.
   */
  cancelDeleteAccount(): void {
    if (this.isDeletingAccount || this.isAccountDeleted) {
      return;
    }

    this.isDeleteConfirmationOpen = false;

    this.profileUpdateMessage = '';
    this.profileUpdateError = false;

    this.cdr.detectChanges();
  }

  /**
   * Delete the user account.
   */
  deleteAccount(): void {
    if (
      this.isDeletingAccount ||
      this.isUpdatingProfile ||
      !this.isDeleteConfirmationOpen ||
      this.isAccountDeleted
    ) {
      return;
    }

    this.isDeletingAccount = true;

    this.profileUpdateMessage = '';
    this.profileUpdateError = false;

    this.cdr.detectChanges();

    this.authService.deleteAccount().subscribe({
      next: () => {
        this.finishAccountDeletion();
      },

      error: (error) => {
        console.error('[ProfileSettings] Account deletion failed:', error);

        if (error?.status === 401 || error?.status === 404) {
          this.finishAccountDeletion();
          return;
        }

        this.isDeletingAccount = false;

        this.showProfileMessage(
          this.getBackendErrorMessage(error, 'Unable to delete your account.'),
          true,
        );

        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Show the account deleted screen and navigate home.
   */
  private finishAccountDeletion(): void {
    this.isDeletingAccount = false;

    this.isDeleteConfirmationOpen = false;
    this.editingSetting = null;
    this.isImageCropOpen = false;

    document.body.style.overflow = '';

    this.authService.clearAuthentication();

    this.accountDeletedMessage = 'Your account has been successfully deleted.';

    this.isAccountDeleted = true;

    setTimeout(() => {
      this.cdr.markForCheck();
    }, 0);

    this.accountDeletionNavigationTimer = setTimeout(() => {
      window.location.href = '/';
    }, 1800);
  }

  /**
   * Reset the password form fields.
   */
  private resetPasswordForm(): void {
    this.passwordForm = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };
  }

  /**
   * Display a profile message with optional error state.
   */
  private showProfileMessage(message: string, error = false): void {
    this.profileUpdateMessage = message;
    this.profileUpdateError = error;

    this.cdr.detectChanges();
  }

  /**
   * Extract a readable error message from a backend response.
   */
  private getBackendErrorMessage(error: any, fallback: string): string {
    if (!error?.error) {
      return fallback;
    }

    const backendError = error.error;

    if (typeof backendError === 'string') {
      return backendError;
    }

    const fields = [
      'detail',
      'username',
      'old_password',
      'current_password',
      'new_password',
      'new_password2',
      'password',
      'non_field_errors',
    ];

    for (const field of fields) {
      const value = backendError[field];

      if (!value) {
        continue;
      }

      if (Array.isArray(value)) {
        return String(value[0]);
      }

      return String(value);
    }

    return fallback;
  }
}
