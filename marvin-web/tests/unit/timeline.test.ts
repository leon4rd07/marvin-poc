import { describe, expect, it } from "vitest";
import { cameraPose, createSceneProgress, portal, portalView, timeline, wrap } from "../../src/lib/timeline";

describe("3D entrance choreography", () => {
  it("opens the curtain and advances the camera together without an open-door pause", () => {
    // Straight on, slightly above the booth's middle.
    const first = cameraPose(0, 9);
    expect(first.lookX).toBe(0);
    expect(first.x).toBe(0);
    expect(first.y).toBeGreaterThan(first.lookY);
    for (const progress of [.08, .22, .36, .42]) {
      expect(cameraPose(progress, 9).z).toBeLessThan(first.z);
      expect(timeline(progress).curtain).toBeGreaterThan(0);
      expect(timeline(progress).travel).toBeGreaterThan(0);
    }
    expect(timeline(.285).curtain).toBeCloseTo(.5);
    expect(timeline(.60).curtain).toBe(1);
  });
  it("aligns with the clear doorway before crossing its front plane", () => {
    for (let progress = .02; progress <= 1; progress += .005) {
      const view = cameraPose(progress, 9);
      if (view.z < .9) {
        expect(view.y).toBeCloseTo(view.lookY, 5);
        expect(view.lookX).toBeCloseTo(view.x, 5);
        expect(view.x).toBeCloseTo(.94);
        expect(timeline(progress).curtain).toBeGreaterThan(.9);
      }
    }
  });
  it("is one continuous zoom that never backs up", () => {
    let previous = cameraPose(0, 9).z;
    for (let step = 1; step <= 200; step++) {
      const z = cameraPose(step / 200, 9).z;
      expect(z).toBeLessThanOrEqual(previous);
      previous = z;
    }
    expect(cameraPose(1, 9).z).toBeCloseTo(portal.endZ);
  });
  it("holds and reverses the exact same poses without elapsed time", () => {
    for (const progress of [0, .22, .4, .6, .78]) {
      const before = timeline(progress);
      timeline(1);
      expect(timeline(progress)).toEqual(before);
    }
  });
  it("locks the portfolio page to the doorway and lands it at full size", () => {
    const host = 800;
    const end = portalView(cameraPose(1, 9), host);
    expect(end.scale).toBeCloseTo(1);
    expect(end.x).toBeCloseTo(0);
    expect(end.y).toBeCloseTo(0);
    let previous = 0;
    for (let step = 0; step <= 100; step++) {
      const { scale } = portalView(cameraPose(step / 100, 9), host);
      expect(scale).toBeGreaterThanOrEqual(previous);
      previous = scale;
    }
  });
  it("bounds invalid input and becomes interactive only at the end", () => {
    for (const value of [-1, NaN, Infinity]) expect(timeline(value).progress).toBe(0);
    expect(timeline(2).progress).toBe(1);
    expect(timeline(.56).monitor).toBe(0);
    expect(timeline(.999).interactive).toBe(false);
    expect(timeline(1).interactive).toBe(true);
    expect(timeline(1).monitor).toBe(1);
  });
  it("notifies subscribers only for changed poses and cleans up", () => {
    const progress = createSceneProgress();
    const values: number[] = [];
    const unsubscribe = progress.subscribe(value => values.push(value));
    progress.set(.5); progress.set(.5); progress.set(.2);
    unsubscribe(); progress.set(.8);
    expect(values).toEqual([.5, .2]);
    expect(progress.get()).toBe(.8);
  });
  it("wraps collection navigation", () => {
    expect(wrap(-1, 3)).toBe(2);
    expect(wrap(3, 3)).toBe(0);
  });
});

describe("narrow screens", () => {
  // Depth from the back wall at which a view of this aspect shows nothing but the wall.
  const wallOnly = (aspect: number) => .63 / (Math.tan(17 * Math.PI / 180) * aspect);
  const wallShare = (aspect: number, distance: number) => {
    let steps = 0;
    for (let step = 0; step <= 1000; step++) {
      if (cameraPose(step / 1000, distance, aspect).z - portal.backZ < wallOnly(aspect)) steps++;
    }
    return steps / 1001;
  };
  it("does not linger on the plain back wall on a phone", () => {
    // Phone in portrait: the camera starts far back, and the view is very slim.
    expect(wallShare(.46, 16)).toBeLessThan(.13);
    expect(cameraPose(1, 16, .46).z).toBeCloseTo(portal.endZ);
  });
  it("keeps the laptop walk-in as it was", () => {
    for (let step = 0; step <= 100; step++) {
      expect(cameraPose(step / 100, 6.7, 1.6).z).toBeCloseTo(cameraPose(step / 100, 6.7).z, 6);
    }
  });
  it("stays one continuous zoom on any screen", () => {
    for (const aspect of [.4, .46, .75, 1, 1.33]) {
      let previous = Infinity;
      for (let step = 0; step <= 400; step++) {
        const z = cameraPose(step / 400, 12, aspect).z;
        expect(z).toBeLessThanOrEqual(previous + 1e-9);
        previous = z;
      }
    }
  });
});
