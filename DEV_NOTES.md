# FitNow 개발 메모

## 현재 구조

FitNow는 Vite 기반 단일 페이지 앱입니다. 현재 실제 화면은 `index.react.html`에서 시작하고, 핵심 로직은 `src/standalone-app.js`에 많이 모여 있습니다.

주요 파일:

| 경로 | 역할 |
| --- | --- |
| `index.react.html` | 앱 진입 HTML |
| `src/standalone-app.js` | 현재 메인 앱 로직 |
| `src/styles.css` | 현재 메인 스타일 |
| `src/standalone/config.js` | 저장소 키, Supabase 환경값 등 공통 설정 |
| `src/services/*` | React 소스 쪽 Supabase 서비스 |
| `scripts/build-local.ps1` | 로컬 확인용 빌드 |
| `scripts/serve-dist.js` | `dist` 폴더를 서빙하는 확인용 서버 |
| `scripts/check-deploy-smoke.js` | 배포 산출물 기본 점검 |
| `scripts/check-home-clicks.js` | 홈 주요 클릭 E2E 점검 |

## 실행 기준

- 개발 중에는 `01_DEV_SERVER_HOT_RELOAD.bat` 또는 `npm run dev:local`을 사용합니다.
- 고객/친구에게 보여주기 전에는 `02_PREVIEW_BUILD_AND_OPEN.bat`를 사용합니다.
- `dist`는 빌드 결과물이므로 원본 수정은 `src`, `scripts`, 문서 파일에서 진행합니다.

## 현재 주요 기능

- 쇼핑 홈, 카테고리, 검색, 필터, 상품 상세
- 찜, 장바구니, 주문, 고객 추적 화면
- 카카오/네이버 로그인 테스트 흐름과 게스트 흐름
- 입점업체 주문 관리, 반품/환불 처리
- 총관리자 주문/정산/QA 도구
- 배송 완료 사진 인증 및 Supabase Storage 연동
- 리뷰 사진 등록, 교체, 삭제, 관리자 숨김 처리
- 홈 주요 버튼 E2E 및 배포 스모크 체크

## Supabase

Supabase 프로젝트:

```text
https://supabase.com/dashboard/project/tncxltvgqnwbezcyewcs
```

환경 변수는 `.env`에 둡니다. `.env`는 Git에 올리지 않습니다.

```env
VITE_SUPABASE_URL=https://tncxltvgqnwbezcyewcs.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

스키마와 샘플 데이터:

- `docs/supabase-schema.sql`
- `docs/supabase-seed.sql`

## 작업 전후 체크

작업 전:

```powershell
git status --short
```

작업 후:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run build:local
& "C:\Program Files\nodejs\npm.cmd" run check:deploy
& "C:\Program Files\nodejs\npm.cmd" run check:e2e
```

푸시 후에는 GitHub Actions의 `Deploy GitHub Pages`가 성공했는지 확인합니다.

## 주의할 점

- `standalone-preview.html`은 과거 작업 이력상 남아 있는 큰 단일 HTML입니다. 현재는 `index.react.html`과 `src` 기준으로 작업합니다.
- `dist` 폴더는 확인용 빌드 결과라 변경된 것처럼 보여도 보통 커밋하지 않습니다.
- 문서와 실행 파일은 UTF-8 기준으로 유지합니다.
