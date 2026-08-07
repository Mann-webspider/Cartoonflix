import test from "node:test";
import assert from "node:assert/strict";
import { railsByGenre, formatRuntime } from "./api.js";

const title = (id, genres) => ({ id, title: `Title ${id}`, genres });

test("railsByGenre puts each title in exactly one rail", () => {
  // The failure this guards: catalogues tag almost everything the same way, so
  // grouping a title into every genre it carries yields several rails holding
  // an identical list.
  const catalogue = [
    ...Array.from({ length: 6 }, (_, i) => title(`m${i}`, ["Animation", "Comedy", "Musical"])),
    ...Array.from({ length: 5 }, (_, i) => title(`s${i}`, ["Animation", "Comedy", "Sci-Fi"])),
    ...Array.from({ length: 4 }, (_, i) => title(`c${i}`, ["Animation", "Comedy"])),
  ];

  const rails = railsByGenre(catalogue);
  const placements = rails.flatMap((rail) => rail.items.map((item) => item.id));

  assert.equal(placements.length, catalogue.length, "every title placed");
  assert.equal(new Set(placements).size, catalogue.length, "no title placed twice");

  // The rare genre wins over the one nearly everything shares.
  const names = rails.map((rail) => rail.title);
  assert.ok(names.includes("Musical"), `expected a Musical rail, got ${names.join(", ")}`);
  assert.ok(names.includes("Sci-Fi"), `expected a Sci-Fi rail, got ${names.join(", ")}`);
  assert.ok(!names.includes("Animation"), "the universal genre should not become a rail");
});

test("railsByGenre never emits a rail below the minimum", () => {
  const catalogue = [
    ...Array.from({ length: 5 }, (_, i) => title(`a${i}`, ["Action"])),
    title("lonely", ["Documentary"]),
    title("lonely2", ["Noir"]),
    title("lonely3", ["Noir"]),
  ];

  const rails = railsByGenre(catalogue, { minPerRail: 3 });
  for (const rail of rails) {
    assert.ok(rail.items.length >= 3, `${rail.title} has ${rail.items.length} items`);
  }
  assert.equal(rails.flatMap((r) => r.items).length, catalogue.length, "nothing dropped");
});

test("railsByGenre handles titles with no genres", () => {
  const catalogue = Array.from({ length: 4 }, (_, i) => title(`x${i}`, []));
  const rails = railsByGenre(catalogue);
  assert.equal(rails.length, 1);
  assert.equal(rails[0].items.length, 4);
});

test("formatRuntime reads as a runtime, not a number of seconds", () => {
  assert.equal(formatRuntime(0), null);
  assert.equal(formatRuntime(undefined), null);
  assert.equal(formatRuntime(90), "2m");
  assert.equal(formatRuntime(5400), "1h 30m");
  assert.equal(formatRuntime(7200), "2h 0m");
});
