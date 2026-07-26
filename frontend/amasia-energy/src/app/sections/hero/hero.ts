import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { ThreeEngineService } from '../../three/core/three-engine';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class HeroComponent implements AfterViewInit {
  @ViewChild('canvas')
  canvas!: ElementRef<HTMLCanvasElement>;

  constructor(private threeEngine: ThreeEngineService) {}

  ngAfterViewInit() {
    this.threeEngine.init(this.canvas.nativeElement);
  }
}
