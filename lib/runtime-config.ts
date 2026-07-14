import { env } from "cloudflare:workers";

type RuntimeEnvironment = {
  ADMIN_PASSWORD?: string;
  GOOGLE_SHEETS_WEBHOOK_URL?: string;
  GOOGLE_SHEETS_API_TOKEN?: string;
};

function runtimeEnvironment() {
  return env as unknown as RuntimeEnvironment;
}

export function getAdminPassword() {
  return runtimeEnvironment().ADMIN_PASSWORD?.trim() ?? "";
}

export function getGoogleSheetsConfig() {
  const runtime = runtimeEnvironment();
  return {
    url: runtime.GOOGLE_SHEETS_WEBHOOK_URL?.trim() ?? "",
    token: runtime.GOOGLE_SHEETS_API_TOKEN?.trim() ?? "",
  };
}

export function googleSheetsConfigured() {
  const config = getGoogleSheetsConfig();
  return Boolean(config.url && config.token);
}
