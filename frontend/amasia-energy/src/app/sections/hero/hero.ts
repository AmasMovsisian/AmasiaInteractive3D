import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { ThreeEngine } from '../../three/core/three-engine';
import { Nav } from '../shared/nav/nav';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [Nav],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class HeroComponent implements AfterViewInit {
  @ViewChild('canvas')
  canvas!: ElementRef<HTMLCanvasElement>;

  constructor(private threeEngine: ThreeEngine) {}

  ngAfterViewInit() {
    this.threeEngine.init(this.canvas.nativeElement);
  }
}
