import { effect, Injectable, signal } from '@angular/core';
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
  private initialized = false;
  private initPromise?: Promise<void>;
  private attachedCanvas?: HTMLCanvasElement;
  private renderLoopStarted = false;
  private resizeListener?: () => void;
  private heroActive = false;
  readonly loading = signal(false);

  constructor(
    private gltfLoader: GltfLoader,
    private textureManager: TextureManager,
    private scrollService: ScrollService,
    private flavorService: FlavorService,
  ) {
    effect(() => {
      const flavorId = this.flavorService.selectedFlavorId();
      if (!this.materialsReady) {
        return;
      }
      if (flavorId === this.currentCenterFlavor && !this.centerRotationAnimating) {
        return;
      }
      if (this.centerRotationAnimating) {
        return;
      }
      this.applyFlavorToCenter(flavorId);
    });
  }

  async init(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;
    this.attachedCanvas = canvas;
    this.heroActive = true;

    if (this.initialized) {
      this.loading.set(false);
      this.attachRendererToCanvas(canvas);
      this.resizeCamera();
      return;
    }

    if (this.initPromise) {
      this.loading.set(true);
      await this.initPromise;
      this.canvas = canvas;
      this.attachedCanvas = canvas;
      this.heroActive = true;
      this.attachRendererToCanvas(canvas);
      this.resizeCamera();
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.initPromise = this.initializeEngine(canvas);

    try {
      await this.initPromise;
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      this.initialized = true;
      this.loading.set(false);
    } catch (error) {
      this.initPromise = undefined;
      this.initialized = false;
      this.loading.set(false);
      throw error;
    }
  }

  detach(): void {
    this.heroActive = false;
  }

  dispose(): void {
    this.heroActive = false;
    this.initialized = false;
    this.initPromise = undefined;
    this.loading.set(false);

    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = undefined;
    }

    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.scene);
      this.mixer = undefined;
    }

    if (this.scene) {
      this.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) {
          return;
        }

        object.geometry?.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];

        for (const material of materials) {
          material.dispose();
        }
      });
    }

    if (this.scene?.environment) {
      this.scene.environment.dispose();
    }

    this.flavorMaterials = {};
    this.materialsReady = false;
    this.materialsPreloadPromise = undefined;
    this.centerGroup = undefined;
    this.centerRotationPivot = undefined;

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }

    this.renderer = undefined!;
    this.scene = undefined!;
    this.camera = undefined!;
    this.canvas = undefined!;
    this.attachedCanvas = undefined!;
  }

  private async initializeEngine(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;
    this.attachedCanvas = canvas;
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
    this.setupResizeListener();

    if (this.enableHDRI) {
      await this.loadHDRILighting();
    }

    await this.loadArnoldLights();

    if (this.enableFallbackLight) {
      this.createFallbackLight();
    }

    await this.loadModel();
    this.startRenderLoop();
  }

  private attachRendererToCanvas(canvas: HTMLCanvasElement): void {
    if (!this.renderer) {
      return;
    }

    this.canvas = canvas;
    this.attachedCanvas = canvas;

    if (canvas !== this.renderer.domElement) {
      this.replaceAngularCanvasWithPersistentCanvas(canvas);
    }

    this.resizeCamera();
  }

  private replaceAngularCanvasWithPersistentCanvas(angularCanvas: HTMLCanvasElement): void {
    const persistentCanvas = this.renderer.domElement;

    if (angularCanvas === persistentCanvas) {
      return;
    }

    const parent = angularCanvas.parentElement;

    if (!parent) {
      return;
    }

    persistentCanvas.className = angularCanvas.className;
    persistentCanvas.style.cssText = angularCanvas.style.cssText;
    persistentCanvas.style.width = '100%';
    persistentCanvas.style.height = '100%';

    parent.replaceChild(persistentCanvas, angularCanvas);
    this.canvas = persistentCanvas;
    this.attachedCanvas = persistentCanvas;
  }

  private setupResizeListener(): void {
    if (this.resizeListener) {
      return;
    }

    this.resizeListener = () => {
      this.resizeCamera();
    };

    window.addEventListener('resize', this.resizeListener, {
      passive: true,
    });
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

  private assetUrl(path: string): string {
    const cleanPath = path.replace(/^\/+/, '');
    const baseHref =
      document.querySelector('base')?.getAttribute('href') || document.baseURI || '/';

    return new URL(cleanPath, new URL(baseHref, window.location.origin)).toString();
  }

  private async loadHDRILighting() {
    try {
      const loader = new EXRLoader();
      const hdriUrl = this.assetUrl('three/hdri/hdri_1.exr');
      const hdri = await loader.loadAsync(hdriUrl);

      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const envMap = pmrem.fromEquirectangular(hdri).texture;

      this.scene.environment = envMap;
      this.scene.environmentRotation = new THREE.Euler(0, this.hdriStartRotation, 0);
      this.scene.environmentIntensity = 2;

      hdri.dispose();
      pmrem.dispose();
    } catch (error) {}
  }

  private async loadArnoldLights() {
    this.arnoldLightLoader = new ArnoldLightLoader(this.scene);
    const arnoldLightsUrl = this.assetUrl('three/lighting/arnold_lights.json');
    await this.arnoldLightLoader.load(arnoldLightsUrl);
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
    const modelUrl = this.assetUrl('three/models/MyHeroAnimation.glb');
    const gltf = await this.gltfLoader.load(modelUrl);

    this.scene.add(gltf.scene);

    await this.applyGuaranteedTexturesToMeshes(gltf.scene);
    this.setupCamera(gltf);
    this.setupAnimation(gltf);
  }

  private createCenterRotationPivot(): void {
    if (!this.centerGroup || !this.centerGroup.parent) {
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
  }

  private resizeCamera() {
    if (!this.camera || !this.renderer || !this.canvas) {
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
  }

  private async applyGuaranteedTexturesToMeshes(object: THREE.Object3D) {
    const centerGroup = object.getObjectByName('Can_Center_GRP');
    const leftGroup = object.getObjectByName('Can_Left_GRP');
    const rightGroup = object.getObjectByName('Can_Right_GRP');

    this.centerGroup = centerGroup ?? undefined;

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

    await Promise.all(
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

          return true;
        } catch (error) {
          return false;
        }
      }),
    );

    this.textureManager.prepareAllMaterialsForGPU();
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
    } catch (error) {}
  }

  private applyMaterialsToCan(
    canGroup: THREE.Object3D,
    materials: FlavorMaterials,
    flavor: FlavorId | string,
  ): void {
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
      return;
    }

    if (!this.centerRotationPivot) {
      return;
    }

    const materials = this.flavorMaterials[flavorId];

    if (!materials) {
      return;
    }

    if (flavorId === this.currentCenterFlavor) {
      return;
    }

    if (this.centerRotationAnimating) {
      return;
    }

    this.pendingFlavorId = flavorId;
    this.pendingFlavorMaterials = materials;
    this.pendingMaterialApplied = false;

    this.startCenterRotation();
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
    }
  }

  private canvasAspect() {
    if (!this.canvas) {
      return 1;
    }

    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    if (height <= 0) {
      return 1;
    }

    return width / height;
  }

  private startRenderLoop(): void {
    if (this.renderLoopStarted) {
      return;
    }

    this.renderLoopStarted = true;
    requestAnimationFrame(this.animate);
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

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };
}
