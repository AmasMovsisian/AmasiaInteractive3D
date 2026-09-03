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

  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const isRefreshRequest = req.url === `${environment.apiUrl}/auth/refresh/`;

  const accessToken = authService.getAccessToken();

  if (!accessToken) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isRefreshRequest) {
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
