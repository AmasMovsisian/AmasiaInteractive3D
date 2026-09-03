import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, of, catchError, map, finalize } from 'rxjs';

import { environment } from '../../../../../environments/environment';

import { LoginRequest, LoginResponse, RegisterRequest, User } from './models/auth.models';

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
      }),
    );
  }

  initializeAuthentication(): Observable<boolean> {
    if (!this.getAccessToken()) {
      this.userSubject.next(null);
      this.authInitializedSubject.next(true);

      return of(false);
    }

    return this.getMe().pipe(
      map(() => true),

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

    if (!refreshToken) {
      this.clearSession();

      return of(undefined);
    }

    return this.http
      .post<void>(`${this.apiUrl}/logout/`, {
        refresh: refreshToken,
      })
      .pipe(
        tap(() => {
          this.clearSession();
        }),

        catchError((error) => {
          this.clearSession();

          throw error;
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
  }

  private clearSession(): void {
    localStorage.removeItem(this.accessTokenKey);

    localStorage.removeItem(this.refreshTokenKey);

    this.userSubject.next(null);
  }
}
