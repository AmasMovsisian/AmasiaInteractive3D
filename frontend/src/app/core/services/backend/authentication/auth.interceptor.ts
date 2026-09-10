import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import {
  catchError,
  finalize,
  Observable,
  shareReplay,
  switchMap,
  throwError,
} from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { AuthService } from './auth.service';
import { LoginResponse } from './models/auth.models';

let refreshRequest$: Observable<LoginResponse> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const isLoginRequest =
    req.url === `${environment.apiUrl}/auth/login/`;
  const isRefreshRequest =
    req.url === `${environment.apiUrl}/auth/refresh/`;
  const isLogoutRequest =
    req.url === `${environment.apiUrl}/auth/logout/`;

  if (isLoginRequest) {
    return next(req);
  }

  if (isRefreshRequest) {
    return next(req);
  }

  if (isLogoutRequest) {
    return next(req);
  }

  const accessToken = authService.getAccessToken();

  if (!accessToken) {
    return next(req);
  }

  const sendRequest = (token: string) => {
    const authenticatedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(authenticatedRequest);
  };

  const refreshAndRetry = () => {
    if (!refreshRequest$) {
      refreshRequest$ = authService.refreshToken().pipe(
        shareReplay(1),
        finalize(() => {
          refreshRequest$ = null;
        }),
      );
    }

    return refreshRequest$.pipe(
      switchMap((response) => sendRequest(response.access)),
    );
  };

  if (authService.isAccessTokenExpired()) {
    return refreshAndRetry().pipe(
      catchError((error) => {
        authService.clearAuthentication();
        if (router.url !== '/login') {
          void router.navigate(['/login']);
        }
        return throwError(() => error);
      }),
    );
  }

  return sendRequest(accessToken).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      return refreshAndRetry().pipe(
        catchError((refreshError) => {
          authService.clearAuthentication();
          if (router.url !== '/login') {
            void router.navigate(['/login']);
          }
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};