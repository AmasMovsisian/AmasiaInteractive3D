import { ChangeDetectorRef, Component, NgZone, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/backend/authentication/auth.service';
import { Nav } from '../../../sections/shared/nav/nav';
import { Footer } from '../../../sections/shared/footer/footer';

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
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  username = '';
  password = '';

  errorMessage = '';
  isLoading = false;

  onSubmit(): void {
    this.errorMessage = '';

    const username = this.username.trim();
    const password = this.password;

    if (!username || !password) {
      this.errorMessage = 'Please enter your username and password.';
      this.cdr.detectChanges();
      return;
    }

    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    this.authService
      .login({
        username,
        password,
      })
      .subscribe({
        next: () => {
          this.zone.run(() => {
            this.isLoading = false;
            this.errorMessage = '';
            this.cdr.detectChanges();
            this.router.navigate(['/dashboard']);
          });
        },

        error: (error) => {
          this.zone.run(() => {
            this.isLoading = false;

            if (error?.status === 401) {
              this.errorMessage = 'Invalid username or password.';
            } else {
              console.error('Login request failed:', error);
              this.errorMessage = 'Something went wrong. Please try again.';
            }

            this.cdr.detectChanges();
          });
        },
      });
  }
}
