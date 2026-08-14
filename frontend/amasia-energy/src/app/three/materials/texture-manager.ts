import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root',
})
export class TextureManager {
  private readonly loader = new THREE.TextureLoader();
  private readonly textureCache = new Map<string, THREE.Texture>();
  private readonly texturePromises = new Map<string, Promise<THREE.Texture | null>>();
  private readonly materialCache = new Map<string, THREE.MeshPhysicalMaterial>();
  private renderer?: THREE.WebGLRenderer;

  setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
  }

  private loadTexture(path: string): Promise<THREE.Texture | null> {
    const cachedTexture = this.textureCache.get(path);
    if (cachedTexture) {
      return Promise.resolve(cachedTexture);
    }
    const existingPromise = this.texturePromises.get(path);
    if (existingPromise) {
      return existingPromise;
    }
    const promise = this.loader
      .loadAsync(path)
      .then((texture) => {
        this.configureTexture(texture, path);
        this.textureCache.set(path, texture);
        this.texturePromises.delete(path);
        console.log('Texture loaded:', path);
        return texture;
      })
      .catch((error) => {
        this.texturePromises.delete(path);
        console.error('Texture FAILED:', path, error);
        return null;
      });
    this.texturePromises.set(path, promise);
    return promise;
  }

  private configureTexture(texture: THREE.Texture, path: string): void {
    texture.flipY = false;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(8, this.renderer?.capabilities.getMaxAnisotropy() ?? 8);
    texture.needsUpdate = true;
    console.log('Configured texture:', path);
  }

  async loadPBRMaterial(
    flavor: string,
    materialFolder: string,
  ): Promise<THREE.MeshPhysicalMaterial> {
    const materialKey = `${flavor}/${materialFolder}`;
    const cachedMaterial = this.materialCache.get(materialKey);
    if (cachedMaterial) {
      return cachedMaterial;
    }
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
    baseColor.needsUpdate = true;
    if (roughness) {
      roughness.needsUpdate = true;
    }
    if (metallic) {
      metallic.needsUpdate = true;
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
    this.materialCache.set(materialKey, material);
    console.log('FINAL PBR MATERIAL:', {
      flavor,
      materialFolder,
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

  async loadPBRMaterialsParallel(
    flavor: string,
    materialFolder: string[],
  ): Promise<THREE.MeshPhysicalMaterial[]> {
    return Promise.all(materialFolder.map((folder) => this.loadPBRMaterial(flavor, folder)));
  }

  prepareTextureForGPU(texture: THREE.Texture | null | undefined): void {
    if (!texture || !this.renderer) {
      return;
    }
    try {
      this.renderer.initTexture(texture);
    } catch (error) {
      console.warn('GPU texture initialization failed:', error);
    }
  }

  prepareMaterialForGPU(material: THREE.Material): void {
    if (
      !(
        material instanceof THREE.MeshStandardMaterial ||
        material instanceof THREE.MeshPhysicalMaterial
      )
    ) {
      return;
    }
    this.prepareTextureForGPU(material.map);
    this.prepareTextureForGPU(material.roughnessMap);
    this.prepareTextureForGPU(material.metalnessMap);
    this.prepareTextureForGPU(material.normalMap);
  }

  prepareAllMaterialsForGPU(): void {
    for (const material of this.materialCache.values()) {
      this.prepareMaterialForGPU(material);
    }
    console.log('All cached PBR materials prepared for GPU.');
  }

  getTexture(path: string): THREE.Texture | undefined {
    return this.textureCache.get(path);
  }

  getMaterial(flavor: string, materialFolder: string): THREE.MeshPhysicalMaterial | undefined {
    return this.materialCache.get(`${flavor}/${materialFolder}`);
  }

  getCacheStats() {
    return {
      textures: this.textureCache.size,
      pendingTextureRequests: this.texturePromises.size,
      materials: this.materialCache.size,
    };
  }
}
