import {
  formatKRW,
  itemNormalPrice,
  itemSalePrice,
} from "./format.js";
import { groupCartPickups } from "./cart.js";

export function emptyOrderSummaryMarkup() {
  return `
    <section class="summary-card">
      <h3>예약할 상품이 없습니다</h3>
      <div class="line-item"><span>상품을 먼저 담으면</span><strong>배송 흐름을 볼 수 있어요</strong></div>
    </section>
  `;
}

export function orderSummaryMarkup({ cart, lastOrder, eta, paymentLabelForOrder, assignedRiderLabel }) {
  const orderForSummary = lastOrder && lastOrder.items.length ? lastOrder : null;
  const summaryItems = orderForSummary ? orderForSummary.items : cart;
  const normalSubtotal = summaryItems.reduce((sum, item) => sum + itemNormalPrice(item) * item.quantity, 0);
  const subtotal = orderForSummary ? orderForSummary.subtotal : cart.reduce((sum, item) => sum + itemSalePrice(item) * item.quantity, 0);
  const discountAmount = Math.max(0, normalSubtotal - subtotal);
  const deliveryFee = orderForSummary ? orderForSummary.deliveryFee : subtotal >= 120000 ? 0 : 3500;
  const total = orderForSummary ? orderForSummary.total : subtotal + deliveryFee;
  const itemRows = summaryItems.map((item) => `
    <div class="line-item">
      <span>${item.name} · ${item.size || "FREE"} x ${item.quantity}</span>
      <strong>${formatKRW(itemSalePrice(item) * item.quantity)}</strong>
    </div>
  `).join("");
  const pickupRows = Object.entries(groupCartPickups(summaryItems, eta)).map(([showroom, info]) => `
    <div class="pickup-row">
      <span>${showroom} - ${info.count}개 픽업</span>
      <strong class="pickup-status">${info.minutes}분 준비</strong>
    </div>
  `).join("");
  const deliveryInfoRows = orderForSummary ? `
    <section class="summary-card">
      <h3>배송 요청</h3>
      <div class="line-item"><span>수령 방식</span><strong>${orderForSummary.receiveType || "문앞 수령"}</strong></div>
      <div class="line-item"><span>결제수단</span><strong>${orderForSummary.paymentMethod || "카카오페이"}</strong></div>
      <div class="line-item"><span>요청사항</span><strong>${orderForSummary.riderRequest || "없음"}</strong></div>
    </section>
  ` : "";

  return `
    <section class="summary-card">
      <h3>선택한 아이템</h3>
      ${itemRows}
    </section>
    <section class="summary-card">
      <h3>쇼룸 픽업 상태</h3>
      ${pickupRows}
    </section>
    ${deliveryInfoRows}
    <section class="summary-card">
      <h3>결제 예정 금액</h3>
      <div class="price-row"><span>정상가 합계</span><strong>${formatKRW(normalSubtotal)}</strong></div>
      <div class="price-row"><span>할인 금액</span><strong>${discountAmount ? "-" + formatKRW(discountAmount) : "KRW 0"}</strong></div>
      <div class="price-row"><span>상품 할인가</span><strong>${formatKRW(subtotal)}</strong></div>
      <div class="price-row"><span>지금배송비</span><strong>${deliveryFee ? formatKRW(deliveryFee) : "무료"}</strong></div>
      <div class="price-row total-row"><span>총 결제 예정</span><strong>${formatKRW(total)}</strong></div>
    </section>
    <section class="summary-card">
      <h3>결제와 배송 배정</h3>
      <div class="line-item"><span>결제 상태</span><strong>${orderForSummary ? paymentLabelForOrder(orderForSummary) : "결제 대기"}</strong></div>
      <div class="line-item"><span>결제수단</span><strong>${orderForSummary ? orderForSummary.paymentMethod || "카카오페이" : "선택 대기"}</strong></div>
      <div class="line-item"><span>배송 배정</span><strong>${orderForSummary ? assignedRiderLabel(orderForSummary) : "주문 후 오픈콜 배정"}</strong></div>
      ${orderForSummary && orderForSummary.paid ? '<button class="primary" type="button" disabled style="width:100%;margin-top:8px;">결제 완료</button>' : '<button class="primary" type="button" onclick="payOrder()" style="width:100%;margin-top:8px;">결제하기</button>'}
    </section>
  `;
}

