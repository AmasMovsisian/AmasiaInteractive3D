import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/backend/authentication/auth.service';
import { Nav } from '../../../sections/shared/nav/nav';
import { Footer } from '../../../sections/shared/footer/footer';

/**
 * Register page component.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, Nav, Footer],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  username = '';
  email = '';
  password = '';
  password2 = '';

  showPassword = false;
  showPassword2 = false;

  errorMessage = '';
  isLoading = false;

  ngOnInit(): void {
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant',
      });
    });
  }

  /**
   * Validate and submit the registration form.
   */
  onSubmit(): void {
    if (this.isLoading) {
      return;
    }

    this.errorMessage = '';

    const username = this.username.trim();
    const email = this.email.trim();
    const password = this.password;
    const password2 = this.password2;

    if (!username || !email || !password || !password2) {
      this.errorMessage = 'Please fill in all fields.';
      this.changeDetectorRef.markForCheck();
      return;
    }

    if (!this.isValidUsername(username)) {
      this.errorMessage =
        'Username must be 4–9 characters and contain only letters, numbers, or underscores.';
      this.changeDetectorRef.markForCheck();
      return;
    }

    if (!this.isValidEmail(email)) {
      this.errorMessage = 'Please enter a valid email address.';
      this.changeDetectorRef.markForCheck();
      return;
    }

    if (password.length < 8) {
      this.errorMessage = 'Password must be at least 8 characters long.';
      this.changeDetectorRef.markForCheck();
      return;
    }

    if (password !== password2) {
      this.errorMessage = 'Passwords do not match.';
      this.changeDetectorRef.markForCheck();
      return;
    }

    this.isLoading = true;
    this.changeDetectorRef.markForCheck();

    this.authService
      .register({
        username,
        email,
        password,
        password2,
      })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/login']);
        },

        error: (error: HttpErrorResponse) => {
          this.handleRegistrationError(error);
          this.changeDetectorRef.markForCheck();
        },
      });
  }

  /**
   * Map a registration error to a user-friendly message.
   */
  private handleRegistrationError(error: HttpErrorResponse): void {
    const status = error.status;
    const backendError = error.error;

    if ((status === 400 || status === 409) && backendError) {
      this.errorMessage = this.getErrorMessage(backendError);
      return;
    }

    if (status === 0) {
      this.errorMessage = 'The server is currently unavailable. Please try again in a moment.';
      return;
    }

    if (status >= 500) {
      this.errorMessage = 'The server encountered a problem. Please try again later.';
      return;
    }

    this.errorMessage = 'Something went wrong. Please try again.';
  }

  /**
   * Check if the username matches the allowed pattern.
   */
  private isValidUsername(username: string): boolean {
    return /^[a-zA-Z0-9_]{4,9}$/.test(username);
  }

  /**
   * Check if the email has a valid format.
   */
  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Extract a readable message from a backend error payload.
   */
  private getErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }

    if (Array.isArray(error)) {
      return error.map((message) => String(message)).join(' ');
    }

    if (typeof error === 'object' && error !== null) {
      const messages = Object.values(error)
        .flat()
        .map((message) => String(message));

      if (messages.length > 0) {
        return messages.join(' ');
      }
    }

    return 'Registration failed. Please try again.';
  }
}
