import { Component, HostBinding, Input, computed, inject } from '@angular/core';
import { ScrollService } from '../../../core/services/scroll.service';
import { ResponsiveService } from '../../../core/services/responsive.service';

type Position = 'left' | 'center' | 'right';
type Vertical = 'top' | 'center' | 'bottom';
type Direction = 'top' | 'bottom' | 'left' | 'right';
type Align = 'left' | 'center' | 'right';

@Component({
  selector: 'app-story',
  standalone: true,
  templateUrl: './story.html',
  styleUrl: './story.scss',
})
export class StoryComponent {
  private scroll = inject(ScrollService);
  private responsive = inject(ResponsiveService);
  progress = this.scroll.progress;

  @Input() from = 0;
  @Input() to = 1;
  @Input() offsetX = 0;
  @Input() offsetY = 0;
  @Input() desktopHorizontal: Position = 'center';
  @Input() desktopVertical: Vertical = 'center';
  @Input() desktopPivot = 'center-box';
  @Input() desktopTextAlign: Align = 'center';
  @Input() desktopOffsetX = 0;
  @Input() desktopOffsetY = 0;
  @Input() desktopWidth = 500;
  @Input() desktopScale = 1;
  @Input() desktopEnter: Direction = 'bottom';
  @Input() desktopLeave: Direction = 'top';
  @Input() tabletHorizontal: Position = 'center';
  @Input() tabletVertical: Vertical = 'center';
  @Input() tabletPivot = 'center-box';
  @Input() tabletTextAlign: Align = 'center';
  @Input() tabletOffsetX = 0;
  @Input() tabletOffsetY = 0;
  @Input() tabletWidth = 400;
  @Input() tabletScale = 1;
  @Input() tabletEnter: Direction = 'bottom';
  @Input() tabletLeave: Direction = 'top';
  @Input() mobileHorizontal: Position = 'center';
  @Input() mobileVertical: Vertical = 'center';
  @Input() mobilePivot = 'center-box';
  @Input() mobileTextAlign: Align = 'center';
  @Input() mobileOffsetX = 0;
  @Input() mobileOffsetY = 0;
  @Input() mobileWidth = 330;
  @Input() mobileScale = 1;
  @Input() mobileEnter: Direction = 'bottom';
  @Input() mobileLeave: Direction = 'top';
  @Input() fadeIn = 0.15;
  @Input() fadeOut = 0.25;
  @Input() opacity = 1;
  @Input() distance = 250;

  private device() {
    if (this.responsive.isMobile()) {
      return 'mobile';
    }
    if (this.responsive.isTablet()) {
      return 'tablet';
    }
    return 'desktop';
  }

  private value(name: string) {
    const device = this.device();
    const deviceValue = (this as any)[`${device}${name}`];
    if (deviceValue !== undefined) {
      return deviceValue;
    }
    const desktopValue = (this as any)[`desktop${name}`];
    if (desktopValue !== undefined) {
      return desktopValue;
    }
    if (name === 'OffsetX') {
      return this.offsetX;
    }
    if (name === 'OffsetY') {
      return this.offsetY;
    }
    return undefined;
  }

  animation = computed(() => {
    const p = this.progress();
    const enter = this.value('Enter');
    const leave = this.value('Leave');
    const enterVector = this.direction(enter);
    const leaveVector = this.direction(leave);
    if (p < this.from || p > this.to) {
      return {
        opacity: 0,
        x: enterVector.x,
        y: enterVector.y,
      };
    }
    const local = (p - this.from) / (this.to - this.from);
    let opacity = 1;
    let x = 0;
    let y = 0;
    if (local < this.fadeIn) {
      const t = local / this.fadeIn;
      opacity = t;
      x = enterVector.x * (1 - t);
      y = enterVector.y * (1 - t);
    } else if (local > 1 - this.fadeOut) {
      const t = (local - (1 - this.fadeOut)) / this.fadeOut;
      opacity = 1 - t;
      x = leaveVector.x * t;
      y = leaveVector.y * t;
    }
    return {
      opacity: opacity * this.opacity,
      x: x + this.value('OffsetX'),
      y: y + this.value('OffsetY'),
    };
  });

  private direction(direction: Direction) {
    switch (direction) {
      case 'left':
        return {
          x: -this.distance,
          y: 0,
        };
      case 'right':
        return {
          x: this.distance,
          y: 0,
        };
      case 'top':
        return {
          x: 0,
          y: -this.distance,
        };
      default:
        return {
          x: 0,
          y: this.distance,
        };
    }
  }

  @HostBinding('style.left')
  get left() {
    switch (this.value('Horizontal')) {
      case 'left':
        return '15%';
      case 'right':
        return '85%';
      default:
        return '50%';
    }
  }

  @HostBinding('style.top')
  get top() {
    switch (this.value('Vertical')) {
      case 'top':
        return '20%';
      case 'bottom':
        return '80%';
      default:
        return '50%';
    }
  }

  @HostBinding('style.width')
  get width() {
    return `${this.value('Width')}px`;
  }

  private pivot() {
    switch (this.value('Pivot')) {
      case 'left':
        return '0%';
      case 'right':
        return '-100%';
      default:
        return '-50%';
    }
  }

  @HostBinding('style.opacity')
  get hostOpacity() {
    return this.animation().opacity;
  }

  @HostBinding('style.transform')
  get transform() {
    const a = this.animation();
    return `
translate(${this.pivot()}, -50%)
translate(${a.x}px, ${a.y}px)
scale(${this.value('Scale') ?? 1})
`;
  }

  @HostBinding('class')
  get alignClass() {
    return [`align-${this.value('TextAlign')}`].join(' ');
  }
}
