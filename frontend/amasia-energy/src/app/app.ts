import { Component } from '@angular/core';
import { HeroComponent } from './sections/hero/hero';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    HeroComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {

}