import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/backend/authentication/auth.service';
import { Nav } from '../../../sections/shared/nav/nav';
import { Footer } from '../../../sections/shared/footer/footer';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, Nav, Footer],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  username = '';
  email = '';
  password = '';
  password2 = '';

  showPassword = false;
  showPassword2 = false;

  errorMessage = '';
  isLoading = false;

  onSubmit(): void {
    this.errorMessage = '';

    const username = this.username.trim();
    const email = this.email.trim();
    const password = this.password;
    const password2 = this.password2;

    if (!username || !email || !password || !password2) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    if (password !== password2) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    if (this.isLoading) {
      return;
    }

    this.isLoading = true;

    this.authService
      .register({
        username,
        email,
        password,
        password2,
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/login']);
        },

        error: (error) => {
          this.isLoading = false;

          console.error('Registration failed:', error);

          if (error?.status === 400 && error?.error) {
            this.errorMessage = this.getErrorMessage(error.error);
            return;
          }

          this.errorMessage = 'Something went wrong. Please try again.';
        },
      });
  }

  private getErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }

    if (typeof error === 'object' && error !== null) {
      const messages = Object.values(error);

      return messages
        .flat()
        .map((message) => String(message))
        .join(' ');
    }

    return 'Registration failed. Please try again.';
  }
}
