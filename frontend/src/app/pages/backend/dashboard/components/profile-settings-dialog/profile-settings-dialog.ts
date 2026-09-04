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

  ngOnInit(): void {
    this.usernameEditValue = this.user?.username ?? '';
    this.resetPasswordForm();
  }

  ngOnDestroy(): void {
    if (!this.isImageCropOpen) {
      document.body.style.overflow = '';
    }
  }

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

  onProfileImageError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (img) {
      img.style.display = 'none';
    }
  }

  openImageCrop(): void {
    if (this.isUpdatingProfile) {
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

  closeDialog(): void {
    if (this.isUpdatingProfile) {
      return;
    }

    if (this.isImageCropOpen) {
      this.closeImageCrop();
    }

    this.editingSetting = null;
    this.usernameEditValue = this.user?.username ?? '';
    this.resetPasswordForm();
    this.profileUpdateMessage = '';
    this.profileUpdateError = false;
    this.close.emit();
  }

  closeImageCrop(): void {
    if (this.isUpdatingProfile) {
      return;
    }

    this.isImageCropOpen = false;
  }

  onImageUploaded(user: User): void {
    this.userUpdated.emit(user);
    this.closeImageCrop();
    this.showProfileMessage('Profile image updated successfully.');
  }

  editName(): void {
    if (this.isUpdatingProfile || !this.user) {
      return;
    }

    this.usernameEditValue = this.user.username;
    this.editingSetting = 'username';
    this.profileUpdateMessage = '';
    this.profileUpdateError = false;
    this.cdr.detectChanges();
  }

  saveUsername(username?: string): void {
    if (!this.user || this.isUpdatingProfile) {
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

  editPassword(): void {
    if (this.isUpdatingProfile) {
      return;
    }

    this.editingSetting = 'password';
    this.resetPasswordForm();
    this.profileUpdateMessage = '';
    this.profileUpdateError = false;
    this.cdr.detectChanges();
  }

  savePassword(): void {
    if (this.isUpdatingProfile) {
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

  cancelSettingEdit(): void {
    if (this.isUpdatingProfile) {
      return;
    }

    this.editingSetting = null;
    this.usernameEditValue = this.user?.username ?? '';
    this.resetPasswordForm();
    this.profileUpdateMessage = '';
    this.profileUpdateError = false;
    this.cdr.detectChanges();
  }

  private resetPasswordForm(): void {
    this.passwordForm = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };
  }

  private showProfileMessage(message: string, error = false): void {
    this.profileUpdateMessage = message;
    this.profileUpdateError = error;
    this.cdr.detectChanges();
  }

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
