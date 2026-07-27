import { Injectable } from '@angular/core';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

@Injectable({
  providedIn: 'root',
})
export class GltfLoader {
  private loader: GLTFLoader;

  constructor() {
    this.loader = new GLTFLoader();
  }

  load(url: string): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,

        (gltf) => {
          resolve(gltf);
        },

        undefined,

        (error) => {
          reject(error);
        },
      );
    });
  }
}
