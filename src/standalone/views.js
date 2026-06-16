import {
  formatKRW,
  itemNormalPrice,
  itemSalePrice,
  normalizedDiscount,
  priceMarkup,
} from "./format.js";

export function visualMarkupForItem(item, extraClass = "") {
  if (item.image) {
    return `<div class="visual has-photo ${extraClass}"><img src="${item.image}" alt="${item.name}" /></div>`;
  }
  return `<div class="visual ${extraClass} ${item.visual}"></div>`;
}

export function recommendationListMarkup(recommendation, helpers) {
  if (!recommendation.items.length) {
    return '<div class="line-item"><span>입점 상품이 준비되면 추천을 보여드릴게요</span><strong>추천 대기</strong></div>';
  }
  return recommendation.items.map((item) => `
    <div class="recommend-row">
      <div>
        <strong>${item.name}</strong>
        <span>${item.category || "상품"} · ${item.showroom} · ${helpers.eta(item)}분 · ${formatKRW(itemSalePrice(item))}</span>
      </div>
      <div class="mini-actions">
        <button type="button" onclick="openDetail('${item.key}')">보기</button>
        <button type="button" ${item.stock > 0 ? "" : "disabled"} onclick="addWishlistToCart('${item.key}', this, event)">담기</button>
        <button class="wish-mini ${helpers.isWishlisted(item.key) ? "active-control" : ""}" type="button" onclick="toggleWishlist('${item.key}')">찜</button>
      </div>
    </div>
  `).join("");
}

