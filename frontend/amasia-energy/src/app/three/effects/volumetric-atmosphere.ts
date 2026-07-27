import * as THREE from 'three';

export class VolumetricAtmosphere {
  private material!: THREE.ShaderMaterial;

  private mesh!: THREE.Mesh;

  constructor(private scene: THREE.Scene) {}

  create() {
    const geometry = new THREE.BoxGeometry(150, 80, 150);

    this.material = new THREE.ShaderMaterial({
      transparent: true,

      depthWrite: false,

      side: THREE.BackSide,

      blending: THREE.AdditiveBlending,

      uniforms: {
        density: {
          value: 0.008,
        },

        volumeColor: {
          value: new THREE.Color(0.32, 0.42, 0.42),
        },

        attenuation: {
          value: 0.2,
        },

        volumeIntensity: {
          value: 2.5,
        },

        anisotropy: {
          value: 0.55,
        },

        lightPosition: {
          value: new THREE.Vector3(0, 25, 0),
        },
      },

      vertexShader: `

      varying vec3 vWorldPosition;


      void main(){

        vec4 world =
        modelMatrix *
        vec4(
          position,
          1.0
        );


        vWorldPosition =
        world.xyz;


        gl_Position =
        projectionMatrix *
        viewMatrix *
        world;

      }

      `,

      fragmentShader: `

      uniform float density;

      uniform vec3 volumeColor;

      uniform float attenuation;

      uniform float anisotropy;

      uniform float volumeIntensity;

      uniform vec3 lightPosition;


      varying vec3 vWorldPosition;



      float hash(vec2 p)
      {
        return fract(
          sin(
            dot(
              p,
              vec2(
                127.1,
                311.7
              )
            )
          )
          *
          43758.5453123
        );
      }



      void main(){


        vec3 viewDir =
        normalize(
          cameraPosition -
          vWorldPosition
        );



        vec3 lightDir =
        normalize(
          lightPosition -
          vWorldPosition
        );



        float cosTheta =
        dot(
          viewDir,
          lightDir
        );



        // Henyey-Greenstein
        float phase =

        (
          1.0 -
          anisotropy *
          anisotropy
        )

        /

        (

          4.0 *
          3.14159 *

          pow(

            1.0 +
            anisotropy *
            anisotropy -

            2.0 *
            anisotropy *
            cosTheta,

            1.5

          )

        );



        float height =

        exp(

          -abs(
            vWorldPosition.y
          )
          *
          density

        );



        float scatter =

        height *
        phase *
        attenuation *
        volumeIntensity;



        // kleine natürliche Dichtevariation

        float noise =
        hash(
          gl_FragCoord.xy
        );



        scatter *=
        mix(
          0.92,
          1.02,
          noise
        );



        // Dithering gegen 8bit Banding

        float dither =
        hash(
          gl_FragCoord.xy
        )
        *
        0.012;



        float alpha =

        scatter *
        0.65
        +
        dither;



        gl_FragColor =

        vec4(

          volumeColor,

          alpha

        );


      }

      `,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);

    this.mesh.position.set(0, 20, 0);

    this.scene.add(this.mesh);
  }

  update(time: number) {}
}
