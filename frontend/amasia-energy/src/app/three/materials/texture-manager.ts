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
      return texture;
    } catch (error) {
      console.error('Texture FAILED:', path);
      return null;
    }
  }

  async loadPBRMaterial(
    flavor: string,
    materialFolder: string,
  ): Promise<THREE.MeshPhysicalMaterial> {
    const path = `/three/materials/${flavor}/${materialFolder}/`;

    const [baseColor, roughness, metallic, normal] = await Promise.all([
      this.loadTexture(path + `${materialFolder}_BaseColor.png`),
      this.loadTexture(path + `${materialFolder}_Roughness.png`),
      this.loadTexture(path + `${materialFolder}_Metallic.png`),
      this.loadTexture(path + `${materialFolder}_Normal.png`),
    ]);

    if (!baseColor) {
      throw new Error(`Missing BaseColor texture: ${materialFolder}`);
    }

    const textures = [baseColor, roughness, metallic, normal];

    textures.forEach((texture) => {
      if (!texture) return;

      texture.flipY = false;
      texture.anisotropy = 16;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
    });

    baseColor.colorSpace = THREE.SRGBColorSpace;

    if (roughness) {
      roughness.colorSpace = THREE.NoColorSpace;
    }
    if (metallic) {
      metallic.colorSpace = THREE.NoColorSpace;
    }
    if (normal) {
      normal.colorSpace = THREE.NoColorSpace;
    }

    const isAluminium = materialFolder.toLowerCase().includes('aluminium');
    const isBody = materialFolder.toLowerCase().includes('body');

    const material = new THREE.MeshPhysicalMaterial({
      map: baseColor,
      roughnessMap: roughness ?? undefined,
      metalnessMap: metallic ?? undefined,
      normalMap: normal ?? undefined,
      color: new THREE.Color(1, 1, 1),
      metalness: metallic ? 1.0 : isAluminium ? 0.85 : 0.0,
      roughness: roughness ? 1.0 : isAluminium ? 0.45 : 0.4,
      envMapIntensity: isAluminium ? 1.5 : 1.2,
      clearcoat: isBody ? 1.0 : isAluminium ? 0.35 : 0,
      clearcoatRoughness: isBody ? 0.08 : isAluminium ? 0.15 : 0,
      depthWrite: true,
      depthTest: true,
    });

    if (isAluminium) {
      material.metalness = metallic ? 1.0 : 1.0;
      material.roughness = roughness ? 1.0 : 0.95;
      material.envMapIntensity = 0.55;
      material.clearcoat = 0.2;
      material.clearcoatRoughness = 0.3;
      material.reflectivity = 0.6;
    }

    if (isBody) {
      material.metalness = metallic ? 1.0 : 0;
      material.roughness = roughness ? 1.0 : 0.4;
      material.envMapIntensity = 1.25;
      material.clearcoat = 1;
      material.clearcoatRoughness = 0.08;

      if (normal) {
        material.normalScale.set(1.0, 1.0);
      }
    }

    console.log('FINAL MATERIAL:', materialFolder, {
      roughnessMap: !!material.roughnessMap,
      metalnessMap: !!material.metalnessMap,
      normalMap: !!material.normalMap,
    });

    return material;
  }
}
