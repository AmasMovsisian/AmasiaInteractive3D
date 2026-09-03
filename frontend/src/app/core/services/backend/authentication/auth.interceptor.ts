import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';

import { inject } from '@angular/core';

import { catchError, finalize, Observable, shareReplay, switchMap, throwError } from 'rxjs';

import { Router } from '@angular/router';

import { environment } from '../../../../../environments/environment';

import { AuthService } from './auth.service';

let refreshRequest$: Observable<any> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Nur Requests an unser Backend bearbeiten
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const isLoginRequest = req.url === `${environment.apiUrl}/auth/login/`;

  const isRefreshRequest = req.url === `${environment.apiUrl}/auth/refresh/`;

  const accessToken = authService.getAccessToken();

  /*
   * Login und Refresh brauchen keinen bestehenden
   * Access Token.
   */
  if (isLoginRequest || isRefreshRequest || !accessToken) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      /*
       * Ein 401 vom normalen Request kann einen
       * Token-Refresh auslösen.

       * Login und Refresh werden oben bereits
       * ausgeschlossen.
       */
      if (error.status !== 401) {
        return throwError(() => error);
      }

      if (!refreshRequest$) {
        refreshRequest$ = authService.refreshToken().pipe(
          shareReplay(1),

          finalize(() => {
            refreshRequest$ = null;
          }),
        );
      }

      return refreshRequest$.pipe(
        switchMap((response) => {
          const newAccessToken = response.access;

          const retryRequest = req.clone({
            setHeaders: {
              Authorization: `Bearer ${newAccessToken}`,
            },
          });

          return next(retryRequest);
        }),

        catchError((refreshError) => {
          authService.clearAuthentication();

          if (router.url !== '/login') {
            router.navigate(['/login']);
          }

          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
