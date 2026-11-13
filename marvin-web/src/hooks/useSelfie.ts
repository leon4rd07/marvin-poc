import { useRef, useState } from "react";
import { selfies } from "../data/portfolio";
import { playPrinter, playShutter, playSwish } from "../lib/sounds";

export type Print = { id: number; photo: (typeof selfies)[number]; closing: boolean };

// The print takes about 1.9s to come out; it then stays 3s before leaving.
const flashMs = 650, printDelayMs = 450, closeMs = 1300, ejectMs = 1900, stayMs = 3000;

// Pressing the selfie button fires the flash and the shutter, then a polaroid is
// pushed out of the slot in the console and develops. Three seconds after it is
// out it flips over and leaves by itself; a new selfie sends the previous one off.
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
      setPrints(list => [...list, { id, photo: selfies[(id - 1) % selfies.length], closing: false }]);
      playPrinter();
      later(() => close(id), ejectMs + stayMs);
    }, printDelayMs);
  }
  return { prints, flash, snap };
}
