import {
  discountedPrice,
  itemNormalPrice,
  itemSalePrice,
} from "./format.js";

export function matchesSizeFilter(item, selectedSizeFilter) {
  if (selectedSizeFilter === "전체") return true;
  const label = (item.size || "").toLowerCase();
  const category = item.category === "의류" ? "상의" : (item.category || "");
  if (selectedSizeFilter === "신발") return category === "신발" || /\d{3}/.test(label);
  if (selectedSizeFilter === "잡화") return category === "잡화";
  if (selectedSizeFilter === "상의") return category === "상의";
  if (selectedSizeFilter === "하의") return category === "하의";
  return true;
}

export function matchesPriceRange(item, selectedPriceRange) {
  const price = itemSalePrice(item);
  if (selectedPriceRange === "under50000") return price <= 50000;
  if (selectedPriceRange === "50000to100000") return price > 50000 && price <= 100000;
  if (selectedPriceRange === "over100000") return price > 100000;
  return true;
}

export function filterVisibleProducts({
  products,
  query,
  selectedLookKeys,
  selectedShowroom,
  selectedCategory,
  selectedSizeFilter,
  selectedPriceRange,
  onlyFast,
  sortMode,
  storeIsVisible,
  eta,
  productRatingValue,
  productReviewCount,
}) {
  const normalizedQuery = (query || "").trim().toLowerCase();
  return products.filter((item) => {
    const text = (item.name + " " + item.showroom + " " + item.material + " " + item.category + " " + item.size + " " + item.note).toLowerCase();
    return storeIsVisible(item)
      && (!selectedLookKeys.length || selectedLookKeys.includes(item.key))
      && (!normalizedQuery || text.includes(normalizedQuery))
      && (selectedShowroom === "전체" || item.showroom === selectedShowroom)
      && (selectedCategory === "전체" || (item.category || "상품") === selectedCategory)
      && matchesSizeFilter(item, selectedSizeFilter)
      && matchesPriceRange(item, selectedPriceRange)
      && (!onlyFast || eta(item) <= 45);
  }).sort((a, b) => {
    if (sortMode === "match") return b.match - a.match;
    if (sortMode === "stock") return b.stock - a.stock;
    if (sortMode === "rating") return productRatingValue(b) - productRatingValue(a) || eta(a) - eta(b);
    if (sortMode === "review") return productReviewCount(b) - productReviewCount(a) || productRatingValue(b) - productRatingValue(a);
    return eta(a) - eta(b);
  });
}

export function buildPersonalizedRecommendations({
  products,
  wishlistItems,
  recentViewItems,
  storeIsVisible,
  eta,
  productRatingValue,
  currentRegionName,
}) {
  const wishlist = wishlistItems();
  const anchors = [...wishlist, ...recentViewItems()];
  const anchorKeys = new Set(anchors.map((item) => item.key));
  const categories = new Set(anchors.map((item) => item.category).filter(Boolean));
  const stores = new Set(wishlist.map((item) => item.showroom).filter(Boolean));
  const prices = anchors.map((item) => itemSalePrice(item));
  const averagePrice = prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;
  const fallback = products
    .filter((item) => storeIsVisible(item) && item.stock > 0)
    .sort((a, b) => eta(a) - eta(b) || b.match - a.match);
  const scored = products
    .filter((item) => storeIsVisible(item) && item.stock > 0 && !anchorKeys.has(item.key))
    .map((item) => {
      let score = Math.max(0, 70 - eta(item)) + Math.min(12, item.match / 8) + productRatingValue(item) * 4;
      if (categories.has(item.category)) score += 36;
      if (stores.has(item.showroom)) score += 28;
      if (averagePrice && Math.abs(itemSalePrice(item) - averagePrice) <= 30000) score += 18;
      return { item, score };
    })
    .sort((a, b) => b.score - a.score || eta(a.item) - eta(b.item))
    .map((entry) => entry.item);
  const unique = [];
  (anchors.length ? scored.concat(fallback) : fallback).forEach((item) => {
    if (!unique.some((entry) => entry.key === item.key)) unique.push(item);
  });
  return {
    items: unique.slice(0, 3),
    reason: anchors.length ? (wishlist.length ? "관심상품과 최근 본 상품 기준" : "최근 본 상품 기준") : currentRegionName + " 빠른배송 기준",
  };
}

export function getLookItems(look, products) {
  return look.keys.map((key) => products.find((item) => item.key === key)).filter(Boolean);
}

export function summarizeLook({ look, products, storeIsVisible, eta }) {
  const items = getLookItems(look, products).filter(storeIsVisible);
  const normalTotal = items.reduce((sum, item) => sum + itemNormalPrice(item), 0);
  const itemSaleTotal = items.reduce((sum, item) => sum + itemSalePrice(item), 0);
  const saleTotal = discountedPrice(itemSaleTotal, look.discountRate);
  const fastest = items.length ? Math.max(...items.map((item) => eta(item))) : 0;
  const lowStock = items.filter((item) => item.stock <= 2).length;
  return { items, total: saleTotal, normalTotal, itemSaleTotal, saleTotal, fastest, lowStock };
}

export function sizeOptionsForItem(item) {
  const label = (item.size || "FREE").trim();
  const singleSizeLabels = ["adjustable", "free", "one", "onesize", "one size", "one-size"];
  if (singleSizeLabels.includes(label.toLowerCase().replace(/\s+/g, " "))) return ["One size"];
  const numericRange = label.match(/^(\d{3})-(\d{3})$/);
  if (numericRange) {
    const start = Number(numericRange[1]);
    const end = Number(numericRange[2]);
    const options = [];
    for (let size = start; size <= end; size += 10) options.push(String(size));
    return options;
  }
  const parts = label.split(/[\/,]/).map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts : [label];
}

export function totalStockForItem(item) {
  if (!item || !item.sizeStock) return Math.max(0, Number(item && item.stock) || 0);
  return Object.values(item.sizeStock).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
}

export function ensureItemSizeStock(item) {
  if (!item) return {};
  const options = sizeOptionsForItem(item);
  if (!item.sizeStock || typeof item.sizeStock !== "object") {
    const total = Math.max(0, Number(item.stock) || 0);
    item.sizeStock = {};
    options.forEach((size, index) => {
      item.sizeStock[size] = Math.floor(total / options.length) + (index < total % options.length ? 1 : 0);
    });
  } else {
    options.forEach((size) => {
      if (item.sizeStock[size] == null) item.sizeStock[size] = 0;
    });
  }
  item.stock = totalStockForItem(item);
  return item.sizeStock;
}

export function stockForSize(item, size) {
  const stockMap = ensureItemSizeStock(item);
  return Math.max(0, Number(stockMap[size]) || 0);
}

export function availableSizesForItem(item) {
  return sizeOptionsForItem(item).filter((size) => stockForSize(item, size) > 0);
}
