import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-nav',
  imports: [],
  templateUrl: './nav.html',
  styleUrl: './nav.scss',
})
export class Nav {
  menuOpen = false;
  isDarkMode = false;

  private readonly themeKey = 'theme';

  constructor() {
    this.loadTheme();
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.updateBodyScrollLock();
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;

    this.applyTheme();

    localStorage.setItem(
      this.themeKey,
      this.isDarkMode ? 'dark' : 'light'
    );
  }

  closeMenu() {
    this.menuOpen = false;
    this.updateBodyScrollLock();
  }

  private loadTheme() {
    const savedTheme = localStorage.getItem(this.themeKey);

    this.isDarkMode = savedTheme === 'dark';

    this.applyTheme();
  }

  private applyTheme() {
    document.documentElement.setAttribute(
      'data-theme',
      this.isDarkMode ? 'dark' : 'light'
    );
  }

  private updateBodyScrollLock() {
    document.body.style.overflow = this.menuOpen ? 'hidden' : '';
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 900 && this.menuOpen) {
      this.menuOpen = false;
      this.updateBodyScrollLock();
    }
  }

  @HostListener('window:keydown.escape')
  onEscape() {
    if (this.menuOpen) {
      this.menuOpen = false;
      this.updateBodyScrollLock();
    }
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
  }
}
