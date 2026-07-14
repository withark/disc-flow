import { desc } from "drizzle-orm";
import { getDb, ensureResultsTable } from "../../../db";
import { discResults } from "../../../db/schema";
import { syncResultToGoogleSheet } from "../../../lib/google-sheets";
import { getAdminPassword, googleSheetsConfigured } from "../../../lib/runtime-config";

const MODES = ["D", "I", "S", "C"] as const;

type DiscMode = (typeof MODES)[number];

function validModeList(value: string) {
  const parts = value.split("/");
  return parts.length > 0 && parts.length <= 4 && new Set(parts).size === parts.length && parts.every((part) => MODES.includes(part as DiscMode));
}

export async function GET(request: Request) {
  const adminPassword = getAdminPassword();
  if (!adminPassword) {
    return Response.json({ error: "관리자 비밀번호가 설정되지 않았습니다." }, { status: 503 });
  }
  if (request.headers.get("x-admin-password") !== adminPassword) {
    return Response.json({ error: "관리자 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  try {
    await ensureResultsTable();
    const results = await getDb().select().from(discResults).orderBy(desc(discResults.createdAt), desc(discResults.id)).limit(1000);
    return Response.json(
      { results, integrations: { googleSheets: { configured: googleSheetsConfigured() } } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "응답 데이터를 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      name?: string;
      team?: string;
      scores?: Partial<Record<DiscMode, number>>;
      dominant?: string;
      secondary?: string;
      pace?: number;
      focus?: number;
    };

    const name = payload.name?.trim() ?? "";
    const team = payload.team?.trim() ?? "";
    const scores = payload.scores;
    const scoreValues = MODES.map((mode) => scores?.[mode]);

    if (!name || name.length > 40 || team.length > 60) {
      return Response.json({ error: "이름 또는 팀 정보가 올바르지 않습니다." }, { status: 400 });
    }
    if (scoreValues.some((score) => !Number.isInteger(score) || (score ?? -1) < 0 || (score ?? 13) > 12) || scoreValues.reduce((sum, score) => sum + (score ?? 0), 0) !== 24) {
      return Response.json({ error: "점수 정보가 올바르지 않습니다." }, { status: 400 });
    }
    if (!payload.dominant || !validModeList(payload.dominant) || !payload.secondary || !MODES.includes(payload.secondary as DiscMode)) {
      return Response.json({ error: "유형 정보가 올바르지 않습니다." }, { status: 400 });
    }
    if (!Number.isInteger(payload.pace) || !Number.isInteger(payload.focus) || (payload.pace ?? -1) < 0 || (payload.pace ?? 101) > 100 || (payload.focus ?? -1) < 0 || (payload.focus ?? 101) > 100) {
      return Response.json({ error: "행동 좌표가 올바르지 않습니다." }, { status: 400 });
    }

    await ensureResultsTable();
    const [result] = await getDb().insert(discResults).values({
      name,
      team,
      d: scores?.D ?? 0,
      i: scores?.I ?? 0,
      s: scores?.S ?? 0,
      c: scores?.C ?? 0,
      dominant: payload.dominant,
      secondary: payload.secondary,
      pace: payload.pace ?? 0,
      focus: payload.focus ?? 0,
    }).returning();

    const sheetSynced = await syncResultToGoogleSheet(result);
    return Response.json({ result, sheetSynced }, { status: 201 });
  } catch {
    return Response.json({ error: "진단 결과를 저장하지 못했습니다." }, { status: 500 });
  }
}
