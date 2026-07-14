import { desc } from "drizzle-orm";
import { getDb, ensureResultsTable } from "../../../../db";
import { discResults } from "../../../../db/schema";
import { syncResultToGoogleSheet } from "../../../../lib/google-sheets";
import { getAdminPassword, googleSheetsConfigured } from "../../../../lib/runtime-config";

export async function POST(request: Request) {
  const adminPassword = getAdminPassword();
  if (!adminPassword) {
    return Response.json({ error: "관리자 비밀번호가 설정되지 않았습니다." }, { status: 503 });
  }
  if (request.headers.get("x-admin-password") !== adminPassword) {
    return Response.json({ error: "관리자 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  if (!googleSheetsConfigured()) {
    return Response.json({ error: "Google Sheets 연결 정보가 설정되지 않았습니다." }, { status: 503 });
  }

  try {
    await ensureResultsTable();
    const results = await getDb().select().from(discResults).orderBy(desc(discResults.createdAt), desc(discResults.id)).limit(1000);
    let synced = 0;

    for (let index = 0; index < results.length; index += 10) {
      const batch = results.slice(index, index + 10);
      const statuses = await Promise.all(batch.map(syncResultToGoogleSheet));
      synced += statuses.filter(Boolean).length;
    }

    return Response.json({ total: results.length, synced, failed: results.length - synced });
  } catch {
    return Response.json({ error: "Google Sheets 동기화에 실패했습니다." }, { status: 500 });
  }
}
