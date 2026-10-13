import { describe, expect, it } from "vitest";
import { computeLevel, levelThresholds, XP_PER_LEVEL } from "./compute-level";

describe("computeLevel", () => {
  it("returns level 1 at the lower bound of 0xp", () => {
    expect(computeLevel(0)).toBe(1);
  });

  it("returns level 1 just below the next threshold", () => {
    expect(computeLevel(24)).toBe(1);
  });

  it("returns level 2 exactly at the 25xp boundary", () => {
    expect(computeLevel(25)).toBe(2);
  });

  it("returns level 2 just below the next threshold", () => {
    expect(computeLevel(49)).toBe(2);
  });

  it("returns level 3 exactly at the 50xp boundary", () => {
    expect(computeLevel(50)).toBe(3);
  });

  it("clamps negative xp to level 1", () => {
    expect(computeLevel(-10)).toBe(1);
  });

  it("computes a high level for large xp", () => {
    expect(computeLevel(1000)).toBe(41);
  });

  it("XP_PER_LEVEL is 25", () => {
    expect(XP_PER_LEVEL).toBe(25);
  });
});

describe("levelThresholds", () => {
  it("returns the range for level 1", () => {
    expect(levelThresholds(1)).toEqual({ prev: 0, next: 25 });
  });

  it("returns the range for level 2", () => {
    expect(levelThresholds(2)).toEqual({ prev: 25, next: 50 });
  });

  it("clamps prev to 0 for the defensive level 0 case", () => {
    expect(levelThresholds(0)).toEqual({ prev: 0, next: 0 });
  });
});
