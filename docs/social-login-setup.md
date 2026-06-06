# FitNow Social Login Setup

## Kakao

1. Supabase Dashboard > Authentication > Providers > Kakao enable.
2. Kakao Developers에서 앱을 만들고 REST API key / Client Secret을 발급한다.
3. Supabase Kakao provider에 Client ID와 Client Secret을 입력한다.
4. Kakao Developers Redirect URI에는 Supabase가 보여주는 callback URL을 등록한다.
5. Supabase Auth URL Configuration에 앱 실행 URL을 Redirect URL로 추가한다.

Note: Kakao `account_email` requires a Kakao Biz App. FitNow requests only `profile_nickname profile_image` in the app code so Kakao login can work without email permission. Customer identity is stored with the Supabase Auth user id instead of email.

## Naver

1. Supabase Dashboard > Authentication > Providers > Custom OAuth Providers > New Provider.
2. Identifier는 `custom:naver`로 만든다.
3. OAuth2 manual configuration을 사용한다.
4. Authorization URL: `https://nid.naver.com/oauth2.0/authorize`
5. Token URL: `https://nid.naver.com/oauth2.0/token`
6. UserInfo URL: `https://openapi.naver.com/v1/nid/me`
7. Naver Developers에 Supabase callback URL을 등록한다.
8. Supabase Auth URL Configuration에 앱 실행 URL을 Redirect URL로 추가한다.

## Local Test Note

OAuth redirect is not reliable from `file://` URLs. Run the app from `localhost` or deploy it before testing Kakao/Naver login.
