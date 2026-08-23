import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Nav } from '../../sections/shared/nav/nav';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [FormsModule, Nav],
  templateUrl: './coming-soon.html',
  styleUrl: './coming-soon.scss',
})
export class ComingSoon implements OnInit, OnDestroy {
  showSuccess = false;

  ngOnInit(): void {
    this.lockPageScroll();
  }

  ngOnDestroy(): void {
    this.unlockPageScroll();
  }

  onSubmit(): void {
    this.showSuccess = true;
  }

  closeModal(): void {
    this.showSuccess = false;
  }

  private lockPageScroll(): void {
    document.documentElement.classList.add('page-scroll-locked');
    document.body.classList.add('page-scroll-locked');
  }

  private unlockPageScroll(): void {
    document.documentElement.classList.remove('page-scroll-locked');
    document.body.classList.remove('page-scroll-locked');
  }
}
