import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-nav',
  imports: [],
  templateUrl: './nav.html',
  styleUrl: './nav.scss',
})
export class Nav {

  menuOpen = false;


  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }


  @HostListener('window:resize')
  onResize() {

    if (window.innerWidth > 900) {
      this.menuOpen = false;
    }

  }

}