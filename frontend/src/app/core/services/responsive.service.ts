import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ResponsiveService {
  private width = signal(window.innerWidth);

  constructor() {
    window.addEventListener('resize', () => {
      this.width.set(window.innerWidth);
    });
  }

  isMobile() {
    return this.width() <= 600;
  }

  isTablet() {
    return this.width() > 600 && this.width() <= 1024;
  }

  isDesktop() {
    return this.width() > 1024;
  }
}
