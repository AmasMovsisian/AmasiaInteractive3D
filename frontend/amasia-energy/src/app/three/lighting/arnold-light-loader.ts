import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js';

export interface ArnoldLightData {
  name: string;
  transform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  };
  attributes: {
    color: [[number, number, number]];
    intensity: number;
    exposure: number;
    aiSamples?: number;
    aiNormalize?: boolean;
    aiDiffuse?: number;
    aiSpecular?: number;
    aiSss?: number;
    aiIndirect?: number;
    aiVolume?: number;
    aiShadowDensity?: number;
    aiShadowColor?: [[number, number, number]];
    aiSpread?: number;
    aiRoundness?: number;
    aiSoftEdge?: number;
    aiCastVolumetricShadows?: boolean;
    aiResolution?: number;
  };
}

export class ArnoldLightLoader {
  private lights: THREE.Light[] = [];
  private readonly mayaToThree = 0.01;
  private readonly debugDirectionalLight = false;
  private readonly showLightHelpers = true;
  private readonly arnoldToThreeIntensity = 0.25;
  private readonly useMayaRotation = true;

  constructor(private scene: THREE.Scene) {
    RectAreaLightUniformsLib.init();
  }

  async load(jsonPath: string): Promise<THREE.Light[]> {
    const response = await fetch(jsonPath);
    if (!response.ok) {
      throw new Error(`Arnold Light JSON konnte nicht geladen werden: ${jsonPath}`);
    }

    const data = (await response.json()) as ArnoldLightData[];
    if (!Array.isArray(data)) {
      throw new Error('Arnold Light JSON muss ein Array enthalten.');
    }

    this.removeExistingLights();
    this.lights = [];

    console.log('====================================');
    console.log('LOADING ARNOLD LIGHTS');
    console.log('LIGHT COUNT:', data.length);
    console.log('====================================');

    for (const lightData of data) {
      const light = this.createLight(lightData);
      this.scene.add(light);
      this.lights.push(light);
    }

    console.log('====================================');
    console.log('ARNOLD LIGHTS LOADED:', this.lights.length);
    console.log('====================================');

    return this.lights;
  }

  private removeExistingLights() {
    const lightsToRemove: THREE.Light[] = [];
    this.scene.traverse((object: THREE.Object3D) => {
      if (object instanceof THREE.Light) {
        lightsToRemove.push(object);
      }
    });

    for (const light of lightsToRemove) {
      light.removeFromParent();
    }
  }

  private getColor(data: ArnoldLightData): THREE.Color {
    const rgb = data.attributes.color?.[0] ?? [1, 1, 1];
    return new THREE.Color(rgb[0], rgb[1], rgb[2]);
  }

  private getLightPower(data: ArnoldLightData): number {
    const intensity = Number.isFinite(data.attributes.intensity) ? data.attributes.intensity : 1;
    const exposure = Number.isFinite(data.attributes.exposure) ? data.attributes.exposure : 0;
    const arnoldValue = intensity * Math.pow(2, exposure);
    const threeIntensity = arnoldValue * this.arnoldToThreeIntensity;

    console.log('------------------------------------');
    console.log('ARNOLD LIGHT POWER');
    console.log('NAME:', data.name);
    console.log('ARNOLD INTENSITY:', intensity);
    console.log('ARNOLD EXPOSURE:', exposure);
    console.log('ARNOLD 2^EXPOSURE:', arnoldValue);
    console.log('THREE INTENSITY:', threeIntensity);
    console.log('------------------------------------');

    return threeIntensity;
  }

  private createLight(data: ArnoldLightData): THREE.Light {
    if (this.debugDirectionalLight) {
      return this.createDirectionalLight(data);
    }
    return this.createRectAreaLight(data);
  }

  private createRectAreaLight(data: ArnoldLightData): THREE.RectAreaLight {
    const color = this.getColor(data);
    const intensity = this.getLightPower(data);
    const width = Math.max(Math.abs(data.transform.scale[0]) * this.mayaToThree, 0.05);
    const height = Math.max(Math.abs(data.transform.scale[1]) * this.mayaToThree, 0.05);

    const light = new THREE.RectAreaLight(color, intensity, width, height);
    light.name = `ArnoldRect_${data.name}`;

    light.position.set(
      data.transform.position[0] * this.mayaToThree,
      data.transform.position[1] * this.mayaToThree,
      data.transform.position[2] * this.mayaToThree,
    );

    if (this.useMayaRotation) {
      light.rotation.set(
        THREE.MathUtils.degToRad(data.transform.rotation[0]),
        THREE.MathUtils.degToRad(data.transform.rotation[1]),
        THREE.MathUtils.degToRad(data.transform.rotation[2]),
      );
    } else {
      light.lookAt(0, 0, 0);
    }

    console.log('====================================');
    console.log('ARNOLD AREA LIGHT');
    console.log('NAME:', data.name);
    console.log('MAYA POSITION:', data.transform.position);
    console.log('THREE POSITION:', light.position.toArray());
    console.log('MAYA ROTATION:', data.transform.rotation);
    console.log('THREE ROTATION DEG:', [
      THREE.MathUtils.radToDeg(light.rotation.x),
      THREE.MathUtils.radToDeg(light.rotation.y),
      THREE.MathUtils.radToDeg(light.rotation.z),
    ]);
    console.log('MAYA SCALE:', data.transform.scale);
    console.log('THREE SIZE:', { width, height });
    console.log('ARNOLD INTENSITY:', data.attributes.intensity);
    console.log('ARNOLD EXPOSURE:', data.attributes.exposure);
    console.log('THREE INTENSITY:', intensity);
    console.log('====================================');

    return light;
  }

  private createDirectionalLight(data: ArnoldLightData): THREE.DirectionalLight {
    const color = this.getColor(data);
    const intensity = this.getLightPower(data);

    const light = new THREE.DirectionalLight(color, intensity);
    light.name = `ArnoldDebug_${data.name}`;

    light.position.set(
      data.transform.position[0] * this.mayaToThree,
      data.transform.position[1] * this.mayaToThree,
      data.transform.position[2] * this.mayaToThree,
    );

    light.target.position.set(0, 0, 0);
    this.scene.add(light.target);

    light.castShadow = true;
    light.shadow.mapSize.width = data.attributes.aiResolution ?? 2048;
    light.shadow.mapSize.height = data.attributes.aiResolution ?? 2048;
    light.shadow.camera.near = 0.01;
    light.shadow.camera.far = 100;
    light.shadow.camera.left = -10;
    light.shadow.camera.right = 10;
    light.shadow.camera.top = 10;
    light.shadow.camera.bottom = -10;
    light.shadow.bias = -0.0001;
    light.shadow.normalBias = 0.02;

    console.log('====================================');
    console.log('DEBUG DIRECTIONAL LIGHT');
    console.log('NAME:', data.name);
    console.log('POSITION:', light.position.toArray());
    console.log('TARGET:', light.target.position.toArray());
    console.log('INTENSITY:', intensity);
    console.log('====================================');

    return light;
  }
}