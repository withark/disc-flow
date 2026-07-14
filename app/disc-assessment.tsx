"use client";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  ClipboardList,
  Download,
  FileSpreadsheet,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  MessageSquareText,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  ShieldCheck,
  Shuffle,
  Users,
  UsersRound,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  buildBalancedGroups,
  createTeamDebrief,
  latestUniqueRecords,
  primaryMode,
  type TeamResultRecord,
} from "./team-tools";

type DiscKey = "D" | "I" | "S" | "C";
type View = "info" | "quiz" | "result" | "admin";
type AdminTab = "overview" | "groups" | "debrief";
type Scores = Record<DiscKey, number>;

type Question = {
  context: string;
  a: { mode: DiscKey; text: string };
  b: { mode: DiscKey; text: string };
};

type ResultRecord = TeamResultRecord;

const DEFAULT_SHEET_API = "https://script.google.com/macros/s/AKfycbzCNlntJyIgl-JZ1ClaPfuhAiH93BQZsh756VPqf916mUyAhRE0gUjY41WSsy11yVJH/exec";

function validSheetApi(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "script.google.com" && url.pathname.endsWith("/exec");
  } catch {
    return false;
  }
}

function loadSheetResults(sheetApi: string, adminPassword: string) {
  return new Promise<ResultRecord[]>((resolve, reject) => {
    const callbackName = `discFlowSheet_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => finish(new Error("Google Sheets 응답 시간이 초과되었습니다.")), 15000);

    function cleanup() {
      window.clearTimeout(timeout);
      script.remove();
      delete (window as unknown as Record<string, unknown>)[callbackName];
    }

    function finish(error?: Error, results?: ResultRecord[]) {
      cleanup();
      if (error) reject(error);
      else resolve(results ?? []);
    }

    (window as unknown as Record<string, unknown>)[callbackName] = (payload: {
      ok?: boolean;
      results?: ResultRecord[];
      error?: string;
    }) => {
      if (!payload.ok) finish(new Error(payload.error || "Google Sheets 데이터를 불러오지 못했습니다."));
      else finish(undefined, payload.results ?? []);
    };

    const url = new URL(sheetApi);
    url.searchParams.set("action", "list");
    url.searchParams.set("adminPassword", adminPassword);
    url.searchParams.set("callback", callbackName);
    script.src = url.toString();
    script.onerror = () => finish(new Error("Google Sheets 연결에 실패했습니다."));
    document.head.appendChild(script);
  });
}

const MODE_ORDER: DiscKey[] = ["D", "I", "S", "C"];

const MODES: Record<
  DiscKey,
  {
    name: string;
    title: string;
    color: string;
    soft: string;
    summary: string;
    strength: string;
    watch: string;
    communication: string;
  }
> = {
  D: {
    name: "주도형",
    title: "빠르게 방향을 정하는 추진자",
    color: "#e64b3c",
    soft: "#fff0ed",
    summary: "목표와 결과를 중심으로 빠르게 판단하고, 어려운 상황에서도 주도권을 잡는 편입니다.",
    strength: "결단력, 도전 정신, 실행 속도, 문제 해결",
    watch: "속도를 내는 과정에서 다른 사람의 의견이나 세부 절차를 놓칠 수 있습니다.",
    communication: "핵심과 기대 결과를 먼저 말하고 선택지를 간결하게 제시해 보세요.",
  },
  I: {
    name: "사교형",
    title: "사람을 움직이는 긍정적 연결자",
    color: "#f2ad17",
    soft: "#fff7de",
    summary: "관계와 분위기를 살리며 아이디어를 공유하고, 설득과 상호작용에서 에너지를 얻습니다.",
    strength: "표현력, 낙관성, 설득력, 관계 형성",
    watch: "흥미로운 가능성에 집중하다 일정이나 세부 실행을 놓칠 수 있습니다.",
    communication: "아이디어를 충분히 나눈 뒤 담당자와 기한을 명확히 정리해 보세요.",
  },
  S: {
    name: "안정형",
    title: "신뢰를 만드는 차분한 지원자",
    color: "#2f9d78",
    soft: "#eaf8f2",
    summary: "일관성과 협력을 중요하게 여기며, 주변을 세심하게 지원하고 안정적인 흐름을 만듭니다.",
    strength: "경청, 인내, 협력, 꾸준함",
    watch: "갑작스러운 변화나 갈등을 피하다 필요한 의견 표현이 늦어질 수 있습니다.",
    communication: "변화의 이유와 단계를 확인하고, 필요한 지원을 구체적으로 요청해 보세요.",
  },
  C: {
    name: "신중형",
    title: "기준을 세우는 정밀한 분석가",
    color: "#3e6fb6",
    soft: "#edf3fc",
    summary: "정확성과 논리를 바탕으로 충분히 검토하며, 높은 품질과 명확한 기준을 추구합니다.",
    strength: "분석력, 정확성, 체계성, 품질 관리",
    watch: "완성도를 높이려다 결정과 실행이 늦어지거나 표현이 지나치게 신중해질 수 있습니다.",
    communication: "판단 기준과 근거를 공유하되, 결정에 필요한 최소 정보와 기한을 정해 보세요.",
  },
};

const QUESTIONS: Question[] = [
  { context: "새로운 일을 시작할 때", a: { mode: "D", text: "먼저 목표를 정하고 바로 움직인다" }, b: { mode: "I", text: "사람들과 아이디어를 나누며 분위기를 띄운다" } },
  { context: "업무를 진행할 때", a: { mode: "S", text: "익숙한 흐름을 유지하며 차분히 이어간다" }, b: { mode: "C", text: "기준과 절차를 확인한 뒤 정확히 처리한다" } },
  { context: "예상 밖의 문제가 생기면", a: { mode: "S", text: "주변을 살피며 모두가 편한 해법을 찾는다" }, b: { mode: "D", text: "핵심 문제를 짚고 빠르게 결정을 내린다" } },
  { context: "회의에서 나는", a: { mode: "I", text: "떠오른 생각을 활발하게 제안한다" }, b: { mode: "C", text: "자료와 근거가 충분한지 먼저 살핀다" } },
  { context: "중요한 결정을 앞두면", a: { mode: "C", text: "가능한 위험과 세부 조건을 검토한다" }, b: { mode: "D", text: "가장 효과적인 선택을 빠르게 확정한다" } },
  { context: "동료와 함께 일할 때", a: { mode: "I", text: "대화를 자주 나누며 활력을 더한다" }, b: { mode: "S", text: "필요한 부분을 묵묵히 챙기고 지원한다" } },
  { context: "목표가 높게 주어지면", a: { mode: "I", text: "사람들의 참여와 기대감을 끌어낸다" }, b: { mode: "D", text: "도전으로 받아들이고 성과를 밀어붙인다" } },
  { context: "반복되는 업무에서는", a: { mode: "C", text: "오류 없이 정확하게 완성하는 데 집중한다" }, b: { mode: "S", text: "일정한 리듬으로 꾸준히 책임을 다한다" } },
  { context: "갈등이 생겼을 때", a: { mode: "D", text: "내 입장과 원하는 결과를 분명히 말한다" }, b: { mode: "S", text: "상대의 마음을 듣고 관계를 안정시킨다" } },
  { context: "설명을 들을 때", a: { mode: "C", text: "구체적인 수치와 논리적 근거가 중요하다" }, b: { mode: "I", text: "큰 그림과 흥미로운 가능성이 중요하다" } },
  { context: "시간이 부족하면", a: { mode: "D", text: "우선순위를 과감히 정하고 실행한다" }, b: { mode: "C", text: "실수를 줄이기 위해 핵심 항목을 재확인한다" } },
  { context: "낯선 사람들과 있을 때", a: { mode: "S", text: "먼저 분위기를 살피고 천천히 가까워진다" }, b: { mode: "I", text: "자연스럽게 대화를 시작하고 관계를 넓힌다" } },
  { context: "팀의 방향이 불분명하면", a: { mode: "D", text: "내가 먼저 방향과 다음 행동을 제시한다" }, b: { mode: "I", text: "다양한 의견을 끌어내며 가능성을 넓힌다" } },
  { context: "변화가 필요하다는 말을 들으면", a: { mode: "S", text: "무엇이 얼마나 달라지는지 단계부터 확인한다" }, b: { mode: "C", text: "변화의 근거와 예상 결과를 분석한다" } },
  { context: "누군가 도움이 필요해 보이면", a: { mode: "S", text: "부담을 주지 않도록 조용히 필요한 것을 돕는다" }, b: { mode: "D", text: "문제 해결에 필요한 행동을 직접 제안한다" } },
  { context: "아이디어를 평가할 때", a: { mode: "I", text: "사람들이 얼마나 흥미를 느낄지 본다" }, b: { mode: "C", text: "현실성과 논리적 빈틈이 없는지 본다" } },
  { context: "성과를 높이기 위해", a: { mode: "C", text: "품질 기준과 측정 방법을 먼저 세운다" }, b: { mode: "D", text: "목표를 높이고 실행 속도를 끌어올린다" } },
  { context: "팀 분위기가 가라앉으면", a: { mode: "I", text: "긍정적인 말과 새로운 제안으로 환기한다" }, b: { mode: "S", text: "한 사람씩 살피며 편안하게 이야기를 듣는다" } },
  { context: "경쟁 상황에서는", a: { mode: "I", text: "나의 강점을 적극적으로 알리고 참여를 이끈다" }, b: { mode: "D", text: "이길 수 있는 전략을 정하고 강하게 실행한다" } },
  { context: "약속한 일을 맡으면", a: { mode: "C", text: "요구사항을 빠짐없이 지켜 완성한다" }, b: { mode: "S", text: "중간에 흔들리지 않고 끝까지 꾸준히 한다" } },
  { context: "반대 의견을 들으면", a: { mode: "D", text: "쟁점을 바로 확인하고 내 판단을 설명한다" }, b: { mode: "S", text: "상대가 중요하게 여기는 부분부터 이해한다" } },
  { context: "발표를 준비할 때", a: { mode: "C", text: "정확한 자료와 빈틈없는 구성을 준비한다" }, b: { mode: "I", text: "청중의 관심을 끌 이야기와 표현을 준비한다" } },
  { context: "완벽하지 않은 상황에서도", a: { mode: "D", text: "기회를 놓치지 않도록 일단 결정한다" }, b: { mode: "C", text: "중요한 조건이 충족될 때까지 조금 더 확인한다" } },
  { context: "함께 일하기 좋은 환경은", a: { mode: "S", text: "서로 배려하며 예측 가능한 환경이다" }, b: { mode: "I", text: "자유롭게 소통하며 활기가 있는 환경이다" } },
];

const EMPTY_SCORES: Scores = { D: 0, I: 0, S: 0, C: 0 };

function calculateScores(answers: Record<number, DiscKey>) {
  return Object.values(answers).reduce<Scores>(
    (scores, mode) => ({ ...scores, [mode]: scores[mode] + 1 }),
    { ...EMPTY_SCORES },
  );
}

function rankModes(scores: Scores) {
  return [...MODE_ORDER].sort((a, b) => scores[b] - scores[a]);
}

function calculateCoordinates(scores: Scores) {
  const total = Math.max(1, Object.values(scores).reduce((sum, value) => sum + value, 0));
  return {
    pace: Math.round(((scores.D + scores.I) / total) * 100),
    focus: Math.round(((scores.I + scores.S) / total) * 100),
  };
}

function modeLabel(key: string) {
  return key
    .split("/")
    .map((mode) => MODES[mode as DiscKey]?.name ?? mode)
    .join(" · ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function DiscAssessment({ initialView = "info" }: { initialView?: "info" | "admin" }) {
  const [view, setView] = useState<View>(initialView);
  const [participant, setParticipant] = useState({ name: "", team: "" });
  const [answers, setAnswers] = useState<Record<number, DiscKey>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminRecords, setAdminRecords] = useState<ResultRecord[]>([]);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [teamFilter, setTeamFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [adminTab, setAdminTab] = useState<AdminTab>("overview");
  const [groupCount, setGroupCount] = useState(3);
  const [groupSeed, setGroupSeed] = useState(1);
  const [googleSheetsConnected, setGoogleSheetsConnected] = useState(false);
  const [sheetSyncState, setSheetSyncState] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [sheetSyncMessage, setSheetSyncMessage] = useState("");
  const [externalSheetMode, setExternalSheetMode] = useState(false);
  const sheetApi = DEFAULT_SHEET_API;

  const scores = useMemo(() => calculateScores(answers), [answers]);
  const rankedModes = useMemo(() => rankModes(scores), [scores]);
  const coordinates = useMemo(() => calculateCoordinates(scores), [scores]);
  const maxScore = Math.max(...Object.values(scores));
  const dominantModes = rankedModes.filter((mode) => scores[mode] === maxScore);
  const primaryResultMode = rankedModes[0];
  const secondaryMode = rankedModes[1];

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const isGitHubPages = window.location.hostname.endsWith("github.io");
      setExternalSheetMode(isGitHubPages);
      if (params.has("admin") || /\/admin\/?$/.test(window.location.pathname)) setView("admin");
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  function goHome() {
    setView("info");
    const participantPath = window.location.pathname.replace(/\/admin\/?$/, "/");
    window.history.replaceState({}, "", participantPath);
  }

  function beginAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!participant.name.trim()) return;
    setAnswers({});
    setCurrentQuestion(0);
    setSaveState("idle");
    setView("quiz");
  }

  function chooseAnswer(mode: DiscKey) {
    setAnswers((current) => ({ ...current, [currentQuestion]: mode }));
  }

  async function finishAssessment() {
    if (Object.keys(answers).length !== QUESTIONS.length) return;
    setView("result");
    setSaveState("saving");

    const dominant = dominantModes.join("/");
    const resultPayload = {
      name: participant.name.trim(),
      team: participant.team.trim(),
      scores,
      dominant,
      secondary: secondaryMode,
      ...coordinates,
    };
    try {
      if (externalSheetMode) {
        if (!sheetApi) throw new Error("Google Sheets 연결 정보가 없습니다.");
        const recordId = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await fetch(sheetApi, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "save",
            recordId,
            createdAt: new Date().toISOString(),
            ...resultPayload,
            d: scores.D,
            i: scores.I,
            s: scores.S,
            c: scores.C,
          }),
        });
      } else {
        const response = await fetch("/api/results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resultPayload),
        });
        if (!response.ok) throw new Error("save failed");
      }
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  async function loadAdmin(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!adminPassword) return;
    setAdminLoading(true);
    setAdminError("");
    try {
      if (externalSheetMode) {
        if (!validSheetApi(sheetApi)) throw new Error("Google Sheets 연결 설정을 확인해 주세요.");
        const results = await loadSheetResults(sheetApi, adminPassword);
        setAdminRecords(results);
        setGoogleSheetsConnected(true);
      } else {
        const response = await fetch("/api/results", {
          headers: { "x-admin-password": adminPassword },
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          results?: ResultRecord[];
          integrations?: { googleSheets?: { configured?: boolean } };
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error || "데이터를 불러오지 못했습니다.");
        setAdminRecords(payload.results ?? []);
        setGoogleSheetsConnected(Boolean(payload.integrations?.googleSheets?.configured));
      }
      setAdminAuthenticated(true);
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "데이터를 불러오지 못했습니다.");
    } finally {
      setAdminLoading(false);
    }
  }

  const teams = useMemo(
    () => [...new Set(adminRecords.map((record) => record.team).filter(Boolean))].sort(),
    [adminRecords],
  );

  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return adminRecords.filter((record) => {
      const matchesTeam = teamFilter === "all" || record.team === teamFilter;
      const matchesSearch = !keyword || `${record.name} ${record.team}`.toLowerCase().includes(keyword);
      return matchesTeam && matchesSearch;
    });
  }, [adminRecords, search, teamFilter]);

  const teamScopedRecords = useMemo(
    () => adminRecords.filter((record) => teamFilter === "all" || record.team === teamFilter),
    [adminRecords, teamFilter],
  );

  const teamParticipants = useMemo(() => latestUniqueRecords(teamScopedRecords), [teamScopedRecords]);
  const maxGroupCount = Math.max(2, Math.min(12, teamParticipants.length || 2));
  const balancedGroups = useMemo(
    () => buildBalancedGroups(teamParticipants, Math.min(groupCount, maxGroupCount), groupSeed),
    [groupCount, groupSeed, maxGroupCount, teamParticipants],
  );
  const teamDebrief = useMemo(() => createTeamDebrief(teamParticipants), [teamParticipants]);

  const distribution = useMemo(
    () =>
      MODE_ORDER.reduce<Record<DiscKey, number>>(
        (acc, mode) => ({
          ...acc,
          [mode]: filteredRecords.filter((record) => record.dominant.split("/")[0] === mode).length,
        }),
        { ...EMPTY_SCORES },
      ),
    [filteredRecords],
  );

  function exportCsv() {
    const header = ["이름", "팀", "대표유형", "D", "I", "S", "C", "빠른속도", "사람중심", "응답일시"];
    const rows = filteredRecords.map((record) => [
      record.name,
      record.team,
      modeLabel(record.dominant),
      record.d,
      record.i,
      record.s,
      record.c,
      record.pace,
      record.focus,
      formatDate(record.createdAt),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `disc-results-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportGroupsCsv() {
    const header = ["조", "이름", "팀", "대표유형", "보조유형", "D", "I", "S", "C"];
    const rows = balancedGroups.flatMap((group) =>
      group.members.map((record) => [
        `${group.number}조`,
        record.name,
        record.team,
        modeLabel(record.dominant),
        modeLabel(record.secondary),
        record.d,
        record.i,
        record.s,
        record.c,
      ]),
    );
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `disc-groups-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function syncGoogleSheets() {
    if (externalSheetMode) {
      await loadAdmin();
      setSheetSyncState("success");
      setSheetSyncMessage("Google Sheets 최신 결과를 불러왔습니다.");
      return;
    }
    setSheetSyncState("syncing");
    setSheetSyncMessage("");
    try {
      const response = await fetch("/api/results/sync", {
        method: "POST",
        headers: { "x-admin-password": adminPassword },
      });
      const payload = (await response.json()) as { total?: number; synced?: number; failed?: number; error?: string };
      if (!response.ok) throw new Error(payload.error || "Google Sheets 동기화에 실패했습니다.");
      setSheetSyncState("success");
      setSheetSyncMessage(`${payload.synced ?? 0}/${payload.total ?? 0}건 동기화 완료`);
    } catch (error) {
      setSheetSyncState("error");
      setSheetSyncMessage(error instanceof Error ? error.message : "Google Sheets 동기화에 실패했습니다.");
    }
  }

  async function copyParticipantLink() {
    const url = new URL(window.location.href);
    url.pathname = url.pathname.replace(/\/admin\/?$/, "/");
    url.search = "";
    url.hash = "";
    await navigator.clipboard.writeText(url.toString());
    setSheetSyncState("success");
    setSheetSyncMessage("검사 참여 링크를 복사했습니다.");
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" onClick={goHome} aria-label="DISC FLOW 홈">
          <span className="brand-mark" aria-hidden="true">
            {MODE_ORDER.map((mode) => <i key={mode} style={{ background: MODES[mode].color }} />)}
          </span>
          <span>DISC <strong>FLOW</strong></span>
        </button>
        <button
          className="icon-button"
          title="관리자 대시보드"
          aria-label="관리자 대시보드"
          onClick={() => {
            setView("admin");
            const participantPath = window.location.pathname.replace(/\/admin\/?$/, "/").replace(/\/$/, "");
            window.history.replaceState({}, "", `${participantPath}/admin/`);
          }}
        >
          <LockKeyhole size={18} />
        </button>
      </header>

      <main>
        {view === "info" && (
          <section className="intake-view page-enter">
            <div className="intake-copy">
              <div className="eyebrow"><ClipboardList size={16} /> DISC 행동유형 진단</div>
              <h1>응답자 정보를 입력하고<br />바로 시작하세요</h1>
              <p>
                평소 일하는 방식과 소통 습관을 떠올리며, 지금의 나와 더 가까운 문장을 선택하면 됩니다.
                정답은 없습니다.
              </p>
              <div className="home-meta" aria-label="진단 정보">
                <span><ClipboardList size={17} /> 24문항</span>
                <span><BarChart3 size={17} /> 즉시 결과 확인</span>
                <span><ShieldCheck size={17} /> 약 5분 소요</span>
              </div>
            </div>

            <form className="info-form intake-form" onSubmit={beginAssessment}>
              <div className="step-label">START</div>
              <h2>응답자 정보</h2>
              <p className="section-copy">결과표에 표시할 정보를 입력하세요. 팀명은 관리자 집계에서만 사용됩니다.</p>
              <label>
                이름 <span>필수</span>
                <input
                  autoFocus
                  value={participant.name}
                  onChange={(event) => setParticipant({ ...participant, name: event.target.value })}
                  placeholder="이름을 입력하세요"
                  maxLength={40}
                  required
                  data-testid="participant-name"
                />
              </label>
              <label>
                팀 또는 소속 <em>선택</em>
                <input
                  value={participant.team}
                  onChange={(event) => setParticipant({ ...participant, team: event.target.value })}
                  placeholder="예: 마케팅팀"
                  maxLength={60}
                  data-testid="participant-team"
                />
              </label>
              <div className="notice-box">
                <ShieldCheck size={20} />
                <p><strong>응답 안내</strong><br />평소의 실제 행동을 떠올리고, 오래 고민하지 말고 더 가까운 쪽을 선택하세요.</p>
              </div>
              <button className="primary-button full" type="submit" data-testid="start-assessment">진단 시작하기 <ArrowRight size={18} /></button>
            </form>
          </section>
        )}

        {view === "quiz" && (
          <section className="quiz-view page-enter">
            <div className="quiz-topline">
              <button className="back-button" onClick={() => currentQuestion === 0 ? setView("info") : setCurrentQuestion(currentQuestion - 1)}>
                <ArrowLeft size={17} /> 이전
              </button>
              <span>{currentQuestion + 1} / {QUESTIONS.length}</span>
            </div>
            <div className="progress-track"><span style={{ width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%` }} /></div>
            <div className="question-card">
              <span className="question-kicker">평소의 나와 더 가까운 쪽은?</span>
              <h2>{QUESTIONS[currentQuestion].context}</h2>
              <div className="answer-grid">
                {(["a", "b"] as const).map((side) => {
                  const option = QUESTIONS[currentQuestion][side];
                  const selected = answers[currentQuestion] === option.mode;
                  return (
                    <button
                      key={side}
                      className={`answer-option ${selected ? "selected" : ""}`}
                      onClick={() => chooseAnswer(option.mode)}
                      style={{ "--option-color": MODES[option.mode].color } as React.CSSProperties}
                      data-testid={`answer-${side}`}
                    >
                      <span className="choice-letter">{side.toUpperCase()}</span>
                      <span>{option.text}</span>
                      <i>{selected && <Check size={17} />}</i>
                    </button>
                  );
                })}
              </div>
              <button
                className="primary-button full quiz-next"
                disabled={!answers[currentQuestion]}
                onClick={() => currentQuestion === QUESTIONS.length - 1 ? finishAssessment() : setCurrentQuestion(currentQuestion + 1)}
                data-testid="next-question"
              >
                {currentQuestion === QUESTIONS.length - 1 ? "결과 확인하기" : "다음 문항"} <ArrowRight size={18} />
              </button>
            </div>
          </section>
        )}

        {view === "result" && (
          <section className="result-view page-enter">
            <div className="result-actions no-print">
              <button className="back-button" onClick={goHome}><ArrowLeft size={17} /> 처음으로</button>
              <button className="secondary-button" onClick={() => window.print()}><Printer size={17} /> 인쇄·PDF</button>
            </div>
            <div className="result-hero" style={{ "--result-color": MODES[primaryResultMode].color, "--result-soft": MODES[primaryResultMode].soft } as React.CSSProperties}>
              <div>
                <span className="result-owner">{participant.name}님의 DISC 결과</span>
                <div className="result-type-line">
                  <span className="result-letter">{dominantModes.join("")}</span>
                  <div><p>대표 행동유형</p><h1>{dominantModes.map((mode) => MODES[mode].name).join(" · ")}</h1></div>
                </div>
                <h2>{MODES[primaryResultMode].title}</h2>
                <p>{MODES[primaryResultMode].summary}</p>
              </div>
              <div className={`save-chip ${saveState}`}>
                {saveState === "saving" && "결과 저장 중"}
                {saveState === "saved" && <><Check size={15} /> 결과 저장 완료</>}
                {saveState === "error" && "결과는 표시되었지만 저장하지 못했습니다"}
              </div>
            </div>

            <section className="result-overview">
              <div className="section-heading">
                <div><span>DISC OVERVIEW</span><h3>전체 지도에서 본 나의 결과</h3></div>
                <p>강조된 영역이 나의 대표 행동유형입니다.</p>
              </div>
              <div className="result-overview-layout">
                <div className="disc-map" aria-label="DISC 전체 지도와 나의 대표 행동유형">
                  <div className="map-cross" aria-hidden="true" />
                  {MODE_ORDER.map((mode) => {
                    const isDominant = dominantModes.includes(mode);
                    return (
                      <div
                        key={mode}
                        className={`map-mode map-${mode.toLowerCase()} ${isDominant ? "is-result" : ""}`}
                        style={{ "--mode-color": MODES[mode].color } as React.CSSProperties}
                        aria-current={isDominant ? "true" : undefined}
                      >
                        <strong>{mode}</strong>
                        <span>{MODES[mode].name}</span>
                        {isDominant && <small>나의 유형</small>}
                      </div>
                    );
                  })}
                  <span className="map-axis axis-top">빠른 속도</span>
                  <span className="map-axis axis-bottom">차분한 속도</span>
                  <span className="map-axis axis-left">과업 중심</span>
                  <span className="map-axis axis-right">사람 중심</span>
                </div>

                <div className="mode-strip result-mode-strip">
                  {MODE_ORDER.map((mode) => {
                    const isDominant = dominantModes.includes(mode);
                    return (
                      <article
                        key={mode}
                        className={`mode-intro ${isDominant ? "is-result" : ""}`}
                        style={{ borderColor: MODES[mode].color, "--mode-color": MODES[mode].color } as React.CSSProperties}
                      >
                        <span style={{ color: MODES[mode].color }}>{mode}</span>
                        <div>
                          <strong>{MODES[mode].name}</strong>
                          <p>{MODES[mode].title}</p>
                          {isDominant && <small>나의 대표 유형</small>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
              <p className="result-disclaimer">이 진단은 자기이해와 대화를 돕는 참고 도구이며, 의학적·심리학적 진단을 대신하지 않습니다.</p>
            </section>

            <div className="result-grid">
              <section className="result-section score-section">
                <div className="section-heading"><div><span>PROFILE</span><h3>유형별 점수</h3></div><p>각 유형은 최대 12점입니다.</p></div>
                <div className="score-list">
                  {MODE_ORDER.map((mode) => (
                    <div className="score-row" key={mode}>
                      <div className="score-name"><b style={{ color: MODES[mode].color }}>{mode}</b><span>{MODES[mode].name}</span></div>
                      <div className="score-track"><span style={{ width: `${(scores[mode] / 12) * 100}%`, background: MODES[mode].color }} /></div>
                      <strong>{scores[mode]}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="result-section coordinate-section">
                <div className="section-heading"><div><span>POSITION</span><h3>행동 좌표</h3></div></div>
                <div className="coordinate-map">
                  <span className="quadrant q-d">D</span><span className="quadrant q-i">I</span>
                  <span className="quadrant q-c">C</span><span className="quadrant q-s">S</span>
                  <i className="result-dot" style={{ left: `${coordinates.focus}%`, top: `${100 - coordinates.pace}%`, background: MODES[primaryResultMode].color }} />
                </div>
                <div className="coordinate-legend"><span>과업 중심</span><span>사람 중심</span></div>
              </section>
            </div>

            <section className="insight-band">
              <div className="section-heading"><div><span>INSIGHT</span><h3>{primaryResultMode}{secondaryMode} 조합으로 보는 나</h3></div></div>
              <div className="insight-grid">
                <article><span>강점</span><p>{MODES[primaryResultMode].strength}</p></article>
                <article><span>주의할 점</span><p>{MODES[primaryResultMode].watch}</p></article>
                <article><span>소통 팁</span><p>{MODES[primaryResultMode].communication}</p></article>
              </div>
              <p className="blend-note"><strong>보조 유형 {secondaryMode} · {MODES[secondaryMode].name}</strong>의 특성이 함께 나타납니다. 상황과 역할에 따라 네 유형의 행동을 모두 사용할 수 있습니다.</p>
            </section>

            <div className="retake-area no-print">
              <button className="secondary-button" onClick={() => setView("info")}><RefreshCw size={17} /> 다시 진단하기</button>
            </div>
          </section>
        )}

        {view === "admin" && (
          <section className="admin-view page-enter">
            {!adminAuthenticated ? (
              <div className="admin-login">
                <div className="admin-icon"><LockKeyhole size={26} /></div>
                <span className="step-label">ADMIN</span>
                <h2>관리자 대시보드</h2>
                <p>응답 현황과 팀별 DISC 분포를 확인합니다.</p>
                <form onSubmit={loadAdmin}>
                  <label>관리자 비밀번호
                    <input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="비밀번호 입력" required data-testid="admin-password" />
                  </label>
                  {adminError && <p className="form-error">{adminError}</p>}
                  <button className="primary-button full" type="submit" disabled={adminLoading}>
                    {adminLoading ? "확인 중" : "대시보드 열기"} {!adminLoading && <ArrowRight size={17} />}
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div className="admin-heading">
                  <div><span className="step-label">ADMIN</span><h1>DISC 팀 인사이트</h1><p>응답 현황부터 조 편성, 디브리핑까지 한 흐름으로 운영하세요.</p></div>
                  <div className="admin-actions">
                    <span className={`sheets-status ${googleSheetsConnected ? "connected" : ""}`}>
                      <FileSpreadsheet size={15} /> Google Sheets {googleSheetsConnected ? "연결됨" : "미연결"}
                    </span>
                    {externalSheetMode ? (
                      <button className="secondary-button" onClick={copyParticipantLink} title="검사 참여 주소 복사">
                        <Link2 size={17} /> 검사 링크 복사
                      </button>
                    ) : (
                      <button
                        className="secondary-button"
                        onClick={syncGoogleSheets}
                        disabled={!googleSheetsConnected || sheetSyncState === "syncing"}
                        title={googleSheetsConnected ? "저장된 결과를 Google Sheets와 동기화" : "Google Sheets 연결 정보가 필요합니다"}
                      >
                        <FileSpreadsheet size={17} /> {sheetSyncState === "syncing" ? "동기화 중" : "Sheets 동기화"}
                      </button>
                    )}
                    <button className="icon-button" title="새로고침" aria-label="새로고침" onClick={() => loadAdmin()} disabled={adminLoading}><RefreshCw size={18} /></button>
                    {adminTab === "overview" && <button className="secondary-button" onClick={exportCsv}><Download size={17} /> CSV</button>}
                  </div>
                </div>

                {sheetSyncMessage && <div className={`sync-message ${sheetSyncState}`}>{sheetSyncMessage}</div>}

                <div className="admin-tabs" role="tablist" aria-label="관리자 보기">
                  <button className={adminTab === "overview" ? "active" : ""} onClick={() => setAdminTab("overview")} role="tab" aria-selected={adminTab === "overview"}>
                    <LayoutDashboard size={17} /> 현황
                  </button>
                  <button className={adminTab === "groups" ? "active" : ""} onClick={() => setAdminTab("groups")} role="tab" aria-selected={adminTab === "groups"}>
                    <UsersRound size={17} /> 팀 구성
                  </button>
                  <button className={adminTab === "debrief" ? "active" : ""} onClick={() => setAdminTab("debrief")} role="tab" aria-selected={adminTab === "debrief"}>
                    <MessageSquareText size={17} /> 디브리핑
                  </button>
                </div>

                <div className="admin-scope-bar">
                  <label className="select-wrap">
                    <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)} aria-label="팀 범위">
                      <option value="all">전체 팀</option>
                      {teams.map((team) => <option key={team} value={team}>{team}</option>)}
                    </select>
                    <ChevronDown size={15} />
                  </label>
                  <span><strong>{teamParticipants.length}</strong>명 최신 응답 기준</span>
                </div>

                {adminTab === "overview" && (
                  <div className="admin-tab-content page-enter">
                    <div className="metric-grid">
                      <article><Users size={20} /><span>전체 응답</span><strong>{adminRecords.length}<small>건</small></strong></article>
                      <article><BarChart3 size={20} /><span>조회 응답</span><strong>{filteredRecords.length}<small>건</small></strong></article>
                      <article><ClipboardList size={20} /><span>등록 팀</span><strong>{teams.length}<small>개</small></strong></article>
                    </div>

                    <div className="admin-panel distribution-panel">
                      <div className="panel-heading"><div><span>DISTRIBUTION</span><h2>대표유형 분포</h2></div></div>
                      <div className="distribution-grid">
                        {MODE_ORDER.map((mode) => {
                          const count = distribution[mode];
                          const percent = filteredRecords.length ? Math.round((count / filteredRecords.length) * 100) : 0;
                          return (
                            <article key={mode} style={{ "--mode-color": MODES[mode].color, "--mode-soft": MODES[mode].soft } as React.CSSProperties}>
                              <div><b>{mode}</b><span>{MODES[mode].name}</span></div><strong>{count}<small>명</small></strong>
                              <div className="mini-track"><span style={{ width: `${percent}%` }} /></div><em>{percent}%</em>
                            </article>
                          );
                        })}
                      </div>
                    </div>

                    <div className="admin-panel table-panel">
                      <div className="table-toolbar">
                        <div><span>RESPONSES</span><h2>응답자 목록</h2></div>
                        <div className="filters">
                          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="이름 또는 팀 검색" aria-label="이름 또는 팀 검색" />
                        </div>
                      </div>
                      <div className="table-scroll">
                        <table>
                          <thead><tr><th>이름</th><th>팀</th><th>대표유형</th><th>D</th><th>I</th><th>S</th><th>C</th><th>응답일</th></tr></thead>
                          <tbody>
                            {filteredRecords.map((record) => (
                              <tr key={record.id}><td><strong>{record.name}</strong></td><td>{record.team || "-"}</td><td><span className="type-pill" style={{ color: MODES[record.dominant.split("/")[0] as DiscKey]?.color }}>{modeLabel(record.dominant)}</span></td><td>{record.d}</td><td>{record.i}</td><td>{record.s}</td><td>{record.c}</td><td>{formatDate(record.createdAt)}</td></tr>
                            ))}
                            {!filteredRecords.length && <tr><td colSpan={8} className="empty-row">조건에 맞는 응답이 없습니다.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {adminTab === "groups" && (
                  <section className="team-builder page-enter">
                    <div className="workspace-heading">
                      <div><span>TEAM BUILDER</span><h2>DISC 균형 조 편성</h2><p>같은 유형이 한 조에 몰리지 않도록 최신 응답을 고르게 배치합니다.</p></div>
                      <div className="builder-controls">
                        <div className="group-stepper" aria-label="조 개수">
                          <button className="icon-button" onClick={() => setGroupCount((count) => Math.max(2, count - 1))} disabled={groupCount <= 2} title="조 줄이기" aria-label="조 줄이기"><Minus size={16} /></button>
                          <span><strong>{Math.min(groupCount, maxGroupCount)}</strong>개 조</span>
                          <button className="icon-button" onClick={() => setGroupCount((count) => Math.min(maxGroupCount, count + 1))} disabled={groupCount >= maxGroupCount} title="조 늘리기" aria-label="조 늘리기"><Plus size={16} /></button>
                        </div>
                        <button className="secondary-button" onClick={() => setGroupSeed((seed) => seed + 1)} disabled={teamParticipants.length < 2}><Shuffle size={17} /> 다시 섞기</button>
                        <button className="secondary-button" onClick={exportGroupsCsv} disabled={!balancedGroups.length}><Download size={17} /> 조 편성 CSV</button>
                      </div>
                    </div>

                    {teamParticipants.length < 2 ? (
                      <div className="workspace-empty"><UsersRound size={24} /><p>조를 편성하려면 최신 응답이 2명 이상 필요합니다.</p></div>
                    ) : (
                      <div className="group-board">
                        {balancedGroups.map((group) => (
                          <article className="group-column" key={group.number}>
                            <div className="group-header"><div><span>{group.number}</span><strong>{group.number}조</strong></div><em>{group.members.length}명</em></div>
                            <div className="group-mix" aria-label={`${group.number}조 유형 구성`}>
                              {MODE_ORDER.map((mode) => group.distribution[mode] > 0 && (
                                <i key={mode} style={{ width: `${(group.distribution[mode] / group.members.length) * 100}%`, background: MODES[mode].color }} />
                              ))}
                            </div>
                            <ul>
                              {group.members.map((record) => {
                                const mode = primaryMode(record);
                                return (
                                  <li key={record.id}>
                                    <span className="member-mode" style={{ color: MODES[mode].color, background: MODES[mode].soft }}>{mode}</span>
                                    <div><strong>{record.name}</strong><small>{record.team || "소속 없음"} · {MODES[mode].name}</small></div>
                                  </li>
                                );
                              })}
                            </ul>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {adminTab === "debrief" && (
                  <section className="debrief-workspace page-enter">
                    <div className="workspace-heading">
                      <div><span>DEBRIEF</span><h2>팀 디브리핑 가이드</h2><p>현재 팀 구성의 강점과 놓치기 쉬운 관점을 대화 주제로 전환합니다.</p></div>
                    </div>

                    {!teamParticipants.length ? (
                      <div className="workspace-empty"><MessageSquareText size={24} /><p>디브리핑을 만들 진단 결과가 없습니다.</p></div>
                    ) : (
                      <>
                        <div className="debrief-summary" style={{ "--mode-color": MODES[teamDebrief.topMode].color, "--mode-soft": MODES[teamDebrief.topMode].soft } as React.CSSProperties}>
                          <div><span>가장 많은 대표유형</span><strong>{teamDebrief.topMode} · {MODES[teamDebrief.topMode].name}</strong></div>
                          <div><span>팀 속도</span><strong>{teamDebrief.averagePace}% 빠른 실행</strong></div>
                          <div><span>팀 초점</span><strong>{teamDebrief.averageFocus}% 사람 중심</strong></div>
                        </div>

                        <div className="debrief-columns">
                          <section>
                            <div className="debrief-title"><BarChart3 size={18} /><h3>관찰 포인트</h3></div>
                            <ol>{teamDebrief.observations.map((observation, index) => <li key={index}>{observation}</li>)}</ol>
                          </section>
                          <section>
                            <div className="debrief-title"><MessageSquareText size={18} /><h3>진행 질문</h3></div>
                            <ol>{teamDebrief.questions.map((question, index) => <li key={index}>{question}</li>)}</ol>
                          </section>
                        </div>

                        <div className="mode-roles">
                          {MODE_ORDER.map((mode) => (
                            <article key={mode} style={{ borderColor: MODES[mode].color }}>
                              <div><b style={{ color: MODES[mode].color }}>{mode}</b><strong>{MODES[mode].name}에게 요청할 역할</strong></div>
                              <p>{mode === "D" && "결정할 쟁점과 우선순위를 명확히 정리하기"}{mode === "I" && "참여를 끌어내고 아이디어를 연결하기"}{mode === "S" && "실행 과정의 지원과 관계 영향을 점검하기"}{mode === "C" && "판단 기준, 위험, 품질 조건을 검토하기"}</p>
                            </article>
                          ))}
                        </div>
                      </>
                    )}
                  </section>
                )}
              </>
            )}
          </section>
        )}
      </main>

      <footer className="site-footer no-print"><span>DISC FLOW</span><p>자기이해와 더 나은 협업을 위한 행동유형 진단</p></footer>
    </div>
  );
}
