# Supabase 연결 설정

FitNow는 Supabase를 상품, 주문, 리뷰, 배송 인증 사진 저장소로 사용합니다.

## 1. 프로젝트 정보

Dashboard:

```text
https://supabase.com/dashboard/project/tncxltvgqnwbezcyewcs
```

앱에서 사용하는 URL:

```text
https://tncxltvgqnwbezcyewcs.supabase.co
```

## 2. `.env` 설정

프로젝트 루트의 `.env`에 아래 값을 넣습니다.

```env
VITE_SUPABASE_URL=https://tncxltvgqnwbezcyewcs.supabase.co
VITE_SUPABASE_ANON_KEY=Supabase Dashboard에서 복사한 anon public key
```

anon key 위치:

```text
Supabase Dashboard > Project Settings > API > anon public
```

`.env`는 민감 정보가 들어갈 수 있으므로 Git에 커밋하지 않습니다.

## 3. DB 스키마 적용

Supabase Dashboard의 SQL Editor에서 아래 파일 내용을 실행합니다.

```text
docs/supabase-schema.sql
```

이 파일은 주요 테이블과 Storage 버킷을 준비합니다.

주요 테이블:

- `showrooms`
- `products`
- `orders`
- `order_items`
- `look_sets`
- `look_set_items`
- `product_reviews`
- `wishlists`

주요 Storage 버킷:

- `delivery-proof-photos`
- `review-photos`

## 4. 샘플 데이터 적용

스키마 적용 후 SQL Editor에서 아래 파일 내용을 실행합니다.

```text
docs/supabase-seed.sql
```

## 5. 연결 확인

로컬에서 최신 빌드 또는 개발 서버를 실행합니다.

```powershell
& "C:\Program Files\nodejs\npm.cmd" run build:local
```

또는:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run dev:local
```

앱 상단이나 관리자 도구의 DB 연결 확인에서 Supabase 연결, 테이블, Storage 버킷 상태를 확인합니다.

## 6. 자주 나는 문제

`delivery-proof-photos Bucket not found`:

- `docs/supabase-schema.sql`이 최신 상태로 실행되지 않은 경우입니다.
- SQL Editor에서 스키마 파일을 다시 실행합니다.

상품이나 주문이 로컬 샘플만 보임:

- `.env`의 `VITE_SUPABASE_ANON_KEY`가 비어 있거나 잘못된 경우입니다.
- 브라우저를 새로고침하거나 로컬 서버를 다시 실행합니다.

사진 업로드가 실패함:

- Storage 버킷 정책이 적용되지 않았을 가능성이 큽니다.
- `docs/supabase-schema.sql`의 Storage 정책 구간까지 실행됐는지 확인합니다.
