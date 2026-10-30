export const clamp = (value: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
const segment = (p: number, start: number, end: number) => clamp((p - start) / (end - start));
const ease = (t: number) => t * t * (3 - 2 * t);

export const cameraFov = 34;

// The portfolio lives on the back wall inside the booth. `backZ` is the front face
// of that wall, `endZ` is where the camera stops (page fills the screen 1:1) and
// `centerX/eyeY` is the point of the wall the camera finally looks at.
export const portal = { backZ: -.695, endZ: 0, centerX: .94, eyeY: 1.7, startY: 2.75, startSide: .24, lookStartY: 1.85, lookStartZ: 0 };

// Pure, reversible rail/camera poses. Secondary fabric movement settles around
// these targets without advancing the scroll timeline or moving the camera.
export function timeline(progress: number) {
  const p = clamp(progress);
  return {
    progress: p,
    phase: p < .02 ? "booth" : p < 1 ? "entering" : "monitor",
    // The curtain is fully open well before the camera reaches the doorway.
    curtain: ease(segment(p, .02, .55)),
    alignment: ease(segment(p, .02, .5)),
    travel: segment(p, .02, 1),
    // Only used when WebGL is unavailable and the portfolio has to fade in.
    monitor: ease(segment(p, .56, 1)),
    interactive: p >= 1,
  };
}
export const wrap = (index: number, length: number) => ((index % length) + length) % length;

// One continuous dolly. The distance to the back wall shrinks by a constant
// ratio per unit of progress, so the apparent zoom rate never changes: no
// stop-and-go "zoom, pause, zoom again".
export function cameraPose(progress: number, distance: number) {
  const pose = timeline(progress);
  const near = portal.endZ - portal.backZ;
  const far = Math.max(distance - portal.backZ, near * 1.5);
  const z = portal.backZ + far * (near / far) ** pose.travel;
  // Before entering, the camera stands a little to the right and above, looking
  // at the middle of the booth (a three-quarter view that shows its depth), then
  // swings round to face the doorway square-on before crossing it.
  const side = 1 - pose.alignment;
  const x = portal.centerX * pose.alignment + portal.startSide * distance * side;
  const y = portal.eyeY + (portal.startY - portal.eyeY) * side;
  const lookX = portal.centerX * pose.alignment;
  const lookY = portal.eyeY + (portal.lookStartY - portal.eyeY) * side;
  return { x, y, z, lookX, lookY, lookZ: -.74 + (portal.lookStartZ + .74) * side };
}

export type PortalFrame = { scale: number; x: number; y: number };

// Where the flat portfolio page appears on screen, in CSS pixels relative to the
// centre of the 3D view. The camera always looks straight down -z, so the wall is
// a pure scale-and-shift of the page; at the end of the journey it is 1:1.
export function portalView(view: { x: number; y: number; z: number }, hostHeight: number): PortalFrame {
  const depth = Math.max(.01, view.z - portal.backZ);
  const focal = hostHeight / 2 / Math.tan(cameraFov * Math.PI / 360);
  return {
    scale: (portal.endZ - portal.backZ) / depth,
    x: focal * (portal.centerX - view.x) / depth,
    y: focal * (view.y - portal.eyeY) / depth,
  };
}

export function createSceneProgress() {
  let progress = 0;
  const listeners = new Set<(value: number) => void>();
  return {
    get: () => progress,
    set(value: number) {
      const next = clamp(value);
      if (next === progress) return;
      progress = next;
      listeners.forEach(listener => listener(progress));
    },
    subscribe(listener: (value: number) => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
export type SceneProgress = ReturnType<typeof createSceneProgress>;
