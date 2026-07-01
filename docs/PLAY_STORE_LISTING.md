# Google Play Store Listing Copy

Use this for the first internal testing store listing. Keep public production claims conservative until payments, returns, settlement, and store operations are fully verified.

## FitNow

- App name: `FitNow`
- Package: `com.fitnow.app`
- Category: Shopping
- Developer name currently used: `FitNow Korea`
- Privacy policy: `https://restshop7779.github.io/fitnow/privacy.html`
- Account/data deletion: `https://restshop7779.github.io/fitnow/data-deletion.html`

### Short Description

동네 패션 상품을 둘러보고 예약, 배송 추적, 반품/환불 요청을 한 번에 확인하는 쇼핑 앱입니다.

### Full Description

FitNow는 지역 패션 매장의 상품을 모바일에서 확인하고 예약 주문과 배송 진행상태를 추적할 수 있는 쇼핑 앱입니다.

고객은 홈 화면에서 상품을 탐색하고, 상세 정보와 장바구니를 확인한 뒤 주문을 예약할 수 있습니다. 주문 이후에는 매장 확인, 픽업 준비, 배송 진행, 배송 완료 상태를 앱에서 확인할 수 있습니다.

입점업체는 들어온 주문을 확인하고 재고 확인, 픽업 준비, 반품/환불 요청 확인 같은 운영 업무를 처리할 수 있습니다.

첫 배포는 내부 테스트용입니다. 테스트 기간에는 고객 쇼핑 흐름, 입점업체 주문 처리, 배송 추적, 배송 인증 사진, 반품/환불 요청 화면을 중점적으로 확인합니다.

### Release Notes

FitNow 고객/입점업체 내부 테스트 첫 빌드입니다.

확인 항목:
- 상품 탐색, 상세보기, 장바구니
- 무료배송 예약 주문
- 입점업체 주문 확인 및 픽업 준비
- 고객 배송 추적 화면
- 반품/환불 요청 화면
- 로그인/로그아웃 및 역할별 화면 분리

## FitNow Rider

- App name: `FitNow Rider`
- Package: `com.fitnow.rider`
- Category: Business or Productivity
- Privacy policy: `https://restshop7779.github.io/fitnow/privacy.html`
- Account/data deletion: `https://restshop7779.github.io/fitnow/data-deletion.html`

### Short Description

FitNow 배송 파트너가 오픈콜, 배정, 픽업, 도착 인증을 확인하는 배송 업무 앱입니다.

### Full Description

FitNow Rider는 FitNow 배송 파트너를 위한 별도 업무 앱입니다.

배송 파트너는 배송사 계정으로 로그인해 오픈콜을 확인하고, 담당 배송을 배정받아 픽업과 도착 인증 흐름을 처리할 수 있습니다. 고객/입점업체용 화면과 분리되어 배송 업무에 필요한 정보와 작업만 확인하도록 구성되어 있습니다.

첫 배포는 내부 테스트용입니다. 테스트 기간에는 배송사 로그인, 오픈콜 표시, 배송 배정, 픽업 인증, 도착 인증, 배송 완료 처리 흐름을 중점적으로 확인합니다.

### Release Notes

FitNow Rider 배송 업무 내부 테스트 첫 빌드입니다.

확인 항목:
- 배송사 앱 실행 화면
- 배송사 로그인
- 오픈콜 확인
- 배송 배정 및 기사 선택
- 픽업/도착 인증
- 배송 완료 처리
- 고객/입점업체 앱과의 역할 분리

## Screenshot Plan

Phone screenshots are generated under `docs/play-store-assets/`.

App icon candidate:

- `public/icons/fitnow-icon-512.png`

Suggested upload order for FitNow:

1. `fitnow-phone-01-home.png`
2. `fitnow-phone-02-product-detail.png`
3. `fitnow-phone-03-cart.png`
4. `fitnow-phone-04-looks.png`
5. `fitnow-phone-05-my-page.png`

Suggested upload order for FitNow Rider:

1. `fitnow-rider-phone-01-home.png`

Feature graphic:

- `fitnow-feature-graphic.png`

## Asset Requirements Checked

Official Google Play preview asset guidance says screenshots should be PNG or JPEG, up to 8 MB each, with supported dimensions between 320 px and 3840 px. Use at least 2 phone screenshots for the public store listing; for internal testing, keep the same assets ready so the listing can be completed quickly after account verification.
