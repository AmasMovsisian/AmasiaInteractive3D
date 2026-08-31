import { Component, HostListener } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ScrollService } from '../../../core/services/scroll.service';
import {
  HERO_NAVIGATION,
  HERO_TOTAL_FRAMES,
  HeroNavigationSection,
} from '../../../core/services/hero-navigation';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './nav.html',
  styleUrl: './nav.scss',
})
/** Navigation component with theme toggle and hero section scrolling. */
export class Nav {
  menuOpen = false;
  isDarkMode = false;
  private readonly themeKey = 'theme';

  constructor(
    private readonly scrollService: ScrollService,
    private readonly router: Router,
  ) {
    this.loadTheme();
  }

  /** Navigates to the hero start section, scrolling smoothly if already on hero page. */
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

  /** Scrolls to a hero section, navigating to hero page first if needed. */
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

  /** Toggles the mobile menu and updates body scroll lock. */
  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    this.updateBodyScrollLock();
  }

  /** Toggles dark/light theme and persists the preference. */
  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    this.applyTheme();
    localStorage.setItem(this.themeKey, this.isDarkMode ? 'dark' : 'light');
  }

  /** Closes the mobile menu and updates body scroll lock. */
  closeMenu(): void {
    this.menuOpen = false;
    this.updateBodyScrollLock();
  }

  /** Loads the saved theme preference from localStorage. */
  private loadTheme(): void {
    const savedTheme = localStorage.getItem(this.themeKey);
    this.isDarkMode = savedTheme === 'dark';
    this.applyTheme();
  }

  /** Applies the current theme to the document root. */
  private applyTheme(): void {
    document.documentElement.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light');
  }

  /** Locks or unlocks body scroll based on menu state. */
  private updateBodyScrollLock(): void {
    document.body.style.overflow = this.menuOpen ? 'hidden' : '';
  }

  /** Closes the menu on desktop resize. */
  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 900 && this.menuOpen) {
      this.menuOpen = false;
      this.updateBodyScrollLock();
    }
  }

  /** Closes the menu on Escape key press. */
  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.menuOpen) {
      this.menuOpen = false;
      this.updateBodyScrollLock();
    }
  }

  /** Cleans up body scroll lock on component destruction. */
  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }
}
