import { Injectable, signal } from '@angular/core';
import * as THREE from 'three';
@Injectable({
  providedIn: 'root',
})
export class ScrollService {
  readonly progress = signal(0);
  constructor() {
    window.addEventListener(
      'scroll',
      () => {
        this.updateProgress();
      },
      { passive: true },
    );
    this.updateProgress();
  }
  private updateProgress(): void {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) {
      this.progress.set(0);
      return;
    }
    this.progress.set(THREE.MathUtils.clamp(window.scrollY / maxScroll, 0, 1));
  }
  scrollToProgress(progress: number, behavior: ScrollBehavior = 'smooth'): void {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) {
      return;
    }
    const clampedProgress = THREE.MathUtils.clamp(progress, 0, 1);
    const targetY = clampedProgress * maxScroll;
    window.scrollTo({
      top: targetY,
      behavior,
    });
  }
  scrollToFrame(frame: number, totalFrames: number, behavior: ScrollBehavior = 'smooth'): void {
    if (totalFrames <= 0) {
      return;
    }
    const progress = frame / totalFrames;
    this.scrollToProgress(progress, behavior);
  }
}
