import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
} from '@angular/core';

import { AuthService } from '../../../../../core/services/backend/authentication/auth.service';
import { User } from '../../../../../core/services/backend/authentication/models/auth.models';

@Component({
  selector: 'app-image-crop-modal',
  standalone: true,
  imports: [],
  templateUrl: './image-crop-modal.html',
  styleUrl: './image-crop-modal.scss',
})
export class ImageCropModalComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() user!: User;

  @Output() close = new EventEmitter<void>();
  @Output() imageUploaded = new EventEmitter<User>();

  @ViewChild('cropStage')
  private cropStage?: ElementRef<HTMLElement>;

  @ViewChild('cropImage')
  private cropImage?: ElementRef<HTMLImageElement>;

  @ViewChild('fileInput')
  private fileInput?: ElementRef<HTMLInputElement>;

  isUpdatingProfile = false;
  cropImageUrl = '';
  cropZoomPercent = 100;
  cropX = 0;
  cropY = 0;
  cropTransform = 'translate3d(-50%, -50%, 0) scale(1)';

  private cropSourceFile: File | null = null;
  private cropObjectUrl: string | null = null;
  private isCropDragging = false;
  private cropPointerId: number | null = null;
  private cropDragStartX = 0;
  private cropDragStartY = 0;
  private cropStartX = 0;
  private cropStartY = 0;

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    this.revokeCropObjectUrl();
    this.isCropDragging = false;
    this.cropPointerId = null;
  }

  triggerFileUpload(): void {
    if (this.isUpdatingProfile) {
      return;
    }

    const input = this.fileInput?.nativeElement;
    if (input) {
      input.value = '';
      input.click();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const file = input.files?.item(0);
    input.value = '';

    if (!file) {
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      this.closeModal();
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.closeModal();
      return;
    }

    this.revokeCropObjectUrl();
    this.cropSourceFile = file;
    this.cropObjectUrl = URL.createObjectURL(file);
    this.cropImageUrl = this.cropObjectUrl;
    this.cropZoomPercent = 100;
    this.cropX = 0;
    this.cropY = 0;
    this.cropTransform = 'translate3d(-50%, -50%, 0) scale(1)';
    this.cdr.detectChanges();

    requestAnimationFrame(() => {
      this.prepareCropImage();
    });
  }

  private prepareCropImage(): void {
    const image = this.cropImage?.nativeElement;
    if (!image) {
      return;
    }

    if (image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
      requestAnimationFrame(() => {
        this.resetCropPosition();
      });
      return;
    }

    image.onload = () => {
      requestAnimationFrame(() => {
        this.resetCropPosition();
      });
    };

    image.onerror = () => {
      this.closeModal();
    };
  }

  onPointerDown(event: PointerEvent): void {
    if (this.isUpdatingProfile) {
      return;
    }

    event.preventDefault();
    this.isCropDragging = true;
    this.cropPointerId = event.pointerId;
    this.cropDragStartX = event.clientX;
    this.cropDragStartY = event.clientY;
    this.cropStartX = this.cropX;
    this.cropStartY = this.cropY;

    const target = event.currentTarget as HTMLElement | null;
    if (target) {
      try {
        target.setPointerCapture(event.pointerId);
      } catch {}
    }
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.isCropDragging || this.cropPointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const deltaX = event.clientX - this.cropDragStartX;
    const deltaY = event.clientY - this.cropDragStartY;

    this.cropX = this.cropStartX + deltaX;
    this.cropY = this.cropStartY + deltaY;
    this.limitCropPosition();
    this.updateCropTransform();
  }

  onPointerUp(event: PointerEvent): void {
    if (this.cropPointerId !== null && event.pointerId !== this.cropPointerId) {
      return;
    }

    this.isCropDragging = false;
    const pointerId = this.cropPointerId;
    this.cropPointerId = null;

    const target = event.currentTarget as HTMLElement | null;
    if (target && pointerId !== null) {
      try {
        target.releasePointerCapture(pointerId);
      } catch {}
    }
  }

  onZoomChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const value = Number(input.value);
    if (!Number.isFinite(value)) {
      return;
    }

    const nextZoom = Math.min(300, Math.max(100, value));
    if (nextZoom === this.cropZoomPercent) {
      return;
    }

    const previousScale = this.getCropImageScale();
    const nextScale = this.getCropImageScale(nextZoom);

    if (
      Number.isFinite(previousScale) &&
      Number.isFinite(nextScale) &&
      previousScale > 0 &&
      nextScale > 0
    ) {
      const ratio = nextScale / previousScale;
      this.cropX *= ratio;
      this.cropY *= ratio;
    }

    this.cropZoomPercent = nextZoom;
    this.limitCropPosition();
    this.updateCropTransform();
  }

  private updateCropTransform(): void {
    const scale = this.getCropImageScale();
    this.cropTransform = `translate3d(calc(-50% + ${this.cropX}px), calc(-50% + ${this.cropY}px), 0) scale(${scale})`;
  }

  private getCropImageScale(zoomPercent = this.cropZoomPercent): number {
    const stage = this.cropStage?.nativeElement;
    const image = this.cropImage?.nativeElement;

    if (!stage || !image || !image.naturalWidth || !image.naturalHeight) {
      return Math.max(100, zoomPercent) / 100;
    }

    const rect = stage.getBoundingClientRect();
    const stageWidth = rect.width;
    const stageHeight = rect.height;

    if (stageWidth <= 0 || stageHeight <= 0) {
      return Math.max(100, zoomPercent) / 100;
    }

    const baseScale = Math.max(stageWidth / image.naturalWidth, stageHeight / image.naturalHeight);

    return baseScale * Math.max(1, zoomPercent / 100);
  }

  private getCropGeometry(zoomPercent = this.cropZoomPercent) {
    const stage = this.cropStage?.nativeElement;
    const image = this.cropImage?.nativeElement;

    if (!stage || !image || !image.naturalWidth || !image.naturalHeight) {
      return null;
    }

    const rect = stage.getBoundingClientRect();
    const stageWidth = rect.width;
    const stageHeight = rect.height;

    if (stageWidth <= 0 || stageHeight <= 0) {
      return null;
    }

    const cropSize = Math.min(stageWidth, stageHeight);
    const cropRadius = cropSize / 2;
    const scale = this.getCropImageScale(zoomPercent);
    const renderedWidth = image.naturalWidth * scale;
    const renderedHeight = image.naturalHeight * scale;
    const maxX = Math.max(0, renderedWidth / 2 - cropRadius);
    const maxY = Math.max(0, renderedHeight / 2 - cropRadius);

    return {
      stageWidth,
      stageHeight,
      cropSize,
      cropRadius,
      scale,
      renderedWidth,
      renderedHeight,
      maxX,
      maxY,
    };
  }

  private resetCropPosition(): void {
    this.cropX = 0;
    this.cropY = 0;
    this.limitCropPosition();
    this.updateCropTransform();
    this.cdr.detectChanges();
  }

  private limitCropPosition(): void {
    const geometry = this.getCropGeometry();
    if (!geometry) {
      return;
    }

    this.cropX = Math.max(-geometry.maxX, Math.min(geometry.maxX, this.cropX));
    this.cropY = Math.max(-geometry.maxY, Math.min(geometry.maxY, this.cropY));
  }

  closeModal(): void {
    if (this.isUpdatingProfile) {
      return;
    }

    this.cropSourceFile = null;
    this.revokeCropObjectUrl();
    this.cropImageUrl = '';
    this.cropZoomPercent = 100;
    this.cropX = 0;
    this.cropY = 0;
    this.cropTransform = 'translate3d(-50%, -50%, 0) scale(1)';
    this.isCropDragging = false;
    this.cropPointerId = null;
    this.close.emit();
  }

  private revokeCropObjectUrl(): void {
    if (!this.cropObjectUrl) {
      return;
    }

    URL.revokeObjectURL(this.cropObjectUrl);
    this.cropObjectUrl = null;
  }

  async applyCrop(): Promise<void> {
    if (this.isUpdatingProfile || !this.cropSourceFile) {
      return;
    }

    const sourceFile = this.cropSourceFile;
    this.isUpdatingProfile = true;
    this.cdr.detectChanges();

    try {
      const croppedFile = await this.createCroppedImageFile(
        sourceFile,
        this.cropX,
        this.cropY,
        this.cropZoomPercent,
      );

      this.authService
        .updateProfile({
          profile_image: croppedFile,
        })
        .subscribe({
          next: (user) => {
            this.isUpdatingProfile = false;
            this.imageUploaded.emit(user);
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('[ImageCrop] Profile image update failed:', error);
            this.isUpdatingProfile = false;
            this.cdr.detectChanges();
          },
        });
    } catch (error) {
      console.error('[ImageCrop] Image crop failed:', error);
      this.isUpdatingProfile = false;
      this.cdr.detectChanges();
    }
  }

  private createCroppedImageFile(
    sourceFile: File,
    offsetX: number,
    offsetY: number,
    zoomPercent: number,
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const image = this.cropImage?.nativeElement;
      const stage = this.cropStage?.nativeElement;

      if (!image || !stage || !image.naturalWidth || !image.naturalHeight) {
        reject(new Error('Image is not loaded.'));
        return;
      }

      try {
        const sourceWidth = image.naturalWidth;
        const sourceHeight = image.naturalHeight;
        const stageRect = stage.getBoundingClientRect();
        const stageWidth = stageRect.width;
        const stageHeight = stageRect.height;

        if (stageWidth <= 0 || stageHeight <= 0) {
          reject(new Error('Crop stage has no size.'));
          return;
        }

        const cropSize = Math.min(stageWidth, stageHeight);
        if (cropSize <= 0) {
          reject(new Error('Crop area has no size.'));
          return;
        }

        const outputSize = 800;
        const canvas = document.createElement('canvas');
        canvas.width = outputSize;
        canvas.height = outputSize;

        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }

        context.clearRect(0, 0, outputSize, outputSize);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';

        const baseScale = Math.max(stageWidth / sourceWidth, stageHeight / sourceHeight);
        const zoom = Math.max(1, zoomPercent / 100);
        const scale = baseScale * zoom;
        const renderedWidth = sourceWidth * scale;
        const renderedHeight = sourceHeight * scale;
        const stageCenterX = stageWidth / 2;
        const stageCenterY = stageHeight / 2;
        const imageLeft = stageCenterX - renderedWidth / 2 + offsetX;
        const imageTop = stageCenterY - renderedHeight / 2 + offsetY;
        const cropLeft = stageCenterX - cropSize / 2;
        const cropTop = stageCenterY - cropSize / 2;
        const sourceCropX = (cropLeft - imageLeft) / scale;
        const sourceCropY = (cropTop - imageTop) / scale;
        const sourceCropSize = cropSize / scale;
        const clampedSourceCropSize = Math.min(sourceCropSize, sourceWidth, sourceHeight);
        const clampedSourceCropX = Math.max(
          0,
          Math.min(sourceWidth - clampedSourceCropSize, sourceCropX),
        );
        const clampedSourceCropY = Math.max(
          0,
          Math.min(sourceHeight - clampedSourceCropSize, sourceCropY),
        );

        context.drawImage(
          image,
          clampedSourceCropX,
          clampedSourceCropY,
          clampedSourceCropSize,
          clampedSourceCropSize,
          0,
          0,
          outputSize,
          outputSize,
        );

        const mimeType = this.getOutputMimeType(sourceFile.type);
        const extension = this.getOutputExtension(mimeType);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Unable to create cropped image.'));
              return;
            }

            const timestamp = Date.now();
            const file = new File([blob], `profile-image-${timestamp}.${extension}`, {
              type: mimeType,
              lastModified: timestamp,
            });

            resolve(file);
          },
          mimeType,
          mimeType === 'image/jpeg' ? 0.92 : undefined,
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  private getOutputMimeType(sourceType: string): string {
    if (sourceType === 'image/png') {
      return 'image/png';
    }

    if (sourceType === 'image/webp') {
      return 'image/webp';
    }

    return 'image/jpeg';
  }

  private getOutputExtension(mimeType: string): string {
    switch (mimeType) {
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      default:
        return 'jpg';
    }
  }
}
