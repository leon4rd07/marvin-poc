import {
  ACESFilmicToneMapping, Group, PCFSoftShadowMap, PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer,
} from "three";
import { buildBackdrop, type Backdrop } from "./buildBackdrop";
import { buildBooth, type BoothTheme } from "./buildBooth";
import { buildWrappedBooth, type BoothWrap } from "./buildWrappedBooth";
import { createCurtainMotion } from "./curtainMotion";
import { createStudioRig } from "./studioRig";

const fov = 30;
// Where the camera looks, and how much height it keeps in view: the Marvin booth
// with its sign is taller than an event's own printed booth.
const boothFrame = { target: 1.95, height: 4.4 };
const wrapFrame = { target: 1.45, height: 4.4 };

// A small, interactive model for the portfolio, turning on its own until dragged:
// the Marvin booth (with a curtain to open and close), an event's own printed
// booth (`wrap`), or, for an event with a backdrop, that backdrop on its own.
// It renders only while something moves.
export function createBoothViewer(host: HTMLElement, { autoRotate, theme, backdrop, wrap }: {
  autoRotate: boolean; theme?: BoothTheme; backdrop?: Backdrop; wrap?: BoothWrap;
}) {
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
  // How far the model reaches from its centre as it turns (a backdrop: half its width).
  const reach = wrap ? 2.3 : backdrop ? backdrop.width / 2 + .2 : 1.8;
  const rig = createStudioRig(renderer, scene, 1024, { span: Math.max(2.5, reach + .3) });
  const model = wrap ? buildWrappedBooth(wrap, schedule) : backdrop ? buildBackdrop(backdrop, schedule) : buildBooth(schedule, { theme });
  const booth = "setCurtain" in model ? model : null;
  const pivot = new Group();
  model.root.position.z = -.05;
  pivot.add(model.root);
  scene.add(pivot);
  let frameWidth = wrap ? 4.8 : backdrop ? backdrop.width + .7 : 3.8;
  let { target: targetY, height: frameHeight } = wrap ? wrapFrame : boothFrame;
  if (backdrop) {
    // Framed once the photo has loaded and the backdrop's height is known.
    targetY = backdrop.width * .55; frameHeight = backdrop.width * 1.3;
    void model.ready.then(() => {
      const height = "height" in model ? model.height() : 0;
      if (!height) return;
      targetY = height / 2; frameHeight = height + .7;
      resize();
    });
  }

  let yaw = backdrop ? -.35 : -.5;
  let pitch = .1;
  let spin = 0;
  let opening = 0;
  let openTarget = 0;
  let windTime = 0;
  // The models turn on their own until the visitor touches them, then stay put.
  let touched = false;
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
    // Gentle turntable at the same speed however slowly the device draws.
    const turning = rotates && !touched;
    if (turning) {
      const step = Math.min(.25, Math.max(0, elapsed)) * .3;
      yaw += step;
    }
    yaw += spin * Math.min(1, dt * 8);
    spin *= Math.max(0, 1 - dt * 8);
    if (Math.abs(spin) < .0005) spin = 0;
    opening += (openTarget - opening) * (1 - Math.exp(-dt * 3));
    if (Math.abs(openTarget - opening) < .0005) opening = openTarget;
    const motion = cloth.step(opening, dt);
    booth?.setCurtain(opening, motion.displacement, windTime);
    pivot.rotation.y = yaw;
    camera.position.set(0, targetY + Math.sin(pitch) * distance, Math.cos(pitch) * distance);
    camera.lookAt(0, targetY, 0);
    renderer.render(scene, camera);
    host.dataset.renderer = "ready";
    host.dataset.yaw = yaw.toFixed(3);
    host.dataset.open = String(openTarget);
    host.dataset.turntable = turning ? "on" : "off";
    host.dataset.frames = String(++frames);
    // Keep drawing while anything moves or the turntable runs; otherwise sleep.
    moving = dragging || spin !== 0 || opening !== openTarget || motion.active;
    if (moving || turning) schedule();
  }
  function resize() {
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const tangent = Math.tan(fov * Math.PI / 360);
    distance = Math.max(frameHeight / (2 * tangent), frameWidth / (2 * tangent * camera.aspect));
    schedule();
  }
  const down = (event: PointerEvent) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    touched = true;
    schedule();
  };
  const move = (event: PointerEvent) => {
    if (!dragging) return;
    yaw += (event.clientX - lastX) * .009;
    pitch = Math.min(.4, Math.max(-.05, pitch + (event.clientY - lastY) * .003));
    lastX = event.clientX;
    lastY = event.clientY;
    schedule();
  };
  const up = (event: PointerEvent) => {
    dragging = false;
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
  void model.ready.then(() => { if (!disposed) { host.dataset.textures = "loaded"; schedule(); } });
  return {
    turn(radians: number) { spin += radians; touched = true; schedule(); },
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
      model.dispose();
      rig.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
