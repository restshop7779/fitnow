# FitNow 개발 메모

## 현재 방향

FitNow는 음식 배달이 아니라 패션 아이템을 즉시 배송하는 모바일 앱 콘셉트입니다. 배달앱처럼 익숙한 주문 흐름을 유지하면서, 쇼룸 재고, 스타일 추천, 배송 추적, 예약 완료 영수증까지 패션 서비스에 맞게 구성했습니다.

## 현재 앱 상태

- 정적 구버전 미리보기는 `index.html`에 남아 있습니다.
- 실제 확장 중인 앱은 React/Vite 버전이며 `index.react.html`과 `src/` 아래에 구현되어 있습니다.
- 빌드 결과는 `dist/index.react.html`에 생성됩니다.
- 상품/쇼룸 기본 데이터는 `src/data.js`에 있습니다.
- 주요 UI는 `src/components/` 아래에 있습니다.
- Supabase REST 연결은 `src/lib/supabaseClient.js`에서 담당합니다.
- 상품/쇼룸 조회는 `src/services/catalogService.js`, 주문 저장/조회는 `src/services/orderService.js`에 있습니다.
- 로컬 저장 유틸은 `src/utils/storage.js`에 있습니다.

## 최근 구현

- 상품명, 쇼룸명, 소재 기반 검색을 추가했습니다.
- 쇼룸 필터, 45분 안 도착 필터, 빠른 도착/매치율/재고순 정렬을 추가했습니다.
- 상품 카드와 상품 상세에 쇼룸명, 남은 수량, 예상 도착 시간을 표시합니다.
- 장바구니 수량 증가/감소, 항목 삭제, 배송지 선택, 요청사항 입력을 지원합니다.
- 게스트 장바구니를 이메일 로그인 계정으로 자동 병합합니다.
- 주문 목록, 주문 상세, 실시간 추적 화면을 분리했습니다.
- 주문 완료 후 예약 완료 시트와 영수증 카드를 표시합니다.
- Supabase 샘플 데이터 입력용 `docs/supabase-seed.sql`을 추가했습니다.

## Supabase 프로젝트

Dashboard:

```text
https://supabase.com/dashboard/project/tncxltvgqnwbezcyewcs
```

앱 URL:

```text
https://tncxltvgqnwbezcyewcs.supabase.co
```

현재 `.env`에는 URL만 입력되어 있습니다. `VITE_SUPABASE_ANON_KEY`에는 Supabase Dashboard의 `Project Settings` → `API`에서 `anon public` key를 복사해 넣어야 합니다.

연결 순서:

1. `.env`에 anon key를 넣습니다.
2. Supabase SQL Editor에서 `docs/supabase-schema.sql`을 실행합니다.
3. Supabase SQL Editor에서 `docs/supabase-seed.sql`을 실행합니다.
4. 앱을 다시 빌드하거나 개발 서버를 재시작합니다.
5. 앱 상단 상태가 `실시간 쇼룸 재고`로 바뀌면 DB 연결이 된 상태입니다.

자세한 순서는 `SUPABASE_SETUP.md`에 정리했습니다.

## 실행 명령

개발 서버:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run dev:local
```

정적 빌드:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run build:local
```

## 도구 상태

- Node.js: `C:\Program Files\nodejs\node.exe`
- npm: `C:\Program Files\nodejs\npm.cmd`
- Git: `C:\Program Files\Git\cmd\git.exe`
- 현재 `node_modules`는 기존 pnpm 설치본을 사용합니다.
- Codex 환경에서 npm registry 접근이 막힐 수 있어 `build:local`을 우선 사용합니다.

## 다음 작업 후보

1. Supabase anon key 입력 후 실제 DB 연결 확인
2. 실제 Supabase Auth 사용자 정보 보강
3. 주문 상태 변경 시뮬레이션
4. 쇼룸/상품 운영자 입력 화면
5. 결제 PG 연결 준비
