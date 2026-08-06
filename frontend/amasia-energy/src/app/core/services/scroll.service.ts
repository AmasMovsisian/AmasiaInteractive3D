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
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

        if (maxScroll <= 0) {
          this.progress.set(0);
          return;
        }

        this.progress.set(THREE.MathUtils.clamp(window.scrollY / maxScroll, 0, 1));
      },
      { passive: true },
    );
  }
}
