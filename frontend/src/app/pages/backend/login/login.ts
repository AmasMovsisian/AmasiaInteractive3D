import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/backend/authentication/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  username = '';
  password = '';

  errorMessage = '';
  isLoading = false;

  onSubmit(): void {
    this.errorMessage = '';

    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter your username and password.';
      return;
    }

    this.isLoading = true;

    this.authService
      .login({
        username: this.username,
        password: this.password,
      })
      .subscribe({
        next: () => {
          this.isLoading = false;

          this.router.navigate(['/dashboard']);
        },

        error: (error) => {
          this.isLoading = false;

          console.error('Login failed:', error);

          if (error.status === 401) {
            this.errorMessage = 'Invalid username or password.';
            return;
          }

          this.errorMessage = 'Something went wrong. Please try again.';
        },
      });
  }
}
