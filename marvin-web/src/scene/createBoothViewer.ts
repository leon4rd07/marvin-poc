import {
  ACESFilmicToneMapping, Group, PCFSoftShadowMap, PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer,
} from "three";
import { buildBooth } from "./buildBooth";
import { createCurtainMotion } from "./curtainMotion";
import { createStudioRig } from "./studioRig";

const fov = 30;
const targetY = 1.95;

// A small, interactive copy of the booth for the portfolio: drag to turn it, open
// and close the curtain. It renders only while something moves.
export function createBoothViewer(host: HTMLElement, { autoRotate }: { autoRotate: boolean }) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = "viewer-canvas";
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);
  const scene = new Scene();
  const camera = new PerspectiveCamera(fov, 1, .1, 60);
  const rig = createStudioRig(renderer, scene, 1024);
  const booth = buildBooth(schedule);
  const pivot = new Group();
  booth.root.position.z = -.05;
  pivot.add(booth.root);
  scene.add(pivot);

  let yaw = -.5;
  let pitch = .1;
  let spin = 0;
  let opening = 0;
  let openTarget = 0;
  let windTime = 0;
  let idleSince = performance.now();
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let previous = performance.now();
  let scheduled = 0;
  let disposed = false;
  let distance = 9;
  let frames = 0;
  let moving = true;
  const cloth = createCurtainMotion(0);
  const rotates = autoRotate;

  function schedule() {
    if (!disposed && !scheduled && !document.hidden) scheduled = requestAnimationFrame(render);
  }
  function render(time: number) {
    scheduled = 0;
    if (disposed || document.hidden) return;
    const elapsed = (time - previous) / 1000;
    // Idle turntable and breeze draw at 30 fps; dragging stays at full rate.
    if (!moving && elapsed < 1 / 30) { schedule(); return; }
    const dt = Math.min(.05, Math.max(0, elapsed));
    previous = time;
    windTime += dt;
    // Gentle turntable until the visitor takes over; resumes after a pause.
    const resting = !dragging && time - idleSince > 2500;
    if (rotates && resting) yaw += dt * .3;
    yaw += spin * Math.min(1, dt * 8);
    spin *= Math.max(0, 1 - dt * 8);
    if (Math.abs(spin) < .0005) spin = 0;
    opening += (openTarget - opening) * (1 - Math.exp(-dt * 3));
    if (Math.abs(openTarget - opening) < .0005) opening = openTarget;
    const motion = cloth.step(opening, dt);
    booth.setCurtain(opening, motion.displacement, windTime);
    pivot.rotation.y = yaw;
    camera.position.set(0, targetY + Math.sin(pitch) * distance, Math.cos(pitch) * distance);
    camera.lookAt(0, targetY, 0);
    renderer.render(scene, camera);
    host.dataset.renderer = "ready";
    host.dataset.yaw = yaw.toFixed(3);
    host.dataset.open = String(openTarget);
    host.dataset.frames = String(++frames);
    // Keep drawing while anything moves or the turntable runs; otherwise sleep.
    moving = dragging || spin !== 0 || opening !== openTarget || motion.active;
    if (moving || rotates) schedule();
  }
  function resize() {
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const tangent = Math.tan(fov * Math.PI / 360);
    distance = Math.max(4.35 / (2 * tangent), 4 / (2 * tangent * camera.aspect));
    schedule();
  }
  const down = (event: PointerEvent) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    idleSince = performance.now();
    schedule();
  };
  const move = (event: PointerEvent) => {
    if (!dragging) return;
    yaw += (event.clientX - lastX) * .009;
    pitch = Math.min(.4, Math.max(-.05, pitch + (event.clientY - lastY) * .003));
    lastX = event.clientX;
    lastY = event.clientY;
    idleSince = performance.now();
    schedule();
  };
  const up = (event: PointerEvent) => {
    dragging = false;
    idleSince = performance.now();
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  const onVisibility = () => { if (!document.hidden) { previous = performance.now(); schedule(); } };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  document.addEventListener("visibilitychange", onVisibility);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  void booth.ready.then(() => { if (!disposed) { host.dataset.textures = "loaded"; schedule(); } });
  return {
    turn(radians: number) { spin += radians; idleSince = performance.now(); schedule(); },
    setOpen(open: boolean) { openTarget = open ? 1 : 0; schedule(); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(scheduled);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      document.removeEventListener("visibilitychange", onVisibility);
      booth.dispose();
      rig.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
