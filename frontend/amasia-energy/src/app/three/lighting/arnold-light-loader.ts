import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

export class ArnoldLightLoader {
  constructor(private scene: THREE.Scene) {
    RectAreaLightUniformsLib.init();
  }

  async load(_: string) {
    this.scene.traverse((object) => {
      if ((object as any).isLight) {
        this.scene.remove(object);
      }
    });

    const key = new THREE.RectAreaLight(0xffffff, 45, 7, 7);
    key.position.set(-4, 3.5, 5);
    key.lookAt(0, 0, 0);
    this.scene.add(key);

    const fill = new THREE.RectAreaLight(new THREE.Color(0.96, 0.98, 1), 12, 8, 8);
    fill.position.set(5, 2, 5);
    fill.lookAt(0, 0, 0);
    this.scene.add(fill);

    const top = new THREE.RectAreaLight(0xffffff, 22, 8, 8);
    top.position.set(0, 6, 0);
    top.lookAt(0, 0, 0);
    this.scene.add(top);

    const leftStrip = new THREE.RectAreaLight(0xffffff, 18, 0.5, 10);
    leftStrip.position.set(-3.5, 0, 2);
    leftStrip.lookAt(0, 0, 0);
    this.scene.add(leftStrip);

    const rightStrip = new THREE.RectAreaLight(0xffffff, 18, 0.5, 10);
    rightStrip.position.set(3.5, 0, 2);
    rightStrip.lookAt(0, 0, 0);
    this.scene.add(rightStrip);

    const rim = new THREE.RectAreaLight(0xffffff, 20, 5, 5);
    rim.position.set(0, 1, -5);
    rim.lookAt(0, 0, 0);
    this.scene.add(rim);

    const beauty = new THREE.RectAreaLight(0xffffff, 8, 4, 4);
    beauty.position.set(0, 0.5, 6);
    beauty.lookAt(0, 0, 0);
    this.scene.add(beauty);

    const bounce = new THREE.RectAreaLight(0xffffff, 6, 10, 6);
    bounce.position.set(0, -4, 2);
    bounce.lookAt(0, 0, 0);
    this.scene.add(bounce);
  }
}
