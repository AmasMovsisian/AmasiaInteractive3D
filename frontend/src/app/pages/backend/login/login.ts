import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/backend/authentication/auth.service';
import { Nav } from '../../../sections/shared/nav/nav';
import { Footer } from '../../../sections/shared/footer/footer';

/**
 * Login page component.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, Nav, Footer],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  username = '';
  password = '';
  showPassword = false;

  errorMessage = '';
  isLoading = false;

  /**
   * Submit the login form.
   */
  onSubmit(): void {
    if (this.isLoading) {
      return;
    }

    this.errorMessage = '';

    const username = this.username.trim();
    const password = this.password;

    if (!username || !password) {
      this.errorMessage = 'Please enter your username and password.';
      this.changeDetectorRef.markForCheck();
      return;
    }

    this.isLoading = true;
    this.changeDetectorRef.markForCheck();

    this.authService
      .login({
        username,
        password,
      })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/dashboard']);
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 401) {
            this.errorMessage = 'Invalid username or password.';
          } else if (error.status === 0) {
            this.errorMessage =
              'The server is currently unavailable. Please try again in a moment.';
          } else if (error.status >= 500) {
            this.errorMessage = 'The server encountered a problem. Please try again later.';
          } else {
            this.errorMessage = 'Something went wrong. Please try again.';
          }

          this.changeDetectorRef.markForCheck();
        },
      });
  }
}
