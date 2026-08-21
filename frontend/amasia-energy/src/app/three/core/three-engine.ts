import { effect, Injectable } from '@angular/core';
import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { GltfLoader } from '../loaders/gltf-loader';
import { TextureManager } from '../materials/texture-manager';
import { ScrollService } from '../../core/services/scroll.service';
import { FlavorId, FlavorService } from '../../core/services/flavor.service';
import { ArnoldLightLoader } from '../lighting/arnold-light-loader';
interface FlavorMaterials {
  body: THREE.MeshPhysicalMaterial;
  aluminium: THREE.MeshPhysicalMaterial;
  tab: THREE.MeshPhysicalMaterial;
}
@Injectable({
  providedIn: 'root',
})
export class ThreeEngine {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private mixer?: THREE.AnimationMixer;
  private action?: THREE.AnimationAction;
  private animationDuration = 0;
  private originalCameraFov = 0;
  private initialDevicePixelRatio = window.devicePixelRatio || 1;
  private lastValidFov = 0;
  private lastValidAspect = 0;
  private arnoldLightLoader!: ArnoldLightLoader;
  private canvas!: HTMLCanvasElement;
  private readonly enableHDRI = true;
  private readonly hdriStartRotation = THREE.MathUtils.degToRad(60);
  private readonly hdriRotationAmount = THREE.MathUtils.degToRad(720);
  private readonly enableFallbackLight = true;
  private readonly fallbackLightIntensity = 1.5;
  private readonly maxRenderPixelRatio = 4;
  private flavorMaterials: Partial<Record<FlavorId, FlavorMaterials>> = {};
  private centerGroup?: THREE.Object3D;
  private materialsReady = false;
  private materialsPreloadPromise?: Promise<void>;
  private centerRotationPivot?: THREE.Group;
  private centerRotationAnimating = false;
  private centerRotationStartTime = 0;
  private centerRotationStart = 0;
  private centerRotationTarget = Math.PI * 2;
  private readonly centerRotationDuration = 0.3;
  private pendingFlavorId?: FlavorId;
  private pendingFlavorMaterials?: FlavorMaterials;
  private pendingMaterialApplied = false;
  private currentCenterFlavor?: FlavorId;
  constructor(
    private gltfLoader: GltfLoader,
    private textureManager: TextureManager,
    private scrollService: ScrollService,
    private flavorService: FlavorService,
  ) {
    effect(() => {
      const flavorId = this.flavorService.selectedFlavorId();
      console.log('Flavor signal changed:', flavorId);
      if (!this.materialsReady) {
        console.log('Flavor ignored until materials are ready:', flavorId);
        return;
      }
      if (flavorId === this.currentCenterFlavor && !this.centerRotationAnimating) {
        return;
      }
      if (this.centerRotationAnimating) {
        console.log('Flavor click ignored while 360° rotation is running:', flavorId);
        return;
      }
      this.applyFlavorToCenter(flavorId);
    });
  }
  async init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initialDevicePixelRatio = window.devicePixelRatio || 1;
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.updateRenderPixelRatio();
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.textureManager.setRenderer(this.renderer);
    window.addEventListener(
      'resize',
      () => {
        this.resizeCamera();
      },
      { passive: true },
    );
    if (this.enableHDRI) {
      await this.loadHDRILighting();
    }
    await this.loadArnoldLights();
    if (this.enableFallbackLight) {
      this.createFallbackLight();
    }
    await this.loadModel();
    this.animate();
  }
  private updateRenderPixelRatio(): void {
    if (!this.renderer) {
      return;
    }
    const currentDpr = window.devicePixelRatio || 1;
    const pixelRatio = THREE.MathUtils.clamp(
      currentDpr,
      this.initialDevicePixelRatio,
      this.maxRenderPixelRatio,
    );
    this.renderer.setPixelRatio(pixelRatio);
    console.log('Render Pixel Ratio:', pixelRatio);
    console.log('Current Device Pixel Ratio:', currentDpr);
  }
  private createFallbackLight() {
    const light = new THREE.HemisphereLight(0xffffff, 0x444444, this.fallbackLightIntensity);
    light.name = 'ThreeFallbackHemisphereLight';
    this.scene.add(light);
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.25);
    frontLight.name = 'ThreeFallbackFrontLight';
    frontLight.position.set(0, 3, 5);
    frontLight.target.position.set(0, 0, 0);
    this.scene.add(frontLight);
    this.scene.add(frontLight.target);
  }
  private async loadHDRILighting() {
    try {
      const loader = new EXRLoader();
      const hdri = await loader.loadAsync('/three/hdri/hdri_1.exr');
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const envMap = pmrem.fromEquirectangular(hdri).texture;
      this.scene.environment = envMap;
      this.scene.environmentRotation = new THREE.Euler(0, this.hdriStartRotation, 0);
      this.scene.environmentIntensity = 2;
      hdri.dispose();
      pmrem.dispose();
      console.log('HDRI loaded successfully');
    } catch (error) {
      console.warn('HDRI Fehler:', error);
    }
  }
  private async loadArnoldLights() {
    this.arnoldLightLoader = new ArnoldLightLoader(this.scene);
    await this.arnoldLightLoader.load('/three/lighting/arnold_lights.json');
  }
  private updateHDRIRotation() {
    if (!this.enableHDRI) {
      return;
    }
    if (!this.scene.environmentRotation) {
      return;
    }
    const progress = this.scrollService.progress();
    const rotation = this.hdriStartRotation + progress * this.hdriRotationAmount;
    this.scene.environmentRotation.y = rotation;
  }
  private async loadModel() {
    const gltf = await this.gltfLoader.load('/three/models/MyHeroAnimation.glb');
    this.scene.add(gltf.scene);
    gltf.scene.traverse((child: THREE.Object3D) => {
      console.log('GLB:', child.name, '| type:', child.type, '| parent:', child.parent?.name);
    });
    await this.applyGuaranteedTexturesToMeshes(gltf.scene);
    this.setupCamera(gltf);
    this.setupAnimation(gltf);
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    console.log('====================================');
    console.log('MODEL DEBUG');
    console.log('BOUNDING BOX SIZE:', size.toArray());
    console.log('MODEL CENTER:', center.toArray());
    console.log('====================================');
  }
  private createCenterRotationPivot(): void {
    if (!this.centerGroup || !this.centerGroup.parent) {
      console.warn('Cannot create center rotation pivot.');
      return;
    }
    const originalParent = this.centerGroup.parent;
    this.scene.updateMatrixWorld(true);
    const worldPosition = new THREE.Vector3();
    this.centerGroup.getWorldPosition(worldPosition);
    const pivot = new THREE.Group();
    pivot.name = 'Can_Center_FlavorRotation_Pivot';
    originalParent.add(pivot);
    pivot.position.copy(originalParent.worldToLocal(worldPosition.clone()));
    pivot.attach(this.centerGroup);
    this.centerRotationPivot = pivot;
    this.centerRotationPivot.rotation.set(0, 0, 0);
    console.log('CENTER ROTATION PIVOT CREATED', this.centerRotationPivot);
  }
  private setupCamera(gltf: any) {
    let camera: THREE.PerspectiveCamera | undefined;
    if (gltf.cameras && gltf.cameras.length > 0) {
      const gltfCamera = gltf.cameras[0];
      if (gltfCamera instanceof THREE.PerspectiveCamera) {
        camera = gltfCamera;
      }
    }
    if (!camera) {
      gltf.scene.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.PerspectiveCamera) {
          camera = object;
        }
      });
    }
    if (!camera) {
      camera = new THREE.PerspectiveCamera(22.9, this.canvasAspect(), 0.01, 1000);
      camera.position.set(0, 0, 10);
      camera.lookAt(0, 0, 0);
    }
    this.camera = camera;
    this.originalCameraFov = this.camera.fov;
    this.resizeCamera();
    console.log('AKTIVE GLB KAMERA:', this.camera.name);
  }
  private resizeCamera() {
    if (!this.camera || !this.renderer) {
      return;
    }
    this.updateRenderPixelRatio();
    const width = window.innerWidth;
    let multiplier = 1;
    if (width <= 390) {
      multiplier = 1.75;
    } else if (width <= 480) {
      multiplier = 1.75;
    } else if (width <= 768) {
      multiplier = 1.25;
    } else if (width <= 1080) {
      multiplier = 1.85;
    } else if (width <= 1420) {
      multiplier = 1.5;
    }
    if (this.isBrowserZoomedTooFar()) {
      multiplier = 1;
    }
    this.camera.fov = this.originalCameraFov * multiplier;
    this.camera.aspect = this.canvasAspect();
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
    this.lastValidFov = this.camera.fov;
    this.lastValidAspect = this.camera.aspect;
  }
  private isBrowserZoomedTooFar(): boolean {
    const screenWidth = window.screen.width;
    const viewportWidth = window.innerWidth;
    if (screenWidth <= 0 || viewportWidth <= 0) {
      return false;
    }
    const zoomRatio = viewportWidth / screenWidth;
    return zoomRatio < 0.75 || zoomRatio > 1.25;
  }
  private setupAnimation(gltf: any) {
    if (!gltf.animations || gltf.animations.length === 0) {
      console.warn('Keine Animation gefunden');
      return;
    }
    const clip = gltf.animations[0];
    this.animationDuration = clip.duration;
    this.mixer = new THREE.AnimationMixer(gltf.scene);
    this.action = this.mixer.clipAction(clip);
    this.action.reset();
    this.action.enabled = true;
    this.action.setEffectiveWeight(1);
    this.action.play();
    console.log('Animation duration:', this.animationDuration);
  }
  private async applyGuaranteedTexturesToMeshes(object: THREE.Object3D) {
    const centerGroup = object.getObjectByName('Can_Center_GRP');
    const leftGroup = object.getObjectByName('Can_Left_GRP');
    const rightGroup = object.getObjectByName('Can_Right_GRP');
    this.centerGroup = centerGroup ?? undefined;
    console.log('====================================');
    console.log('MATERIAL GROUPS');
    console.log('CENTER:', centerGroup);
    console.log('LEFT:', leftGroup);
    console.log('RIGHT:', rightGroup);
    console.log('====================================');
    if (!centerGroup) {
      console.error('Can_Center_GRP NOT FOUND!');
    }
    if (!leftGroup) {
      console.error('Can_Left_GRP NOT FOUND!');
    }
    if (!rightGroup) {
      console.error('Can_Right_GRP NOT FOUND!');
    }
    const flavorMaterialConfigs: Record<
      FlavorId,
      {
        folder: string;
      }
    > = {
      keylime: {
        folder: 'Keylime',
      },
      akebi: {
        folder: 'Akebi',
      },
      coconut: {
        folder: 'Coconut',
      },
      lychee: {
        folder: 'Lychee',
      },
      pandan: {
        folder: 'Pandan',
      },
      'black-edition': {
        folder: 'BlackEdition',
      },
    };
    if (this.materialsPreloadPromise) {
      await this.materialsPreloadPromise;
      return;
    }
    this.materialsPreloadPromise = this.preloadAllFlavorMaterials(flavorMaterialConfigs);
    await this.materialsPreloadPromise;
    const keylimeMaterials = this.flavorMaterials.keylime;
    if (keylimeMaterials) {
      if (leftGroup) {
        this.applyMaterialsToCan(leftGroup, keylimeMaterials, 'keylime');
      }
      if (rightGroup) {
        this.applyMaterialsToCan(rightGroup, keylimeMaterials, 'keylime');
      }
    }
    const initialFlavor = this.flavorService.selectedFlavorId();
    const initialMaterials = this.flavorMaterials[initialFlavor];
    if (initialMaterials && centerGroup) {
      this.applyMaterialsToCan(centerGroup, initialMaterials, initialFlavor);
      this.currentCenterFlavor = initialFlavor;
    }
    if (centerGroup) {
      this.createCenterRotationPivot();
    }
    await this.precompileMaterials();
    this.materialsReady = true;
    console.log('====================================');
    console.log('ALL FLAVOR ASSETS READY');
    console.log(this.textureManager.getCacheStats());
    console.log('====================================');
  }
  private async preloadAllFlavorMaterials(
    configs: Record<
      FlavorId,
      {
        folder: string;
      }
    >,
  ): Promise<void> {
    const flavorIds = Object.keys(configs) as FlavorId[];
    console.log('====================================');
    console.log('STARTING PARALLEL FLAVOR PRELOAD');
    console.log(flavorIds);
    console.log('====================================');
    const results = await Promise.all(
      flavorIds.map(async (flavorId) => {
        const config = configs[flavorId];
        try {
          const [body, aluminium, tab] = await Promise.all([
            this.textureManager.loadPBRMaterial(config.folder, 'Body_Texture_Main'),
            this.textureManager.loadPBRMaterial(config.folder, 'Top_Bottom_Aluminium'),
            this.textureManager.loadPBRMaterial(config.folder, 'Opening_Tab_Aluminium'),
          ]);
          const materials: FlavorMaterials = {
            body,
            aluminium,
            tab,
          };
          this.flavorMaterials[flavorId] = materials;
          this.textureManager.prepareMaterialForGPU(body);
          this.textureManager.prepareMaterialForGPU(aluminium);
          this.textureManager.prepareMaterialForGPU(tab);
          console.log('Flavor prepared:', flavorId);
          return true;
        } catch (error) {
          console.error(`Could not load materials for ${flavorId}:`, error);
          return false;
        }
      }),
    );
    console.log('Flavor preload results:', results);
    this.textureManager.prepareAllMaterialsForGPU();
    console.log('ALL TEXTURES UPLOADED TO GPU');
  }
  private async precompileMaterials(): Promise<void> {
    if (!this.renderer || !this.scene || !this.camera) {
      return;
    }
    try {
      if (typeof this.renderer.compileAsync === 'function') {
        await this.renderer.compileAsync(this.scene, this.camera);
      } else {
        this.renderer.compile(this.scene, this.camera);
      }
      console.log('Three.js shaders precompiled.');
    } catch (error) {
      console.warn('Shader precompile failed:', error);
    }
  }
  private applyMaterialsToCan(
    canGroup: THREE.Object3D,
    materials: FlavorMaterials,
    flavor: FlavorId | string,
  ): void {
    console.log(`Applying ${flavor} materials to:`, canGroup.name);
    canGroup.traverse((child: THREE.Object3D) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }
      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = false;
      const name = child.name.toLowerCase();
      if (name.includes('body_texture_main')) {
        child.material = materials.body;
        return;
      }
      if (name.includes('top_bottom_aluminium')) {
        child.material = materials.aluminium;
        return;
      }
      if (name.includes('opening_tab_aluminium')) {
        child.material = materials.tab;
        return;
      }
    });
  }
  private applyFlavorToCenter(flavorId: FlavorId): void {
    if (!this.centerGroup) {
      console.warn('Cannot change flavor: Can_Center_GRP not found.');
      return;
    }
    if (!this.centerRotationPivot) {
      console.warn('Cannot rotate center: rotation pivot not found.');
      return;
    }
    const materials = this.flavorMaterials[flavorId];
    if (!materials) {
      console.warn(`No materials loaded for flavor: ${flavorId}`);
      return;
    }
    if (flavorId === this.currentCenterFlavor) {
      return;
    }
    if (this.centerRotationAnimating) {
      console.log('Flavor change blocked because rotation is active.');
      return;
    }
    this.pendingFlavorId = flavorId;
    this.pendingFlavorMaterials = materials;
    this.pendingMaterialApplied = false;
    this.startCenterRotation();
    console.log('====================================');
    console.log('STARTING FLAVOR ROTATION:', flavorId);
    console.log('====================================');
  }
  private startCenterRotation(): void {
    if (!this.centerRotationPivot) {
      return;
    }
    this.centerRotationAnimating = true;
    this.centerRotationStart = this.centerRotationPivot.rotation.y;
    this.centerRotationTarget = this.centerRotationStart + Math.PI * 2;
    this.centerRotationStartTime = performance.now();
  }
  private updateCenterRotation(): void {
    if (!this.centerRotationAnimating || !this.centerRotationPivot) {
      return;
    }
    const elapsed = performance.now() - this.centerRotationStartTime;
    const progress = THREE.MathUtils.clamp(elapsed / (this.centerRotationDuration * 1000), 0, 1);
    if (!this.pendingMaterialApplied && progress >= 0.5) {
      if (this.pendingFlavorMaterials && this.pendingFlavorId) {
        this.applyMaterialsToCan(
          this.centerGroup!,
          this.pendingFlavorMaterials,
          this.pendingFlavorId,
        );
        this.currentCenterFlavor = this.pendingFlavorId;
        this.pendingMaterialApplied = true;
        console.log('Material switched at 180°:', this.pendingFlavorId);
      }
    }
    this.centerRotationPivot.rotation.y = THREE.MathUtils.lerp(
      this.centerRotationStart,
      this.centerRotationTarget,
      progress,
    );
    if (progress >= 1) {
      this.centerRotationPivot.rotation.y = this.centerRotationTarget;
      this.centerRotationPivot.rotation.y = THREE.MathUtils.euclideanModulo(
        this.centerRotationPivot.rotation.y,
        Math.PI * 2,
      );
      if (!this.pendingMaterialApplied && this.pendingFlavorMaterials && this.pendingFlavorId) {
        this.applyMaterialsToCan(
          this.centerGroup!,
          this.pendingFlavorMaterials,
          this.pendingFlavorId,
        );
        this.currentCenterFlavor = this.pendingFlavorId;
        this.pendingMaterialApplied = true;
      }
      this.pendingFlavorId = undefined;
      this.pendingFlavorMaterials = undefined;
      this.centerRotationAnimating = false;
      console.log('====================================');
      console.log('360° ROTATION FINISHED');
      console.log('Next flavor click is now allowed.');
      console.log('====================================');
    }
  }
  private debugMaterial(mesh: THREE.Mesh, material: THREE.Material) {
    console.log('MATERIAL:', {
      mesh: mesh.name,
      type: material.type,
    });
    if (
      !(
        material instanceof THREE.MeshStandardMaterial ||
        material instanceof THREE.MeshPhysicalMaterial
      )
    ) {
      console.warn(
        `Material von "${mesh.name}" ist ${material.type}. ` +
          `RectAreaLight funktioniert nur mit ` +
          `MeshStandardMaterial oder MeshPhysicalMaterial.`,
      );
    }
  }
  private canvasAspect() {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (height <= 0) {
      return 1;
    }
    return width / height;
  }
  private animate = () => {
    requestAnimationFrame(this.animate);
    const progress = this.scrollService.progress();
    if (this.mixer && this.animationDuration > 0) {
      const epsilon = 0.0001;
      const time = THREE.MathUtils.clamp(
        progress * (this.animationDuration - epsilon),
        0,
        this.animationDuration - epsilon,
      );
      this.mixer.setTime(time);
    }
    this.updateCenterRotation();
    this.updateHDRIRotation();
    if (this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };
}
