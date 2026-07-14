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
  Gauge,
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
  Target,
  TrendingUp,
  Users,
  UsersRound,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  FINAL_TIE_BREAK_QUESTION,
  QUESTIONS,
  TIE_BREAK_QUESTIONS,
  type DiscKey,
} from "./disc-questions";
import {
  analyzeDiscAnswers,
  analyzeDiscScores,
  calculateDiscScores,
  DISC_MODE_ORDER,
  EMPTY_DISC_SCORES,
  findSecondaryMode,
  findTieBreakLeaders,
  type DiscScores,
} from "./disc-results";
import {
  buildBalancedGroups,
  createTeamDebrief,
  latestUniqueRecords,
  type TeamResultRecord,
} from "./team-tools";

type View = "info" | "quiz" | "tiebreak" | "result" | "admin";
type AdminTab = "overview" | "groups" | "debrief";

type TieBreakSummary = {
  candidates: DiscKey[];
  votes: DiscScores;
  finalSelection?: DiscKey;
};

type ResultRecord = TeamResultRecord;
type SheetDestination = {
  spreadsheetName: string;
  spreadsheetUrl: string;
  sheetName: string;
};
type AssessmentResultPayload = {
  name: string;
  team: string;
  scores: DiscScores;
  dominant: string;
  secondary: string;
  pace: number;
  focus: number;
};
type ResultSaveRequest = {
  payload: AssessmentResultPayload;
  recordId: string;
  createdAt: string;
  destination: "google-sheets" | "local-api";
};

const DEFAULT_SHEET_API = "https://script.google.com/macros/s/AKfycbwxrjQdO4bq9DDHHiffgj_lBGMGSFJwRJOe9_lPvnnLeiy028OIc7xJviZ-yZOzX4rU/exec";

function validSheetApi(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "script.google.com" && url.pathname.endsWith("/exec");
  } catch {
    return false;
  }
}

function createResultRecordIdentity() {
  return {
    recordId: window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  };
}

