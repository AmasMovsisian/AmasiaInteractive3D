import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewFlavors } from './new-flavors';

describe('NewFlavors', () => {
  let component: NewFlavors;
  let fixture: ComponentFixture<NewFlavors>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewFlavors]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewFlavors);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
