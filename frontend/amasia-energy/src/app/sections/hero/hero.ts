import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
} from '@angular/core';
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
export class HeroComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', {
    static: true,
  })
  canvas!: ElementRef<HTMLCanvasElement>;
  constructor(private threeEngine: ThreeEngine) {}
  ngAfterViewInit(): void {
    void this.threeEngine.init(this.canvas.nativeElement);
    this.updateLandscapeMode();
  }
  ngOnDestroy(): void {
    this.threeEngine.detach();
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
