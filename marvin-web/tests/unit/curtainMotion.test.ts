import { describe, expect, it } from "vitest";
import { createCurtainMotion, createHandMotion, curtainDrop, curtainVertex } from "../../src/scene/curtainMotion";

describe("soft curtain", () => {
  it("pins the rail but allows the free hem to move", () => {
    for (const u of [0, .25, .5, .75, 1]) {
      expect(curtainVertex(u, 0, .5, .1)).toEqual(curtainVertex(u, 0, .5, 0));
    }
    expect(curtainVertex(.7, 1, .5, .1).x).not.toBe(curtainVertex(.7, 1, .5).x);
  });
  it("responds to movement, reverses, and comes to an exact rest", () => {
    const motion = createCurtainMotion(0);
    expect(motion.step(0, 1 / 60).active).toBe(false);
    expect(motion.step(.5, 1 / 60).displacement).toBeGreaterThan(0);
    for (let i = 0; i < 160; i++) motion.step(.5, 1 / 60);
    expect(motion.step(.5, 1 / 60)).toEqual({ displacement: 0, active: false });
    expect(motion.step(0, 1 / 60).displacement).toBeLessThan(0);
  });
  it("keeps a gathered curtain clear of the camera, even during settling", () => {
    for (let u = 0; u <= 1; u += .025) {
      for (let v = 0; v <= 1; v += .025) {
        for (const sway of [-.13, 0, .13]) {
          const point = curtainVertex(u, v, 1, sway);
          expect(point.x).toBeLessThan(.74);
          expect(point.y).toBeGreaterThan(.15);
        }
      }
    }
  });
  it("has consistent damping at 30 and 120 fps and bounds suspension jumps", () => {
    const simulate = (fps: number) => {
      const motion = createCurtainMotion(0);
      let result = motion.step(.7, 1 / fps);
      for (let i = 1; i < fps / 2; i++) result = motion.step(.7, 1 / fps);
      return result.displacement;
    };
    expect(simulate(30)).toBeCloseTo(simulate(120), 6);
    const motion = createCurtainMotion(0);
    expect(Math.abs(motion.step(1, 60).displacement)).toBeLessThanOrEqual(.13);
  });
  it("adds a slow breeze at rest while pinning the rail and keeping the doorway clear", () => {
    const hemStart = curtainVertex(.8, 1, 0, 0, 0);
    expect(curtainVertex(.8, 1, 0, 0, 3).z).not.toBeCloseTo(hemStart.z, 3);
    for (let time = 0; time < 24; time += .5) {
      for (const u of [0, .25, .5, .75, 1]) {
        expect(curtainVertex(u, 0, 0, 0, time)).toEqual(curtainVertex(u, 0, 0, 0, 0));
        expect(curtainVertex(u, 1, 1, .13, time).x).toBeLessThan(.74);
      }
      const current = curtainVertex(.8, 1, 0, 0, time);
      const next = curtainVertex(.8, 1, 0, 0, time + 1 / 30);
      expect(Math.abs(next.x - current.x)).toBeLessThan(.001);
      expect(Math.abs(next.z - current.z)).toBeLessThan(.001);
    }
  });

  it("hangs lower than half the doorway and stays clear of the floor", () => {
    expect(curtainDrop).toBeGreaterThan(2.77 / 2);
    expect(curtainVertex(.5, 1, 0).y).toBeGreaterThan(.15);
  });
  it("is pushed back and swings under a hand, then settles once it leaves", () => {
    const resting = curtainVertex(.5, .6, 0);
    const pressed = curtainVertex(.5, .6, 0, 0, 0, { u: .5, v: .6, press: 1, drag: 0 });
    expect(pressed.z).toBeLessThan(resting.z - .05);
    // Far from the hand the cloth is untouched, and the rail never moves.
    expect(curtainVertex(.05, .6, 0, 0, 0, { u: .95, v: .6, press: 1, drag: 0 }).z).toBeCloseTo(curtainVertex(.05, .6, 0).z, 3);
    expect(curtainVertex(.5, 0, 0, 0, 0, { u: .5, v: 0, press: 1, drag: .4 })).toEqual(curtainVertex(.5, 0, 0));
    const hand = createHandMotion();
    for (let step = 0; step < 10; step++) { hand.touch(.3 + step * .04, .5); hand.step(1 / 60); }
    expect(hand.step(1 / 60).active).toBe(true);
    hand.leave();
    let state = hand.step(1 / 60);
    for (let frame = 0; frame < 600 && state.active; frame++) state = hand.step(1 / 60);
    expect(state.active).toBe(false);
    expect(state.press).toBe(0);
  });
});
