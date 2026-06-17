# FitNow Home Handoff

Updated: 2026-06-17 09:00 KST

## Current Status

- Repository: `https://github.com/restshop7779/fitnow.git`
- Branch: `main`
- Latest app commit at handoff: `Keep diagnostic delivery orders visible during checks`
- Deployed app:
  - `https://restshop7779.github.io/fitnow/`
  - `https://restshop7779.github.io/fitnow/index.react.html`
- GitHub Pages deployment for the latest app fix completed successfully.
- Local working tree was clean when this handoff was written.

## What Was Finished

- GitHub Pages deployment is working from the `gh-pages` branch workflow.
- Total admin release readiness panel is live.
- Admin QA checklist is live.
- Total admin release readiness panel now includes top-level shortcut buttons:
  - `QA 체크리스트`
  - `테스트 데이터 정리`
  - `정산서 미리보기`
  - `정산 CSV`
- Delivery partner login now includes a top-level `배송 작업 바로가기` panel for claim, pickup, delivery start, arrival proof, finish, and today done checks.
- Delivery test orders now stay visible during admin diagnostic checks while remaining excluded from normal operating lists.
- QA checklist CSV download was verified in Chrome.
- Settlement statement preview and settlement CSV download were verified with 6 test settlement rows.
- Test data cleanup now auto-checks the QA cleanup items after cleanup succeeds:
  - `진단 주문과 로그 제거`
  - `최근 정리 시간 갱신`
  - `OPERATING MODE 전환`
  - `운영 홈 테스트 안내 제거`
- The currently opened deploy URL after the latest fix was:
  - `https://restshop7779.github.io/fitnow/index.react.html?fix=1c41048`

## How To Continue At Home

1. Clone or update the repository.

```powershell
git clone https://github.com/restshop7779/fitnow.git
cd fitnow
```

If the repo already exists:

```powershell
cd fitnow
git checkout main
git pull origin main
```

2. Install dependencies if needed.

```powershell
pnpm install
```

3. Run a local build check.

```powershell
.\node_modules\.bin\vite.cmd build
```

4. Open the deployed app.

```text
https://restshop7779.github.io/fitnow/index.react.html
```

## Admin QA Path

1. 하단 메뉴 `관리`
2. `총관리자` 카드 `열기`
3. PIN `0000`
4. 상단 `배포 준비 상태` 패널의 `QA 체크리스트` 클릭
5. 정산 출력 확인은 같은 패널의 `정산서 미리보기` 또는 `정산 CSV` 사용

Nested fallback path:

1. 하단 메뉴 `관리`
2. `총관리자` 카드 `열기`
3. PIN `0000`
4. `배송 대시보드` 펼치기
5. `지금배송 정산 요약` 펼치기
6. `관리자 테스트 도구` 펼치기
7. `QA 체크리스트` 확인

## Next Recommended Work

- Run the final operator QA pass manually:
  - `정산 플로우 점검`
  - `QA 체크리스트`
  - `테스트 데이터 정리`
  - confirm cleanup items auto-check
  - save QA report
- After that, decide whether partner/delivery operator views need the same release-readiness shortcut pattern.
- Next, run a full diagnostic delivery pass and confirm each shortcut lands on the expected dashboard section.

## Reference Docs

- `docs/admin-qa-checklist.md`
- `docs/admin-release-notes.md`
