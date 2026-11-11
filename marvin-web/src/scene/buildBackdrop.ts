import {
  BackSide, CanvasTexture, FrontSide, Group, Mesh, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace, TextureLoader,
  type Texture,
} from "three";
import { asset } from "../lib/assets";

// The backdrop the booth stood in front of at an event, shown next to the booth in
// the portfolio's 3D view. It is the event's own backdrop photo, cut out of its
// background, on a gently folded panel standing on the floor.
export type Backdrop = {
  // A photo of the backdrop with a transparent background (PNG or WebP).
  src: string;
  // Width in the 3D scene (the booth is about 3.1 wide); the height follows the photo.
  width: number;
};

export function buildBackdrop(backdrop: Backdrop, invalidate: () => void) {
  const root = new Group();
  root.name = "Event backdrop";
  const textures: Texture[] = [];
  const front = new MeshStandardMaterial({ roughness: .85, alphaTest: .5, side: FrontSide, transparent: false });
  // From behind: the backdrop's outline in plain fabric colour (not the photo mirrored).
  const back = new MeshStandardMaterial({ color: "#e4d9c6", roughness: .9, alphaTest: .5, side: BackSide });
  let geometry: PlaneGeometry | null = null;
  const ready = new TextureLoader().loadAsync(asset(backdrop.src)).then(texture => {
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    textures.push(texture);
    const image = texture.image as HTMLImageElement;
    const height = backdrop.width * image.height / image.width;
    // A slight wave across the panel, so it catches the light like hung fabric.
    geometry = new PlaneGeometry(backdrop.width, height, 48, 1);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) position.setZ(i, .05 * Math.sin(position.getX(i) * 2.4));
    geometry.computeVertexNormals();
    // The photo's transparency as a black and white mask for the back face.
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = Math.round(512 * image.height / image.width);
    const g = canvas.getContext("2d")!;
    g.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = g.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const alpha = pixels.data[i + 3];
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = alpha;
      pixels.data[i + 3] = 255;
    }
    g.putImageData(pixels, 0, 0);
    const mask = new CanvasTexture(canvas);
    textures.push(mask);
    front.map = texture;
    back.alphaMap = mask;
    front.needsUpdate = back.needsUpdate = true;
    for (const material of [front, back]) {
      const panel = new Mesh(geometry, material);
      panel.position.y = height / 2;
      panel.castShadow = true;
      panel.receiveShadow = true;
      root.add(panel);
    }
    invalidate();
  });
  return {
    root,
    ready,
    dispose() {
      geometry?.dispose();
      front.dispose();
      back.dispose();
      textures.forEach(texture => texture.dispose());
    },
  };
}
