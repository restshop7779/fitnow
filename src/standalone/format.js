export function formatKRW(value) {
  return "KRW " + value.toLocaleString("ko-KR");
}

export function normalizedDiscount(value) {
  return Math.max(0, Math.min(90, Number(value) || 0));
}

export function discountedPrice(price, discountRate) {
  const discounted = Math.round((Number(price) || 0) * (100 - normalizedDiscount(discountRate)) / 100);
  return Math.max(0, discounted);
}

export function itemSalePrice(item) {
  return item.salePrice || discountedPrice(item.price, item.discountRate);
}

export function itemNormalPrice(item) {
  return item.normalPrice || item.price || itemSalePrice(item);
}

export function priceMarkup(normalPrice, discountRate, salePrice) {
  const rate = normalizedDiscount(discountRate);
  const sale = salePrice != null ? salePrice : discountedPrice(normalPrice, rate);
  return `
    <div class="price-stack">
      <del>정상가 ${formatKRW(normalPrice)}</del>
      <span class="discount-tag">${rate}% 할인</span>
      <strong>할인가 ${formatKRW(sale)}</strong>
    </div>
  `;
}

export function slugify(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}