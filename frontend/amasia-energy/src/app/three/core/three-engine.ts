import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { GltfLoader } from '../loaders/gltf-loader';
import { TextureManager } from '../materials/texture-manager';
import { ArnoldLightLoader } from '../lighting/arnold-light-loader';
import { VolumetricAtmosphere } from '../effects/volumetric-atmosphere';

@Injectable({
  providedIn: 'root',
})
export class ThreeEngine {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;

  private controls!: OrbitControls;

  private mixer?: THREE.AnimationMixer;
  private animationDuration = 0;

  private clock = new THREE.Clock();
  private hdriRotationDegrees = -323.6632782938925;
  private arnoldLights!: ArnoldLightLoader;
  private atmosphere!: VolumetricAtmosphere;

  private targetScrollPercent = 0;
  private currentScrollPercent = 0;

  constructor(
    private gltfLoader: GltfLoader,
    private textureManager: TextureManager,
  ) {}

  async init(canvas: HTMLCanvasElement) {
    // ==========================
    // SCENE
    // ==========================
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050606);

    this.atmosphere = new VolumetricAtmosphere(this.scene);
    this.atmosphere.create();

    // ==========================
    // RENDERER
    // ==========================
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.resize(canvas);

    // ==========================
    // HDRI
    // ==========================
    await this.loadHDRILighting();
    this.arnoldLights = new ArnoldLightLoader(this.scene);
    await this.arnoldLights.load('/three/lighting/arnold-lighting.json');

    // ==========================
    // MODEL
    // ==========================
    await this.loadModel();

    window.addEventListener('resize', () => this.resize(canvas));
    window.addEventListener('scroll', () => this.onScroll());

    this.onScroll();
    this.animate();
  }

  private degreesToRadians(degrees: number) {
    return (degrees * Math.PI) / 180;
  }

  private async loadHDRILighting() {
    try {
      const exrLoader = new EXRLoader();
      const hdriTexture = await exrLoader.loadAsync('/three/hdri/hdri_1.exr');

      hdriTexture.rotation = this.degreesToRadians(this.hdriRotationDegrees);
      hdriTexture.updateMatrix();

      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      pmremGenerator.compileCubemapShader();

      const envMap = pmremGenerator.fromEquirectangular(hdriTexture).texture;

      this.scene.environment = envMap;
      this.scene.environmentIntensity = 1.5;
      envMap.mapping = THREE.EquirectangularReflectionMapping;

      hdriTexture.dispose();
      pmremGenerator.dispose();
    } catch (error) {
      console.warn('HDRI error:', error);
    }
  }

  private resize(canvas: HTMLCanvasElement) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    this.renderer.setSize(width, height, false);

    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }

  private canvasAspect() {
    const canvas = this.renderer.domElement;
    return canvas.clientWidth / canvas.clientHeight;
  }

  private async loadModel() {
    const gltf = await this.gltfLoader.load('/three/models/MyHeroAnimation.glb');

    this.scene.add(gltf.scene);

    await this.applyGuaranteedTexturesToMeshes(gltf.scene);

    // ==========================
    // CAMERA
    // ==========================
    if (gltf.cameras.length > 0) {
      const gltfCamera = gltf.cameras[0];
      if (gltfCamera instanceof THREE.PerspectiveCamera) {
        this.camera = gltfCamera;
      } else {
        this.camera = new THREE.PerspectiveCamera(22.9, this.canvasAspect(), 0.01, 5000);
      }
      this.camera.fov = 22.9;
      this.camera.aspect = this.canvasAspect();
      this.camera.near = 0.01;
      this.camera.far = 5000;
      this.camera.updateProjectionMatrix();
      this.camera.updateMatrixWorld(true);
    } else {
      this.camera = new THREE.PerspectiveCamera(22.9, this.canvasAspect(), 0.01, 5000);
      this.camera.position.z = 10;
    }

    // ==========================
    // CONTROLS (Maus-Interaktion)
    // ==========================
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
    this.controls.enabled = false;

    // ==========================
    // ANIMATION
    // ==========================
    if (gltf.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(gltf.scene);

      gltf.animations.forEach((clip: THREE.AnimationClip) => {
        const action = this.mixer!.clipAction(clip);
        action.play();

        this.animationDuration = Math.max(this.animationDuration, clip.duration);
      });

      this.mixer.setTime(0);
    }
  }

  private async applyGuaranteedTexturesToMeshes(object: THREE.Object3D) {
    const flavorNames = ['Blueberry', 'Lime', 'Orange', 'Strawberry'];
    const loadedTextures: { [key: string]: THREE.Texture } = {};

    for (const flavor of flavorNames) {
      const tex = await this.textureManager.loadFlavor(flavor);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.flipY = false;
      loadedTextures[flavor] = tex;
    }

    const bodyMeshes: THREE.Mesh[] = [];

    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.geometry.attributes['uv1']) {
          child.geometry.setAttribute('uv', child.geometry.attributes['uv1']);
        }

        const materials = Array.isArray(child.material) ? child.material : [child.material];

        materials.forEach((material: any) => {
          const name = material.name ? material.name.toLowerCase() : '';

          if (name.includes('body')) {
            bodyMeshes.push(child);
          }

          if (name.includes('aluminium')) {
            const aluminiumMaterial = material as THREE.MeshPhysicalMaterial;
            aluminiumMaterial.color.setRGB(0.75, 0.78, 0.82);
            aluminiumMaterial.metalness = 1.0;
            aluminiumMaterial.roughness = 0.22;
            aluminiumMaterial.envMapIntensity = 1.8;
            aluminiumMaterial.clearcoat = 0.0;
            aluminiumMaterial.reflectivity = 1.0;
            aluminiumMaterial.needsUpdate = true;
          }
        });
      }
    });

    const assignedFlavors: string[] = [];
    const remainingFlavors = ['Blueberry', 'Orange', 'Strawberry'];

    bodyMeshes.forEach((mesh, index) => {
      let chosenFlavor = '';

      if (index === 0) {
        chosenFlavor = 'Lime';
      } else if (index <= 3) {
        chosenFlavor = remainingFlavors[index - 1];
      } else {
        const allFlavors = ['Lime', 'Blueberry', 'Orange', 'Strawberry'];
        const randomIndex = Math.floor(Math.random() * allFlavors.length);
        chosenFlavor = allFlavors[randomIndex];
      }

      assignedFlavors.push(chosenFlavor);
      const texture = loadedTextures[chosenFlavor];

      mesh.material = new THREE.MeshPhysicalMaterial({
        map: texture,
        color: 0xffffff,
        roughness: 0.22,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
        envMapIntensity: 2,
      });
    });

    console.log('Zugewiesene Texturen für alle Dosen:', assignedFlavors);
  }

  private onScroll() {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

    if (maxScroll > 0) {
      const scrollMultiplikator = 2.0;
      const rawPercent = (scrollY / maxScroll) * scrollMultiplikator;
      this.targetScrollPercent = Math.max(0, Math.min(1, rawPercent));
    } else {
      this.targetScrollPercent = 0;
    }
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    this.currentScrollPercent += (this.targetScrollPercent - this.currentScrollPercent) * 0.05;

    if (this.mixer && this.animationDuration > 0) {
      this.mixer.setTime(this.currentScrollPercent * this.animationDuration);
    }

    if (this.controls) {
      this.controls.enabled = this.currentScrollPercent > 0.2;
      this.controls.update();
    }

    this.atmosphere.update(performance.now() * 0.001);
    this.renderer.render(this.scene, this.camera);
  }
}
