import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

import { GltfLoader } from '../loaders/gltf-loader';
import { TextureManager } from '../materials/texture-manager';
import { ScrollService } from '../../core/services/scroll.service';

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

  constructor(
    private gltfLoader: GltfLoader,
    private textureManager: TextureManager,
    private scrollService: ScrollService,
  ) {}

  async init(canvas: HTMLCanvasElement) {
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
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    window.addEventListener('resize', () => {
      this.resizeCamera();
    });

    await this.loadHDRILighting();

    await this.loadModel();

    this.animate();
  }

  private async loadHDRILighting() {
    try {
      const loader = new EXRLoader();

      const hdri = await loader.loadAsync('/three/hdri/hdri_1.exr');

      const pmrem = new THREE.PMREMGenerator(this.renderer);

      const envMap = pmrem.fromEquirectangular(hdri).texture;

      this.scene.environment = envMap;

      this.scene.environmentRotation = new THREE.Euler(0, THREE.MathUtils.degToRad(120), 0);

      this.scene.environmentIntensity = 3;

      hdri.dispose();

      pmrem.dispose();
    } catch (error) {
      console.warn('HDRI Fehler', error);
    }
  }

  private async loadModel() {
    const gltf = await this.gltfLoader.load('/three/models/MyHeroAnimation.glb');

    this.scene.add(gltf.scene);

    await this.applyGuaranteedTexturesToMeshes(gltf.scene);

    this.setupCamera(gltf);

    this.setupAnimation(gltf);
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
      camera = new THREE.PerspectiveCamera(22.9, this.canvasAspect(), 0.1, 1000);

      camera.position.set(0, 0, 10);

      camera.lookAt(0, 0, 0);
    }

    this.camera = camera;

    this.originalCameraFov = this.camera.fov;

    this.resizeCamera();

    console.log('AKTIVE GLB KAMERA:', this.camera.name);
  }

  private resizeCamera() {
    if (!this.camera) return;

    const width = window.innerWidth;

    let multiplier = 1;

    if (width <= 390) {
      multiplier = 1.75;
    } else if (width <= 480) {
      multiplier = 1.75;
    } else if (width <= 768) {
      multiplier = 1.25;
    } else if (width <= 1420) {
      multiplier = 1.5;
    } else if (width <= 1080) {
      multiplier = 1.85;
    } else {
      multiplier = 1;
    }

    this.camera.fov = this.originalCameraFov * multiplier;

    this.camera.aspect = this.canvasAspect();

    this.camera.updateProjectionMatrix();
  }

  private setupAnimation(gltf: any) {
    if (!gltf.animations || gltf.animations.length === 0) {
      console.warn('Keine Animation gefunden');

      return;
    }

    const clip = gltf.animations[0];

    this.animationDuration = clip.duration;

    this.mixer = new THREE.AnimationMixer(this.scene);

    this.action = this.mixer.clipAction(clip);

    this.action.reset();

    this.action.enabled = true;

    this.action.setEffectiveWeight(1);

    this.action.play();
  }

  private async applyGuaranteedTexturesToMeshes(object: THREE.Object3D) {
    const flavor = 'Keylime';

    const bodyMaterial = await this.textureManager.loadPBRMaterial(flavor, 'Body_Texture_Main');

    const aluminiumMaterial = await this.textureManager.loadPBRMaterial(
      flavor,
      'Top_Bottom_Aluminium',
    );

    const tabMaterial = await this.textureManager.loadPBRMaterial(flavor, 'Opening_Tab_Aluminium');

    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.castShadow = true;

      child.receiveShadow = true;

      child.frustumCulled = false;

      const name = child.name.toLowerCase();

      if (name.includes('body_texture_main') || name.includes('body')) {
        child.material = bodyMaterial;
      } else if (name.includes('top_bottom_aluminium') || name.includes('top_bottom')) {
        child.material = aluminiumMaterial;
      } else if (name.includes('opening_tab') || name.includes('tab')) {
        child.material = tabMaterial;
      }
    });
  }

  private canvasAspect() {
    const canvas = this.renderer.domElement;

    return canvas.clientWidth / canvas.clientHeight;
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    if (this.mixer && this.animationDuration > 0) {
      const progress = this.scrollService.progress();

      const time = progress * this.animationDuration;

      this.mixer.setTime(time);
    }

    this.renderer.render(this.scene, this.camera);
  };
}
