import { Component, EventEmitter, Input, Output } from '@angular/core';

import { User } from '../../../../../core/services/backend/authentication/models/auth.models';

/**
 * Card component displaying the user's profile summary.
 */
@Component({
  selector: 'app-profile-card',
  standalone: true,
  imports: [],
  templateUrl: './profile-card.html',
  styleUrl: './profile-card.scss',
})
export class ProfileCardComponent {
  @Input() user!: User;
  @Input() profileImageUrl = '';

  @Output() openSettings = new EventEmitter<void>();
  @Output() profileImageError = new EventEmitter<Event>();

  /**
   * Emit the open settings event.
   */
  openProfileSettings(): void {
    this.openSettings.emit();
  }

  /**
   * Emit the profile image error event.
   */
  onProfileImageError(event: Event): void {
    this.profileImageError.emit(event);
  }
}
