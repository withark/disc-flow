import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeDiscScores,
  countTieBreakVotes,
  findSecondaryMode,
  findTieBreakLeaders,
} from "../app/disc-results.ts";

test("keeps a single highest score as the primary type", () => {
  const result = analyzeDiscScores({ D: 9, I: 7, S: 5, C: 3 });

  assert.equal(result.kind, "single");
  assert.deepEqual(result.dominantModes, ["D"]);
  assert.equal(result.secondaryMode, "I");
});

test("identifies all raw-score leaders before tie resolution", () => {
  const result = analyzeDiscScores({ D: 8, I: 8, S: 5, C: 3 });

  assert.equal(result.kind, "dual");
  assert.deepEqual(result.dominantModes, ["D", "I"]);
});

test("uses three situational choices to resolve a tied highest score", () => {
  const candidates = ["D", "I"];
  const votes = countTieBreakVotes(candidates, ["D", "I", "D"]);

  assert.deepEqual(votes, { D: 2, I: 1, S: 0, C: 0 });
  assert.deepEqual(findTieBreakLeaders(candidates, votes), ["D"]);
});

test("requests one final choice when situational choices remain tied", () => {
  const candidates = ["D", "I", "S"];
  const votes = countTieBreakVotes(candidates, ["D", "I", "S"]);

  assert.deepEqual(findTieBreakLeaders(candidates, votes), candidates);
});

test("selects the next highest raw score as secondary after a tie is resolved", () => {
  const analysis = analyzeDiscScores({ D: 8, I: 8, S: 5, C: 3 });

  assert.equal(findSecondaryMode(analysis, "I"), "D");
});
