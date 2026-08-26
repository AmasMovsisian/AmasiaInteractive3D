import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThreeEngine } from '../../three/core/three-engine';
import { Nav } from '../shared/nav/nav';
import { ScrollStoryComponent } from '../scroll-story/scroll-story';
import { NewFlavors } from '../../pages/new-flavors/new-flavors';
@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [RouterLink, Nav, ScrollStoryComponent, NewFlavors],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class HeroComponent implements AfterViewInit {
  @ViewChild('canvas')
  canvas!: ElementRef<HTMLCanvasElement>;
  readonly loading = signal(true);
  constructor(private readonly threeEngine: ThreeEngine) {}
  async ngAfterViewInit(): Promise<void> {
    this.loading.set(true);
    try {
      await this.threeEngine.init(this.canvas.nativeElement);
      this.loading.set(false);
    } catch (error) {
      console.error('Hero / ThreeEngine initialization failed:', error);
      this.loading.set(true);
    }
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
