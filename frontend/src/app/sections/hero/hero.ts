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
import { ScrollService } from '../../core/services/scroll.service';
import { Nav } from '../shared/nav/nav';
import { ScrollStoryComponent } from '../scroll-story/scroll-story';
import { NewFlavors } from '../../pages/new-flavors/new-flavors';
import { Contact } from '../../pages/contact/contact';
import { Footer } from '../shared/footer/footer';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [RouterLink, Nav, ScrollStoryComponent, NewFlavors, Contact, Footer],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
/** Hero section component initializing the Three.js engine and managing landscape mode. */
export class HeroComponent implements AfterViewInit {
  @ViewChild('canvas')
  canvas!: ElementRef<HTMLCanvasElement>;
  readonly loading = signal(true);
  contactSubmitted = false;

  constructor(
    private readonly threeEngine: ThreeEngine,
    private readonly scrollService: ScrollService,
  ) {}

  /** Initializes the Three.js engine and unlocks scrolling on success. */
  async ngAfterViewInit(): Promise<void> {
    this.scrollService.setLocked(true);
    this.loading.set(true);
    try {
      await this.threeEngine.init(this.canvas.nativeElement);
      this.scrollService.setLocked(false);
      this.loading.set(false);
    } catch (error) {
      console.error('Hero / ThreeEngine initialization failed:', error);
      this.scrollService.setLocked(true);
      this.loading.set(true);
    }
    this.updateLandscapeMode();
  }

  /** Closes the contact success notification. */
  closeContactSuccess(): void {
    this.contactSubmitted = false;
  }

  /** Toggles landscape lock class on touch devices based on orientation. */
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
