import { useRef, useState } from "react";
import { portraits } from "../data/portfolio";

export type Print = { id: number; photo: (typeof portraits)[number]; tilt: number };
const keep = 3;

export function useSelfie() {
  const [prints, setPrints] = useState<Print[]>([]);
  const [flash, setFlash] = useState(0);
  const counter = useRef(0);
  function snap() {
    const id = ++counter.current;
    setFlash(id);
    // The shutter fires first, then the printer starts.
    window.setTimeout(() => {
      const tilt = [-4, 3, -2, 5, -3][id % 5];
      setPrints(list => [...list.slice(-(keep - 1)), { id, photo: portraits[(id * 2 + 1) % portraits.length], tilt }]);
    }, 260);
  }
  return { prints, flash, snap };
}
