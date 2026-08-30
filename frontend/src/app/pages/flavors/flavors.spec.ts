import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Flavors } from './flavors';

describe('Flavors', () => {
  let component: Flavors;
  let fixture: ComponentFixture<Flavors>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Flavors]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Flavors);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
