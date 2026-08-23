import { Component, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink],
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

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    this.updateBodyScrollLock();
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;

    this.applyTheme();

    localStorage.setItem(this.themeKey, this.isDarkMode ? 'dark' : 'light');
  }

  closeMenu(): void {
    this.menuOpen = false;
    this.updateBodyScrollLock();
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
    document.body.style.overflow = '';
  }
}
