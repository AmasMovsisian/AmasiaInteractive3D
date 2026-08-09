import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { GltfLoader } from '../loaders/gltf-loader';
import { TextureManager } from '../materials/texture-manager';
import { ScrollService } from '../../core/services/scroll.service';
import { ArnoldLightLoader } from '../lighting/arnold-light-loader';

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
  private arnoldLightLoader!: ArnoldLightLoader;
  private canvas!: HTMLCanvasElement;
  private readonly enableHDRI = true;
  private readonly hdriStartRotation = THREE.MathUtils.degToRad(120);
  private readonly hdriRotationAmount = THREE.MathUtils.degToRad(360);
  private readonly enableFallbackLight = true;
  private readonly fallbackLightIntensity = 2.5;

  constructor(
    private gltfLoader: GltfLoader,
    private textureManager: TextureManager,
    private scrollService: ScrollService,
  ) {}

  async init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();

    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 1;
    bgCanvas.height = 512;
    const ctx = bgCanvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.15, '#F3F3F3');
    gradient.addColorStop(0.3, '#E2E2E2');
    gradient.addColorStop(0.5, '#FCFCFC');
    gradient.addColorStop(0.7, '#E5E5E5');
    gradient.addColorStop(1, '#F7F7F7');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1, 512);
    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    bgTexture.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = bgTexture;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    window.addEventListener('resize', () => {
      this.resizeCamera();
    });

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
      this.scene.environmentIntensity = 2.5;
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
    const rotation = this.hdriStartRotation + (progress * this.hdriRotationAmount);
    this.scene.environmentRotation.y = rotation;
  }

  private async loadModel() {
    const gltf = await this.gltfLoader.load('/three/models/MyHeroAnimation.glb');
    this.scene.add(gltf.scene);
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
    if (!this.camera) {
      return;
    }

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
    } else {
      multiplier = 1;
    }

    this.camera.fov = this.originalCameraFov * multiplier;
    this.camera.aspect = this.canvasAspect();
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
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
  }

  private async applyGuaranteedTexturesToMeshes(object: THREE.Object3D) {
    const flavor = 'Keylime';
    const bodyMaterial = await this.textureManager.loadPBRMaterial(flavor, 'Body_Texture_Main');
    const aluminiumMaterial = await this.textureManager.loadPBRMaterial(flavor, 'Top_Bottom_Aluminium');
    const tabMaterial = await this.textureManager.loadPBRMaterial(flavor, 'Opening_Tab_Aluminium');

    object.traverse((child: THREE.Object3D) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }

      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = false;

      const name = child.name.toLowerCase();

      if (name.includes('body_texture_main') || name.includes('body')) {
        child.material = bodyMaterial;
        this.debugMaterial(child, bodyMaterial);
        return;
      }

      if (name.includes('top_bottom_aluminium') || name.includes('top_bottom')) {
        child.material = aluminiumMaterial;
        this.debugMaterial(child, aluminiumMaterial);
        return;
      }

      if (name.includes('opening_tab') || name.includes('tab')) {
        child.material = tabMaterial;
        this.debugMaterial(child, tabMaterial);
      }
    });
  }

  private debugMaterial(mesh: THREE.Mesh, material: THREE.Material) {
    console.log('MATERIAL:', {
      mesh: mesh.name,
      type: material.type,
    });

    if (!(material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial)) {
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
      const time = progress * this.animationDuration;
      this.mixer.setTime(time);
    }

    this.updateHDRIRotation();

    if (this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };
}