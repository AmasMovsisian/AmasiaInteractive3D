import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

import { environment } from '../../../../environments/environment';

import { AuthService } from '../../../core/services/backend/authentication/auth.service';
import { User } from '../../../core/services/backend/authentication/models/auth.models';

import { Nav } from '../../../sections/shared/nav/nav';
import { Footer } from '../../../sections/shared/footer/footer';

import { ProfileSettingsDialogComponent } from './components/profile-settings-dialog/profile-settings-dialog';
import { ProfileCardComponent } from './components/profile-card/profile-card';
import { OrdersCardComponent } from './components/orders-card/orders-card';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [Nav, Footer, ProfileSettingsDialogComponent, ProfileCardComponent, OrdersCardComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  user: User | null = null;
  isLoading = true;
  isLoggingOut = false;
  errorMessage = '';

  isProfileSettingsOpen = false;

  ngOnInit(): void {
    this.loadUser();
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  get profileImageUrl(): string {
    return this.getProfileImageUrl(this.user?.profile_image);
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

  private loadUser(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.getMe().subscribe({
      next: (user) => {
        this.user = user;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[Dashboard] getMe failed:', error);
        this.isLoading = false;

        if (error?.status === 401) {
          this.user = null;
          this.authService.clearAuthentication();
          this.router.navigate(['/']);
          return;
        }

        this.errorMessage = 'Unable to load your account information.';
        this.cdr.detectChanges();
      },
    });
  }

  openProfileSettings(): void {
    this.isProfileSettingsOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeProfileSettings(): void {
    this.isProfileSettingsOpen = false;
    document.body.style.overflow = '';
  }

  onUserUpdated(user: User): void {
    this.user = user;
    this.cdr.detectChanges();
  }

  logout(): void {
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;
    this.cdr.detectChanges();

    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: () => {
        this.router.navigate(['/']);
      },
    });
  }
}
