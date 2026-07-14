# DISC FLOW

모바일과 데스크톱에서 사용하는 DISC 행동유형 진단 및 팀 운영 도구입니다.

- 공개 검사 주소: <https://withark.github.io/disc-flow/>
- 관리자 주소: <https://withark.github.io/disc-flow/admin/>

## 주요 기능

- 24개 양자택일 문항과 D/I/S/C 개인 결과
- Cloudflare D1 기반 결과 저장
- 관리자 응답 현황, 필터, CSV 내보내기
- 대표유형이 한 조에 몰리지 않는 DISC 균형 조 편성
- 팀 분포에 맞춘 관찰 포인트와 디브리핑 질문
- Google Sheets 자동 적재 및 기존 결과 재동기화

## 로컬 실행

Node.js 22 이상이 필요합니다.

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local`에서 `ADMIN_PASSWORD`를 반드시 변경하세요. 비밀번호와 Google Sheets 토큰은 Git에 커밋하지 않습니다.

## Google Sheets 연결

1. 새 Google 스프레드시트를 만들고 `확장 프로그램 > Apps Script`를 엽니다.
2. [google-apps-script/Code.gs](google-apps-script/Code.gs)의 내용을 Apps Script 편집기에 넣습니다.
3. 프로젝트 설정에서 스크립트 속성 `ADMIN_PASSWORD`를 만들고 관리자 비밀번호를 입력합니다. 비공개 서버 동기화도 사용할 경우 `API_TOKEN`을 추가합니다.
4. Apps Script 편집기에서 `setupDiscSheet` 함수를 한 번 실행합니다.
5. `배포 > 새 배포 > 웹 앱`에서 실행 사용자를 본인, 액세스 사용자를 모든 사용자로 설정해 배포합니다.
6. 공개 사이트의 `/admin/`에서 3단계 관리자 비밀번호를 입력합니다.
7. 로그인 후 `검사 링크 복사`를 눌러 일반 검사 주소를 참여자에게 공유합니다.

```env
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
GOOGLE_SHEETS_API_TOKEN=3단계에서-설정한-토큰
```

GitHub Pages에서는 Apps Script 웹앱이 결과 저장소 역할을 합니다. 웹앱 주소는 사이트 설정에 포함되지만 관리자 비밀번호는 포함되지 않습니다. 기존 비공개 서버 배포에서는 웹 앱 주소와 토큰을 서버 환경에만 저장하며, `Sheets 동기화` 버튼으로 기존 D1 결과를 Record ID 기준으로 추가하거나 갱신할 수 있습니다.

## 배포 구조

공개 검사 화면은 GitHub Pages에서 실행되고 Google Apps Script를 통해 Google Sheets에 저장합니다. 같은 소스에는 Cloudflare D1을 사용하는 비공개 서버 배포도 포함되어 있습니다.

```bash
npm test
```

위 명령은 배포 빌드와 팀 편성 로직 테스트를 함께 실행합니다.
