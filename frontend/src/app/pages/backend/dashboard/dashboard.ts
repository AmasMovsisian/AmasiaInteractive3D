import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ViewportScroller } from '@angular/common';

import { environment } from '../../../../environments/environment';

import { AuthService } from '../../../core/services/backend/authentication/auth.service';
import { User } from '../../../core/services/backend/authentication/models/auth.models';

import { Nav } from '../../../sections/shared/nav/nav';
import { Footer } from '../../../sections/shared/footer/footer';

import { ProfileSettingsDialogComponent } from './components/profile-settings-dialog/profile-settings-dialog';
import { ProfileCardComponent } from './components/profile-card/profile-card';
import { OrdersCardComponent } from './components/orders-card/orders-card';

/**
 * Dashboard component displaying user profile and orders.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    Nav,
    Footer,
    ProfileSettingsDialogComponent,
    ProfileCardComponent,
    OrdersCardComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly viewportScroller = inject(ViewportScroller);

  user: User | null = null;

  isLoading = true;
  isLoggingOut = false;

  errorMessage = '';

  isProfileSettingsOpen = false;

  accountDeletedMessage = '';
  private accountDeletedTimer?: ReturnType<typeof setTimeout>;

  /**
   * Scroll to top and load the current user.
   */
  ngOnInit(): void {
    this.viewportScroller.scrollToPosition([0, 0]);

    this.loadUser();
  }

  /**
   * Clean up timers and body styles on destroy.
   */
  ngOnDestroy(): void {
    document.body.style.overflow = '';

    if (this.accountDeletedTimer) {
      clearTimeout(this.accountDeletedTimer);
    }
  }

  /**
   * Return the absolute URL of the profile image.
   */
  get profileImageUrl(): string {
    return this.getProfileImageUrl(this.user?.profile_image);
  }

  /**
   * Build an absolute URL for a given profile image path.
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
   * Hide the profile image when it fails to load.
   */
  onProfileImageError(event: Event): void {
    const img = event.target as HTMLImageElement | null;

    if (img) {
      img.style.display = 'none';
    }
  }

  /**
   * Fetch the current authenticated user.
   */
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

          void this.router.navigate(['/']);

          return;
        }

        this.errorMessage = 'Unable to load your account information.';

        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Open the profile settings dialog.
   */
  openProfileSettings(): void {
    this.isProfileSettingsOpen = true;

    document.body.style.overflow = 'hidden';
  }

  /**
   * Close the profile settings dialog.
   */
  closeProfileSettings(): void {
    this.isProfileSettingsOpen = false;

    document.body.style.overflow = '';
  }

  /**
   * Handle updated user data from child components.
   */
  onUserUpdated(user: User): void {
    this.user = user;

    this.cdr.detectChanges();
  }

  /**
   * Handle account deletion and navigate home.
   */
  onAccountDeleted(): void {
    this.user = null;

    this.isProfileSettingsOpen = false;
    this.isLoading = false;
    this.errorMessage = '';

    document.body.style.overflow = '';

    this.accountDeletedMessage = 'ACCOUNT SUCCESSFULLY DELETED';

    this.cdr.detectChanges();

    if (this.accountDeletedTimer) {
      clearTimeout(this.accountDeletedTimer);
    }

    this.accountDeletedTimer = setTimeout(() => {
      this.accountDeletedMessage = '';

      this.cdr.detectChanges();

      void this.router.navigateByUrl('/');
    }, 1400);
  }

  /**
   * Log out the user and navigate home.
   */
  logout(): void {
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;

    this.cdr.detectChanges();

    this.authService.logout().subscribe({
      next: () => {
        void this.router.navigateByUrl('/');
      },

      error: () => {
        void this.router.navigateByUrl('/');
      },
    });
  }
}
