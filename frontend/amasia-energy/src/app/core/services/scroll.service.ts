import { Injectable, signal } from '@angular/core';
import * as THREE from 'three';
@Injectable({
  providedIn: 'root',
})
export class ScrollService {
  readonly progress = signal(0);
  readonly buttonsActive = signal(false);
  private readonly scrollHandler = (): void => {
    this.updateProgress();
    this.updateButtonsActive();
  };
  private readonly resizeHandler = (): void => {
    this.updateProgress();
    this.updateButtonsActive();
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
  private updateProgress(): void {
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
  private updateButtonsActive(): void {
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
  scrollToProgress(progress: number, behavior: ScrollBehavior = 'smooth'): void {
    const hero = document.querySelector('.hero');
    if (!(hero instanceof HTMLElement)) {
      return;
    }
    const heroRect = hero.getBoundingClientRect();
    const heroStart = window.scrollY + heroRect.top;
    const heroScrollDistance = hero.offsetHeight - window.innerHeight;
    if (heroScrollDistance <= 0) {
      return;
    }
    const clampedProgress = THREE.MathUtils.clamp(progress, 0, 1);
    const targetY = heroStart + clampedProgress * heroScrollDistance;
    window.scrollTo({
      top: targetY,
      behavior,
    });
  }
  scrollToFrame(frame: number, totalFrames: number, behavior: ScrollBehavior = 'smooth'): void {
    if (totalFrames <= 0) {
      return;
    }
    const progress = THREE.MathUtils.clamp(frame / totalFrames, 0, 1);
    this.scrollToProgress(progress, behavior);
  }
}
