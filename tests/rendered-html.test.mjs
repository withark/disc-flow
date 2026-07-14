import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("builds the DISC assessment product surface", async () => {
  const [page, assessment, layout, hosting] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/disc-assessment.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    access(new URL("../dist/server/index.js", import.meta.url)),
    access(new URL("../dist-pages/admin/index.html", import.meta.url)),
  ]);

  assert.match(page, /DISC 행동유형 진단 \| DISC FLOW/);
  assert.match(assessment, /진단 시작하기/);
  assert.match(assessment, /응답자 정보를 입력하고/);
  assert.match(assessment, /전체 지도에서 본 나의 결과/);
  assert.match(assessment, /동기를 높이는 조건/);
  assert.doesNotMatch(assessment, /data-testid="next-question"/);
  assert.doesNotMatch(assessment, /view === "home"/);
  assert.match(assessment, /관리자 대시보드/);
  assert.doesNotMatch(assessment, /Apps Script 웹앱 주소/);
  assert.match(assessment, /QUESTIONS\.length/);
  assert.match(layout, /og\.png/);
  assert.match(hosting, /"d1": "DB"/);
  assert.doesNotMatch(`${page}\n${layout}`, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});
