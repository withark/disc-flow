import type { DiscKey } from "./disc-questions";

export type DiscScores = Record<DiscKey, number>;

export type DiscResultAnalysis = {
  scores: DiscScores;
  rankedModes: DiscKey[];
  dominantModes: DiscKey[];
  primaryMode: DiscKey;
  secondaryMode: DiscKey | null;
  kind: "single" | "dual" | "balanced";
  coordinates: { pace: number; focus: number };
};

export const DISC_MODE_ORDER: DiscKey[] = ["D", "I", "S", "C"];
export const EMPTY_DISC_SCORES: DiscScores = { D: 0, I: 0, S: 0, C: 0 };

export function calculateDiscScores(answers: Record<number, DiscKey>) {
  return Object.values(answers).reduce<DiscScores>(
    (scores, mode) => ({ ...scores, [mode]: scores[mode] + 1 }),
    { ...EMPTY_DISC_SCORES },
  );
}

export function analyzeDiscScores(scores: DiscScores): DiscResultAnalysis {
  const rankedModes = [...DISC_MODE_ORDER].sort((a, b) => scores[b] - scores[a]);
  const maxScore = Math.max(...Object.values(scores));
  const dominantModes = rankedModes.filter((mode) => scores[mode] === maxScore);
  const secondaryMode = rankedModes.find((mode) => !dominantModes.includes(mode)) ?? null;
  const total = Math.max(1, Object.values(scores).reduce((sum, value) => sum + value, 0));

  return {
    scores,
    rankedModes,
    dominantModes,
    primaryMode: rankedModes[0],
    secondaryMode,
    kind: dominantModes.length === 1 ? "single" : dominantModes.length === 2 ? "dual" : "balanced",
    coordinates: {
      pace: Math.round(((scores.D + scores.I) / total) * 100),
      focus: Math.round(((scores.I + scores.S) / total) * 100),
    },
  };
}

export function analyzeDiscAnswers(answers: Record<number, DiscKey>) {
  return analyzeDiscScores(calculateDiscScores(answers));
}
