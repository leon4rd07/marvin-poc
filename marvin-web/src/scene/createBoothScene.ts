import {
  ACESFilmicToneMapping, Mesh, MeshBasicMaterial, PCFSoftShadowMap, PerspectiveCamera,
  PlaneGeometry, Scene, SRGBColorSpace, Vector3, WebGLRenderer,
} from "three";
import { buildBooth, boothDimensions } from "./buildBooth";
import { cameraFov, cameraPose, portalView, timeline, type PortalFrame } from "../lib/timeline";
import { createCurtainMotion } from "./curtainMotion";
import { createScrollMotion } from "./scrollMotion";
import { createStudioRig } from "./studioRig";

export function createBoothScene(
  host: HTMLDivElement,
  initialProgress: number,
  // Called in the same frame as every draw with where the portfolio page must be
  // (null when the scene stops). Keeps the HTML page locked to the doorway.
  onPortal?: (frame: PortalFrame | null) => void,
) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.className = "booth-canvas";
  host.appendChild(canvas);
  // No scene background: the canvas stays transparent wherever the booth's
  // back wall would be, which is how the page behind the doorway shows through.
  // Everything else is covered by an opaque white backdrop.
  const scene = new Scene();
  const backdrop = new Mesh(new PlaneGeometry(400, 400),
    new MeshBasicMaterial({ color: "#ffffff", toneMapped: false }));
  backdrop.position.z = -30;
  backdrop.renderOrder = 10;
  scene.add(backdrop);
  const camera = new PerspectiveCamera(cameraFov, 1, .025, 80);
  const target = new Vector3();
  const rig = createStudioRig(renderer, scene, host.clientWidth < 700 ? 1024 : 2048);

  let progress = initialProgress;
  let scheduled = 0;
  let disposed = false;
  let lost = false;
  let frames = 0;
  let distance = 8;
  let previousTime = performance.now();
  let windTime = 0;
  let motionActive = true;
  const clothMotion = createCurtainMotion(timeline(initialProgress).curtain);
  const scrollMotion = createScrollMotion(initialProgress);
  const booth = buildBooth(schedule, { portal: true });
  scene.add(booth.root);
  void booth.ready.then(() => { if (!disposed) { host.dataset.textures = "loaded"; schedule(); } });
  function schedule() {
    if (!disposed && !lost && !scheduled && !document.hidden) scheduled = requestAnimationFrame(render);
  }
  function render(time: number) {
    scheduled = 0;
    if (disposed || lost || document.hidden || progress >= 1) return;
    const elapsed = (time - previousTime) / 1000;
    // Idle breeze renders at 30 fps; wheel/touch movement remains responsive.
    if (!motionActive && elapsed < 1 / 30) { schedule(); return; }
    const motion = scrollMotion.step(progress, elapsed);
    const pose = timeline(motion.progress);
    const cloth = clothMotion.step(pose.curtain, elapsed);
    previousTime = time;
    windTime += Math.max(0, Math.min(elapsed, .05));
    booth.setCurtain(pose.curtain, cloth.displacement, windTime);
    const view = cameraPose(motion.progress, distance);
    // Keep eye level fixed during travel; change position, not field of view.
    camera.position.set(view.x, view.y, view.z);
    target.set(view.lookX, view.lookY, view.lookZ);
    camera.lookAt(target);
    renderer.render(scene, camera);
    const frame = portalView(view, host.clientHeight);
    onPortal?.(frame);
    if (frames === 0) performance.mark("marvin-scene-ready");
    host.dataset.renderer = "ready";
    host.dataset.curtain = pose.curtain.toFixed(4);
    host.dataset.camera = camera.position.toArray().map(value => value.toFixed(4)).join(",");
    host.dataset.portalScale = frame.scale.toFixed(4);
    host.dataset.sceneMotion = motion.active ? "settling" : "settled";
    host.dataset.frames = String(++frames);
    host.dataset.clothMotion = cloth.active ? "settling" : "settled";
    host.dataset.clothDisplacement = cloth.displacement.toFixed(6);
    host.dataset.wind = "breeze";
    host.dataset.windTime = windTime.toFixed(4);
    motionActive = cloth.active || motion.active;
    schedule();
  }
  function resize() {
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, width < 700 ? 1.25 : 1.5));
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const tangent = Math.tan(camera.fov * Math.PI / 360);
    distance = .85 + Math.max(boothDimensions.height / (2 * tangent), 3.55 / (2 * tangent * camera.aspect)) * 1.16;
    schedule();
  }
  const onContextLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    cancelAnimationFrame(scheduled);
    scheduled = 0;
    host.dataset.renderer = "fallback";
    onPortal?.(null);
  };
  const onVisibility = () => { if (!document.hidden) { previousTime = performance.now(); schedule(); } };
  canvas.addEventListener("webglcontextlost", onContextLost);
  document.addEventListener("visibilitychange", onVisibility);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  return {
    setProgress(value: number) { progress = value; schedule(); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(scheduled);
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      document.removeEventListener("visibilitychange", onVisibility);
      onPortal?.(null);
      booth.dispose();
      backdrop.geometry.dispose();
      backdrop.material.dispose();
      rig.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
