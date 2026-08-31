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
/** Contact form component with validation and success overlay. */
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

  /** Validates that name has at least 2 characters. */
  get isNameValid(): boolean {
    return this.form.name.trim().length >= 2;
  }

  /** Validates email format. */
  get isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(this.form.email.trim());
  }

  /** Validates that subject has at least 3 characters. */
  get isSubjectValid(): boolean {
    return this.form.subject.trim().length >= 3;
  }

  /** Validates that message has at least 10 characters. */
  get isMessageValid(): boolean {
    return this.form.message.trim().length >= 10;
  }

  /** Returns true if all form fields are valid. */
  get isFormValid(): boolean {
    return this.isNameValid && this.isEmailValid && this.isSubjectValid && this.isMessageValid;
  }

  /** Marks a field as touched and triggers change detection. */
  markTouched(field: keyof ContactForm): void {
    this.touched[field] = true;
    this.cdr.detectChanges();
  }

  /** Submits the form after validation, simulates sending, and shows success overlay. */
  submitForm(): void {
    if (this.sending) return;
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

  /** Moves the success overlay to the document body for proper stacking. */
  private moveSuccessOverlayToBody(): void {
    const overlay = this.successOverlay?.nativeElement;
    if (!overlay || this.overlayAppendedToBody) return;
    document.body.appendChild(overlay);
    this.overlayAppendedToBody = true;
    this.cdr.detectChanges();
  }

  /** Removes the success overlay from the body and resets state. */
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
