import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, of, catchError, map, finalize, throwError } from 'rxjs';

import { environment } from '../../../../../environments/environment';

import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  ChangePasswordRequest,
} from './models/auth.models';

/**
 * Service handling authentication, tokens and user state.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/auth`;

  private readonly accessTokenKey = 'access_token';
  private readonly refreshTokenKey = 'refresh_token';

  private readonly userSubject = new BehaviorSubject<User | null>(null);

  readonly user$ = this.userSubject.asObservable();

  private readonly authState = signal(this.hasStoredAccessToken());

  readonly isLoggedIn = this.authState.asReadonly();

  private readonly authInitializedSubject = new BehaviorSubject<boolean>(false);

  readonly authInitialized$ = this.authInitializedSubject.asObservable();

  /**
   * Register a new user.
   */
  register(data: RegisterRequest): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/register/`, data);
  }

  /**
   * Log in a user and store the returned tokens.
   */
  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login/`, data).pipe(
      tap((response) => {
        this.setTokens(response);
      }),
    );
  }

  /**
   * Fetch the current authenticated user.
   */
  getMe(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me/`).pipe(
      tap((user) => {
        this.userSubject.next(user);
        this.authState.set(true);
      }),
    );
  }

  /**
   * Update the current user's profile.
   */
  updateProfile(data: { username?: string; profile_image?: File }): Observable<User> {
    const formData = new FormData();

    if (data.username !== undefined) {
      formData.append('username', data.username);
    }

    if (data.profile_image) {
      formData.append('profile_image', data.profile_image);
    }

    return this.http.patch<User>(`${this.apiUrl}/me/`, formData).pipe(
      tap((user) => {
        this.userSubject.next(user);
      }),
    );
  }

  /**
   * Change the current user's password.
   */
  changePassword(data: ChangePasswordRequest): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(`${this.apiUrl}/change-password/`, data);
  }

  /**
   * Delete the current user's account and clear the session.
   */
  deleteAccount(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete-account/`).pipe(
      tap(() => {
        this.clearSession();
      }),
    );
  }

  /**
   * Initialize authentication state from stored tokens.
   */
  initializeAuthentication(): Observable<boolean> {
    if (!this.getAccessToken()) {
      this.userSubject.next(null);
      this.authState.set(false);
      this.authInitializedSubject.next(true);

      return of(false);
    }

    return this.getMe().pipe(
      map(() => {
        this.authState.set(true);

        return true;
      }),
      catchError(() => {
        this.clearSession();

        return of(false);
      }),
      finalize(() => {
        this.authInitializedSubject.next(true);
      }),
    );
  }

  /**
   * Log out the user and clear the session.
   */
  logout(): Observable<void> {
    const refreshToken = this.getRefreshToken();

    this.userSubject.next(null);
    this.authState.set(false);

    if (!refreshToken) {
      this.clearSession();

      return of(undefined);
    }

    return this.http
      .post<void>(`${this.apiUrl}/logout/`, {
        refresh: refreshToken,
      })
      .pipe(
        catchError(() => of(undefined)),
        finalize(() => {
          this.clearSession();
        }),
      );
  }

  /**
   * Refresh the access token using the refresh token.
   */
  refreshToken(): Observable<LoginResponse> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      this.clearSession();

      return throwError(() => new Error('No refresh token available.'));
    }

    return this.http
      .post<LoginResponse>(`${this.apiUrl}/refresh/`, {
        refresh: refreshToken,
      })
      .pipe(
        tap((response) => {
          this.setTokens(response);
        }),
      );
  }

  /**
   * Return the stored access token.
   */
  getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  /**
   * Return the stored refresh token.
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  /**
   * Check if the user is authenticated.
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Check if the access token is expired or about to expire.
   */
  isAccessTokenExpired(bufferSeconds = 30): boolean {
    const token = this.getAccessToken();

    if (!token) {
      return true;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));

      if (typeof payload.exp !== 'number') {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);

      return payload.exp <= currentTime + bufferSeconds;
    } catch {
      return true;
    }
  }

  /**
   * Check if authentication has been initialized.
   */
  isAuthInitialized(): boolean {
    return this.authInitializedSubject.value;
  }

  /**
   * Clear authentication state and tokens.
   */
  clearAuthentication(): void {
    this.clearSession();
  }

  /**
   * Store access and refresh tokens.
   */
  private setTokens(response: LoginResponse): void {
    localStorage.setItem(this.accessTokenKey, response.access);
    localStorage.setItem(this.refreshTokenKey, response.refresh);
    this.authState.set(true);
  }

  /**
   * Clear stored tokens and reset user state.
   */
  private clearSession(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    this.userSubject.next(null);
    this.authState.set(false);
  }

  /**
   * Check if an access token is stored.
   */
  private hasStoredAccessToken(): boolean {
    return !!localStorage.getItem(this.accessTokenKey);
  }
}
