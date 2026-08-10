import test from "node:test";
import assert from "node:assert/strict";
import { cost, bestCandidate } from "./spatial.js";

/** A rectangle, written the way a layout is read: position then size. */
const box = (left, top, width, height) => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
});

const named = (name, rect) => ({ name, rect });

test("a candidate that does not lie in the direction of travel is rejected", () => {
  const from = box(500, 500, 100, 60);

  assert.equal(cost(from, box(200, 500, 100, 60), "right"), null);
  assert.equal(cost(from, box(800, 500, 100, 60), "left"), null);
  assert.equal(cost(from, box(500, 200, 100, 60), "down"), null);
  assert.equal(cost(from, box(500, 800, 100, 60), "up"), null);

  // An element sitting exactly on top of this one is not "somewhere to go".
  // Without this the first overlapping node wins every press and focus sticks.
  assert.equal(cost(from, box(500, 500, 100, 60), "right"), null);
});

test("moving along a rail reaches the next card, not the nearer row below", () => {
  // The failure this rules out: the card below is closer by straight-line
  // distance, so a plain nearest-neighbour search leaves the row on every
  // press and the rail becomes impossible to scan with a thumb.
  const current = box(100, 300, 264, 200);
  const items = [
    named("next in row", box(380, 300, 264, 200)),
    named("row below", box(100, 520, 264, 200)),
  ];

  assert.equal(bestCandidate(current, items, "right").name, "next in row");
  assert.equal(bestCandidate(current, items, "down").name, "row below");
});

test("the nearest aligned neighbour wins over a closer misaligned one", () => {
  const current = box(0, 0, 100, 100);
  const items = [
    // Slightly further along, but on the same line.
    named("aligned", box(200, 0, 100, 100)),
    // Nearer, but well off the axis of travel.
    named("drifted", box(160, 260, 100, 100)),
  ];

  assert.equal(bestCandidate(current, items, "right").name, "aligned");
});

test("nothing in that direction returns null so the key is left alone", () => {
  // This is what lets the page scroll normally at the end of a list rather
  // than the remote appearing to stop responding.
  const current = box(0, 0, 100, 100);
  assert.equal(bestCandidate(current, [named("behind", box(0, 400, 100, 100))], "up"), null);
  assert.equal(bestCandidate(current, [], "down"), null);
});

test("a tall neighbour is not punished for its height", () => {
  // Measuring centre to centre would make the billboard look far away purely
  // because it is large, and focus would skip past it to something smaller.
  const current = box(0, 700, 100, 40);
  const items = [
    named("tall banner", box(0, 100, 900, 560)),
    named("small distant", box(600, 300, 60, 40)),
  ];

  assert.equal(bestCandidate(current, items, "up").name, "tall banner");
});

test("distance still decides between two equally aligned candidates", () => {
  const current = box(0, 0, 100, 100);
  const items = [named("far", box(600, 0, 100, 100)), named("near", box(200, 0, 100, 100))];

  assert.equal(bestCandidate(current, items, "right").name, "near");
});
