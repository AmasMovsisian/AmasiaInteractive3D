import { Component, inject } from '@angular/core';
import { StoryComponent } from './story/story';
import { FlavorId, FlavorService } from '../../core/services/flavor.service';
import { ScrollService } from '../../core/services/scroll.service';

@Component({
  selector: 'app-scroll-story',
  standalone: true,
  imports: [StoryComponent],
  templateUrl: './scroll-story.html',
  styleUrl: './scroll-story.scss',
})
/** Scroll story component for flavor selection and display. */
export class ScrollStoryComponent {
  readonly flavorService = inject(FlavorService);
  readonly scrollService = inject(ScrollService);
  readonly flavors = this.flavorService.flavors;
  readonly selectedFlavor = this.flavorService.selectedFlavor;
  readonly buttonsActive = this.scrollService.buttonsActive;

  /** Selects a flavor if buttons are active. */
  selectFlavor(flavorId: FlavorId): void {
    if (!this.buttonsActive()) return;
    this.flavorService.selectFlavor(flavorId);
  }

  /** Formats a price as German currency. */
  formatPrice(price: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  }
}
