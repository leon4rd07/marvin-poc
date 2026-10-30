import { useRef, useState } from "react";
import { portraits } from "../data/portfolio";
import { playPrinter, playShutter, playSwish } from "../lib/sounds";

export type Print = { id: number; photo: (typeof portraits)[number]; closing: boolean };

const flashMs = 650, printDelayMs = 450, closeMs = 1300;

// Pressing the selfie button fires the flash and the shutter, then a polaroid is
// pushed out of the slot in the console and slowly develops. A print can be put
// away; a new selfie puts the previous one away first.
export function useSelfie() {
  const [prints, setPrints] = useState<Print[]>([]);
  const [flash, setFlash] = useState(0);
  const counter = useRef(0);
  const timers = useRef<number[]>([]);
  const open = useRef(new Set<number>());
  function later(callback: () => void, ms: number) {
    timers.current.push(window.setTimeout(callback, ms));
  }
  function close(id: number) {
    if (!open.current.delete(id)) return;
    setPrints(list => list.map(print => print.id === id ? { ...print, closing: true } : print));
    playSwish();
    later(() => setPrints(list => list.filter(print => print.id !== id)), closeMs);
  }
  function snap() {
    const id = ++counter.current;
    setFlash(id);
    playShutter();
    later(() => setFlash(current => current === id ? 0 : current), flashMs);
    later(() => {
      [...open.current].forEach(close);
      open.current.add(id);
      setPrints(list => [...list, { id, photo: portraits[(id * 2 + 1) % portraits.length], closing: false }]);
      playPrinter();
    }, printDelayMs);
  }
  return { prints, flash, snap, close };
}
