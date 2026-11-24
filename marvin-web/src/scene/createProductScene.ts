import {
  ACESFilmicToneMapping, BoxGeometry, CatmullRomCurve3, CylinderGeometry, DirectionalLight, DoubleSide, Group,
  HemisphereLight, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PCFShadowMap, PerspectiveCamera, PlaneGeometry,
  PMREMGenerator, SRGBColorSpace, Scene, ShadowMaterial, TextureLoader, TorusGeometry, TubeGeometry, Vector3, WebGLRenderer,
  type BufferGeometry, type Material, type Texture,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { studioEnvironment } from "./studioEnvironment";

// Marvin's prints (under the monitor) as real objects on white displays, on a turntable
// that turns slowly and never stops on its own: the 4R print on a clear acrylic
// easel, the XL strip in its clear PVC sleeve with handles hanging from a chrome
// stand, and the mini tote, a clear PVC bag with the printed card inside.
// Dragging turns it by hand (it glides on, then settles back to its own pace);
// `show` brings one print round to the front.

export type ProductArtwork = { id: string; src: string };

const radius = 1.9;              // of the turntable
const plinthHeight = .3;
const cruise = -(Math.PI * 2) / 42; // radians a second: one slow turn in 42 seconds
const step = (Math.PI * 2) / 3;

export function createProductScene(host: HTMLElement, { products, onFront }: {
  products: readonly ProductArtwork[];
  onFront: (index: number) => void;
}) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const canvas = renderer.domElement;
  canvas.className = "product-canvas";
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);

  const scene = new Scene();
  const environmentScene = studioEnvironment();
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(environmentScene, .03, .1, 50, { size: 256 });
  scene.environment = environment.texture;
  scene.environmentIntensity = .85;
  environmentScene.dispose();
  pmrem.dispose();
  scene.add(new HemisphereLight("#ffffff", "#cfccc4", .7));
  const key = new DirectionalLight("#fffaf0", 2.2);
  key.position.set(-3, 7, 6);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(1024);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
  key.shadow.normalBias = .02;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new DirectionalLight("#eef3ff", .7);
  fill.position.set(5, 3, 4);
  scene.add(fill);
  const rim = new DirectionalLight("#ffffff", .9);
  rim.position.set(2, 5, -6);
  scene.add(rim);
  const floor = new Mesh(new PlaneGeometry(30, 30), new ShadowMaterial({ opacity: .07 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const camera = new PerspectiveCamera(28, 1, .1, 60);
  const lookAt = new Vector3(0, 1.32, radius * .8);

  // Everything made here, to release at the end.
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const textures: Texture[] = [];
  const keep = <T extends BufferGeometry>(geometry: T) => { geometries.push(geometry); return geometry; };
  const made = <T extends Material>(material: T) => { materials.push(material); return material; };
  const mesh = (geometry: BufferGeometry, material: Material | Material[], shadow = true) => {
    const result = new Mesh(keep(geometry), material);
    result.castShadow = shadow;
    result.receiveShadow = true;
    return result;
  };

  const plinth = made(new MeshStandardMaterial({ color: "#efece6", roughness: .6 }));
  const paper = made(new MeshStandardMaterial({ color: "#f7f6f2", roughness: .7 }));
  const acrylic = made(new MeshPhysicalMaterial({
    color: "#f4fbff", transparent: true, opacity: .22, roughness: .04, clearcoat: 1, clearcoatRoughness: .03,
    side: DoubleSide, depthWrite: false, envMapIntensity: 1.6,
  }));
  const pvc = made(new MeshPhysicalMaterial({
    color: "#ffffff", transparent: true, opacity: .06, roughness: .06, clearcoat: 1, clearcoatRoughness: .05,
    side: DoubleSide, depthWrite: false, envMapIntensity: 1.1,
  }));
  const seam = made(new MeshPhysicalMaterial({
    color: "#e9f1f4", transparent: true, opacity: .55, roughness: .1, clearcoat: 1, depthWrite: false,
  }));
  const tube = made(new MeshPhysicalMaterial({
    color: "#eef6f8", transparent: true, opacity: .55, roughness: .03, clearcoat: 1, clearcoatRoughness: .02,
    envMapIntensity: 2, depthWrite: false,
  }));
  const chrome = made(new MeshStandardMaterial({ color: "#d9dadc", metalness: 1, roughness: .16 }));
  const snap = made(new MeshStandardMaterial({ color: "#1f2733", metalness: .4, roughness: .35 }));

  const loader = new TextureLoader();
  const artwork = (src: string) => {
    const texture = loader.load(src, () => { loaded += 1; invalidate(); });
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    textures.push(texture);
    // The print's own colours, as sharp as the artwork: not lit, shaded or tone
    // mapped (the studio light and the film curve greyed the blacks and washed
    // out the colours, so the photos looked hazy). The paper round it is still lit.
    return made(new MeshBasicMaterial({ map: texture, toneMapped: false }));
  };
  let loaded = 0;

  // A print: a thin card, the artwork on its front, plain paper on the back and edges.
  function print(width: number, height: number, front: Material) {
    return mesh(new BoxGeometry(width, height, .008), [paper, paper, paper, paper, front, paper]);
  }
  // A clear PVC bag: soft-edged clear body, welded seams round its sides and
  // bottom, a dark snap at the mouth and two clear tube handles.
  function bag(width: number, height: number, depth: number, handleWidth: number, handleHeight: number) {
    const group = new Group();
    const body = mesh(new RoundedBoxGeometry(width, height, depth, 3, Math.min(.04, depth / 2.2)), pvc, false);
    body.position.y = height / 2;
    body.renderOrder = 2;
    group.add(body);
    for (const x of [-width / 2 + .012, width / 2 - .012]) {
      const side = mesh(new BoxGeometry(.024, height, depth + .004), seam, false);
      side.position.set(x, height / 2, 0);
      side.renderOrder = 3;
      group.add(side);
    }
    const bottom = mesh(new BoxGeometry(width, .03, depth + .004), seam, false);
    bottom.position.y = .015;
    bottom.renderOrder = 3;
    group.add(bottom);
    const arch = new CatmullRomCurve3([
      new Vector3(-handleWidth / 2, height - .06, 0),
      new Vector3(-handleWidth / 2 - .02, height + handleHeight * .7, 0),
      new Vector3(0, height + handleHeight, 0),
      new Vector3(handleWidth / 2 + .02, height + handleHeight * .7, 0),
      new Vector3(handleWidth / 2, height - .06, 0),
    ]);
    for (const z of [depth / 2 - .015, -depth / 2 + .015]) {
      const handle = mesh(new TubeGeometry(arch, 48, .022, 10), tube);
      handle.position.z = z;
      handle.renderOrder = 4;
      group.add(handle);
      const button = mesh(new CylinderGeometry(.04, .04, .02, 20), snap);
      button.rotation.x = Math.PI / 2;
      button.position.set(0, height - .05, z + Math.sign(z) * .03);
      group.add(button);
    }
    return group;
  }

  const builders: Record<string, (front: Material) => Group> = {
    "4r": front => {
      // A 4R print (4 x 6 in), leaning back on a clear acrylic easel.
      const group = new Group();
      const card = print(1, 1.5, front);
      const lean = .08;
      card.rotation.x = -lean;
      card.position.set(0, .06 + 1.5 / 2 * Math.cos(lean), -.02 - 1.5 / 2 * Math.sin(lean));
      group.add(card);
      const back = mesh(new BoxGeometry(.5, 1.05, .02), acrylic, false);
      back.rotation.x = .32;
      back.position.set(0, .5, -.3);
      back.renderOrder = 2;
      group.add(back);
      const ledge = mesh(new BoxGeometry(1.1, .06, .14), acrylic, false);
      ledge.position.set(0, .03, .03);
      ledge.renderOrder = 2;
      const lip = mesh(new BoxGeometry(1.1, .1, .02), acrylic, false);
      lip.position.set(0, .07, .09);
      lip.renderOrder = 2;
      group.add(ledge, lip);
      return group;
    },
    xl: front => {
      // The XL strip (25 x 75 cm) in its clear sleeve, hanging from a chrome stand.
      const group = new Group();
      const width = .56, height = 1.68, handleHeight = .34;
      const stand = new Group();
      const base = mesh(new CylinderGeometry(.3, .32, .03, 40), chrome);
      base.position.set(0, .015, -.22);
      const pole = mesh(new CylinderGeometry(.016, .016, 2.35, 16), chrome);
      pole.position.set(0, 1.19, -.22);
      const arm = mesh(new CylinderGeometry(.013, .013, .24, 12), chrome);
      arm.rotation.x = Math.PI / 2;
      arm.position.set(0, 2.34, -.1);
      const hook = mesh(new TorusGeometry(.04, .009, 8, 20, Math.PI * 1.3), chrome);
      hook.rotation.set(0, Math.PI / 2, Math.PI * .85);
      hook.position.set(0, 2.31, .02);
      stand.add(base, pole, arm, hook);
      group.add(stand);
      const sleeve = bag(width, height, .05, .3, handleHeight);
      // The strip is a 1 : 3 print, a little clear sleeve above it.
      const stripHeight = (width - .05) * 3;
      const strip = print(width - .05, stripHeight, front);
      strip.position.set(0, stripHeight / 2 + .04, .006);
      sleeve.add(strip);
      sleeve.position.set(0, 2.29 - height - handleHeight, .02);
      group.add(sleeve);
      return group;
    },
    tote: front => {
      // The mini tote (25 x 20 cm): a clear bag standing on the display, its card inside.
      const width = 1.5, height = 1.2, depth = .26;
      const tote = bag(width, height, depth, .62, .62);
      // A little below the snap at the mouth, so it never covers the artwork.
      const card = print(width - .2, (width - .2) * .8, front);
      card.position.set(0, .03 + (width - .2) * .4, depth / 2 - .045);
      tote.add(card);
      return tote;
    },
  };

  const turntable = new Group();
  scene.add(turntable);
  const stands = products.map(product => {
    const holder = new Group();
    const base = mesh(new CylinderGeometry(.72, .72, plinthHeight, 64), plinth);
    base.position.y = plinthHeight / 2;
    holder.add(base);
    const model = (builders[product.id] ?? builders["4r"])(artwork(product.src));
    model.position.y = plinthHeight;
    holder.add(model);
    turntable.add(holder);
    return holder;
  });

  // The turntable: `angle` turns it; the print at the front is the one whose
  // place on the circle is closest to the camera.
  let angle = 0;
  let speed = cruise;
  let glideTo: { from: number; to: number; start: number } | null = null;
  let holdUntil = 0;
  let front = -1;
  let dragging = false;
  let running = true;
  let frame = 0;
  let last = performance.now();
  const wrap = (value: number) => ((value % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  function place() {
    stands.forEach((holder, index) => {
      const turn = angle + index * step;
      holder.position.set(Math.sin(turn) * radius, 0, Math.cos(turn) * radius);
      holder.rotation.y = turn;
    });
    const next = Math.round(wrap(-angle) / step) % products.length;
    if (next !== front) { front = next; host.dataset.front = products[next].id; onFront(next); }
    host.dataset.angle = (angle * 180 / Math.PI).toFixed(1);
  }

  function resize() {
    const width = host.clientWidth || 1, height = host.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Far enough for the tallest print (the XL on its stand) and, on a narrow
    // screen, the widest (the tote) to fit.
    const tan = Math.tan(camera.fov * Math.PI / 360);
    const distance = Math.max(3.45 / (2 * tan), 1.95 / (2 * tan * camera.aspect));
    camera.position.set(0, lookAt.y + distance * .09, lookAt.z + distance);
    camera.lookAt(lookAt);
    camera.updateProjectionMatrix();
    invalidate();
  }

  function tick(now: number) {
    frame = 0;
    const dt = Math.min(.1, (now - last) / 1000);
    last = now;
    if (glideTo) {
      const t = Math.min(1, (now - glideTo.start) / 1100);
      const eased = t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      angle = glideTo.from + (glideTo.to - glideTo.from) * eased;
      if (t >= 1) { glideTo = null; speed = 0; holdUntil = now + 2200; }
    } else if (!dragging) {
      // After a flick (or a pause on a chosen print) ease back to the slow turn.
      const target = now < holdUntil ? 0 : cruise;
      speed += (target - speed) * Math.min(1, dt * (Math.abs(speed) > Math.abs(cruise) ? 2.2 : .9));
      angle += speed * dt;
    }
    place();
    renderer.render(scene, camera);
    if (running) frame = requestAnimationFrame(tick);
  }
  function invalidate() {
    if (!frame) frame = requestAnimationFrame(tick);
  }

  // Dragging sideways turns it by hand.
  let pointer: { id: number; x: number; y: number; lastX: number; lastT: number; moved: boolean } | null = null;
  const onDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastT: performance.now(), moved: false };
  };
  const onMove = (event: PointerEvent) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    if (!pointer.moved) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return;
      pointer.moved = dragging = true;
      glideTo = null; holdUntil = 0;
      host.setPointerCapture(event.pointerId);
      host.dataset.dragging = "true";
    }
    const now = performance.now();
    const turn = (event.clientX - pointer.lastX) * 4.2 / (host.clientWidth || 600);
    angle += turn;
    speed = turn / Math.max(.008, (now - pointer.lastT) / 1000);
    pointer.lastX = event.clientX; pointer.lastT = now;
  };
  const onUp = (event: PointerEvent) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    if (pointer.moved && host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId);
    pointer = null;
    dragging = false;
    speed = Math.max(-4, Math.min(4, speed));
    delete host.dataset.dragging;
  };
  host.addEventListener("pointerdown", onDown);
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerup", onUp);
  host.addEventListener("pointercancel", onUp);

  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  place();
  invalidate();

  /** Glide round to a print (the shorter way), stay a moment, then turn on. */
  function show(index: number) {
    const target = -index * step;
    let delta = wrap(target - angle);
    if (delta > Math.PI) delta -= Math.PI * 2;
    glideTo = { from: angle, to: angle + delta, start: performance.now() };
    invalidate();
  }

  return {
    show,
    /** Turn the next (1) or previous (-1) print to the front. */
    turn(direction: 1 | -1) {
      show(((front + direction) % products.length + products.length) % products.length);
    },
    /** Stop drawing while the slide is out of sight. */
    setRunning(value: boolean) {
      running = value;
      if (value) { last = performance.now(); invalidate(); }
      else { cancelAnimationFrame(frame); frame = 0; }
    },
    loaded: () => loaded,
    dispose() {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      textures.forEach(texture => texture.dispose());
      floor.geometry.dispose();
      floor.material.dispose();
      environment.dispose();
      key.shadow.map?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}

export type ProductScene = ReturnType<typeof createProductScene>;
