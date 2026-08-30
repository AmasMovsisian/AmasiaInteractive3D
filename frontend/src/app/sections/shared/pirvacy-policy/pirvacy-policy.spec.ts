import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PirvacyPolicy } from './pirvacy-policy';

describe('PirvacyPolicy', () => {
  let component: PirvacyPolicy;
  let fixture: ComponentFixture<PirvacyPolicy>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PirvacyPolicy]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PirvacyPolicy);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
