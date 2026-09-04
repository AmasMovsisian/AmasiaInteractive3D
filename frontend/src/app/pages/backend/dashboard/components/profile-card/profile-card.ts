import { Component, EventEmitter, Input, Output } from '@angular/core';

import { User } from '../../../../../core/services/backend/authentication/models/auth.models';

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

  openProfileSettings(): void {
    this.openSettings.emit();
  }

  onProfileImageError(event: Event): void {
    this.profileImageError.emit(event);
  }
}
