import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Nav } from '../nav/nav';
import { Footer } from '../footer/footer';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, Nav, Footer],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
/** 404 error page with a call-to-action back to the home page. */
export class NotFound implements OnInit {
  constructor(private readonly cdr: ChangeDetectorRef) {}

  /** Scrolls to top on initialization. */
  ngOnInit(): void {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
  }
}