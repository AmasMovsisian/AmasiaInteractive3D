import { TestBed } from '@angular/core/testing';

import { GltfLoader } from './gltf-loader';

describe('GltfLoader', () => {
  let service: GltfLoader;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GltfLoader);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
