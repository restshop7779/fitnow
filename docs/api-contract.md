# FitNow API 계약 초안

## 상품 목록

`products`는 쇼룸 재고와 배송 가능 시간을 포함합니다.

필수 필드:

- `id`
- `slug`
- `name`
- `price`
- `category`
- `meta`
- `tone`
- `material`
- `fit`
- `match_score`
- `stock_quantity`
- `delivery_minutes`
- `visual_key`
- `showroom_id`

## 쇼룸 목록

`showrooms`는 지역 기반 편집샵 정보를 담습니다.

필수 필드:

- `id`
- `slug`
- `name`
- `area`
- `summary`
- `average_delivery_minutes`

## 주문 생성

앱의 `lineItems`는 `toOrderItems()`를 거쳐 `order_items` 저장 형태로 변환합니다.

주문 생성 순서:

1. `orders`에 주문 헤더를 생성합니다.
2. 반환된 `orders.id`를 사용해 `order_items`를 일괄 생성합니다.
3. 성공하면 장바구니를 비우고 배송 추적 화면을 엽니다.

## 주문 상태

현재 추적 화면은 아래 상태 흐름을 기준으로 동작합니다.

- `reserved`
- `stock_checked`
- `styled`
- `pickup`
- `arriving`
- `delivered`
- `cancelled`

앱의 타임라인 표시는 `status`를 `statusIndex`로 매핑해서 처리하면 됩니다.
