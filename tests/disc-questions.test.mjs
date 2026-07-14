import assert from "node:assert/strict";
import test from "node:test";
import { QUESTIONS } from "../app/disc-questions.ts";

test("keeps the DISC question set structurally balanced", () => {
  const modeCounts = { D: 0, I: 0, S: 0, C: 0 };
  const pairCounts = new Map();

  for (const question of QUESTIONS) {
    assert.notEqual(question.a.mode, question.b.mode);
    modeCounts[question.a.mode] += 1;
    modeCounts[question.b.mode] += 1;
    const pair = [question.a.mode, question.b.mode].sort().join("");
    pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + 1);
  }

  assert.equal(QUESTIONS.length, 24);
  assert.deepEqual(modeCounts, { D: 12, I: 12, S: 12, C: 12 });
  assert.deepEqual(Object.fromEntries([...pairCounts].sort()), {
    CD: 4,
    CI: 4,
    CS: 4,
    DI: 4,
    DS: 4,
    IS: 4,
  });
  assert.equal(new Set(QUESTIONS.map((question) => question.context)).size, QUESTIONS.length);
});
