import {
  BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SRGBColorSpace, TextureLoader,
  type BufferGeometry, type Material, type Texture,
} from "three";
import { asset } from "../lib/assets";

// A booth made for one event and wrapped in its own print (the design drawings of
// the front, both sides and the back become the panels), with the canopy, the sign
// box on the roof and the small table in front, as in the drawings.
export type BoothWrap = {
  front: string;
  back: string;
  left: string;
  right: string;
  // The sign on the front of the box on the roof.
  sign: string;
  // Colour of the unprinted parts (sign box sides).
  color: string;
};

// Proportions follow the drawings; scaled to about the size of the Marvin booth.
const width = 3.7, height = 2.96, depth = 2.2;

export function buildWrappedBooth(wrap: BoothWrap, invalidate: () => void) {
  const root = new Group();
  root.name = "Wrapped event booth";
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const textures: Texture[] = [];
  const loader = new TextureLoader();
  const keep = <T extends BufferGeometry>(geometry: T) => { geometries.push(geometry); return geometry; };
  const material = (options: ConstructorParameters<typeof MeshStandardMaterial>[0]) => {
    const created = new MeshStandardMaterial(options);
    materials.push(created);
    return created;
  };
  const printed = (src: string) => {
    const surface = material({ color: "#ffffff", roughness: .6 });
    const load = loader.loadAsync(asset(src)).then(texture => {
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 4;
      textures.push(texture);
      surface.map = texture;
      surface.needsUpdate = true;
      invalidate();
    });
    return { surface, load };
  };
  const add = (mesh: Mesh) => { mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh); return mesh; };
  const metal = material({ color: "#c9ced3", metalness: .6, roughness: .35 });
  const top = material({ color: "#b8bec4", roughness: .5 });
  const panel = material({ color: wrap.color, roughness: .6 });

  const front = printed(wrap.front), back = printed(wrap.back), left = printed(wrap.left), right = printed(wrap.right);
  const sign = printed(wrap.sign);
  // Box faces: +x (right side), -x (left side), top, bottom, +z (front), -z (back).
  const body = add(new Mesh(keep(new BoxGeometry(width, height, depth)),
    [right.surface, left.surface, top, top, front.surface, back.surface]));
  body.position.y = height / 2;

  // The canopy over the front, just under the roof line.
  const canopy = add(new Mesh(keep(new BoxGeometry(width + .08, .07, .42)), metal));
  canopy.position.set(0, height * .87, depth / 2 + .2);
  canopy.rotation.x = .06;

  // The sign box on the roof, a little back from the front, with two posts on top.
  const boxWidth = width * .44, boxHeight = height * .11, boxDepth = depth * .14;
  const signBox = add(new Mesh(keep(new BoxGeometry(boxWidth, boxHeight, boxDepth)),
    [panel, panel, panel, panel, sign.surface, panel]));
  signBox.position.set(-width * .015, height + boxHeight / 2, depth / 2 - depth * .2);
  for (const side of [-1, 1]) {
    const post = add(new Mesh(keep(new CylinderGeometry(.045, .045, .08, 14)), metal));
    post.position.set(signBox.position.x + side * boxWidth * .36, height + boxHeight + .04, signBox.position.z);
  }

  // The small table in front, at the left, on four slim legs.
  const tableWidth = width * .4, tableDepth = .42, tableHeight = height * .37;
  const tableX = -width / 2 + width * .025 + tableWidth / 2, tableZ = depth / 2 + tableDepth / 2;
  const tableTop = add(new Mesh(keep(new BoxGeometry(tableWidth, .06, tableDepth)), material({ color: "#eef0f2", roughness: .4 })));
  tableTop.position.set(tableX, tableHeight, tableZ);
  const leg = keep(new CylinderGeometry(.025, .025, tableHeight, 10));
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const piece = add(new Mesh(leg, metal));
    piece.position.set(tableX + x * (tableWidth / 2 - .06), tableHeight / 2, tableZ + z * (tableDepth / 2 - .05));
  }

  const ready = Promise.all([front.load, back.load, left.load, right.load, sign.load]).then(() => undefined);
  return {
    root,
    ready,
    // There is no curtain: the door is part of the print.
    setCurtain() {},
    dispose() {
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(item => item.dispose());
      textures.forEach(texture => texture.dispose());
    },
  };
}
