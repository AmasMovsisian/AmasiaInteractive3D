import { Component } from '@angular/core';
import { StoryComponent } from './story/story';


@Component({
  selector: 'app-scroll-story',
  standalone: true,
  imports: [
    StoryComponent
  ],
  templateUrl: './scroll-story.html',
  styleUrl: './scroll-story.scss',
})
export class ScrollStoryComponent {

}