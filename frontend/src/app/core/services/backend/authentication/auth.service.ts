import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, of, catchError, map, finalize } from 'rxjs';

import { environment } from '../../../../../environments/environment';

import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  ChangePasswordRequest,
} from './models/auth.models';

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

  register(data: RegisterRequest): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/register/`, data);
  }

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login/`, data).pipe(
      tap((response) => {
        this.setTokens(response);
      }),
    );
  }

  getMe(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me/`).pipe(
      tap((user) => {
        this.userSubject.next(user);
        this.authState.set(true);
      }),
    );
  }

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

  changePassword(data: ChangePasswordRequest): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(`${this.apiUrl}/change-password/`, data);
  }

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
        finalize(() => {
          this.clearSession();
        }),
        catchError((error) => {
          console.error('Backend logout failed:', error);
          return of(undefined);
        }),
      );
  }

  refreshToken(): Observable<LoginResponse> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      this.clearSession();

      return new Observable((subscriber) => {
        subscriber.error(new Error('No refresh token available.'));
      });
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

  getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  isAuthInitialized(): boolean {
    return this.authInitializedSubject.value;
  }

  clearAuthentication(): void {
    this.clearSession();
  }

  private setTokens(response: LoginResponse): void {
    localStorage.setItem(this.accessTokenKey, response.access);
    localStorage.setItem(this.refreshTokenKey, response.refresh);
    this.authState.set(true);
  }

  private clearSession(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    this.userSubject.next(null);
    this.authState.set(false);
  }

  private hasStoredAccessToken(): boolean {
    return !!localStorage.getItem(this.accessTokenKey);
  }
}
