export const clamp = (value: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
const segment = (p: number, start: number, end: number) => clamp((p - start) / (end - start));
const ease = (t: number) => t * t * (3 - 2 * t);

export const cameraFov = 34;

// The portfolio lives on the back wall inside the booth. `backZ` is the front face
// of that wall, `endZ` is where the camera stops (page fills the screen 1:1) and
// `centerX/eyeY` is the point of the wall the camera finally looks at.
export const portal = { backZ: -.695, endZ: 0, centerX: .94, eyeY: 1.7, startY: 2.25, startSide: 0, lookStartY: 1.95, lookStartZ: 0 };

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
//
// On a narrow (portrait) screen the view is so slim that, well before the camera
// reaches the doorway, all it shows is the plain back wall. `aspect` lets that last,
// featureless stretch take no longer than it does on a laptop, so a phone does not
// sit on an empty wall for seconds while walking in or out.
// A laptop spends about a quarter of the walk-in on the plain wall; a narrower
// screen gets a shorter stretch than that.
export const wallOnlyShare = .26;
const narrowWallShare = .12;
export function cameraPose(progress: number, distance: number, aspect = 16 / 10) {
  const pose = timeline(progress);
  const near = portal.endZ - portal.backZ;
  const far = Math.max(distance - portal.backZ, near * 1.5);
  // Distance from the back wall at which the view no longer shows anything but the
  // wall (its half width reaches the interior side wall, .63 m from the doorway centre).
  const halfWidth = Math.tan(cameraFov * Math.PI / 360) * Math.max(.1, aspect);
  const wallOnly = Math.min(far, Math.max(near, .63 / halfWidth));
  const share = Math.log(wallOnly / near) / Math.log(far / near);
  const t = pose.travel;
  const tail = narrowWallShare;
  const depth = share <= wallOnlyShare ? far * (near / far) ** t
    : t < 1 - tail ? far * (wallOnly / far) ** (t / (1 - tail))
      : wallOnly * (near / wallOnly) ** ((t - 1 + tail) / tail);
  const z = portal.backZ + depth;
  // Before entering, the camera faces the booth straight on from a little above
  // its middle (the depth comes from lighting and a small pointer parallax), then
  // moves across to face the doorway square-on before crossing it.
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
