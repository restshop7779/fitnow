# FitNow

패션 아이템 즉시배송 앱 프로토타입입니다. 배달앱처럼 빠르게 담고, 예약하고, 배송 상태를 추적하는 흐름을 패션 쇼룸 경험에 맞춰 구성했습니다.

## 바로 실행

개발 서버:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run dev:local
```

빌드:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run build:local
```

개발 화면은 `http://127.0.0.1:5173/index.react.html`에서 확인합니다. 빌드 결과는 `dist/index.react.html`에 생성됩니다.

## Supabase

현재 프로젝트 URL은 아래 값으로 설정했습니다.

```text
https://tncxltvgqnwbezcyewcs.supabase.co
```

anon key 설정과 SQL 실행 순서는 [SUPABASE_SETUP.md](SUPABASE_SETUP.md)를 참고합니다.

## 현재 기능

- 감각적인 홈 화면과 즉시배송 상품 카드
- 상품명, 쇼룸, 소재 검색
- 쇼룸별 재고, 남은 수량, 예상 도착 시간 표시
- 쇼룸별 필터, 45분 안 도착 필터, 빠른 도착/매치율/재고순 정렬
- 상품 상세의 쇼룸/재고/도착 시간 정보
- 추천 세트 담기
- 장바구니 수량 조절과 항목 삭제
- 배송지와 요청사항 입력
- 예약 완료 화면과 영수증 카드
- 주문 목록, 주문 상세, 실시간 배송 추적
- 게스트/이메일 사용자 상태
- 게스트 장바구니의 로그인 계정 이어받기
- 사용자별 로컬 장바구니와 주문 기록 저장
- Supabase 상품/쇼룸/주문 연결 준비

## 다음 개발 방향

1. Supabase anon key 입력 후 실제 DB 연결 확인
2. 실제 Supabase Auth 사용자 정보 보강
3. 주문 상태 변경 시뮬레이션
4. 쇼룸/상품 운영자 입력 화면
5. 결제 PG 연결 준비
