/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Fix: Use named imports for Three.js to resolve type errors.
import {
  BackSide,
  Color,
  EquirectangularReflectionMapping,
  Euler,
  GLSL3,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  PMREMGenerator,
  PerspectiveCamera,
  Quaternion,
  RawShaderMaterial,
  Scene,
  Texture,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { fs as backdropFS, vs as backdropVS } from './backdrop-shader';
import { vs as sphereVS } from './sphere-shader';
import { Analyser } from './analyser';

/**
 * 3D live audio visualizer class.
 */
export class Visualizer3D {
  private camera!: PerspectiveCamera;
  private scene!: Scene;
  private renderer!: WebGLRenderer;
  private composer!: EffectComposer;
  private sphere!: Mesh;
  private backdrop!: Mesh;
  private prevTime = 0;
  private rotation = new Vector3(0, 0, 0);
  private animationFrameId?: number;
  private canvas: HTMLCanvasElement;
  
  private inputAnalyser: Analyser;
  private outputAnalyser: Analyser;

  constructor(canvas: HTMLCanvasElement, inputNode: AudioNode, outputNode: AudioNode) {
    this.canvas = canvas;
    this.inputAnalyser = new Analyser(inputNode);
    this.outputAnalyser = new Analyser(outputNode);
    this.init();
  }

  private init() {
    this.scene = new Scene();
    this.scene.background = new Color(0x020617); // Match body bg

    this.backdrop = new Mesh(
      new IcosahedronGeometry(10, 5),
      new RawShaderMaterial({
        uniforms: {
          resolution: { value: new Vector2(1, 1) },
          rand: { value: 0 },
        },
        vertexShader: backdropVS,
        fragmentShader: backdropFS,
        glslVersion: GLSL3,
      })
    );
    // Fix: Cast material to RawShaderMaterial to access `side` property.
    (this.backdrop.material as RawShaderMaterial).side = BackSide;
    this.scene.add(this.backdrop);
    
    this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 0, 5);
    
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000, 0);

    const geometry = new IcosahedronGeometry(1, 10);

    const pmremGenerator = new PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();

    const sphereMaterial = new MeshStandardMaterial({
      color: 0x000010,
      metalness: 0.5,
      roughness: 0.1,
      emissive: 0x1e40af, // blue-800
      emissiveIntensity: 1.5,
    });

    sphereMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.time = { value: 0 };
      shader.uniforms.inputData = { value: new Vector4() };
      shader.uniforms.outputData = { value: new Vector4() };
      sphereMaterial.userData.shader = shader;
      shader.vertexShader = sphereVS;
    };
    
    this.sphere = new Mesh(geometry, sphereMaterial);
    this.scene.add(this.sphere);
    
    new EXRLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/piz_compressed.exr', (texture: Texture) => {
        texture.mapping = EquirectangularReflectionMapping;
        const exrCubeRenderTarget = pmremGenerator.fromEquirectangular(texture);
        sphereMaterial.envMap = exrCubeRenderTarget.texture;
    });

    const renderPass = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(new Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0;
    bloomPass.strength = 1.0; // Lowered for a more subtle glow
    bloomPass.radius = 0.5;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderPass);
    this.composer.addPass(bloomPass);

    const onWindowResize = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      const dPR = this.renderer.getPixelRatio();
      const w = window.innerWidth;
      const h = window.innerHeight;
      (this.backdrop.material as RawShaderMaterial).uniforms.resolution.value.set(w * dPR, h * dPR);
      this.renderer.setSize(w, h);
      this.composer.setSize(w, h);
    }
    
    window.addEventListener('resize', onWindowResize);
    onWindowResize();
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    this.inputAnalyser.update();
    this.outputAnalyser.update();

    const t = performance.now();
    const dt = (t - this.prevTime) / (1000 / 60);
    this.prevTime = t;

    (this.backdrop.material as RawShaderMaterial).uniforms.rand.value = Math.random() * 10000;
    const sphereMaterial = this.sphere.material as MeshStandardMaterial;

    if (sphereMaterial.userData.shader) {
      this.sphere.scale.setScalar(1 + (0.2 * this.outputAnalyser.data[1]) / 255);

      const f = 0.001;
      this.rotation.x += (dt * f * 0.5 * this.outputAnalyser.data[1]) / 255;
      this.rotation.z += (dt * f * 0.5 * this.inputAnalyser.data[1]) / 255;
      this.rotation.y += (dt * f * 0.25 * (this.inputAnalyser.data[2] + this.outputAnalyser.data[2])) / 255;
      
      const euler = new Euler(this.rotation.x, this.rotation.y, this.rotation.z);
      const quaternion = new Quaternion().setFromEuler(euler);
      const vector = new Vector3(0, 0, 5);
      vector.applyQuaternion(quaternion);
      this.camera.position.copy(vector);
      this.camera.lookAt(this.sphere.position);

      sphereMaterial.userData.shader.uniforms.time.value += (dt * 0.1 * this.outputAnalyser.data[0]) / 255;
      sphereMaterial.userData.shader.uniforms.inputData.value.set((1 * this.inputAnalyser.data[0]) / 255, (0.1 * this.inputAnalyser.data[1]) / 255, (10 * this.inputAnalyser.data[2]) / 255, 0);
      sphereMaterial.userData.shader.uniforms.outputData.value.set((2 * this.outputAnalyser.data[0]) / 255, (0.1 * this.outputAnalyser.data[1]) / 255, (10 * this.outputAnalyser.data[2]) / 255, 0);
    }

    this.composer.render();
  }
  
  public start() {
      this.animate();
  }

  public stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}