import { Component, OnInit } from '@angular/core';
import { Nav } from '../nav/nav';
import { Footer } from '../footer/footer';

@Component({
  selector: 'app-pirvacy-policy',
  standalone: true,
  imports: [Footer, Nav],
  templateUrl: './pirvacy-policy.html',
  styleUrl: './pirvacy-policy.scss',
})
/** Privacy policy page component. */
export class PirvacyPolicy implements OnInit {
  /** Scrolls to top on initialization. */
  ngOnInit(): void {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
  }

  /** Smoothly scrolls to a section by ID and updates the URL hash. */
  scrollToSection(id: string, event: Event): void {
    event.preventDefault();
    const element = document.getElementById(id);
    if (!element) return;
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    history.replaceState(null, '', `#${id}`);
  }
}
