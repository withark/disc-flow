const DISC_SHEET_NAME = 'DISC 응답';
const DISC_HEADERS = [
  'Record ID',
  '응답 시각',
  '이름',
  '팀',
  '대표 유형',
  '보조 유형',
  'D',
  'I',
  'S',
  'C',
  '빠른 속도',
  '사람 중심',
];

function setupDiscSheet() {
  const spreadsheet = getDiscSpreadsheet_();
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheet.getId());
  const sheet = getDiscSheet_(spreadsheet);
  ensureHeaders_(sheet);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, DISC_HEADERS.length);
  return spreadsheet.getName() + ' > ' + sheet.getName();
}

function doGet(event) {
  const action = String((event && event.parameter && event.parameter.action) || 'health');
  if (action !== 'list') {
    return json_({ ok: true, service: 'DISC FLOW Google Sheets bridge' });
  }

  const expectedPassword = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  const suppliedPassword = String(event.parameter.adminPassword || '');
  const callback = safeCallback_(event.parameter.callback);
  if (!expectedPassword || suppliedPassword !== expectedPassword) {
    return jsonp_(callback, { ok: false, error: '관리자 비밀번호가 올바르지 않습니다.' });
  }

  return jsonp_(callback, {
    ok: true,
    destination: getSheetDestination_(),
    results: listResults_(),
  });
}

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || '{}');
    const expectedToken = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
    if (payload.apiToken && expectedToken && payload.apiToken !== expectedToken) {
      return json_({ ok: false, error: 'unauthorized' });
    }

    if (!payload.name || String(payload.name).length > 40) {
      return json_({ ok: false, error: 'invalid participant' });
    }

    const sheet = getDiscSheet_();
    ensureHeaders_(sheet);
    const row = [
      String(payload.recordId || ''),
      String(payload.createdAt || new Date().toISOString()),
      String(payload.name || ''),
      String(payload.team || ''),
      String(payload.dominant || ''),
      String(payload.secondary || ''),
      Number(payload.d || 0),
      Number(payload.i || 0),
      Number(payload.s || 0),
      Number(payload.c || 0),
      Number(payload.pace || 0),
      Number(payload.focus || 0),
    ];

    const recordId = row[0];
    const existing = findRecordRow_(sheet, recordId);
    if (existing) {
      sheet.getRange(existing, 1, 1, DISC_HEADERS.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }

    return json_({ ok: true, recordId: recordId, sheetName: DISC_SHEET_NAME });
  } catch (error) {
    return json_({ ok: false, error: String(error) });
  }
}

function listResults_() {
  const sheet = getDiscSheet_();
  ensureHeaders_(sheet);
  if (sheet.getLastRow() < 2) return [];

  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, DISC_HEADERS.length)
    .getValues()
    .filter(function(row) { return Boolean(row[0]); })
    .map(function(row, index) {
      return {
        id: index + 1,
        recordId: String(row[0]),
        createdAt: row[1] instanceof Date ? row[1].toISOString() : String(row[1]),
        name: String(row[2]),
        team: String(row[3]),
        dominant: String(row[4]),
        secondary: String(row[5]),
        d: Number(row[6] || 0),
        i: Number(row[7] || 0),
        s: Number(row[8] || 0),
        c: Number(row[9] || 0),
        pace: Number(row[10] || 0),
        focus: Number(row[11] || 0),
      };
    })
    .reverse();
}

function getDiscSpreadsheet_() {
  const spreadsheetId = String(
    PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || ''
  ).trim();
  if (spreadsheetId) return SpreadsheetApp.openById(spreadsheetId);

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('스크립트 속성 SPREADSHEET_ID에 저장할 Google 스프레드시트 ID를 입력하세요.');
  }
  return spreadsheet;
}

function getDiscSheet_(spreadsheet) {
  spreadsheet = spreadsheet || getDiscSpreadsheet_();
  return spreadsheet.getSheetByName(DISC_SHEET_NAME) || spreadsheet.insertSheet(DISC_SHEET_NAME);
}

function getSheetDestination_() {
  const spreadsheet = getDiscSpreadsheet_();
  return {
    spreadsheetName: spreadsheet.getName(),
    spreadsheetUrl: spreadsheet.getUrl(),
    sheetName: DISC_SHEET_NAME,
  };
}

function ensureHeaders_(sheet) {
  const current = sheet.getRange(1, 1, 1, DISC_HEADERS.length).getValues()[0];
  if (current.join('|') !== DISC_HEADERS.join('|')) {
    sheet.getRange(1, 1, 1, DISC_HEADERS.length).setValues([DISC_HEADERS]);
    sheet.getRange(1, 1, 1, DISC_HEADERS.length).setFontWeight('bold').setBackground('#eaf4ef');
  }
}

function findRecordRow_(sheet, recordId) {
  if (!recordId || sheet.getLastRow() < 2) return null;
  const match = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(recordId)
    .matchEntireCell(true)
    .findNext();
  return match ? match.getRow() : null;
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function safeCallback_(value) {
  const callback = String(value || 'discFlowCallback').replace(/[^a-zA-Z0-9_.$]/g, '');
  return callback || 'discFlowCallback';
}

function jsonp_(callback, payload) {
  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(payload) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
