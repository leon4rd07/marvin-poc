import { describe, expect, it } from "vitest";
import { createScrollMotion } from "../../src/scene/scrollMotion";

describe("scroll movement", () => {
  it("eases large wheel steps without overshooting and stops exactly at rest", () => {
    const motion = createScrollMotion(.43);
    const first = motion.step(.7, 1 / 60);
    expect(first.progress).toBeGreaterThan(.43);
    expect(first.progress).toBeLessThan(.5);
    expect(first.active).toBe(true);
    let previous = first.progress;
    for (let frame = 0; frame < 90; frame++) {
      const next = motion.step(.7, 1 / 60);
      expect(next.progress).toBeGreaterThanOrEqual(previous);
      expect(next.progress).toBeLessThanOrEqual(.7);
      previous = next.progress;
    }
    expect(motion.step(.7, 1 / 60)).toEqual({ progress: .7, active: false });
    expect(motion.step(.22, 1 / 60).progress).toBeLessThan(.7);
  });
  it("follows the same approach at 30 and 60 frames per second", () => {
    const slow = createScrollMotion(0), fast = createScrollMotion(0);
    let slowProgress = 0, fastProgress = 0;
    for (let i = 0; i < 12; i++) slowProgress = slow.step(.7, 1 / 30).progress;
    for (let i = 0; i < 24; i++) fastProgress = fast.step(.7, 1 / 60).progress;
    expect(slowProgress).toBeCloseTo(fastProgress, 8);
  });
  it("glides for longer with a larger response time", () => {
    const quick = createScrollMotion(0), soft = createScrollMotion(0, .28);
    let quickProgress = 0, softProgress = 0;
    for (let i = 0; i < 12; i++) {
      quickProgress = quick.step(1, 1 / 60).progress;
      softProgress = soft.step(1, 1 / 60).progress;
    }
    expect(softProgress).toBeGreaterThan(0);
    expect(softProgress).toBeLessThan(quickProgress);
    for (let i = 0; i < 600; i++) softProgress = soft.step(1, 1 / 60).progress;
    expect(softProgress).toBe(1);
  });
});
