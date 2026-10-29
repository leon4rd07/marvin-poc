import {
  CanvasTexture, DirectionalLight, HemisphereLight, Mesh, MeshBasicMaterial,
  PlaneGeometry, PMREMGenerator, PointLight, ShadowMaterial, type Scene, type WebGLRenderer,
} from "three";
import { studioEnvironment } from "./studioEnvironment";

// Soft studio lighting, reflections and ground shadow shared by the entrance
// scene and the interactive 3D model in the portfolio.
export function createStudioRig(renderer: WebGLRenderer, scene: Scene, shadowSize: number) {
  const environmentScene = studioEnvironment();
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(environmentScene, .025, .1, 50, { size: 256 });
  scene.environment = environment.texture;
  scene.environmentIntensity = .7;
  environmentScene.dispose();
  pmrem.dispose();
  scene.add(new HemisphereLight("#fff9ef", "#929487", .55));
  const key = new DirectionalLight("#fff7e5", 2.0);
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
  const fill = new DirectionalLight("#e6efff", .65);
  fill.position.set(4, 3, 2);
  scene.add(fill);
  const interiorLight = new PointLight("#ffe9bb", 2, 3, 2);
  interiorLight.position.set(.9, 2.8, -.15);
  scene.add(interiorLight);
  const floor = new Mesh(new PlaneGeometry(40, 40), new ShadowMaterial({ opacity: .045 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -.012;
  floor.receiveShadow = true;
  scene.add(floor);
  // Soft contact occlusion grounds the booth without a sharp theatrical shadow.
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext("2d")!;
  const gradient = shadowContext.createRadialGradient(64, 64, 16, 64, 64, 64);
  gradient.addColorStop(0, "rgba(39,38,30,.28)");
  gradient.addColorStop(.5, "rgba(39,38,30,.12)");
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
