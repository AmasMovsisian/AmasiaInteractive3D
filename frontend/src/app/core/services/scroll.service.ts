import { Injectable, signal } from '@angular/core';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root',
})
/** Manages scroll progress, locking, and scroll-based UI state. */
export class ScrollService {
  readonly progress = signal(0);
  readonly buttonsActive = signal(false);
  readonly locked = signal(false);

  private readonly scrollHandler = (): void => {
    this.updateProgress();
    this.updateButtonsActive();
  };

  private readonly resizeHandler = (): void => {
    this.updateProgress();
    this.updateButtonsActive();
  };

  private readonly preventScroll = (event: Event): void => {
    if (!this.locked()) return;
    event.preventDefault();
  };

  private readonly preventKeyboardScroll = (event: KeyboardEvent): void => {
    if (!this.locked()) return;
    const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
    if (scrollKeys.includes(event.key)) {
      event.preventDefault();
    }
  };

  constructor() {
    window.addEventListener('scroll', this.scrollHandler, {
      passive: true,
    });
    window.addEventListener('resize', this.resizeHandler, {
      passive: true,
    });
    this.updateProgress();
    requestAnimationFrame(() => {
      this.updateButtonsActive();
    });
  }

  /** Locks or unlocks scrolling with event prevention. */
  setLocked(locked: boolean): void {
    this.locked.set(locked);
    document.documentElement.classList.toggle('scroll-locked', locked);
    document.body.classList.toggle('scroll-locked', locked);
    if (locked) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant',
      });
      window.addEventListener('wheel', this.preventScroll, {
        passive: false,
      });
      window.addEventListener('touchmove', this.preventScroll, {
        passive: false,
      });
      window.addEventListener('keydown', this.preventKeyboardScroll, {
        passive: false,
      });
      this.progress.set(0);
      this.buttonsActive.set(false);
    } else {
      window.removeEventListener('wheel', this.preventScroll);
      window.removeEventListener('touchmove', this.preventScroll);
      window.removeEventListener('keydown', this.preventKeyboardScroll);
      this.updateProgress();
      this.updateButtonsActive();
    }
  }

  /** Updates scroll progress based on hero section position. */
  private updateProgress(): void {
    if (this.locked()) {
      this.progress.set(0);
      return;
    }
    const hero = document.querySelector('.hero');
    if (!(hero instanceof HTMLElement)) {
      this.progress.set(0);
      return;
    }
    const heroRect = hero.getBoundingClientRect();
    const heroStart = window.scrollY + heroRect.top;
    const heroScrollDistance = hero.offsetHeight - window.innerHeight;
    if (heroScrollDistance <= 0) {
      this.progress.set(0);
      return;
    }
    const currentScroll = window.scrollY - heroStart;
    const progress = THREE.MathUtils.clamp(currentScroll / heroScrollDistance, 0, 1);
    this.progress.set(progress);
  }

  /** Updates button visibility based on scroll position and element state. */
  private updateButtonsActive(): void {
    if (this.locked()) {
      this.buttonsActive.set(false);
      return;
    }
    const buttonSection = document.querySelector('.button_section');
    if (!(buttonSection instanceof HTMLElement)) {
      this.buttonsActive.set(false);
      return;
    }
    const progress = this.progress();
    const sectionStart = 0.8;
    const sectionEnd = 1;
    const sectionRange = sectionEnd - sectionStart;
    const fadeInEnd = sectionStart + sectionRange * 0.45;
    const fadeOutStart = sectionEnd - sectionRange * 0.3;
    if (progress < fadeInEnd) {
      this.buttonsActive.set(false);
      return;
    }
    if (progress >= fadeOutStart) {
      this.buttonsActive.set(false);
      return;
    }
    const rect = buttonSection.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const tolerance = 2;
    const hasSize = rect.width > 0 && rect.height > 0;
    const completelyVisible = rect.top >= -tolerance && rect.bottom <= viewportHeight + tolerance;
    const computedStyle = window.getComputedStyle(buttonSection);
    const opacity = Number.parseFloat(computedStyle.opacity);
    const fullyOpaque = opacity >= 0.99;
    const active = hasSize && completelyVisible && fullyOpaque;
    this.buttonsActive.set(active);
  }

  /** Scrolls to a specific progress value within the hero section. */
  scrollToProgress(progress: number, behavior: ScrollBehavior = 'smooth'): void {
    if (this.locked()) return;
    const hero = document.querySelector('.hero');
    if (!(hero instanceof HTMLElement)) return;
    const heroRect = hero.getBoundingClientRect();
    const heroStart = window.scrollY + heroRect.top;
    const heroScrollDistance = hero.offsetHeight - window.innerHeight;
    if (heroScrollDistance <= 0) return;
    const clampedProgress = THREE.MathUtils.clamp(progress, 0, 1);
    const targetY = heroStart + clampedProgress * heroScrollDistance;
    window.scrollTo({
      top: targetY,
      behavior,
    });
  }

  /** Scrolls to a specific frame within the hero animation. */
  scrollToFrame(frame: number, totalFrames: number, behavior: ScrollBehavior = 'smooth'): void {
    if (totalFrames <= 0) return;
    const progress = THREE.MathUtils.clamp(frame / totalFrames, 0, 1);
    this.scrollToProgress(progress, behavior);
  }
}
