import { ChangeDetectorRef, Component, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}
@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact {
  @ViewChild('successOverlay')
  private successOverlay?: ElementRef<HTMLElement>;
  form: ContactForm = {
    name: '',
    email: '',
    subject: '',
    message: '',
  };
  submitted = false;
  sending = false;
  touched: Record<keyof ContactForm, boolean> = {
    name: false,
    email: false,
    subject: false,
    message: false,
  };
  private overlayAppendedToBody = false;
  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly renderer: Renderer2,
  ) {}
  get isNameValid(): boolean {
    return this.form.name.trim().length >= 2;
  }
  get isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(this.form.email.trim());
  }
  get isSubjectValid(): boolean {
    return this.form.subject.trim().length >= 3;
  }
  get isMessageValid(): boolean {
    return this.form.message.trim().length >= 10;
  }
  get isFormValid(): boolean {
    return this.isNameValid && this.isEmailValid && this.isSubjectValid && this.isMessageValid;
  }
  markTouched(field: keyof ContactForm): void {
    this.touched[field] = true;
    this.cdr.detectChanges();
  }
  submitForm(): void {
    if (this.sending) {
      return;
    }
    this.touched = {
      name: true,
      email: true,
      subject: true,
      message: true,
    };
    if (!this.isFormValid) {
      this.cdr.detectChanges();
      return;
    }
    this.sending = true;
    this.cdr.detectChanges();
    window.setTimeout(() => {
      this.sending = false;
      this.submitted = true;
      this.form = {
        name: '',
        email: '',
        subject: '',
        message: '',
      };
      this.touched = {
        name: false,
        email: false,
        subject: false,
        message: false,
      };
      this.cdr.detectChanges();
      requestAnimationFrame(() => {
        this.moveSuccessOverlayToBody();
      });
    }, 2000);
  }
  private moveSuccessOverlayToBody(): void {
    const overlay = this.successOverlay?.nativeElement;
    if (!overlay || this.overlayAppendedToBody) {
      return;
    }
    document.body.appendChild(overlay);
    this.overlayAppendedToBody = true;
    this.cdr.detectChanges();
  }
  closeSuccess(): void {
    const overlay = this.successOverlay?.nativeElement;
    if (overlay && overlay.parentElement === document.body) {
      overlay.remove();
    }
    this.overlayAppendedToBody = false;
    this.submitted = false;
    this.cdr.detectChanges();
  }
}
