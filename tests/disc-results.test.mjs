import assert from "node:assert/strict";
import test from "node:test";
import { analyzeDiscScores } from "../app/disc-results.ts";

test("keeps a single highest score as the primary type", () => {
  const result = analyzeDiscScores({ D: 9, I: 7, S: 5, C: 3 });

  assert.equal(result.kind, "single");
  assert.deepEqual(result.dominantModes, ["D"]);
  assert.equal(result.secondaryMode, "I");
});

test("treats two equal highest scores as joint primary types", () => {
  const result = analyzeDiscScores({ D: 8, I: 8, S: 5, C: 3 });

  assert.equal(result.kind, "dual");
  assert.deepEqual(result.dominantModes, ["D", "I"]);
  assert.equal(result.secondaryMode, "S");
});

test("treats three or four equal highest scores as balanced profiles", () => {
  const threeWay = analyzeDiscScores({ D: 7, I: 7, S: 7, C: 3 });
  const fourWay = analyzeDiscScores({ D: 6, I: 6, S: 6, C: 6 });

  assert.equal(threeWay.kind, "balanced");
  assert.deepEqual(threeWay.dominantModes, ["D", "I", "S"]);
  assert.equal(threeWay.secondaryMode, "C");
  assert.equal(fourWay.kind, "balanced");
  assert.deepEqual(fourWay.dominantModes, ["D", "I", "S", "C"]);
  assert.equal(fourWay.secondaryMode, null);
  assert.deepEqual(fourWay.coordinates, { pace: 50, focus: 50 });
});
