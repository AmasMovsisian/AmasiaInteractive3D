import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { ScrollService } from '../../../core/services/scroll.service';
import {
  HERO_NAVIGATION,
  HERO_TOTAL_FRAMES,
  HeroNavigationSection,
} from '../../../core/services/hero-navigation';
import { AuthService } from '../../../core/services/backend/authentication/auth.service';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './nav.html',
  styleUrl: './nav.scss',
})
export class Nav implements OnInit, OnDestroy {
  menuOpen = false;
  isDarkMode = false;
  isLoggedIn = false;

  private readonly themeKey = 'theme';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly scrollService: ScrollService,
    private readonly router: Router,
    private readonly authService: AuthService,
  ) {
    this.loadTheme();
  }

  ngOnInit(): void {
    this.authService.user$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      this.isLoggedIn = !!user;
    });
  }

  logout(): void {
    this.closeMenu();
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/']);
    });
  }

  goToStart(event?: Event): void {
    event?.preventDefault();
    this.closeMenu();

    const frame = HERO_NAVIGATION.home;
    const currentUrl = this.router.url.split('?')[0].split('#')[0];
    const isHeroPage = currentUrl === '/' || currentUrl === '';

    if (isHeroPage) {
      this.scrollService.scrollToFrame(frame, HERO_TOTAL_FRAMES, 'smooth');
      return;
    }

    this.router.navigate(['/']).then(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.scrollService.scrollToFrame(frame, HERO_TOTAL_FRAMES, 'smooth');
        });
      });
    });
  }

  async scrollToSection(section: HeroNavigationSection, event?: Event): Promise<void> {
    event?.preventDefault();
    this.closeMenu();

    const frame = HERO_NAVIGATION[section];
    const currentUrl = this.router.url.split('?')[0].split('#')[0];
    const isHeroPage = currentUrl === '/' || currentUrl === '';

    if (isHeroPage) {
      this.scrollService.scrollToFrame(frame, HERO_TOTAL_FRAMES, 'smooth');
      return;
    }

    try {
      await this.router.navigate(['/']);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.scrollService.scrollToFrame(frame, HERO_TOTAL_FRAMES, 'smooth');
        });
      });
    } catch (error) {
      console.error('Navigation to hero section failed:', error);
    }
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    this.updateBodyScrollLock();
  }

  closeMenu(): void {
    this.menuOpen = false;
    this.updateBodyScrollLock();
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    this.applyTheme();
    localStorage.setItem(this.themeKey, this.isDarkMode ? 'dark' : 'light');
  }

  private loadTheme(): void {
    const savedTheme = localStorage.getItem(this.themeKey);
    this.isDarkMode = savedTheme === 'dark';
    this.applyTheme();
  }

  private applyTheme(): void {
    document.documentElement.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light');
  }

  private updateBodyScrollLock(): void {
    document.body.style.overflow = this.menuOpen ? 'hidden' : '';
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 900 && this.menuOpen) {
      this.menuOpen = false;
      this.updateBodyScrollLock();
    }
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.menuOpen) {
      this.menuOpen = false;
      this.updateBodyScrollLock();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.body.style.overflow = '';
  }
}
