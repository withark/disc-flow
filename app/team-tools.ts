export type DiscKey = "D" | "I" | "S" | "C";

export type TeamResultRecord = {
  id: number;
  name: string;
  team: string;
  d: number;
  i: number;
  s: number;
  c: number;
  dominant: string;
  secondary: string;
  pace: number;
  focus: number;
  createdAt: string;
};

export type BalancedGroup = {
  number: number;
  members: TeamResultRecord[];
  distribution: Record<DiscKey, number>;
};

const MODE_ORDER: DiscKey[] = ["D", "I", "S", "C"];
const EMPTY_DISTRIBUTION: Record<DiscKey, number> = { D: 0, I: 0, S: 0, C: 0 };

export function primaryMode(record: TeamResultRecord) {
  return (record.dominant.split("/")[0] || "D") as DiscKey;
}

export function latestUniqueRecords(records: TeamResultRecord[]) {
  const latest = new Map<string, TeamResultRecord>();
  for (const record of records) {
    const key = `${record.team.trim().toLowerCase()}::${record.name.trim().toLowerCase()}`;
    const current = latest.get(key);
    if (!current || new Date(record.createdAt).getTime() > new Date(current.createdAt).getTime()) {
      latest.set(key, record);
    }
  }
  return [...latest.values()];
}

function seededHash(value: string, seed: number) {
  let hash = 2166136261 ^ seed;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function buildBalancedGroups(records: TeamResultRecord[], requestedCount: number, seed: number) {
  if (!records.length) return [];
  const groupCount = Math.max(1, Math.min(Math.floor(requestedCount), records.length, 12));
  const groups: BalancedGroup[] = Array.from({ length: groupCount }, (_, index) => ({
    number: index + 1,
    members: [],
    distribution: { ...EMPTY_DISTRIBUTION },
  }));

  for (const mode of MODE_ORDER) {
    const bucket = records
      .filter((record) => primaryMode(record) === mode)
      .sort((a, b) => seededHash(`${a.id}:${a.name}`, seed) - seededHash(`${b.id}:${b.name}`, seed));

    for (const member of bucket) {
      const selected = [...groups].sort((a, b) => {
        const typeBalance = a.distribution[mode] - b.distribution[mode];
        if (typeBalance !== 0) return typeBalance;
        const sizeBalance = a.members.length - b.members.length;
        if (sizeBalance !== 0) return sizeBalance;
        return seededHash(`${a.number}:${member.id}`, seed) - seededHash(`${b.number}:${member.id}`, seed);
      })[0];

      selected.members.push(member);
      selected.distribution[mode] += 1;
    }
  }

  return groups;
}

export function createTeamDebrief(records: TeamResultRecord[]) {
  const distribution = records.reduce<Record<DiscKey, number>>(
    (counts, record) => {
      counts[primaryMode(record)] += 1;
      return counts;
    },
    { ...EMPTY_DISTRIBUTION },
  );
  const sortedModes = [...MODE_ORDER].sort((a, b) => distribution[b] - distribution[a]);
  const topMode = sortedModes[0];
  const missingModes = MODE_ORDER.filter((mode) => distribution[mode] === 0);
  const averagePace = records.length ? Math.round(records.reduce((sum, record) => sum + record.pace, 0) / records.length) : 0;
  const averageFocus = records.length ? Math.round(records.reduce((sum, record) => sum + record.focus, 0) / records.length) : 0;

  const modeObservation: Record<DiscKey, string> = {
    D: "빠른 판단과 실행력이 강점입니다. 결정 전에 반대 의견을 한 번 더 확인하면 실행 품질이 높아집니다.",
    I: "아이디어와 참여 에너지가 강점입니다. 대화의 결론을 담당자와 기한으로 정리하면 추진력이 살아납니다.",
    S: "협력과 안정적인 실행이 강점입니다. 변화가 필요할 때 우려와 필요한 지원을 먼저 말할 공간이 필요합니다.",
    C: "분석과 품질 관리가 강점입니다. 완벽한 정보보다 결정에 필요한 최소 기준과 시점을 합의하는 것이 중요합니다.",
  };

  const modeQuestion: Record<DiscKey, string> = {
    D: "속도를 높이는 과정에서 우리가 충분히 듣지 못한 의견은 무엇인가요?",
    I: "좋은 아이디어를 실제 행동으로 옮기기 위해 오늘 확정할 담당자와 기한은 무엇인가요?",
    S: "팀이 안전하게 변화를 시도하려면 어떤 설명과 지원이 더 필요한가요?",
    C: "결정을 내리기 전에 반드시 확인할 기준과, 과감히 생략해도 될 정보는 무엇인가요?",
  };

  const observations = records.length
    ? [
        `${topMode} 유형이 ${distribution[topMode]}명으로 가장 많아 ${modeObservation[topMode]}`,
        averagePace >= 50
          ? `팀의 빠른 속도 지향이 ${averagePace}%로, 논의보다 실행이 먼저 시작될 가능성이 있습니다.`
          : `팀의 차분한 속도 지향이 ${100 - averagePace}%로, 변화 전 충분한 합의와 준비를 선호합니다.`,
        averageFocus >= 50
          ? `사람 중심 경향이 ${averageFocus}%로, 관계와 참여가 의사결정에 큰 영향을 줍니다.`
          : `과업 중심 경향이 ${100 - averageFocus}%로, 목표와 기준이 관계보다 앞설 수 있습니다.`,
        missingModes.length
          ? `${missingModes.join("·")} 관점이 대표유형에 없습니다. 중요한 결정에서 해당 관점을 의도적으로 맡길 필요가 있습니다.`
          : "네 가지 대표유형이 모두 있어 서로 다른 관점을 활용할 기반이 갖춰져 있습니다.",
      ]
    : ["선택한 범위에 진단 결과가 없습니다."];

  const questions = records.length
    ? [
        modeQuestion[topMode],
        missingModes.length ? `${missingModes.join("·")} 관점에서 보면 현재 계획의 빈틈은 무엇인가요?` : modeQuestion[sortedModes[1]],
        "압박이 커질 때 우리 팀이 과하게 사용하는 행동과 줄어드는 행동은 각각 무엇인가요?",
        "다음 협업에서 각 유형의 강점을 살리기 위해 한 가지씩 바꿀 행동은 무엇인가요?",
      ]
    : [];

  return { distribution, topMode, missingModes, averagePace, averageFocus, observations, questions };
}
