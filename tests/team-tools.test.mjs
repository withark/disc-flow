import assert from "node:assert/strict";
import test from "node:test";
import { buildBalancedGroups, createTeamDebrief, latestUniqueRecords } from "../app/team-tools.ts";

function record(id, dominant, name = `참여자${id}`, createdAt = "2026-07-14T10:00:00.000Z") {
  return {
    id,
    name,
    team: "테스트팀",
    d: dominant === "D" ? 12 : 4,
    i: dominant === "I" ? 12 : 4,
    s: dominant === "S" ? 12 : 4,
    c: dominant === "C" ? 12 : 4,
    dominant,
    secondary: "D",
    pace: 50,
    focus: 50,
    createdAt,
  };
}

test("keeps only the latest result per participant and team", () => {
  const rows = [
    record(1, "D", "김진단", "2026-07-14T09:00:00.000Z"),
    record(2, "S", "김진단", "2026-07-14T11:00:00.000Z"),
    record(3, "I", "이협업"),
  ];
  const latest = latestUniqueRecords(rows);
  assert.equal(latest.length, 2);
  assert.equal(latest.find((row) => row.name === "김진단")?.dominant, "S");
});

test("spreads DISC types evenly across groups", () => {
  const rows = ["D", "D", "I", "I", "S", "S", "C", "C"].map((mode, index) => record(index + 1, mode));
  const groups = buildBalancedGroups(rows, 2, 3);
  assert.deepEqual(groups.map((group) => group.members.length), [4, 4]);
  assert.deepEqual(groups.map((group) => group.distribution), [
    { D: 1, I: 1, S: 1, C: 1 },
    { D: 1, I: 1, S: 1, C: 1 },
  ]);
});

test("uses tied profiles flexibly when balancing groups", () => {
  const rows = [record(1, "D/I"), record(2, "D/I"), record(3, "S"), record(4, "C")];
  const groups = buildBalancedGroups(rows, 2, 5);

  assert.deepEqual(groups.map((group) => group.members.length), [2, 2]);
  for (const group of groups) {
    for (const member of group.members) {
      const assignedMode = group.memberModes[member.id];
      assert.ok(member.dominant.split("/").includes(assignedMode));
    }
  }
});

test("creates debrief observations and questions", () => {
  const rows = [record(1, "D"), record(2, "D"), record(3, "I")];
  const debrief = createTeamDebrief(rows);
  assert.equal(debrief.topMode, "D");
  assert.deepEqual(debrief.topModes, ["D"]);
  assert.ok(debrief.missingModes.includes("S"));
  assert.equal(debrief.questions.length, 4);
});
