import { Component, inject } from '@angular/core';
import { StoryComponent } from './story/story';
import {
  FlavorId,
  FlavorService,
} from '../../core/services/flavor.service';

@Component({
  selector: 'app-scroll-story',
  standalone: true,
  imports: [
    StoryComponent,
  ],
  templateUrl: './scroll-story.html',
  styleUrl: './scroll-story.scss',
})
export class ScrollStoryComponent {
  readonly flavorService = inject(FlavorService);
  readonly flavors = this.flavorService.flavors;
  readonly selectedFlavor =
    this.flavorService.selectedFlavor;

  selectFlavor(flavorId: FlavorId): void {
    this.flavorService.selectFlavor(flavorId);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  }
}