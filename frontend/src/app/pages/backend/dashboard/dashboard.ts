import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/backend/authentication/auth.service';
import { User } from '../../../core/services/backend/authentication/models/auth.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  user: User | null = null;
  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.loadUser();
  }

  private loadUser(): void {
    this.authService.getMe().subscribe({
      next: (user) => {
        this.user = user;
        this.isLoading = false;
        this.errorMessage = '';
      },

      error: (error) => {
        this.isLoading = false;

        if (error.status === 401) {
          return;
        }

        console.error('Failed to load user:', error);

        this.errorMessage = 'Unable to load your account information.';
      },
    });
  }

  logout(): void {
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
