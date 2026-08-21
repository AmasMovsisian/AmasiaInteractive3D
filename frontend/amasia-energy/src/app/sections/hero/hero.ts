import { AfterViewInit, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { ThreeEngine } from '../../three/core/three-engine';
import { Nav } from '../shared/nav/nav';
import { ScrollStoryComponent } from '../scroll-story/scroll-story';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [Nav, ScrollStoryComponent],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class HeroComponent implements AfterViewInit {
  @ViewChild('canvas')
  canvas!: ElementRef<HTMLCanvasElement>;

  constructor(private threeEngine: ThreeEngine) {}

  ngAfterViewInit(): void {
    this.threeEngine.init(this.canvas.nativeElement);
    this.updateLandscapeMode();
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange')
  updateLandscapeMode(): void {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) {
      document.documentElement.classList.remove('device-landscape-lock');
      document.body.classList.remove('device-landscape-lock');
      return;
    }
    const orientation = screen.orientation?.type;
    const isLandscape =
      orientation === 'landscape-primary' || orientation === 'landscape-secondary';
    document.documentElement.classList.toggle('device-landscape-lock', isLandscape);
    document.body.classList.toggle('device-landscape-lock', isLandscape);
  }
}
