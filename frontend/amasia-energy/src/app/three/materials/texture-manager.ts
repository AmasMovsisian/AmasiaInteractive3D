import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

@Injectable({
  providedIn: 'root',
})
export class TextureManager {
  private readonly ktx2Loader = new KTX2Loader();
  private renderer?: THREE.WebGLRenderer;
  private ktx2Initialized = false;
  private readonly textureCache = new Map<string, THREE.Texture>();
  private readonly texturePromises = new Map<string, Promise<THREE.Texture | null>>();
  private readonly materialCache = new Map<string, THREE.MeshPhysicalMaterial>();

  setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
    if (this.ktx2Initialized) {
      return;
    }
    this.ktx2Loader.setTranscoderPath('/three/basis/');
    this.ktx2Loader.setWorkerLimit(2);
    this.ktx2Loader.detectSupport(renderer);
    this.ktx2Initialized = true;
    console.log('====================================');
    console.log('KTX2 LOADER INITIALIZED');
    console.log('Transcoder path: /three/basis/');
    console.log('Worker limit: 2');
    console.log('====================================');
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
    if (!this.ktx2Initialized || !this.renderer) {
      const error = new Error(
        'TextureManager: KTX2Loader is not initialized. ' +
          'Call textureManager.setRenderer(renderer) before loading textures.',
      );
      console.error(error);
      return Promise.reject(error);
    }
    console.log('====================================');
    console.log('LOADING KTX2 TEXTURE');
    console.log(path);
    console.log('====================================');
    const promise = this.ktx2Loader
      .loadAsync(path)
      .then((texture) => {
        this.configureTexture(texture, path);
        this.textureCache.set(path, texture);
        this.texturePromises.delete(path);
        console.log('KTX2 SUCCESS:', path);
        return texture;
      })
      .catch((error) => {
        this.texturePromises.delete(path);
        console.error('====================================');
        console.error('KTX2 FAILED');
        console.error('URL:', path);
        console.error('ERROR:', error);
        console.error('====================================');
        return null;
      });
    this.texturePromises.set(path, promise);
    return promise;
  }

  private configureTexture(texture: THREE.Texture, path: string): void {
    texture.flipY = false;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const maxAnisotropy = this.renderer?.capabilities.getMaxAnisotropy() ?? 1;
    texture.anisotropy = Math.min(8, maxAnisotropy);
    texture.needsUpdate = true;
    console.log('Configured KTX2 texture:', {
      path,
      colorSpace: texture.colorSpace,
      minFilter: texture.minFilter,
      magFilter: texture.magFilter,
      anisotropy: texture.anisotropy,
    });
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
    console.log('====================================');
    console.log('LOADING PBR MATERIAL');
    console.log('Flavor:', flavor);
    console.log('Folder:', materialFolder);
    console.log('====================================');
    const baseColorPath = path + `${materialFolder}_BaseColor.ktx2`;
    const roughnessPath = path + `${materialFolder}_Roughness.ktx2`;
    const metallicPath = path + `${materialFolder}_Metallic.ktx2`;
    console.log('BaseColor:', baseColorPath);
    console.log('Roughness:', roughnessPath);
    console.log('Metallic:', metallicPath);
    const [baseColor, roughness, metallic] = await Promise.all([
      this.loadTexture(baseColorPath),
      this.loadTexture(roughnessPath),
      this.loadTexture(metallicPath),
    ]);
    if (!baseColor) {
      throw new Error(`Missing BaseColor KTX2 texture: ${baseColorPath}`);
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
      material.metalness = 1.0;
      material.roughness = 1.0;
      material.clearcoat = 0.0;
      material.clearcoatRoughness = 1.0;
    }
    this.materialCache.set(materialKey, material);
    console.log('====================================');
    console.log('PBR MATERIAL READY');
    console.log(materialKey);
    console.log({
      baseColor: !!material.map,
      roughness: !!material.roughnessMap,
      metallic: !!material.metalnessMap,
    });
    console.log('====================================');
    return material;
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
    console.log('All cached KTX2 materials prepared for GPU.');
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
