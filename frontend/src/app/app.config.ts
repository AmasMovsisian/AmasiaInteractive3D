import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/services/backend/authentication/auth.interceptor';
import { AuthService } from './core/services/backend/authentication/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),

    provideRouter(routes),

    provideHttpClient(withInterceptors([authInterceptor])),

    provideAppInitializer(() => {
      const authService = inject(AuthService);

      return authService.initializeAuthentication();
    }),
  ],
};