export function deliveryFormMarkup({ customerName, phone, address }) {
  return `
    <section class="summary-card">
      <h3>배송 정보 확인</h3>
      <form class="delivery-form" onsubmit="confirmCheckout(event)">
        <div class="form-grid">
          <label>고객명
            <input id="orderCustomerName" type="text" value="${customerName || "고객"}" required />
          </label>
          <label>휴대폰
            <input id="orderCustomerPhone" type="tel" value="${phone}" placeholder="01012345678" required />
          </label>
        </div>
        <label>배송 주소
          <div class="address-search compact">
            <input id="orderAddress" type="search" value="${address}" placeholder="동탄역, 오산역, 세교 등 주소 검색" oninput="updateOrderAddressSearch()" required />
            <div class="address-suggestions" id="orderAddressSuggestions"></div>
          </div>
        </label>
        <label>수령 방식
          <select id="receiveType">
            <option>문앞 수령</option>
            <option>공동현관 앞</option>
            <option>직접 수령</option>
            <option>경비실 보관</option>
          </select>
        </label>
        <label>결제수단
          <select id="paymentMethod">
            <option>카카오페이</option>
            <option>네이버페이</option>
            <option>카드결제</option>
            <option>현장결제</option>
          </select>
        </label>
        <label>라이더 요청사항
          <textarea id="riderRequest" placeholder="예: 도착 전 연락 주세요. 공동현관 비밀번호는 주문 후 안내합니다."></textarea>
        </label>
        <button class="primary" type="submit">주문 확정</button>
      </form>
    </section>
  `;
}

export function emptyOrdersMarkup() {
  return `
    <section class="summary-card">
      <h3>아직 주문 내역이 없습니다</h3>
      <div class="line-item"><span>상품을 담고 배송 예약을 하면</span><strong>여기에 표시돼요</strong></div>
    </section>
  `;
}

export function orderListMarkup(orders, helpers) {
  return orders.map((order) => `
    <section class="order-card">
      <div class="order-card-head">
        <div>
          <strong>${order.id}</strong>
          <span>${order.createdLabel} - ${order.region}</span>
        </div>
        <span class="order-status">${helpers.orderDisplayLabel(order)}</span>
      </div>
      <div class="line-item"><span>${order.items[0].name}${order.items.length > 1 ? " 외 " + (order.items.length - 1) + "개" : ""}</span><strong>${formatKRW(order.total)}</strong></div>
      <div class="line-item"><span>${order.address}</span><strong>${order.fastest}분</strong></div>
      <div class="line-item"><span>${order.receiveType || "문앞 수령"}</span><strong>${order.riderRequest ? "요청 있음" : "요청 없음"}</strong></div>
      <div class="line-item"><span>${order.paymentMethod || "카카오페이"}</span><strong>${helpers.paymentLabelForOrder(order)}</strong></div>
      ${helpers.customerRefundStatusLabel && helpers.customerRefundStatusLabel(order) ? '<div class="line-item"><span>반품/환불 상태</span><strong>' + helpers.customerRefundStatusLabel(order) + '</strong></div>' : ""}
      ${helpers.customerRefundStatusDetail && helpers.customerRefundStatusDetail(order) ? '<div class="line-item"><span>처리 안내</span><strong>' + helpers.customerRefundStatusDetail(order) + '</strong></div>' : ""}
      <div class="line-item"><span>담당 기사</span><strong>${helpers.assignedRiderLabel(order)}</strong></div>
      ${helpers.isOrderCancelled(order) ? '<div class="line-item"><span>취소 분류</span><strong>' + helpers.cancelReasonLabel(order) + '</strong></div>' : ""}
      ${helpers.isOrderCancelled(order) ? '<div class="line-item"><span>취소 사유</span><strong>' + (order.cancelReason || "사유 미입력") + '</strong></div>' : ""}
      ${helpers.canReviewOrder(order) ? '<div class="line-item"><span>리뷰</span><strong>' + helpers.orderReviewCount(order) + '/' + order.items.length + '개 작성</strong></div>' : ""}
      <div class="mini-actions">
        <button type="button" onclick="selectOrder('${order.id}')">추적 보기</button>
        <button type="button" ${helpers.canReviewOrder(order) ? "" : "disabled"} onclick="reviewOrder('${order.id}')">${helpers.canReviewOrder(order) ? "리뷰 작성" : "배송 완료 후 리뷰"}</button>
        <button class="danger" type="button" ${helpers.canCancelOrder(order) ? "" : "disabled"} onclick="cancelOrder('${order.id}', 'customer')">${helpers.customerCancelActionLabel ? helpers.customerCancelActionLabel(order) : helpers.isOrderCancelled(order) ? "취소됨" : "주문 취소"}</button>
      </div>
    </section>
  `).join("");
}

export function timelineMarkup(steps, current) {
  return steps.map((step, index) => `
    <div class="step ${index <= current ? "done" : ""}">
      <span class="dot"></span>
      <span>${step}</span>
      <span>${index <= current ? "완료" : "대기"}</span>
    </div>
  `).join("");
}
