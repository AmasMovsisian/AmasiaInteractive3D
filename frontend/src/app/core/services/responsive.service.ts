import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
/** Tracks viewport width and provides device type checks. */
export class ResponsiveService {
  private width = signal(window.innerWidth);

  constructor() {
    window.addEventListener('resize', () => {
      this.width.set(window.innerWidth);
    });
  }

  /** Returns true if viewport width is mobile-sized. */
  isMobile() {
    return this.width() <= 600;
  }

  /** Returns true if viewport width is tablet-sized. */
  isTablet() {
    return this.width() > 600 && this.width() <= 1024;
  }

  /** Returns true if viewport width is desktop-sized. */
  isDesktop() {
    return this.width() > 1024;
  }
}