export function detailRecommendationMarkupForItems(items, helpers) {
  if (!items.length) return "";
  return `
    <div class="summary-card" style="margin-top: 12px;">
      <h3>함께 보면 좋은 아이템</h3>
      <div class="detail-recommend-list">
        ${items.map((candidate) => `
          <div class="detail-recommend-row">
            <div>
              <strong>${candidate.name}</strong>
              <span>${candidate.showroom} · ${helpers.eta(candidate)}분 · ${formatKRW(itemSalePrice(candidate))}</span>
            </div>
            <div class="mini-actions">
              <button type="button" onclick="openDetail('${candidate.key}')">보기</button>
              <button class="wish-mini ${helpers.isWishlisted(candidate.key) ? "active-control" : ""}" type="button" onclick="toggleWishlist('${candidate.key}')">찜</button>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

export function lookCardMarkup(look, summary, helpers) {
  const itemNames = summary.items.map((item) => item.name).join(", ");
  const sizeRows = summary.items.map((item) => `
    <div class="look-size-row">
      <div>
        <strong>${item.category || "상품"} · ${item.name}</strong>
        <span>${item.showroom} · ${item.stock}개 재고</span>
      </div>
      <select id="lookSize-${look.key}-${item.key}" aria-label="${item.name} 사이즈">
        ${helpers.sizeOptions(item).map((size) => '<option value="' + size + '" ' + (helpers.sizeStock(item, size) > 0 ? "" : "disabled") + '>' + size + ' · ' + (helpers.sizeStock(item, size) > 0 ? helpers.sizeStock(item, size) + '개' : '품절') + '</option>').join("")}
      </select>
    </div>
  `).join("");
  return `
    <article class="look-card">
      <div class="look-visuals">${summary.items.map((item) => visualMarkupForItem(item)).join("")}</div>
      <div>
        <div class="badge"><i></i>${summary.fastest || "-"}분 안팎 도착</div>
        <h3>${look.title}</h3>
        <p>${look.store || "입점 매장"} · ${look.note}</p>
      </div>
      <div class="look-meta">
        <span>${itemNames || "입점 상품 대기"}</span>
        <strong>${formatKRW(summary.total)}</strong>
      </div>
      ${priceMarkup(summary.itemSaleTotal, look.discountRate, summary.saleTotal)}
      <div class="look-size-list">${sizeRows}</div>
      <div class="detail-actions">
        <button class="secondary" type="button" onclick="filterLookItems('${look.key}')">상품 보기</button>
        <button class="primary" type="button" ${summary.items.length ? "" : "disabled"} onclick="addLookToCart('${look.key}')">세트 담기</button>
      </div>
      <p>${summary.lowStock ? "재고 임박 상품 " + summary.lowStock + "개 포함" : "즉시 픽업 가능 재고로 구성"}</p>
    </article>
  `;
}

export function productGridMarkup(items, helpers) {
  if (!items.length) return '<p class="empty">조건에 맞는 아이템이 없습니다.</p>';
  return items.map((item) => `
    <article class="product-card" role="button" tabindex="0" onclick="openDetail('${item.key}')" onkeydown="if(event.key === 'Enter') openDetail('${item.key}')">
      <button class="wish-button ${helpers.isWishlisted(item.key) ? "active-control" : ""}" type="button" aria-label="관심상품" onclick="toggleWishlist('${item.key}', event)">${helpers.isWishlisted(item.key) ? "♥" : "♡"}</button>
      ${visualMarkupForItem(item)}
      <div class="badge"><i></i>${helpers.eta(item)}분 도착</div>
      <h3>${item.name}</h3>
      ${priceMarkup(itemNormalPrice(item), item.discountRate, itemSalePrice(item))}
      <small>${item.showroom}</small>
      <small>${helpers.ratingLabelForProduct(item)} · ${helpers.ratingLabelForStore(item.showroom)}</small>
      <div class="stock-line"><span>${item.stock <= 2 ? item.stock + "개 남음" : "재고 " + item.stock + "개"}</span><span>${item.match}% 매칭</span></div>
      <button class="add" type="button" onclick="event.stopPropagation(); addToCart('${item.key}', this)">담기</button>
    </article>
  `).join("");
}

export function emptyCartDetailMarkup() {
  return `
    <section class="summary-card">
      <h3>장바구니가 비어 있습니다</h3>
      <div class="line-item"><span>룩이나 상품을 담으면</span><strong>여기서 확인 가능</strong></div>
    </section>
  `;
}

export function cartDetailMarkup(cart, totals) {
  const rows = cart.map((item, index) => `
    <div class="vendor-product-row">
      <div>
        <strong>${item.name}</strong>
        <span>${item.showroom} · ${item.size || "FREE"} · ${item.quantity}개</span>
        <span>정상가 ${formatKRW(itemNormalPrice(item))} · ${normalizedDiscount(item.discountRate)}% 할인 · 할인가 ${formatKRW(itemSalePrice(item))}</span>
      </div>
      <div class="mini-actions">
        <button type="button" onclick="updateCartQuantity(${index}, -1)">-</button>
        <button type="button" onclick="updateCartQuantity(${index}, 1)">+</button>
        <button class="danger" type="button" onclick="removeCartItem(${index})">삭제</button>
      </div>
    </div>
  `).join("");
  return `
    <section class="summary-card">
      <h3>담긴 상품</h3>
      <div class="vendor-preview-list">${rows}</div>
    </section>
    <section class="summary-card" style="margin-top: 12px;">
      <h3>결제 예정 금액</h3>
      <div class="price-row"><span>정상가 합계</span><strong>${formatKRW(totals.normalSubtotal)}</strong></div>
      <div class="price-row"><span>할인 금액</span><strong>${totals.discountAmount ? "-" + formatKRW(totals.discountAmount) : "KRW 0"}</strong></div>
      <div class="price-row"><span>상품 할인가</span><strong>${formatKRW(totals.saleSubtotal)}</strong></div>
      <div class="price-row"><span>지금배송비</span><strong>${totals.deliveryFee ? formatKRW(totals.deliveryFee) : "무료"}</strong></div>
      <div class="price-row total-row"><span>총 결제 예정</span><strong>${formatKRW(totals.total)}</strong></div>
    </section>
    <div class="detail-actions" style="margin-top: 12px;">
      <button class="secondary" type="button" onclick="closeCartDetail()">계속 담기</button>
      <button class="primary" type="button" onclick="checkoutFromCart()">배송 예약</button>
    </div>
  `;
}
