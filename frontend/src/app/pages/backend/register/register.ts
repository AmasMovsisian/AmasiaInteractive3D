import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/backend/authentication/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule],
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

  errorMessage = '';
  isLoading = false;

  onSubmit(): void {
    this.errorMessage = '';

    if (!this.username || !this.email || !this.password || !this.password2) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    if (this.password !== this.password2) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isLoading = true;

    this.authService
      .register({
        username: this.username,
        email: this.email,
        password: this.password,
        password2: this.password2,
      })
      .subscribe({
        next: () => {
          this.isLoading = false;

          this.router.navigate(['/login']);
        },

        error: (error) => {
          this.isLoading = false;

          console.error('Registration failed:', error);

          if (error.status === 400 && error.error) {
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
