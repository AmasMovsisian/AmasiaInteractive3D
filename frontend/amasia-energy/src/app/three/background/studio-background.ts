import * as THREE from 'three';

export class StudioBackground {
  constructor(private scene: THREE.Scene) {}

  create() {
    const geometry = new THREE.SphereGeometry(100, 64, 64);

    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,

      uniforms: {},

      vertexShader: `

varying vec3 vPos;


void main(){

vPos=position;


gl_Position=
projectionMatrix*
modelViewMatrix*
vec4(position,1.0);

}

`,

      fragmentShader: `

varying vec3 vPos;


void main(){


float h =
normalize(vPos).y;



vec3 top =
vec3(
0.02,
0.025,
0.03
);


vec3 bottom =
vec3(
0.001,
0.003,
0.004
);



vec3 color =
mix(
bottom,
top,
h*0.5+0.5
);



gl_FragColor =
vec4(
color,
1.0
);


}

`,
    });

    const mesh = new THREE.Mesh(geometry, material);

    this.scene.add(mesh);
  }
}
