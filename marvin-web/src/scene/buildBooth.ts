import {
  BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, CylinderGeometry, DoubleSide, DynamicDrawUsage, Float32BufferAttribute, Group, Mesh,
  MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry,
  RepeatWrapping, SRGBColorSpace, TextureLoader, TorusGeometry, type Material, type Texture,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { asset } from "../lib/assets";
import { curtainDrop, curtainVertex, noHand, type Hand } from "./curtainMotion";
import { selfies } from "../data/portfolio";

export const boothDimensions = { width: 3.2, height: 4.04, doorLeft: .43, doorRight: 1.43, eyeHeight: 1.7 };

function surfaceGrain() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d")!;
  const pixels = context.createImageData(128, 128);
  let seed = 31;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const shade = 100 + (seed % 54);
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = shade;
    pixels.data[i + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(9, 22);
  return texture;
}

// A procedural mesh reconstruction of marvin_main.png. Depth and hidden
// interior surfaces are inferred from the single frontal reference image.
// With `portal`, the interior back wall writes depth but no colour. The canvas
// stays transparent there, so the HTML portfolio behind it shows through the
// doorway exactly where the wall would be (and nowhere else).
export type BoothTheme = { curtain?: string; sign?: string; sheen?: string };

// The sample display on the booth: what a guest takes home. On the left one XL
// strip (three large frames) half tucked into its black Marvin sleeve; on the
// right two sets of small polaroids, one hanging from a line with pegs and one
// fanned out as a stack. Drawn once into a canvas when the photos load.
function photoStripBoard(sources: readonly string[], logoSource: string, onReady: () => void) {
  const canvas = document.createElement("canvas");
  canvas.width = 720; canvas.height = 880;
  const g = canvas.getContext("2d")!;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  let logo: HTMLImageElement | null = null;
  function backdrop() {
    const light = g.createRadialGradient(360, 360, 60, 360, 440, 620);
    light.addColorStop(0, "#fffaf0"); light.addColorStop(1, "#efe1c2");
    g.fillStyle = light; g.fillRect(0, 0, 720, 880);
  }
  function cover(image: HTMLImageElement, x: number, y: number, width: number, height: number) {
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const sw = width / scale, sh = height / scale;
    g.drawImage(image, (image.naturalWidth - sw) / 2, (image.naturalHeight - sh) / 2, sw, sh, x, y, width, height);
  }
  function wordmark(x: number, y: number, width: number, light = false) {
    if (!logo) {
      g.fillStyle = light ? "#f4ecd9" : "#1c1c18"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = `800 ${Math.round(width / 4.2)}px Helvetica, Arial, sans-serif`;
      g.fillText("marvin", x, y);
      return;
    }
    const height = width * logo.naturalHeight / logo.naturalWidth;
    if (light) g.filter = "invert(1) sepia(.25) brightness(1.02)";
    g.drawImage(logo, x - width / 2, y - height / 2, width, height);
    g.filter = "none";
  }
  function shadow(blur = 18, offset = 8) {
    g.shadowColor = "rgba(60, 45, 20, .3)"; g.shadowBlur = blur; g.shadowOffsetY = offset;
  }
  function photoInto(images: HTMLImageElement[], index: number, x: number, y: number, width: number, height: number, mono = false) {
    const image = images[index % Math.max(1, images.length)];
    g.filter = mono ? "grayscale(1) contrast(1.08)" : "saturate(.92)";
    if (image) cover(image, x, y, width, height);
    else { g.fillStyle = "#e6dcc6"; g.fillRect(x, y, width, height); }
    g.filter = "none";
  }
  // A small instant print: white frame, wide lower border with the wordmark.
  function polaroid(images: HTMLImageElement[], index: number, x: number, y: number, size: number, angle: number, mono = false) {
    const pad = size * .07, foot = size * .3;
    const width = size + pad * 2, height = size + pad + foot;
    g.save();
    g.translate(x, y); g.rotate(angle);
    shadow(12, 5);
    g.fillStyle = "#fffefb"; g.fillRect(-width / 2, -height / 2, width, height);
    g.shadowColor = "transparent";
    photoInto(images, index, -width / 2 + pad, -height / 2 + pad, size, size, mono);
    wordmark(0, height / 2 - foot / 2, size * .42);
    g.restore();
  }
  function peg(x: number, y: number) {
    g.save();
    g.translate(x, y);
    shadow(4, 2);
    g.fillStyle = "#c9a974"; g.fillRect(-5, -16, 10, 30);
    g.shadowColor = "transparent";
    g.fillStyle = "#a98852"; g.fillRect(-1, -16, 2, 30);
    g.fillStyle = "#8f8f8f"; g.fillRect(-6, -2, 12, 4);
    g.restore();
  }
  function draw(images: HTMLImageElement[]) {
    backdrop();
    // XL strip: a long strip of four big frames inside a clear plastic tote with a
    // cord handle and a polka-dot ribbon, as guests carry it home.
    g.save();
    g.translate(186, 0); g.rotate(-.025);
    const bagWidth = 272, bagTop = 178, bagBottom = 858;
    const round = (x: number, y: number, w: number, h: number, r: number) => {
      g.beginPath();
      g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
      g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
      g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
    };
    // Back of the bag with its shadow on the display.
    shadow(26, 12);
    g.fillStyle = "rgba(255, 255, 255, .35)";
    round(-bagWidth / 2, bagTop, bagWidth, bagBottom - bagTop, 8); g.fill();
    g.shadowColor = "transparent";
    // The strip itself: cream paper, four frames, the wordmark at the foot.
    const stripWidth = 226, pad = 13, frameHeight = 136, gap = 10, foot = 54;
    const stripHeight = pad + 4 * (frameHeight + gap) - gap + foot;
    const stripTop = bagTop + 34;
    shadow(8, 3);
    g.fillStyle = "#f8f3e7"; g.fillRect(-stripWidth / 2, stripTop, stripWidth, stripHeight);
    g.shadowColor = "transparent";
    [0, 2, 4, 1].forEach((frame, index) =>
      photoInto(images, frame, -stripWidth / 2 + pad, stripTop + pad + index * (frameHeight + gap), stripWidth - pad * 2, frameHeight, true));
    wordmark(0, stripTop + stripHeight - foot / 2, 96);
    // Front film of the bag: a faint milky tint, glossy streaks and welded seams.
    g.fillStyle = "rgba(255, 255, 255, .16)";
    round(-bagWidth / 2, bagTop, bagWidth, bagBottom - bagTop, 8); g.fill();
    const gloss = g.createLinearGradient(-bagWidth / 2, 0, bagWidth / 2, 0);
    gloss.addColorStop(0, "rgba(255,255,255,.35)"); gloss.addColorStop(.08, "rgba(255,255,255,.05)");
    gloss.addColorStop(.18, "rgba(255,255,255,.28)"); gloss.addColorStop(.26, "rgba(255,255,255,0)");
    gloss.addColorStop(.8, "rgba(255,255,255,0)"); gloss.addColorStop(.9, "rgba(255,255,255,.22)"); gloss.addColorStop(1, "rgba(255,255,255,.4)");
    g.fillStyle = gloss; g.fill();
    g.strokeStyle = "rgba(255, 255, 255, .85)"; g.lineWidth = 2.5; g.stroke();
    g.strokeStyle = "rgba(120, 100, 70, .25)"; g.lineWidth = 1; g.stroke();
    g.fillStyle = "rgba(255, 255, 255, .55)"; g.fillRect(-bagWidth / 2 + 3, bagTop + 3, bagWidth - 6, 16);
    g.fillRect(-bagWidth / 2 + 3, bagBottom - 12, bagWidth - 6, 9);
    // Cord handle through two eyelets.
    for (const x of [-62, 62]) {
      g.fillStyle = "#d8d2c4"; g.beginPath(); g.arc(x, bagTop + 11, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#8d8576"; g.beginPath(); g.arc(x, bagTop + 11, 3.5, 0, Math.PI * 2); g.fill();
    }
    g.lineCap = "round";
    g.strokeStyle = "rgba(70, 55, 30, .28)"; g.lineWidth = 8;
    g.beginPath(); g.moveTo(-62, bagTop + 14); g.bezierCurveTo(-58, bagTop - 120, 58, bagTop - 120, 62, bagTop + 14); g.stroke();
    g.strokeStyle = "#f4efe4"; g.lineWidth = 5.5; g.stroke();
    // Black polka-dot ribbon tied where the cord meets the bag.
    g.save();
    g.translate(-62, bagTop + 6);
    const ribbon = (draw: () => void) => {
      g.fillStyle = "#151513"; draw(); g.fill();
      g.save(); g.clip();
      g.shadowColor = "transparent";
      g.fillStyle = "#f4efe4";
      for (let dx = -60; dx <= 60; dx += 11) for (let dy = -40; dy <= 70; dy += 11) {
        g.beginPath(); g.arc(dx + (dy % 22 ? 5 : 0), dy, 2.1, 0, Math.PI * 2); g.fill();
      }
      g.restore();
    };
    shadow(6, 3);
    ribbon(() => { g.beginPath(); g.moveTo(0, 0); g.lineTo(-16, 58); g.lineTo(-6, 54); g.lineTo(-2, 62); g.lineTo(4, 2); g.closePath(); });
    ribbon(() => { g.beginPath(); g.moveTo(0, 0); g.lineTo(18, 54); g.lineTo(8, 52); g.lineTo(6, 60); g.lineTo(-3, 2); g.closePath(); });
    ribbon(() => { g.beginPath(); g.ellipse(-22, -6, 24, 13, -.35, 0, Math.PI * 2); });
    ribbon(() => { g.beginPath(); g.ellipse(22, -6, 24, 13, .35, 0, Math.PI * 2); });
    g.shadowColor = "transparent";
    g.fillStyle = "#151513"; g.beginPath(); g.ellipse(0, -2, 9, 8, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    g.restore();

    // Polaroids on a line: two rows of three, held by wooden pegs.
    for (const [row, y] of [[0, 130], [1, 316]] as const) {
      g.strokeStyle = "#9c8159"; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(372, y - 58); g.quadraticCurveTo(530, y - 36, 698, y - 58); g.stroke();
      [0, 1, 2].forEach(column => {
        const x = 430 + column * 112;
        polaroid(images, row * 3 + column + 1, x, y + 14, 86, (column - 1) * .05 + (row ? .03 : -.02), (row + column) % 3 === 1);
        peg(x, y - 50 + (column === 1 ? 6 : 0));
      });
    }

    // A fanned stack of polaroids, as handed out at the event.
    g.save();
    g.translate(538, 772);
    [-.4, -.2, 0, .2, .38].forEach((angle, index) => {
      g.save();
      g.rotate(angle);
      polaroid(images, index + 2, 0, -150, 124, 0, index === 1);
      g.restore();
    });
    g.restore();

    // A faint diagonal reflection, as on the glass of a real display.
    const glare = g.createLinearGradient(0, 0, 720, 880);
    glare.addColorStop(0, "rgba(255,255,255,.18)"); glare.addColorStop(.35, "rgba(255,255,255,0)");
    glare.addColorStop(.6, "rgba(255,255,255,0)"); glare.addColorStop(.7, "rgba(255,255,255,.1)"); glare.addColorStop(.8, "rgba(255,255,255,0)");
    g.fillStyle = glare; g.fillRect(0, 0, 720, 880);
    texture.needsUpdate = true;
  }
  draw([]);
  const load = (source: string) => {
    const image = new Image();
    image.decoding = "async";
    image.src = source;
    return image.decode().then(() => image, () => null);
  };
  const loaded = Promise.all([load(logoSource), ...sources.map(load)])
    .then(([mark, ...results]) => {
      logo = mark;
      draw(results.filter((image): image is HTMLImageElement => image !== null));
      onReady();
    });
  return { texture, loaded };
}

export function buildBooth(invalidate: () => void, { portal = false, theme = {} as BoothTheme } = {}) {
  const root = new Group();
  root.name = "Marvin — gold-trim reference reconstruction";
  let disposed = false;
  const textures = new Set<Texture>();
  const textureLoads: Promise<void>[] = [];
  const loader = new TextureLoader();
  // UV crops reference the untouched supplied images.
  function photo(path: string, crop?: [number, number, number, number, number, number]) {
    let complete!: () => void;
    textureLoads.push(new Promise<void>(resolve => { complete = resolve; }));
    const map = loader.load(asset(path), texture => {
      if (disposed) texture.dispose(); else invalidate();
      complete();
    }, undefined, () => { if (!disposed) invalidate(); complete(); });
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = 4;
    if (crop) {
      const [x, y, width, height, imageWidth, imageHeight] = crop;
      map.repeat.set(width / imageWidth, height / imageHeight);
      map.offset.set(x / imageWidth, 1 - (y + height) / imageHeight);
    }
    textures.add(map);
    return map;
  }
  const grain = surfaceGrain();
  textures.add(grain);
  // Low-amplitude polishing ripples break up the reflection of the studio
  // softboxes, matching the slightly uneven folded metal in the reference.
  const metalCanvas = document.createElement("canvas");
  metalCanvas.width = metalCanvas.height = 256;
  const metalContext = metalCanvas.getContext("2d")!;
  const normals = metalContext.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = x / 256, v = y / 256, tau = Math.PI * 2;
    const nx = .16 * Math.sin(tau * (u * 7 + v * 3)) + .07 * Math.sin(tau * (u * 13 - v * 8));
    const ny = .14 * Math.cos(tau * (v * 9 + u * 2)) + .06 * Math.sin(tau * (u * 5 - v * 17));
    const index = (y * 256 + x) * 4;
    normals.data[index] = (nx + 1) * 127.5;
    normals.data[index + 1] = (ny + 1) * 127.5;
    normals.data[index + 2] = (Math.sqrt(1 - nx * nx - ny * ny) + 1) * 127.5;
    normals.data[index + 3] = 255;
  }
  metalContext.putImageData(normals, 0, 0);
  const polishedNormals = new CanvasTexture(metalCanvas);
  textures.add(polishedNormals);
  const cream = new MeshPhysicalMaterial({ color: "#d8d3c4", roughness: .48, metalness: .22,
    clearcoat: .16, clearcoatRoughness: .4, bumpMap: grain, bumpScale: .0008 });
  const interior = new MeshStandardMaterial({ color: "#d1c9b9", roughness: .9 });
  const chrome = new MeshPhysicalMaterial({ color: "#d2d4d0", metalness: 1, roughness: .29,
    anisotropy: .45, bumpMap: grain, bumpScale: .0004 });
  const gold = new MeshPhysicalMaterial({ color: "#d4bf96", metalness: 1, roughness: .14,
    clearcoat: .25, clearcoatRoughness: .2, envMapIntensity: 1.15,
    normalMap: polishedNormals });
  gold.normalScale.set(.65, .65);

  function box(name: string, width: number, height: number, depth: number,
    x: number, y: number, z: number, material: Material, rounded = false) {
    const geometry = rounded
      ? new RoundedBoxGeometry(width, height, depth, 2, Math.min(.025, width / 4, height / 4, depth / 4))
      : new BoxGeometry(width, height, depth);
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  }
  function frame(name: string, width: number, height: number, x: number, y: number, z: number,
    thickness = .035, material: Material = gold) {
    // A mitered metal profile catches distinct reflections on the outer bevel,
    // narrow flat face and inward bevel, as in the photographed surrounds.
    const points: number[] = [];
    const contours = [[thickness / 2, -.015], [thickness * .27, .025],
      [-thickness * .12, .025], [-thickness / 2, -.018]];
    for (let level = 0; level < contours.length - 1; level++) {
      const ring = (index: number, band: number) => {
        const [offset, depth] = contours[band];
        return [[-1, -1], [1, -1], [1, 1], [-1, 1]][index]
          .map((side, axis) => side * ((axis === 0 ? width : height) / 2 + offset))
          .concat(depth);
      };
      for (let side = 0; side < 4; side++) {
        const next = (side + 1) % 4;
        const a = ring(side, level), b = ring(next, level);
        const c = ring(next, level + 1), d = ring(side, level + 1);
        points.push(...a, ...b, ...c, ...a, ...c, ...d);
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
    geometry.setAttribute("uv", new Float32BufferAttribute(points.flatMap((_, i) =>
      i % 3 === 0 ? [points[i] / width + .5, points[i + 1] / height + .5] : []), 2));
    geometry.computeVertexNormals();
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
  }
  function plane(name: string, width: number, height: number, x: number, y: number, z: number, material: Material) {
    const mesh = new Mesh(new PlaneGeometry(width, height), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    root.add(mesh);
    return mesh;
  }
  function metalRim(name: string, width: number, height: number, inset: number, x: number, y: number, z: number, finish: Texture) {
    // Four mitered faces slope into the recess, unlike a flat silver border.
    const points: number[] = [];
    const outer = [[-width / 2, -height / 2], [width / 2, -height / 2], [width / 2, height / 2], [-width / 2, height / 2]];
    for (let i = 0; i < 4; i++) {
      const a = outer[i], b = outer[(i + 1) % 4];
      const innerA = [a[0] - Math.sign(a[0]) * inset, a[1] - Math.sign(a[1]) * inset, -.035];
      const innerB = [b[0] - Math.sign(b[0]) * inset, b[1] - Math.sign(b[1]) * inset, -.035];
      points.push(...a, 0, ...b, 0, ...innerB, ...a, 0, ...innerB, ...innerA);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
    const uvs: number[] = [];
    for (let i = 0; i < points.length; i += 3) uvs.push(points[i] / width + .5, points[i + 1] / height + .5);
    geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    const metal = chrome.clone();
    // Preserve the reference's brushed finish on the actual sloping metal faces.
    metal.map = finish;
    metal.metalness = .55;
    metal.roughness = .3;
    const mesh = new Mesh(geometry, metal);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
  }

  const backWall = box("Interior back wall", 3.14, 3.48, .09, 0, 1.76, -.74,
    portal ? new MeshBasicMaterial({ colorWrite: false }) : interior);
  // Opaque meshes are not drawn in depth order, so the invisible wall must go
  // first: everything drawn later (the white backdrop) then fails the depth test.
  if (portal) backWall.renderOrder = -10;
  box("Left side", .09, 3.5, 1.5, -1.555, 1.75, 0, cream);
  box("Right side", .09, 3.5, 1.5, 1.555, 1.75, 0, cream);
  box("Ceiling", 3.2, .08, 1.5, 0, 3.47, 0, cream);
  box("Floor", 3.2, .09, 1.5, 0, .045, 0, interior);
  const leftTrimInnerEdge = -3.15 / 2 + .045 / 2;
  const curtainTrimOuterEdge = .94 - 1.08 / 2 - .045 / 2;
  const displayX = (leftTrimInnerEdge + curtainTrimOuterEdge) / 2;
  const printerLeft = displayX - .26, printerRight = displayX + .26;
  // Four panels leave a real opening for the inset printer tray.
  box("Front panel above printer", 1.96, 1.91, .12, -.55, 2.505, .72, cream);
  box("Front panel below printer", 1.96, 1.20, .12, -.55, .64, .72, cream);
  box("Printer panel left", printerLeft + 1.53, .31, .12, (printerLeft - 1.53) / 2, 1.395, .72, cream);
  box("Printer panel right", .43 - printerRight, .31, .12, (.43 + printerRight) / 2, 1.395, .72, cream);
  box("Door right jamb", .13, 3.42, .13, 1.485, 1.75, .72, cream);
  box("Door lintel", 1.11, .45, .12, .955, 3.245, .72, cream);
  frame("Outer gold surround", 3.15, 3.46, 0, 1.75, .8, .045);
  frame("Doorway gold surround", 1.08, 2.91, .94, 1.565, .82, .045);
  box("Canopy", 2.78, .045, .26, 0, 3.2, .85, gold, true);
  box("Canopy warm underside", 2.56, .015, .15, 0, 3.17, .84,
    new MeshStandardMaterial({ color: "#fff8e9", emissive: "#ffe6b1", emissiveIntensity: .35 }));

  box("Illuminated sign case", 1.43, .43, .20, 0, 3.715, .57, gold, true);
  const signCanvas = document.createElement("canvas");
  signCanvas.width = 512; signCanvas.height = 160;
  const signContext = signCanvas.getContext("2d")!;
  signContext.scale(512, 160);
  const signLight = signContext.createRadialGradient(.5, .5, .1, .5, .5, .68);
  const signTint = theme.sign ?? "#fff0ae";
  signLight.addColorStop(0, "#fffbe6");
  signLight.addColorStop(.65, signTint);
  signLight.addColorStop(1, theme.sign ? signTint : "#e8ca7c");
  signContext.fillStyle = signLight;
  signContext.fillRect(0, 0, 1, 1);
  const signMap = new CanvasTexture(signCanvas);
  signMap.colorSpace = SRGBColorSpace;
  textures.add(signMap);
  box("Warm yellow opal sign diffuser", 1.38, .38, .018, 0, 3.715, .677,
    new MeshBasicMaterial({ map: signMap, toneMapped: false }), true);
  frame("Mitered sign surround", 1.41, .41, 0, 3.715, .686, .036);
  // Keep the supplied black wordmark, its star cutout and transparency intact.
  const logo = photo("textures/marvin-wordmark.png");
  const logoMaterial = new MeshBasicMaterial({ map: logo, transparent: true, alphaTest: .02, toneMapped: false });
  plane("Supplied black Marvin wordmark — illuminated sign", 1.08, 1.08 * 227 / 1098, 0, 3.715, .696, logoMaterial);
  for (const x of [-.48, .48]) {
    const handle = new Mesh(new TorusGeometry(.055, .009, 6, 18, Math.PI), chrome);
    handle.position.set(x, 3.925, .57);
    root.add(handle);
  }

  const displayScale = 1.3;
  const displayY = 2.37;
  const board = photoStripBoard(selfies.slice(0, 8).map(selfie => asset(selfie.src)), asset("textures/marvin-wordmark.png"), () => { if (!disposed) invalidate(); });
  textures.add(board.texture);
  textureLoads.push(board.loaded);
  box("Photo strip display backing", .85 * displayScale, 1.04 * displayScale, .035, displayX, displayY, .81,
    new MeshStandardMaterial({ color: "#f2e7c6", roughness: .8 }));
  frame("Photo strip display frame", .87 * displayScale, 1.06 * displayScale, displayX, displayY, .84, .025);
  plane("Photo strip display — sample prints", .83 * displayScale, 1.02 * displayScale, displayX, displayY, .832,
    new MeshBasicMaterial({ map: board.texture, toneMapped: false }));

  const printerPhoto = "textures/printer-reference.jpg";
  // Match the main reference: compact empty metal recess and a narrow upper
  // print slot, about 17% of the facade width (previously 34%).
  const brushedSteel = chrome.clone();
  brushedSteel.map = photo(printerPhoto, [380, 10, 500, 80, 1280, 854]);
  brushedSteel.roughness = .42;
  brushedSteel.metalness = .65;
  box("Printer recessed housing", .54, .34, .035, displayX, 1.395, .61, brushedSteel);
  box("Printer inner left", .014, .28, .15, displayX - .243, 1.395, .705, chrome);
  box("Printer inner right", .014, .28, .15, displayX + .243, 1.395, .705, chrome);
  box("Printer lower tray", .49, .014, .15, displayX, 1.254, .705, brushedSteel, true);
  box("Printer upper inner wall", .49, .014, .15, displayX, 1.536, .705, chrome);
  box("Printer narrow black output slot", .415, .038, .008, displayX, 1.503, .634,
    new MeshBasicMaterial({ color: "#090b08" }), true);
  metalRim("Beveled stainless printer surround", .56, .36, .033, displayX, 1.395, .835,
    photo(printerPhoto, [343, 330, 628, 410, 1280, 854]));
  frame("Printer inner polished edge", .49, .29, displayX, 1.395, .788, .008, chrome);
  plane("Supplied black Marvin wordmark — lower branding", .58, .58 * 227 / 1098, displayX, 1.095, .789, logoMaterial);

  box("Interior rear skirting", 3.07, .09, .04, 0, .14, -.665, chrome, true);

  const rod = new Mesh(new CylinderGeometry(.017, .017, 1.09, 12), chrome);
  rod.rotation.z = Math.PI / 2;
  rod.position.set(.94, 3.025, .86);
  root.add(rod);
  const curtainGeometry = new PlaneGeometry(1, curtainDrop, 120, 40);
  (curtainGeometry.attributes.position as BufferAttribute).setUsage(DynamicDrawUsage);
  const velvet = photo("textures/olive-velvet.jpg", [20, 25, 590, 1225, 640, 1280]);
  const curtainMaterial = new MeshPhysicalMaterial({
    color: theme.curtain ?? "#ffffff", map: velvet, roughness: .95, metalness: 0,
    bumpMap: grain, bumpScale: .0018,
    sheen: .85, sheenColor: theme.sheen ?? "#889064", sheenRoughness: .85, side: DoubleSide,
  });
  const curtain = new Mesh(curtainGeometry, curtainMaterial);
  if (theme.curtain) {
    // A recoloured curtain keeps the velvet's folds: use its brightness only and
    // let the material colour supply the hue.
    textureLoads.push(new Promise<void>(resolve => {
      const original = velvet.image as CanvasImageSource & { width: number; height: number } | undefined;
      const tint = () => {
        const source = velvet.image as HTMLImageElement | undefined;
        if (disposed || !source?.width) { resolve(); return; }
        const canvas = document.createElement("canvas");
        canvas.width = source.width; canvas.height = source.height;
        const context = canvas.getContext("2d")!;
        context.drawImage(source, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < pixels.data.length; i += 4) {
          const luminance = .3 * pixels.data[i] + .59 * pixels.data[i + 1] + .11 * pixels.data[i + 2];
          const value = Math.min(255, luminance * 1.55 + 28);
          pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
        }
        context.putImageData(pixels, 0, 0);
        const gray = new CanvasTexture(canvas);
        gray.colorSpace = SRGBColorSpace;
        gray.anisotropy = 4;
        gray.repeat.copy(velvet.repeat);
        gray.offset.copy(velvet.offset);
        textures.add(gray);
        curtainMaterial.map = gray;
        curtainMaterial.needsUpdate = true;
        invalidate();
        resolve();
      };
      if (original && "complete" in original && (original as HTMLImageElement).complete) tint();
      else {
        const wait = setInterval(() => {
          const source = velvet.image as HTMLImageElement | undefined;
          if (disposed || (source && source.complete && source.width)) { clearInterval(wait); tint(); }
        }, 40);
      }
    }));
  }
  curtain.name = "Supplied olive velvet — soft gathered curtain";
  curtain.castShadow = true;
  curtain.receiveShadow = true;
  root.add(curtain);
  const rings = Array.from({ length: 13 }, () => {
    const ring = new Mesh(new TorusGeometry(.027, .006, 6, 12), chrome);
    ring.position.y = 3.0;
    ring.position.z = .85;
    root.add(ring);
    return ring;
  });
  let lastOpening = -1;
  let lastSway = NaN;
  let lastWindTime = NaN;
  let lastHand = "";
  function setCurtain(opening: number, sway = 0, windTime = 0, hand: Hand = noHand) {
    const handKey = hand.press === 0 && hand.drag === 0 ? "" : `${hand.u.toFixed(3)},${hand.v.toFixed(3)},${hand.press.toFixed(3)},${hand.drag.toFixed(3)}`;
    if (opening === lastOpening && sway === lastSway && windTime === lastWindTime && handKey === lastHand) return;
    lastOpening = opening;
    lastSway = sway;
    lastWindTime = windTime;
    lastHand = handKey;
    const positions = curtainGeometry.attributes.position;
    const uv = curtainGeometry.attributes.uv;
    for (let i = 0; i < positions.count; i++) {
      const u = uv.getX(i), v = 1 - uv.getY(i);
      const point = curtainVertex(u, v, opening, sway, windTime, hand);
      positions.setXYZ(i, point.x, point.y, point.z);
    }
    positions.needsUpdate = true;
    curtainGeometry.computeVertexNormals();
    curtainGeometry.computeBoundingSphere();
    rings.forEach((ring, i) => { ring.position.x = curtainVertex(i / 12, 0, opening).x; });
  }
  setCurtain(0);
  return {
    root, setCurtain, curtain, ready: Promise.all(textureLoads),
    dispose() {
      disposed = true;
      const materials = new Set<Material>();
      root.traverse(object => {
        if (object instanceof Mesh) {
          object.geometry.dispose();
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
        }
      });
      materials.forEach(material => material.dispose());
      textures.forEach(texture => texture.dispose());
    },
  };
}
