import { TestBed } from '@angular/core/testing';

import { ThreeEngine } from './three-engine';

describe('ThreeEngine', () => {
  let service: ThreeEngine;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThreeEngine);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
