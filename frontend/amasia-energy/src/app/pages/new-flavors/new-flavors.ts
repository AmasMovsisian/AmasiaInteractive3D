import { Component } from '@angular/core';

import { StoryComponent } from '../../sections/scroll-story/story/story';

@Component({
  selector: 'app-new-flavors',
  standalone: true,

  imports: [StoryComponent],

  templateUrl: './new-flavors.html',
  styleUrl: './new-flavors.scss',
})
export class NewFlavors {}