function loadSheetResults(sheetApi: string, adminPassword: string) {
  return new Promise<{ results: ResultRecord[]; destination: SheetDestination | null }>((resolve, reject) => {
    const callbackName = `discFlowSheet_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => finish(new Error("Google Sheets 응답 시간이 초과되었습니다.")), 15000);

    function cleanup() {
      window.clearTimeout(timeout);
      script.remove();
      delete (window as unknown as Record<string, unknown>)[callbackName];
    }

    function finish(
      error?: Error,
      response?: { results: ResultRecord[]; destination: SheetDestination | null },
    ) {
      cleanup();
      if (error) reject(error);
      else resolve(response ?? { results: [], destination: null });
    }

    (window as unknown as Record<string, unknown>)[callbackName] = (payload: {
      ok?: boolean;
      results?: ResultRecord[];
      destination?: SheetDestination;
      error?: string;
    }) => {
      if (!payload.ok) finish(new Error(payload.error || "Google Sheets 데이터를 불러오지 못했습니다."));
      else finish(undefined, {
        results: payload.results ?? [],
        destination: payload.destination ?? null,
      });
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

const MODE_ORDER = DISC_MODE_ORDER;

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
    motivation: string;
    underPressure: string;
    collaboration: string;
    growth: string;
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
    motivation: "도전적인 목표, 빠른 의사결정, 결과를 직접 만들 수 있는 권한",
    underPressure: "통제권을 잡고 결론을 서두르며 말이 평소보다 단호해질 수 있습니다.",
    collaboration: "결론, 책임자, 기한이 분명하고 자율적으로 실행할 여지가 필요합니다.",
    growth: "반대 의견과 실행 세부를 확인하는 시간을 두면 영향력이 더 오래갑니다.",
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
    motivation: "사람과의 상호작용, 아이디어 공유, 인정과 긍정적인 반응",
    underPressure: "말이 많아지거나 낙관적으로 넘기면서 세부 후속 조치를 놓칠 수 있습니다.",
    collaboration: "대화할 공간, 즉각적인 반응, 아이디어를 현실화할 실행 파트너가 필요합니다.",
    growth: "아이디어를 우선순위, 담당자, 기한으로 마무리하면 신뢰가 높아집니다.",
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
    motivation: "예측 가능한 흐름, 신뢰 관계, 나의 기여가 실제 도움이 된다는 확신",
    underPressure: "겉으로 수용하면서 불편함을 표현하지 않거나 변화를 미룰 수 있습니다.",
    collaboration: "충분한 안내와 준비 시간, 일관된 약속, 편하게 의견을 말할 기회가 필요합니다.",
    growth: "필요한 반대와 경계를 조금 더 일찍 표현하면 부담이 줄어듭니다.",
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
    motivation: "명확한 기준, 충분한 정보, 높은 품질을 만들 수 있는 집중 시간",
    underPressure: "정보를 더 모으고 오류를 피하려다 결정이 늦어지거나 비판적으로 보일 수 있습니다.",
    collaboration: "목표, 기준, 근거가 문서화되고 차분히 검토할 수 있는 환경이 필요합니다.",
    growth: "완벽한 답보다 결정에 충분한 기준과 마감을 먼저 정하면 실행력이 높아집니다.",
  },
};

type BehaviorProfile = { title: string; summary: string; contribution: string; balance: string };

const BLENDS: Record<string, BehaviorProfile> = {
  DI: { title: "빠른 설득형", summary: "결정을 내리는 속도와 사람을 움직이는 표현력이 함께 나타납니다.", contribution: "새로운 과제를 빠르게 시작하고 주변의 참여를 끌어냅니다.", balance: "낙관적인 확신만으로 세부 실행과 반대 의견을 건너뛰지 않도록 확인이 필요합니다." },
  DS: { title: "단단한 실행형", summary: "목표를 밀어붙이는 힘과 사람을 안정적으로 챙기는 태도가 결합됩니다.", contribution: "성과를 향해 나아가면서도 팀이 따라올 수 있는 흐름을 만듭니다.", balance: "참다가 한 번에 단호해지기보다 기대와 불편을 초기에 공유하는 것이 좋습니다." },
  DC: { title: "성과 기준형", summary: "빠른 결과 지향성과 높은 정확성 기준을 동시에 추구합니다.", contribution: "복잡한 문제의 핵심을 잡고 품질 높은 결론으로 연결합니다.", balance: "속도와 완성도를 모두 높이려다 자신과 타인에게 과도한 기준을 요구할 수 있습니다." },
  ID: { title: "영향력 있는 추진형", summary: "사람의 공감을 얻은 뒤 빠르게 행동과 성과로 전환합니다.", contribution: "아이디어를 매력적으로 전달하고 팀의 실행 에너지를 높입니다.", balance: "새로운 가능성에 집중할수록 우선순위와 후속 책임을 명확히 해야 합니다." },
  IS: { title: "관계 중심 촉진형", summary: "활발한 상호작용과 따뜻한 지원으로 편안한 참여를 만듭니다.", contribution: "사람들이 의견을 내고 서로 연결되도록 분위기를 조성합니다.", balance: "관계를 지키려다 필요한 결정이나 어려운 대화를 늦추지 않도록 주의합니다." },
  IC: { title: "아이디어 구체화형", summary: "풍부한 가능성을 제안하면서 논리와 완성도도 함께 살핍니다.", contribution: "복잡한 내용을 이해하기 쉽게 전달하고 설득력 있는 안으로 발전시킵니다.", balance: "좋은 설명을 준비하느라 실제 실험과 실행 시점을 놓치지 않도록 합니다." },
  SD: { title: "안정적 실행형", summary: "차분한 협력 태도 안에 필요한 순간의 결단력이 함께 있습니다.", contribution: "팀을 안정시키면서 약속한 결과를 끝까지 만들어 냅니다.", balance: "주변을 배려한 뒤에도 자신의 우선순위와 결정 이유를 분명히 표현해야 합니다." },
  SI: { title: "따뜻한 협력형", summary: "신뢰를 쌓는 꾸준함과 긍정적인 관계 에너지가 결합됩니다.", contribution: "구성원이 소외되지 않도록 연결하고 편안한 협업 환경을 만듭니다.", balance: "모두의 만족을 기다리기보다 필요한 기준과 마감을 함께 확인하는 것이 좋습니다." },
  SC: { title: "신뢰받는 운영형", summary: "일관된 실행과 세심한 품질 관리로 안정적인 결과를 만듭니다.", contribution: "절차를 정돈하고 실수를 줄이며 팀의 신뢰를 높입니다.", balance: "예측 가능한 방식을 선호해 새로운 시도나 빠른 변화에 늦게 반응할 수 있습니다." },
  CD: { title: "전략적 분석형", summary: "정확한 분석을 바탕으로 명확하고 단호한 결정을 내립니다.", contribution: "위험을 구조적으로 검토하고 실질적인 해결책을 제시합니다.", balance: "근거가 충분하다고 판단한 뒤에는 다른 관점도 들을 여지를 남기는 것이 좋습니다." },
  CI: { title: "논리적 제안형", summary: "정교한 분석을 이해하기 쉬운 설명과 아이디어로 전달합니다.", contribution: "자료와 메시지를 연결해 타인이 납득할 수 있는 제안을 만듭니다.", balance: "정보와 표현을 다듬는 데 머물지 않고 실행할 최소 조건을 정해야 합니다." },
  CS: { title: "정교한 지원형", summary: "높은 정확성과 꾸준한 책임감으로 팀을 안정적으로 뒷받침합니다.", contribution: "중요한 세부를 놓치지 않고 약속된 품질을 지속적으로 유지합니다.", balance: "혼자 충분히 검토하고 감당하기보다 우선순위와 지원 필요를 일찍 공유해야 합니다." },
};

function modeLabel(key: string) {
  const modes = key.split("/").filter(Boolean);
  if (!modes.length) return "-";
  const label = modes
    .map((mode) => MODES[mode as DiscKey]?.name ?? mode)
    .join(" · ");
  if (modes.length === 2) return `${label} 공동`;
  if (modes.length > 2) return `${label} 균형`;
  return label;
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
  const [isAdvancing, setIsAdvancing] = useState(false);
  const advancingRef = useRef(false);
  const [completedAnswers, setCompletedAnswers] = useState<Record<number, DiscKey> | null>(null);
  const [resolvedPrimaryMode, setResolvedPrimaryMode] = useState<DiscKey | null>(null);
  const [tieCandidates, setTieCandidates] = useState<DiscKey[]>([]);
  const [activeTieCandidates, setActiveTieCandidates] = useState<DiscKey[]>([]);
  const [tieBreakVotes, setTieBreakVotes] = useState<DiscScores>({ ...EMPTY_DISC_SCORES });
  const [tieBreakQuestion, setTieBreakQuestion] = useState(0);
  const [selectedTieMode, setSelectedTieMode] = useState<DiscKey | null>(null);
  const [tieBreakSummary, setTieBreakSummary] = useState<TieBreakSummary | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [pendingSave, setPendingSave] = useState<ResultSaveRequest | null>(null);
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
  const [sheetDestination, setSheetDestination] = useState<SheetDestination | null>(null);
  const [sheetSyncState, setSheetSyncState] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [sheetSyncMessage, setSheetSyncMessage] = useState("");
  const [externalSheetMode, setExternalSheetMode] = useState(false);
  const sheetApi = DEFAULT_SHEET_API;

  const scores = useMemo(() => calculateDiscScores(answers), [answers]);
  const resultAnalysis = useMemo(() => analyzeDiscScores(scores), [scores]);
  const coordinates = resultAnalysis.coordinates;
  const primaryResultMode = resolvedPrimaryMode ?? resultAnalysis.primaryMode;
  const secondaryMode = findSecondaryMode(resultAnalysis, primaryResultMode) ?? resultAnalysis.rankedModes[1];
  const resultProfile = BLENDS[`${primaryResultMode}${secondaryMode}`];
  const resultColor = MODES[primaryResultMode].color;
  const resultSoft = MODES[primaryResultMode].soft;
  const currentTieBreakQuestion = tieBreakQuestion < TIE_BREAK_QUESTIONS.length
    ? TIE_BREAK_QUESTIONS[tieBreakQuestion]
    : FINAL_TIE_BREAK_QUESTION;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const usesGoogleSheets = window.location.hostname.endsWith("github.io") || window.location.hostname.endsWith("chatgpt.site");
      setExternalSheetMode(usesGoogleSheets);
      if (params.has("admin") || /\/admin\/?$/.test(window.location.pathname)) setView("admin");
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  function goHome() {
    setView("info");
    const participantPath = window.location.pathname.replace(/\/admin\/?$/, "/");
    window.history.replaceState({}, "", participantPath);
  }

  function openPaperAssessment() {
    const participantPath = window.location.pathname.replace(/admin\/?$/, "");
    const rootPath = participantPath.endsWith("/") ? participantPath : `${participantPath}/`;
    window.open(new URL(`${rootPath}paper/`, window.location.origin).toString(), "_blank", "noopener,noreferrer");
  }

  function beginAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!participant.name.trim()) return;
    setAnswers({});
    setCurrentQuestion(0);
    setIsAdvancing(false);
    advancingRef.current = false;
    setCompletedAnswers(null);
    setResolvedPrimaryMode(null);
    setTieCandidates([]);
    setActiveTieCandidates([]);
    setTieBreakVotes({ ...EMPTY_DISC_SCORES });
    setTieBreakQuestion(0);
    setSelectedTieMode(null);
    setTieBreakSummary(null);
    setSaveState("idle");
    setSaveError("");
    setPendingSave(null);
    setView("quiz");
  }

  function chooseAnswer(mode: DiscKey) {
    if (advancingRef.current) return;
    advancingRef.current = true;
    const finalAnswers = { ...answers, [currentQuestion]: mode };
    setAnswers(finalAnswers);
    setIsAdvancing(true);

    window.setTimeout(() => {
      if (currentQuestion === QUESTIONS.length - 1) {
        void finishAssessment(finalAnswers);
        return;
      }
      setCurrentQuestion(currentQuestion + 1);
      setIsAdvancing(false);
      advancingRef.current = false;
    }, 180);
  }

  async function persistResult(request: ResultSaveRequest) {
    setSaveState("saving");
    setSaveError("");

    try {
      if (request.destination === "google-sheets") {
        if (!validSheetApi(sheetApi)) throw new Error("Google Sheets 연결 주소를 확인해 주세요.");
        const response = await fetch(sheetApi, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "save",
            recordId: request.recordId,
            createdAt: request.createdAt,
            ...request.payload,
            d: request.payload.scores.D,
            i: request.payload.scores.I,
            s: request.payload.scores.S,
            c: request.payload.scores.C,
          }),
        });
        const result = (await response.json()) as { ok?: boolean; error?: string };
        if (!response.ok || !result.ok) throw new Error(result.error || "Google Sheets 저장 응답이 올바르지 않습니다.");
      } else {
        const response = await fetch("/api/results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request.payload),
        });
        if (!response.ok) throw new Error("결과 저장 요청에 실패했습니다.");
      }
      setSaveState("saved");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "결과 저장에 실패했습니다.");
      setSaveState("error");
    }
  }

  function finishAssessment(finalAnswers: Record<number, DiscKey>) {
    if (Object.keys(finalAnswers).length !== QUESTIONS.length) {
      setIsAdvancing(false);
      advancingRef.current = false;
      return;
    }
    const finalAnalysis = analyzeDiscAnswers(finalAnswers);

    setIsAdvancing(false);
    advancingRef.current = false;
    if (finalAnalysis.dominantModes.length > 1) {
      setCompletedAnswers(finalAnswers);
      setTieCandidates(finalAnalysis.dominantModes);
      setActiveTieCandidates(finalAnalysis.dominantModes);
      setTieBreakVotes({ ...EMPTY_DISC_SCORES });
      setTieBreakQuestion(0);
      setSelectedTieMode(null);
      setView("tiebreak");
      return;
    }

    void completeAssessment(finalAnswers, finalAnalysis.primaryMode, null);
  }

  function chooseTieBreakAnswer(mode: DiscKey) {
    if (advancingRef.current || !completedAnswers) return;
    advancingRef.current = true;
    setSelectedTieMode(mode);
    setIsAdvancing(true);

    window.setTimeout(() => {
      if (tieBreakQuestion < TIE_BREAK_QUESTIONS.length) {
        const nextVotes = { ...tieBreakVotes, [mode]: tieBreakVotes[mode] + 1 };
        setTieBreakVotes(nextVotes);

        if (tieBreakQuestion < TIE_BREAK_QUESTIONS.length - 1) {
          setTieBreakQuestion(tieBreakQuestion + 1);
          setSelectedTieMode(null);
          setIsAdvancing(false);
          advancingRef.current = false;
          return;
        }

        const leaders = findTieBreakLeaders(tieCandidates, nextVotes);
        if (leaders.length === 1) {
          void completeAssessment(completedAnswers, leaders[0], {
            candidates: tieCandidates,
            votes: nextVotes,
          });
          return;
        }

        setActiveTieCandidates(leaders);
        setTieBreakQuestion(TIE_BREAK_QUESTIONS.length);
        setSelectedTieMode(null);
        setIsAdvancing(false);
        advancingRef.current = false;
        return;
      }

      void completeAssessment(completedAnswers, mode, {
        candidates: tieCandidates,
        votes: tieBreakVotes,
        finalSelection: mode,
      });
    }, 180);
  }

  async function completeAssessment(
    finalAnswers: Record<number, DiscKey>,
    primaryMode: DiscKey,
    summary: TieBreakSummary | null,
  ) {
    const finalAnalysis = analyzeDiscAnswers(finalAnswers);
    const finalScores = finalAnalysis.scores;
    const resultSecondaryMode = findSecondaryMode(finalAnalysis, primaryMode);

    setResolvedPrimaryMode(primaryMode);
    setTieBreakSummary(summary);
    setSelectedTieMode(null);
    setIsAdvancing(false);
    advancingRef.current = false;
    setView("result");

    const resultPayload: AssessmentResultPayload = {
      name: participant.name.trim(),
      team: participant.team.trim(),
      scores: finalScores,
      dominant: primaryMode,
      secondary: resultSecondaryMode ?? "",
      ...finalAnalysis.coordinates,
    };
    const recordIdentity = createResultRecordIdentity();
    const saveRequest: ResultSaveRequest = {
      payload: resultPayload,
      ...recordIdentity,
      destination: externalSheetMode ? "google-sheets" : "local-api",
    };
    setPendingSave(saveRequest);
    await persistResult(saveRequest);
  }

  async function loadAdmin(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!adminPassword) return;
    setAdminLoading(true);
    setAdminError("");
    try {
      if (externalSheetMode) {
        if (!validSheetApi(sheetApi)) throw new Error("Google Sheets 연결 설정을 확인해 주세요.");
        const sheetResponse = await loadSheetResults(sheetApi, adminPassword);
        setAdminRecords(sheetResponse.results);
        setSheetDestination(sheetResponse.destination);
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
        setSheetDestination(null);
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
          [mode]: filteredRecords.filter((record) => record.dominant === mode).length,
        }),
        { ...EMPTY_DISC_SCORES },
      ),
    [filteredRecords],
  );
  const tiedResultCount = useMemo(
    () => filteredRecords.filter((record) => record.dominant.split("/").filter(Boolean).length > 1).length,
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
                <p><strong>응답 안내</strong><br />최근 6개월의 실제 행동을 떠올리고, 오래 고민하지 말고 처음 더 가까웠던 쪽을 선택하세요.</p>
              </div>
              <button className="primary-button full" type="submit" data-testid="start-assessment">진단 시작하기 <ArrowRight size={18} /></button>
            </form>
          </section>
        )}

        {view === "quiz" && (
          <section className="quiz-view page-enter">
            <div className="quiz-topline">
              <span>{currentQuestion + 1} / {QUESTIONS.length}</span>
            </div>
            <div className="progress-track"><span style={{ width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%` }} /></div>
            <div className="question-card">
              <span className="question-kicker">최근 실제 행동에서 더 가까운 쪽은?</span>
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
                      disabled={isAdvancing}
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
            </div>
          </section>
        )}

        {view === "tiebreak" && (
          <section className="quiz-view page-enter" data-testid="tie-break-view">
            <div className="quiz-topline">
              <span>
                {tieBreakQuestion < TIE_BREAK_QUESTIONS.length
                  ? `동점 판별 ${tieBreakQuestion + 1} / ${TIE_BREAK_QUESTIONS.length}`
                  : "최종 동점 판별"}
              </span>
            </div>
            <div className="progress-track tie-progress">
              <span style={{ width: tieBreakQuestion < TIE_BREAK_QUESTIONS.length ? `${((tieBreakQuestion + 1) / TIE_BREAK_QUESTIONS.length) * 100}%` : "100%" }} />
            </div>
            <div className="question-card tie-break-card">
              <span className="question-kicker">동점 유형 중 실제 행동에 더 가까운 선택</span>
              <h2>{currentTieBreakQuestion.context}</h2>
              <div className="answer-grid">
                {activeTieCandidates.map((mode, index) => {
                  const selected = selectedTieMode === mode;
                  return (
                    <button
                      key={mode}
                      className={`answer-option ${selected ? "selected" : ""}`}
                      onClick={() => chooseTieBreakAnswer(mode)}
                      disabled={isAdvancing}
                      style={{ "--option-color": "#2f6f5e" } as React.CSSProperties}
                      data-testid={`tie-break-${mode}`}
                    >
                      <span className="choice-letter">{String.fromCharCode(65 + index)}</span>
                      <span>{currentTieBreakQuestion.options[mode]}</span>
                      <i>{selected && <Check size={17} />}</i>
                    </button>
                  );
                })}
              </div>
              <p className="tie-break-note">기본 점수는 바꾸지 않고, 동점 유형 중 1유형의 우선순위만 결정합니다.</p>
            </div>
          </section>
        )}

        {view === "result" && (
          <section className="result-view page-enter">
            <div className="result-actions no-print">
              <button className="back-button" onClick={goHome}><ArrowLeft size={17} /> 처음으로</button>
              <button className="secondary-button" onClick={() => window.print()}><Printer size={17} /> 인쇄·PDF</button>
            </div>
            <div className="result-hero" style={{ "--result-color": resultColor, "--result-soft": resultSoft } as React.CSSProperties}>
              <div>
                <span className="result-owner">{participant.name}님의 DISC 결과</span>
                <div className="result-type-line">
                  <span className="result-letter">{primaryResultMode}</span>
                  <div>
                    <p>1유형 · 대표 행동유형</p>
                    <h1>{MODES[primaryResultMode].name}</h1>
                  </div>
                </div>
                <h2>{MODES[primaryResultMode].title}</h2>
                <p>{MODES[primaryResultMode].summary}</p>
              </div>
              <div className={`save-chip ${saveState}`}>
                {saveState === "saving" && "결과 저장 중"}
                {saveState === "saved" && <><Check size={15} /> {externalSheetMode ? "Google Sheets · DISC 응답 저장 완료" : "결과 저장 완료"}</>}
                {saveState === "error" && (
                  <><span title={saveError}>결과 저장 실패</span><button type="button" onClick={() => pendingSave && void persistResult(pendingSave)} disabled={!pendingSave}>다시 저장</button></>
                )}
              </div>
            </div>

            <section className="result-overview">
              <div className="section-heading">
                <div><span>DISC OVERVIEW</span><h3>전체 지도에서 본 나의 결과</h3></div>
                <p>강조된 영역이 나의 1유형입니다.</p>
              </div>
              <div className="result-overview-layout">
                <div className="disc-map" aria-label="DISC 전체 지도와 나의 대표 행동유형">
                  <div className="map-cross" aria-hidden="true" />
                  {MODE_ORDER.map((mode) => {
                    const isDominant = primaryResultMode === mode;
                    return (
                      <div
                        key={mode}
                        className={`map-mode map-${mode.toLowerCase()} ${isDominant ? "is-result" : ""}`}
                        style={{ "--mode-color": MODES[mode].color } as React.CSSProperties}
                        aria-current={isDominant ? "true" : undefined}
                      >
                        <strong>{mode}</strong>
                        <span>{MODES[mode].name}</span>
                        {isDominant && <small>나의 1유형</small>}
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
                    const isDominant = primaryResultMode === mode;
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
                          {isDominant && <small>나의 1유형</small>}
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
                    <div className={`score-row ${mode === primaryResultMode ? "is-primary" : ""}`} key={mode}>
                      <div className="score-name"><b style={{ color: MODES[mode].color }}>{mode}</b><span>{MODES[mode].name}</span>{mode === primaryResultMode && <em>1유형</em>}</div>
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
                  <i className="result-dot" style={{ left: `${coordinates.focus}%`, top: `${100 - coordinates.pace}%`, background: resultColor }} />
                </div>
                <div className="coordinate-legend"><span>과업 중심</span><span>사람 중심</span></div>
              </section>
            </div>

            {tieBreakSummary && (
              <section className="tie-resolution" data-testid="tie-resolution">
                <div>
                  <span>TIE BREAK</span>
                  <h3>동점 판별로 1유형 확정</h3>
                </div>
                <p>
                  기본 검사에서 {tieBreakSummary.candidates.map((mode) => `${mode} ${scores[mode]}점`).join(" · ")}으로 최고점이 같았습니다.
                  {" "}추가 상황문항 선택은 {tieBreakSummary.candidates.map((mode) => `${mode} ${tieBreakSummary.votes[mode]}회`).join(" · ")}였고,
                  {tieBreakSummary.finalSelection
                    ? ` 마지막 우선순위 문항에서 ${primaryResultMode}를 선택해 1유형으로 확정했습니다.`
                    : ` ${primaryResultMode}가 가장 많이 선택되어 1유형으로 확정됐습니다.`}
                </p>
              </section>
            )}

            <section className="insight-band">
              <div className="section-heading">
                <div><span>INSIGHT</span><h3>{primaryResultMode}{secondaryMode} · {resultProfile.title}</h3></div>
                <p>1유형과 다음으로 높은 유형을 함께 해석했습니다.</p>
              </div>
              <div className="blend-profile" style={{ "--mode-color": resultColor, "--mode-soft": resultSoft } as React.CSSProperties}>
                <div className="blend-profile-main">
                  <span>{primaryResultMode} 1유형 + {secondaryMode} 보조 유형</span>
                  <h4>{resultProfile.title}</h4>
                  <p>{resultProfile.summary}</p>
                </div>
                <div className="blend-profile-details">
                  <article><span>팀에 주는 기여</span><p>{resultProfile.contribution}</p></article>
                  <article><span>균형 포인트</span><p>{resultProfile.balance}</p></article>
                </div>
              </div>

              <div className="deep-insight-heading"><span>DEEP DIVE</span><h4>{primaryResultMode} · {MODES[primaryResultMode].name}을 더 깊이 이해하기</h4></div>
              <div className="deep-insight-grid">
                <article><Target size={19} /><span>동기를 높이는 조건</span><p>{MODES[primaryResultMode].motivation}</p></article>
                <article><Gauge size={19} /><span>압박 상황의 반응</span><p>{MODES[primaryResultMode].underPressure}</p></article>
                <article><UsersRound size={19} /><span>협업에 필요한 것</span><p>{MODES[primaryResultMode].collaboration}</p></article>
                <article><TrendingUp size={19} /><span>성장 포인트</span><p>{MODES[primaryResultMode].growth}</p></article>
              </div>

              <div className="deep-insight-heading action-heading"><span>ACTION</span><h4>결과를 행동으로 옮기기</h4></div>
              <div className="insight-grid">
                <article><span>강점</span><p>{MODES[primaryResultMode].strength}</p></article>
                <article><span>주의할 점</span><p>{MODES[primaryResultMode].watch}</p></article>
                <article><span>소통 팁</span><p>{MODES[primaryResultMode].communication}</p></article>
              </div>
              <p className="blend-note">상황과 역할에 따라 네 유형의 행동을 모두 사용할 수 있으며, 이 결과는 현재 자주 선택하는 행동 경향을 보여줍니다.</p>
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
                    {sheetDestination ? (
                      <a
                        className="sheets-status connected"
                        href={sheetDestination.spreadsheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={`${sheetDestination.spreadsheetName} > ${sheetDestination.sheetName} 열기`}
                      >
                        <FileSpreadsheet size={15} />
                        <span>{sheetDestination.spreadsheetName} · {sheetDestination.sheetName}</span>
                      </a>
                    ) : (
                      <span className={`sheets-status ${googleSheetsConnected ? "connected" : ""}`}>
                        <FileSpreadsheet size={15} /> Google Sheets {googleSheetsConnected ? "연결됨" : "미연결"}
                      </span>
                    )}
                    <button
                      className="primary-button offline-print-button"
                      onClick={openPaperAssessment}
                      title="A4 질문지 1장과 채점·해설지 1장 열기"
                      data-testid="open-offline-assessment"
                    >
                      <Printer size={17} /> 오프라인 검사지 출력
                    </button>
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
                        <article className="tie-distribution" style={{ "--mode-color": "#2f6f5e", "--mode-soft": "#edf5f1" } as React.CSSProperties}>
                          <div><b>=</b><span>기존 동점 기록</span></div><strong>{tiedResultCount}<small>명</small></strong>
                          <div className="mini-track"><span style={{ width: `${filteredRecords.length ? Math.round((tiedResultCount / filteredRecords.length) * 100) : 0}%` }} /></div>
                          <em>{filteredRecords.length ? Math.round((tiedResultCount / filteredRecords.length) * 100) : 0}%</em>
                        </article>
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
                            {filteredRecords.map((record) => {
                              const recordModes = record.dominant.split("/").filter(Boolean);
                              const typeColor = recordModes.length > 1 ? "#2f6f5e" : MODES[recordModes[0] as DiscKey]?.color;
                              return (
                                <tr key={record.id}><td><strong>{record.name}</strong></td><td>{record.team || "-"}</td><td><span className="type-pill" style={{ color: typeColor }}>{modeLabel(record.dominant)}</span></td><td>{record.d}</td><td>{record.i}</td><td>{record.s}</td><td>{record.c}</td><td>{formatDate(record.createdAt)}</td></tr>
                              );
                            })}
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
                                const mode = group.memberModes[record.id] ?? "D";
                                const tied = record.dominant.includes("/");
                                const badge = tied ? record.dominant.replaceAll("/", "") : mode;
                                return (
                                  <li key={record.id}>
                                    <span className={`member-mode ${tied ? "is-tied" : ""}`} style={{ color: tied ? "#2f6f5e" : MODES[mode].color, background: tied ? "#edf5f1" : MODES[mode].soft }}>{badge}</span>
                                    <div><strong>{record.name}</strong><small>{record.team || "소속 없음"} · {modeLabel(record.dominant)}</small></div>
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
                          <div><span>{teamDebrief.topModes.length > 1 ? "공동 대표유형" : "가장 많은 대표유형"}</span><strong>{teamDebrief.topModes.map((mode) => `${mode} · ${MODES[mode].name}`).join(" / ")}</strong></div>
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
