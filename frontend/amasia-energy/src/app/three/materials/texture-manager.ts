import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root',
})
export class TextureManager {
  private loader = new THREE.TextureLoader();

  async loadFlavor(flavor: string): Promise<THREE.Texture> {
    const texture = await this.loader.loadAsync(`/three/materials/${flavor}.png`);

    console.log('TEXTURE LOADED:', texture);

    console.log('IMAGE:', texture.image);

    texture.colorSpace = THREE.SRGBColorSpace;

    texture.flipY = false;

    texture.needsUpdate = true;

    return texture;
  }
}
