import {
  ACESFilmicToneMapping, AdditiveBlending, CanvasTexture, Fog, Mesh, Raycaster, Vector2, MeshBasicMaterial,
  PCFSoftShadowMap, PerspectiveCamera, PlaneGeometry, Scene, SRGBColorSpace, Vector3, WebGLRenderer,
} from "three";

const horizon = "#e5dccb";

// A canvas radial gradient (centre colour to edge colour) for soft light shapes.
function radial(stops: [number, string][], width = 256, height = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.min(width, height) / 2);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
import { buildBooth, boothDimensions } from "./buildBooth";
import { cameraFov, cameraPose, portalView, timeline, type PortalFrame } from "../lib/timeline";
import { createCurtainMotion, createHandMotion } from "./curtainMotion";
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
  // Everything else is covered by an opaque studio backdrop: a soft pool of light
  // behind the booth falling off to a warm grey, with a floor that fades into it.
  const scene = new Scene();
  const fog = new Fog(horizon, 18, 42);
  scene.fog = fog;
  // Lighter towards the top, exactly the fog colour from eye level down, so the
  // floor melts into it without a visible horizon (like a studio cyclorama).
  const backdropCanvas = document.createElement("canvas");
  backdropCanvas.width = 8; backdropCanvas.height = 2048;
  const backdropContext = backdropCanvas.getContext("2d")!;
  const sky = backdropContext.createLinearGradient(0, 0, 0, 2048);
  sky.addColorStop(0, "#fbf8f2"); sky.addColorStop(.4, "#f6f0e6"); sky.addColorStop(.47, "#ece4d6"); sky.addColorStop(.5, horizon); sky.addColorStop(1, horizon);
  backdropContext.fillStyle = sky; backdropContext.fillRect(0, 0, 8, 2048);
  const backdropTexture = new CanvasTexture(backdropCanvas);
  backdropTexture.colorSpace = SRGBColorSpace;
  const backdrop = new Mesh(new PlaneGeometry(140, 140),
    new MeshBasicMaterial({ map: backdropTexture, toneMapped: false, fog: false }));
  backdrop.position.set(0, 4, -30);
  backdrop.renderOrder = 10;
  scene.add(backdrop);
  // Glow around the lit sign and warm light spilling onto the floor at the door.
  const glowTexture = radial([[0, "rgba(255,214,120,.55)"], [.45, "rgba(255,206,110,.16)"], [1, "rgba(255,200,100,0)"]]);
  const signGlow = new Mesh(new PlaneGeometry(3.2, 1.7), new MeshBasicMaterial({
    map: glowTexture, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false,
  }));
  signGlow.position.set(0, 3.72, .46);
  scene.add(signGlow);
  const spillTexture = radial([[0, "rgba(255,196,110,.42)"], [1, "rgba(255,196,110,0)"]]);
  const spill = new Mesh(new PlaneGeometry(1.7, 1.3), new MeshBasicMaterial({
    map: spillTexture, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  spill.rotation.x = -Math.PI / 2;
  spill.position.set(.94, .004, 1.05);
  scene.add(spill);
  const camera = new PerspectiveCamera(cameraFov, 1, .025, 80);
  const target = new Vector3();
  const rig = createStudioRig(renderer, scene, host.clientWidth < 700 ? 1024 : 2048, { stage: true });

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
  // Hover (or tap) on the curtain moves the cloth as if a hand were on it.
  const hand = createHandMotion();
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  let overCurtain = false;
  // The view drifts a little with the pointer (and slowly on its own), so the
  // booth reads as a solid object before you step in. Fades out while entering.
  const look = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let driftTime = 0;
  function curtainUnder(event: PointerEvent) {
    // Only while the curtain still hangs closed in front of the booth.
    if (progress > .03) return null;
    const rect = canvas.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return null;
    if (event.target instanceof Element && event.target.closest("a, button, nav, header")) return null;
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(booth.curtain, false)[0];
    return hit?.uv ? { u: hit.uv.x, v: 1 - hit.uv.y } : null;
  }
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    look.targetX = Math.max(-1, Math.min(1, event.clientX / innerWidth * 2 - 1));
    look.targetY = Math.max(-1, Math.min(1, event.clientY / innerHeight * 2 - 1));
    if (progress < 1) schedule();
    const point = curtainUnder(event);
    if (point) { hand.touch(point.u, point.v); overCurtain = true; schedule(); }
    else if (overCurtain) { hand.leave(); overCurtain = false; schedule(); }
    document.documentElement.style.cursor = point ? "grab" : "";
  };
  const onPointerDown = (event: PointerEvent) => {
    const point = curtainUnder(event);
    if (point) { hand.touch(point.u, point.v, event.pointerType === "touch" ? 1.6 : .8); schedule(); }
  };
  const onPointerLeave = () => { hand.leave(); overCurtain = false; document.documentElement.style.cursor = ""; schedule(); };
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerdown", onPointerDown);
  document.documentElement.addEventListener("pointerleave", onPointerLeave);
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
    const touch = hand.step(elapsed);
    previousTime = time;
    windTime += Math.max(0, Math.min(elapsed, .05));
    booth.setCurtain(pose.curtain, cloth.displacement, windTime, touch);
    const view = cameraPose(motion.progress, distance);
    const step = Math.max(0, Math.min(elapsed, .05));
    const follow = 1 - Math.exp(-step * 3.2);
    look.x += (look.targetX - look.x) * follow;
    look.y += (look.targetY - look.y) * follow;
    driftTime += step;
    const outside = 1 - pose.alignment;
    const offsetX = (look.x * .9 + Math.sin(driftTime * .32) * .22) * outside;
    const offsetY = (-look.y * .35 + Math.sin(driftTime * .21 + 1) * .06) * outside;
    // Keep eye level fixed during travel; change position, not field of view.
    camera.position.set(view.x + offsetX, view.y + offsetY, view.z);
    target.set(view.lookX, view.lookY, view.lookZ);
    camera.lookAt(target);
    const drifting = outside > 0 && (Math.abs(look.targetX - look.x) > .002 || Math.abs(look.targetY - look.y) > .002);
    renderer.render(scene, camera);
    const frame = portalView(view, host.clientHeight);
    onPortal?.(frame);
    if (frames === 0) performance.mark("marvin-scene-ready");
    host.dataset.renderer = "ready";
    host.dataset.curtain = pose.curtain.toFixed(4);
    // The scroll-driven pose (without the small pointer/idle drift).
    host.dataset.camera = [view.x, view.y, view.z].map(value => value.toFixed(4)).join(",");
    host.dataset.portalScale = frame.scale.toFixed(4);
    host.dataset.sceneMotion = motion.active ? "settling" : "settled";
    host.dataset.frames = String(++frames);
    host.dataset.clothMotion = cloth.active ? "settling" : "settled";
    host.dataset.clothDisplacement = cloth.displacement.toFixed(6);
    host.dataset.wind = "breeze";
    host.dataset.hand = touch.active ? "touching" : "idle";
    host.dataset.windTime = windTime.toFixed(4);
    motionActive = cloth.active || motion.active || touch.active || drifting;
    schedule();
  }
  function resize() {
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, width < 700 ? 1.25 : 1.5));
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const tangent = Math.tan(camera.fov * Math.PI / 360);
    distance = .85 + Math.max(boothDimensions.height / (2 * tangent), 3.55 / (2 * tangent * camera.aspect)) * 1.2;
    fog.near = distance + 4;
    fog.far = distance + 26;
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
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      document.documentElement.style.cursor = "";
      onPortal?.(null);
      booth.dispose();
      for (const mesh of [backdrop, signGlow, spill]) { mesh.geometry.dispose(); mesh.material.dispose(); }
      for (const texture of [backdropTexture, glowTexture, spillTexture]) texture.dispose();
      rig.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
