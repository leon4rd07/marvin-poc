import { useRef, useState } from "react";
import { portraits } from "../data/portfolio";

export type Print = { id: number; photo: (typeof portraits)[number] };

// Pressing the selfie button fires the shutter, then a print feeds out of the
// slot in the console. The previous print drops away when a new one starts.
export function useSelfie() {
  const [prints, setPrints] = useState<Print[]>([]);
  const [flash, setFlash] = useState(0);
  const counter = useRef(0);
  function snap() {
    const id = ++counter.current;
    setFlash(id);
    window.setTimeout(() => {
      setPrints(list => [...list.slice(-1), { id, photo: portraits[(id * 2 + 1) % portraits.length] }]);
    }, 260);
  }
  return { prints, flash, snap };
}
