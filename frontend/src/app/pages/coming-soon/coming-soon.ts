import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Nav } from '../../sections/shared/nav/nav';
import { Footer } from '../../sections/shared/footer/footer';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [FormsModule, Nav, Footer],
  templateUrl: './coming-soon.html',
  styleUrl: './coming-soon.scss',
})
export class ComingSoon implements OnInit {
  showSuccess = false;
  requesting = false;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
  }

  onSubmit(): void {
    if (this.requesting) {
      return;
    }

    const form = document.querySelector('.cs-form') as HTMLFormElement | null;
    const emailInput = document.querySelector('.cs-input') as HTMLInputElement | null;

    if (!form || !emailInput) {
      return;
    }

    if (!emailInput.value.trim() || !emailInput.checkValidity()) {
      emailInput.reportValidity();
      return;
    }

    this.requesting = true;
    this.cdr.detectChanges();

    window.setTimeout(() => {
      this.requesting = false;
      this.showSuccess = true;
      emailInput.value = '';
      form.reset();
      this.cdr.detectChanges();
    }, 2000);
  }

  closeModal(): void {
    this.showSuccess = false;
    this.cdr.detectChanges();
  }
}
