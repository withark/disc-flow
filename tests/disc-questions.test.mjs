import assert from "node:assert/strict";
import test from "node:test";
import {
  FINAL_TIE_BREAK_QUESTION,
  QUESTIONS,
  TIE_BREAK_QUESTIONS,
} from "../app/disc-questions.ts";

test("keeps the DISC question set structurally balanced", () => {
  const modeCounts = { D: 0, I: 0, S: 0, C: 0 };
  const pairCounts = new Map();

  for (const question of QUESTIONS) {
    assert.notEqual(question.a.mode, question.b.mode);
    assert.match(question.context, /\?$/);
    assert.ok(question.a.text.length >= 12);
    assert.ok(question.b.text.length >= 12);
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

test("mixes universal work situations with a small set of everyday situations", () => {
  const everydayMarkers = ["아는 사람이 거의 없는 모임", "단체 대화방", "함께 쓰는 공간", "야외 모임"];
  const everydayQuestions = QUESTIONS.filter((question) =>
    everydayMarkers.some((marker) => question.context.includes(marker)),
  );

  assert.equal(everydayQuestions.length, 4);
});

test("provides realistic tie-break situations for every DISC mode", () => {
  assert.equal(TIE_BREAK_QUESTIONS.length, 3);

  for (const question of [...TIE_BREAK_QUESTIONS, FINAL_TIE_BREAK_QUESTION]) {
    assert.ok(question.context.length > 15);
    assert.deepEqual(Object.keys(question.options), ["D", "I", "S", "C"]);
    for (const option of Object.values(question.options)) assert.ok(option.length > 8);
  }
});
