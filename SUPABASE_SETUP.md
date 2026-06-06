# Supabase 연결 순서

프로젝트:

```text
https://supabase.com/dashboard/project/tncxltvgqnwbezcyewcs
```

앱에서 사용할 URL:

```text
https://tncxltvgqnwbezcyewcs.supabase.co
```

## 1. anon key 넣기

Supabase Dashboard에서 `Project Settings` → `API`로 이동한 뒤 `anon public` key를 복사합니다.

프로젝트의 `.env` 파일에 붙여 넣습니다.

```env
VITE_SUPABASE_URL=https://tncxltvgqnwbezcyewcs.supabase.co
VITE_SUPABASE_ANON_KEY=여기에_anon_public_key
```

`.env`는 Git에 저장되지 않도록 제외되어 있습니다.

## 2. 테이블 만들기

Supabase Dashboard의 `SQL Editor`에서 아래 파일 내용을 실행합니다.

```text
docs/supabase-schema.sql
```

## 3. 샘플 데이터 넣기

스키마 실행 후 SQL Editor에서 아래 파일 내용을 실행합니다.

```text
docs/supabase-seed.sql
```

## 4. 앱 다시 빌드

```powershell
& "C:\Program Files\nodejs\npm.cmd" run build:local
```

개발 서버로 볼 때는:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run dev:local
```

## 연결 확인

앱 상단 상태가 `실시간 쇼룸 재고`로 표시되면 Supabase 상품/쇼룸 데이터를 읽고 있는 상태입니다. 키가 비어 있거나 요청이 실패하면 앱은 로컬 샘플 데이터로 계속 동작합니다.
