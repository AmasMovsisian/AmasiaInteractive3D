import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root',
})
export class TextureManager {
  private loader = new THREE.TextureLoader();

  private async loadTexture(path: string): Promise<THREE.Texture | null> {
    try {
      const texture = await this.loader.loadAsync(path);
      console.log('Texture loaded:', path);
      texture.flipY = false;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = 16;
      texture.needsUpdate = true;
      return texture;
    } catch (error) {
      console.error('Texture FAILED:', path, error);
      return null;
    }
  }

  async loadPBRMaterial(
    flavor: string,
    materialFolder: string,
  ): Promise<THREE.MeshPhysicalMaterial> {
    const path = `/three/materials/${flavor}/${materialFolder}/`;
    console.log('Loading PBR material:', flavor, materialFolder);
    const [baseColor, roughness, metallic] = await Promise.all([
      this.loadTexture(path + `${materialFolder}_BaseColor.png`),
      this.loadTexture(path + `${materialFolder}_Roughness.png`),
      this.loadTexture(path + `${materialFolder}_Metallic.png`),
    ]);
    if (!baseColor) {
      throw new Error(`Missing BaseColor texture: ${flavor}/${materialFolder}`);
    }
    baseColor.colorSpace = THREE.SRGBColorSpace;
    if (roughness) {
      roughness.colorSpace = THREE.NoColorSpace;
    }
    if (metallic) {
      metallic.colorSpace = THREE.NoColorSpace;
    }
    const name = materialFolder.toLowerCase();
    const isAluminium = name.includes('aluminium') || name.includes('aluminum');
    const isBody = name.includes('body');
    const material = new THREE.MeshPhysicalMaterial({
      map: baseColor,
      color: new THREE.Color(1, 1, 1),
      roughness: 1.0,
      roughnessMap: roughness ?? undefined,
      metalness: 1.0,
      metalnessMap: metallic ?? undefined,
      clearcoat: 0.0,
      clearcoatRoughness: 1.0,
      reflectivity: 0.5,
      depthWrite: true,
      depthTest: true,
    });
    if (isAluminium) {
      material.metalness = 1.0;
      material.roughness = 1.0;
      material.clearcoat = 0.0;
      material.clearcoatRoughness = 1.0;
    }
    if (isBody) {
      material.roughness = 1.0;
      material.metalness = 1.0;
      material.clearcoat = 0.0;
      material.clearcoatRoughness = 1.0;
    }
    console.log('FINAL PBR MATERIAL:', {
      flavor,
      materialFolder,
      type: {
        aluminium: isAluminium,
        body: isBody,
      },
      textures: {
        baseColor: !!material.map,
        roughnessMap: !!material.roughnessMap,
        metalnessMap: !!material.metalnessMap,
        normalMap: false,
      },
      colorSpaces: {
        baseColor: baseColor.colorSpace,
        roughness: roughness?.colorSpace,
        metallic: metallic?.colorSpace,
      },
      values: {
        roughness: material.roughness,
        metalness: material.metalness,
        clearcoat: material.clearcoat,
        clearcoatRoughness: material.clearcoatRoughness,
      },
    });
    return material;
  }
}
