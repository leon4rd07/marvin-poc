import {
  BackSide, BoxGeometry, CanvasTexture, FrontSide, Group, Mesh, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace, TextureLoader,
  type BufferGeometry, type Texture,
} from "three";
import { asset } from "../lib/assets";

// The backdrop the booth stood in front of at an event, shown in the portfolio's 3D
// view. Either the event's own backdrop photo cut out of its background, on a gently
// folded panel standing on the floor, or (with `board`) a photo of a backdrop wall
// filling the front of a flat, rigid board.
export type Backdrop = {
  // A photo of the backdrop (PNG or WebP), with a transparent background unless `board`.
  src: string;
  // Width in the 3D scene (the booth is about 3.1 wide); the height follows the photo.
  width: number;
  // The colour of a rigid board's edges and back.
  board?: string;
};

const boardDepth = .08;

export function buildBackdrop(backdrop: Backdrop, invalidate: () => void) {
  const root = new Group();
  root.name = "Event backdrop";
  const textures: Texture[] = [];
  const front = new MeshStandardMaterial({ roughness: .85, alphaTest: .5, side: FrontSide, transparent: false });
  // From behind: the backdrop's outline in plain fabric colour (not the photo mirrored).
  const back = new MeshStandardMaterial({ color: "#e4d9c6", roughness: .9, alphaTest: .5, side: BackSide });
  const geometries: BufferGeometry[] = [];
  let height = 0;
  const ready = new TextureLoader().loadAsync(asset(backdrop.src)).then(texture => {
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    textures.push(texture);
    const image = texture.image as HTMLImageElement;
    height = backdrop.width * image.height / image.width;
    if (backdrop.board) {
      // A board: the photo on its front face, plain colour round the edges and back.
      const face = new PlaneGeometry(backdrop.width, height);
      const body = new BoxGeometry(backdrop.width, height, boardDepth);
      geometries.push(face, body);
      front.map = texture;
      front.alphaTest = 0;
      front.roughness = 1;
      back.color.set(backdrop.board);
      back.side = FrontSide;
      back.alphaTest = 0;
      front.needsUpdate = back.needsUpdate = true;
      const board = new Mesh(body, back);
      board.position.set(0, height / 2, -boardDepth / 2 - .002);
      const photo = new Mesh(face, front);
      photo.position.set(0, height / 2, 0);
      for (const mesh of [board, photo]) { mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh); }
      invalidate();
      return;
    }
    // A slight wave across the panel, so it catches the light like hung fabric.
    const geometry = new PlaneGeometry(backdrop.width, height, 48, 1);
    geometries.push(geometry);
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
    /** The backdrop's height in the scene, once its photo has loaded. */
    height: () => height,
    dispose() {
      geometries.forEach(geometry => geometry.dispose());
      front.dispose();
      back.dispose();
      textures.forEach(texture => texture.dispose());
    },
  };
}
