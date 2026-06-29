import {
  formatKRW,
  itemNormalPrice,
  itemSalePrice,
} from "./format.js";
import { groupCartPickups } from "./cart.js";

function cartCheckoutTotals(items) {
  const normalSubtotal = items.reduce((sum, item) => sum + itemNormalPrice(item) * item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + itemSalePrice(item) * item.quantity, 0);
  const discountAmount = Math.max(0, normalSubtotal - subtotal);
  return { normalSubtotal, subtotal, discountAmount, deliveryFee: 0, total: subtotal };
}

export function emptyOrderSummaryMarkup() {
  return `
    <section class="summary-card">
      <h3>예약할 상품이 없습니다</h3>
      <div class="line-item"><span>상품을 먼저 담으면</span><strong>배송 예약을 진행할 수 있어요</strong></div>
    </section>
  `;
}

export function orderSummaryMarkup({ cart, lastOrder, eta, paymentLabelForOrder, assignedRiderLabel }) {
  const orderForSummary = lastOrder && lastOrder.items.length ? lastOrder : null;
  const summaryItems = orderForSummary ? orderForSummary.items : cart;
  const totals = orderForSummary
    ? {
        normalSubtotal: summaryItems.reduce((sum, item) => sum + itemNormalPrice(item) * item.quantity, 0),
        subtotal: orderForSummary.subtotal,
        discountAmount: Math.max(0, summaryItems.reduce((sum, item) => sum + itemNormalPrice(item) * item.quantity, 0) - orderForSummary.subtotal),
        deliveryFee: orderForSummary.deliveryFee || 0,
        total: orderForSummary.total,
      }
    : cartCheckoutTotals(summaryItems);
  const fastest = summaryItems.length ? Math.min(...summaryItems.map((item) => eta(item))) : 0;
  const itemCount = summaryItems.reduce((sum, item) => sum + item.quantity, 0);
  const itemRows = summaryItems.map((item) => `
    <div class="line-item">
      <span>${item.name} · ${item.size || "FREE"} x ${item.quantity}</span>
      <strong>${formatKRW(itemSalePrice(item) * item.quantity)}</strong>
    </div>
  `).join("");
  const pickupRows = Object.entries(groupCartPickups(summaryItems, eta)).map(([showroom, info]) => `
    <div class="pickup-row">
      <span>${showroom} · ${info.count}개 픽업</span>
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
    <section class="order-confirm-hero">
      <div><span>상품</span><strong>${itemCount}개</strong></div>
      <div><span>배송비</span><strong>무료</strong></div>
      <div><span>예상 도착</span><strong>${fastest ? fastest + "분" : "확인 중"}</strong></div>
    </section>
    <section class="summary-card">
      <h3>선택한 상품</h3>
      ${itemRows}
    </section>
    <section class="summary-card">
      <h3>매장 픽업 상태</h3>
      ${pickupRows}
    </section>
    ${deliveryInfoRows}
    <section class="summary-card">
      <h3>결제 예정 금액</h3>
      <div class="price-row"><span>정상가 합계</span><strong>${formatKRW(totals.normalSubtotal)}</strong></div>
      <div class="price-row"><span>할인 금액</span><strong>${totals.discountAmount ? "-" + formatKRW(totals.discountAmount) : "KRW 0"}</strong></div>
      <div class="price-row"><span>상품 할인가</span><strong>${formatKRW(totals.subtotal)}</strong></div>
      <div class="price-row"><span>지금배송비</span><strong>무료</strong></div>
      <div class="price-row total-row"><span>총 결제 예정</span><strong>${formatKRW(totals.total)}</strong></div>
    </section>
    <section class="summary-card">
      <h3>결제와 배송 배정</h3>
      <div class="line-item"><span>결제 상태</span><strong>${orderForSummary ? paymentLabelForOrder(orderForSummary) : "주문 확정 대기"}</strong></div>
      <div class="line-item"><span>결제수단</span><strong>${orderForSummary ? orderForSummary.paymentMethod || "카카오페이" : "선택 대기"}</strong></div>
      <div class="line-item"><span>배송 배정</span><strong>${orderForSummary ? assignedRiderLabel(orderForSummary) : "주문 후 즉시 배정"}</strong></div>
      ${orderForSummary && orderForSummary.paid ? '<button class="primary" type="button" disabled style="width:100%;margin-top:8px;">결제 완료</button>' : '<button class="primary" type="button" onclick="payOrder()" style="width:100%;margin-top:8px;">결제하기</button>'}
    </section>
  `;
}

export function deliveryFormMarkup({ customerName, phone, address }) {
  return `
    <section class="summary-card order-form-card">
      <div class="order-form-head">
        <div>
          <h3>배송 정보 확인</h3>
          <span>주소와 연락처만 확인하면 바로 예약됩니다.</span>
        </div>
        <strong>무료배송</strong>
      </div>
      <form class="delivery-form" onsubmit="confirmCheckout(event)">
        <div class="form-grid">
          <label>받는 분
            <input id="orderCustomerName" type="text" value="${customerName || "고객"}" autocomplete="name" required />
          </label>
          <label>휴대폰
            <input id="orderCustomerPhone" type="tel" value="${phone}" placeholder="01012345678" autocomplete="tel" inputmode="numeric" required />
          </label>
        </div>
        <label>배송 주소
          <div class="address-search compact">
            <input id="orderAddress" type="search" value="${address}" placeholder="동탄역, 오산역, 세교 등 주소 검색" oninput="updateOrderAddressSearch()" autocomplete="street-address" required />
            <div class="address-suggestions" id="orderAddressSuggestions"></div>
          </div>
        </label>
        <div class="form-grid">
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
        </div>
        <label>기사님 요청사항
          <div class="request-presets">
            <button type="button" onclick="setRiderRequestPreset('도착 전 연락 주세요')">도착 전 연락</button>
            <button type="button" onclick="setRiderRequestPreset('문 앞에 조심히 놓아주세요')">문앞 조심히</button>
            <button type="button" onclick="setRiderRequestPreset('공동현관에서 연락 주세요')">공동현관 연락</button>
          </div>
          <textarea id="riderRequest" placeholder="예: 도착 전 연락 주세요. 공동현관 비밀번호는 주문 후 안내합니다."></textarea>
        </label>
        <div class="order-submit-bar">
          <button class="primary" type="submit">무료배송 예약 확정</button>
        </div>
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
          <span>${order.createdLabel} · ${order.region}</span>
        </div>
        <span class="order-status">${helpers.orderDisplayLabel(order)}</span>
      </div>
      <div class="order-product-line">
        <strong>${order.items[0].name}${order.items.length > 1 ? " 외 " + (order.items.length - 1) + "개" : ""}</strong>
        <span>${order.address}</span>
      </div>
      <div class="order-info-grid">
        <div><span>예상 도착</span><strong>${helpers.isOrderCancelled(order) ? "취소됨" : (order.progressStep || 0) >= 4 ? "완료" : order.fastest + "분"}</strong></div>
        <div><span>결제</span><strong>${helpers.paymentLabelForOrder(order)}</strong></div>
        <div><span>주문 금액</span><strong>${formatKRW(order.total)}</strong></div>
      </div>
      <div class="line-item"><span>${order.receiveType || "문앞 수령"}</span><strong>${order.riderRequest ? "요청 있음" : "요청 없음"}</strong></div>
      ${helpers.customerRefundStatusLabel && helpers.customerRefundStatusLabel(order) ? '<div class="line-item"><span>반품/환불 상태</span><strong>' + helpers.customerRefundStatusLabel(order) + '</strong></div>' : ""}
      ${helpers.customerRefundStatusDetail && helpers.customerRefundStatusDetail(order) ? '<div class="line-item"><span>처리 안내</span><strong>' + helpers.customerRefundStatusDetail(order) + '</strong></div>' : ""}
      <div class="line-item"><span>담당 기사</span><strong>${helpers.assignedRiderLabel(order)}</strong></div>
      ${helpers.isOrderCancelled(order) ? '<div class="line-item"><span>취소 분류</span><strong>' + helpers.cancelReasonLabel(order) + '</strong></div>' : ""}
      ${helpers.isOrderCancelled(order) ? '<div class="line-item"><span>취소 사유</span><strong>' + (order.cancelReason || "사유 미입력") + '</strong></div>' : ""}
      ${helpers.canReviewOrder(order) ? '<div class="line-item"><span>리뷰</span><strong>' + helpers.orderReviewCount(order) + '/' + order.items.length + '개 작성</strong></div>' : ""}
      <div class="mini-actions order-actions">
        <button class="primary-action" type="button" onclick="selectOrder('${order.id}')">추적 보기</button>
        <button class="review-action" type="button" ${helpers.canReviewOrder(order) ? "" : "disabled"} onclick="reviewOrder('${order.id}')">${helpers.canReviewOrder(order) ? "리뷰 작성" : "배송 완료 후 리뷰"}</button>
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
