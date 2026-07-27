import * as THREE from 'three';

export class ArnoldLightLoader {
  constructor(private scene: THREE.Scene) {}

  async load(url: string) {
    const data = await fetch(url).then((response) => response.json());

    data.lights.forEach((light: any) => {
      if (light.type !== 'aiAreaLight') {
        return;
      }

      const color = new THREE.Color(light.color[0], light.color[1], light.color[2]);
      const intensity = (light.intensity ?? 1) * Math.pow(2, light.exposure ?? 0) * 0.001;

      const areaLight = new THREE.RectAreaLight(
        color,
        intensity,
        light.width ?? 10,
        light.height ?? 10,
      );

      areaLight.position.set(light.position[0], light.position[1], light.position[2]);

      const rig = new THREE.Object3D();

      rig.position.set(light.position[0], light.position[1], light.position[2]);

      rig.rotation.set(
        THREE.MathUtils.degToRad(light.rotation[0]),
        THREE.MathUtils.degToRad(light.rotation[1]),
        THREE.MathUtils.degToRad(light.rotation[2]),
      );

      rig.add(areaLight);

      this.scene.add(rig);
      this.scene.add(areaLight);

      console.log('Arnold Light loaded:', light.name);
    });
  }
}
