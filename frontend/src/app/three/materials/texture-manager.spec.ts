import { TestBed } from '@angular/core/testing';

import { TextureManager } from './texture-manager';

describe('TextureManager', () => {
  let service: TextureManager;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TextureManager);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
