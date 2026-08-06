import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScrollStory } from './scroll-story';

describe('ScrollStory', () => {
  let component: ScrollStory;
  let fixture: ComponentFixture<ScrollStory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScrollStory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScrollStory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
