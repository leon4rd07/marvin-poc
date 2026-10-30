import {
  CanvasTexture, DirectionalLight, HemisphereLight, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  PlaneGeometry, PMREMGenerator, PointLight, ShadowMaterial, type Material, type Scene, type WebGLRenderer,
} from "three";
import { studioEnvironment } from "./studioEnvironment";

// Soft studio lighting, reflections and ground shadow shared by the entrance
// scene and the interactive 3D model in the portfolio.
// With `stage`, the booth stands on a visible warm floor (for the entrance);
// without it the floor only catches shadows (the transparent 3D viewer).
export function createStudioRig(renderer: WebGLRenderer, scene: Scene, shadowSize: number, { stage = false } = {}) {
  const environmentScene = studioEnvironment();
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(environmentScene, .025, .1, 50, { size: 256 });
  scene.environment = environment.texture;
  scene.environmentIntensity = .7;
  environmentScene.dispose();
  pmrem.dispose();
  scene.add(new HemisphereLight("#fff9ef", "#929487", .55));
  const key = new DirectionalLight("#fff7e5", stage ? 2.4 : 2.0);
  key.position.set(-3, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(shadowSize);
  key.shadow.camera.left = -2.5;
  key.shadow.camera.right = 2.5;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -2.5;
  key.shadow.normalBias = .006;
  key.shadow.bias = -.0001;
  key.shadow.radius = 3;
  scene.add(key);
  // A weak cool fill keeps the shaded side readable but darker than the front,
  // and a warm rim from behind traces the top and side edges against the backdrop.
  const fill = new DirectionalLight("#e6efff", stage ? .32 : .65);
  fill.position.set(4, 3, 2);
  scene.add(fill);
  const rim = new DirectionalLight("#ffe8c4", stage ? 1.3 : .6);
  rim.position.set(3, 5, -6);
  scene.add(rim);
  // Warm light inside the booth spills out under and around the curtain.
  const interiorLight = new PointLight("#ffdca0", stage ? 4.5 : 2, 3.6, 2);
  interiorLight.position.set(.9, 2.6, -.1);
  scene.add(interiorLight);
  const floorMaterial: Material = stage
    ? new MeshStandardMaterial({ color: "#ebe3d3", roughness: .82, metalness: 0 })
    : new ShadowMaterial({ opacity: .045 });
  const floor = new Mesh(new PlaneGeometry(stage ? 160 : 40, stage ? 160 : 40), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -.012;
  floor.receiveShadow = true;
  scene.add(floor);
  // Soft contact occlusion grounds the booth without a sharp theatrical shadow.
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext("2d")!;
  const gradient = shadowContext.createRadialGradient(64, 64, 16, 64, 64, 64);
  gradient.addColorStop(0, `rgba(39,38,30,${stage ? .42 : .28})`);
  gradient.addColorStop(.5, `rgba(39,38,30,${stage ? .18 : .12})`);
  gradient.addColorStop(1, "rgba(39,38,30,0)");
  shadowContext.fillStyle = gradient;
  shadowContext.fillRect(0, 0, 128, 128);
  const contactTexture = new CanvasTexture(shadowCanvas);
  const contact = new Mesh(new PlaneGeometry(4.8, 3.1), new MeshBasicMaterial({
    map: contactTexture, transparent: true, depthWrite: false, toneMapped: false,
  }));
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(0, -.009, .1);
  scene.add(contact);
  return {
    dispose() {
      floor.geometry.dispose();
      floor.material.dispose();
      contact.geometry.dispose();
      contact.material.dispose();
      contactTexture.dispose();
      environment.dispose();
      key.shadow.map?.dispose();
    },
  };
}
