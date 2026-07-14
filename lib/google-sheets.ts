import { getGoogleSheetsConfig } from "./runtime-config";

export type GoogleSheetResult = {
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

export async function syncResultToGoogleSheet(result: GoogleSheetResult) {
  const config = getGoogleSheetsConfig();
  if (!config.url || !config.token) return false;

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      redirect: "follow",
      body: JSON.stringify({
        apiToken: config.token,
        recordId: `disc-${result.id}`,
        createdAt: result.createdAt,
        name: result.name,
        team: result.team,
        dominant: result.dominant,
        secondary: result.secondary,
        d: result.d,
        i: result.i,
        s: result.s,
        c: result.c,
        pace: result.pace,
        focus: result.focus,
      }),
    });

    if (!response.ok) return false;
    const payload = (await response.json().catch(() => null)) as { ok?: boolean } | null;
    return payload?.ok === true;
  } catch {
    return false;
  }
}
