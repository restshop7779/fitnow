import {
  ADMIN_STORAGE_KEY,
  CUSTOMER_STORAGE_KEY,
  ORDER_STATUS_STORAGE_KEY,
  RECENT_VIEW_STORAGE_KEY,
  REVIEW_STORAGE_KEY,
  RIDER_NICKNAME_STORAGE_KEY,
  SETTLEMENT_RATE_STORAGE_KEY,
  SETTLEMENT_STATUS_STORAGE_KEY,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  VENDOR_STORAGE_KEY,
  WISHLIST_STORAGE_KEY,
  adminAccount,
  addressSuggestions,
  deliveryPartners,
  lookSets,
  partnerStores,
  products,
  regions,
  steps,
  vendorAccounts,
} from "./standalone/config.js";
import {
  discountedPrice,
  formatKRW,
  itemNormalPrice,
  itemSalePrice,
  normalizedDiscount,
  priceMarkup,
  slugify,
} from "./standalone/format.js";
import { selectedValue } from "./standalone/dom.js";
import { exposeHandlers } from "./standalone/expose.js";
import {
  availableSizesForItem,
  buildPersonalizedRecommendations,
  ensureItemSizeStock,
  filterVisibleProducts,
  getLookItems,
  matchesPriceRange,
  matchesSizeFilter,
  sizeOptionsForItem,
  stockForSize,
  summarizeLook,
  totalStockForItem,
} from "./standalone/catalog.js";
import {
  calculateCartTotals,
  groupCartPickups,
} from "./standalone/cart.js";
import {
  cartDetailMarkup,
  detailRecommendationMarkupForItems,
  emptyCartDetailMarkup,
  lookCardMarkup,
  productGridMarkup,
  recommendationListMarkup,
  visualMarkupForItem,
} from "./standalone/views.js";
import { createOrderSnapshotData } from "./standalone/orders.js";
import {
  deliveryFormMarkup,
  emptyOrderSummaryMarkup,
  emptyOrdersMarkup,
  orderListMarkup,
  orderSummaryMarkup,
  timelineMarkup,
} from "./standalone/orderViews.js";

      const SETTLEMENT_FLOW_CHECK_LOG_KEY = "fitnow_settlement_flow_check_logs";
      const TEST_DATA_RETENTION_KEY = "fitnow_test_data_retention";
      const TEST_TOOL_META_KEY = "fitnow_test_tool_meta";
      const ADMIN_QA_CHECKLIST_KEY = "fitnow_admin_qa_checklist";
      const DELIVERY_PROOF_RETENTION_DAYS = 30;
      const DELIVERY_PROOF_RETENTION_MS = DELIVERY_PROOF_RETENTION_DAYS * 24 * 60 * 60 * 1000;
      const RETURN_REFUND_WINDOW_DAYS = 14;
      const RETURN_REFUND_WINDOW_MS = RETURN_REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;
      const TEST_DATA_RETENTION_OPTIONS = {
        "1h": { label: "1시간", ms: 60 * 60 * 1000 },
        "24h": { label: "24시간", ms: 24 * 60 * 60 * 1000 },
        "7d": { label: "7일", ms: 7 * 24 * 60 * 60 * 1000 },
      };

      let selectedShowroom = "전체";
      let selectedLookKeys = [];
      let selectedCategory = "전체";
      let selectedSizeFilter = "전체";
      let selectedPriceRange = "전체";
      let selectedRegion = "dongtan2";
      let addressSuggestionState = { home: [], order: [] };
      let sortMode = "fastest";
      let onlyFast = false;
      let cart = [];
      let vendorProductCount = 0;
      let vendorImageData = "";
      let vendorImageFile = null;
      let editingProductKey = "";
      let editingLookKey = "";
      let activeStep = 0;
      let trackingTimer;
      let lastOrder = null;
      let orderHistory = [];
      let supabaseClient = null;
      let dbConnected = false;
      let currentVendor = null;
      let currentAdmin = null;
      let pendingAdminMode = "delivery";
      let activeAdminMode = "delivery";
      let activeDetailKey = "";
      let selectedDetailSize = "";
      let adminStatusFilter = "all";
      let adminOrderSearchQuery = "";
      let adminRenderedOrders = [];
      let activeAdminTodoFocus = null;
      let settlementPeriodFilter = "all";
      let settlementPartnerFilter = "all";
      let adminSettlementView = "open";
      let pendingSettlementAction = null;
      let lastSettlementResult = null;
      let settlementFlowCheckLogs = readSettlementFlowCheckLogs();
      let vendorOrderFilter = "active";
      let currentCustomer = { name: "게스트", phone: "guest-preview", id: "guest-preview" };
      let wishlist = [];
      let recentViews = [];
      let reviews = [];
      function readReviewStore() {
        try {
          const parsed = JSON.parse(localStorage.getItem(REVIEW_STORAGE_KEY) || "[]");
          return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
          localStorage.removeItem(REVIEW_STORAGE_KEY);
          return [];
        }
      }

      function saveReviewStore() {
        localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(reviews.slice(0, 80)));
      }

      function readWishlistStore() {
        try {
          const parsed = JSON.parse(localStorage.getItem(WISHLIST_STORAGE_KEY) || "[]");
          return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
        } catch (error) {
          localStorage.removeItem(WISHLIST_STORAGE_KEY);
          return [];
        }
      }

      function saveWishlistStore() {
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify([...new Set(wishlist)].slice(0, 80)));
      }

      function isWishlisted(key) {
        return wishlist.includes(key);
      }

      function wishlistItems() {
        return wishlist.map((key) => products.find((item) => item.key === key)).filter(Boolean);
      }

      function readRecentViewStore() {
        try {
          const parsed = JSON.parse(localStorage.getItem(RECENT_VIEW_STORAGE_KEY) || "[]");
          return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 10) : [];
        } catch (error) {
          localStorage.removeItem(RECENT_VIEW_STORAGE_KEY);
          return [];
        }
      }

      function saveRecentViewStore() {
        localStorage.setItem(RECENT_VIEW_STORAGE_KEY, JSON.stringify([...new Set(recentViews)].slice(0, 10)));
      }

      function recentViewItems() {
        return recentViews.map((key) => products.find((item) => item.key === key)).filter(Boolean);
      }

      function rememberRecentView(key) {
        if (!key) return;
        recentViews = [key, ...recentViews.filter((itemKey) => itemKey !== key)]
          .filter((itemKey) => products.some((item) => item.key === itemKey))
          .slice(0, 10);
        saveRecentViewStore();
        renderRecommendations();
        if (document.getElementById("myModal").classList.contains("open")) renderMyPage();
      }

      function canSyncWishlist() {
        return supabaseClient && currentCustomer && customerId() !== "guest-preview";
      }

      function mergeWishlistKeys(keys) {
        wishlist = [...new Set([...(keys || []), ...wishlist])]
          .filter((key) => products.some((item) => item.key === key))
          .slice(0, 80);
        saveWishlistStore();
      }

      async function toggleWishlist(key, event) {
        if (event) event.stopPropagation();
        const removing = isWishlisted(key);
        if (removing) {
          wishlist = wishlist.filter((itemKey) => itemKey !== key);
          setSyncStatus("관심상품에서 삭제됨");
        } else {
          wishlist.unshift(key);
          wishlist = [...new Set(wishlist)];
          const item = products.find((product) => product.key === key);
          setSyncStatus((item ? item.name : "상품") + " 관심상품에 저장됨");
        }
        saveWishlistStore();
        renderProducts();
        renderRecommendations();
        if (document.getElementById("detailModal").classList.contains("open")) openDetail(key);
        if (document.getElementById("myModal").classList.contains("open")) renderMyPage();
        try {
          if (removing) await deleteWishlistFromSupabase(key);
          else await syncWishlistToSupabase(key);
        } catch (error) {
          setSyncStatus("관심상품은 화면에 저장됨 - Supabase wishlists SQL 확인 필요");
        }
      }

      function productReviews(productKey) {
        return reviews.filter((review) => review.productKey === productKey);
      }

      function storeReviews(storeName) {
        return reviews.filter((review) => review.showroom === storeName);
      }

      function averageRating(items) {
        if (!items.length) return 0;
        return Math.round(items.reduce((sum, item) => sum + (item.rating || 0), 0) * 10 / items.length) / 10;
      }

      function ratingLabelForProduct(item) {
        const items = productReviews(item.key);
        const rating = averageRating(items);
        return items.length ? "별점 " + rating.toFixed(1) + " · 리뷰 " + items.length + "개" : "첫 리뷰 대기";
      }

      function productRatingValue(item) {
        return averageRating(productReviews(item.key));
      }

      function productReviewCount(item) {
        return productReviews(item.key).length;
      }

      function ratingLabelForStore(storeName) {
        const items = storeReviews(storeName);
        const rating = averageRating(items);
        return items.length ? "평점 " + rating.toFixed(1) + " · 리뷰 " + items.length + "개" : "평점 대기";
      }

      function canReviewOrder(order) {
        return !!(order && !isOrderCancelled(order) && (order.progressStep || 0) >= 4);
      }

      function orderReviewCount(order) {
        if (!order) return 0;
        return reviews.filter((review) => review.orderId === order.id).length;
      }
      function setSyncStatus(message) {
        document.getElementById("syncStatus").textContent = message;
      }

      function customerId() {
        return currentCustomer ? currentCustomer.id : "guest-preview";
      }

      function providerLabel(provider) {
        const labels = {
          kakao: "카카오",
          "custom:naver": "네이버",
          naver: "네이버",
          oauth: "소셜",
        };
        return labels[provider] || provider || "일반";
      }

      function customerContactLabel() {
        if (!currentCustomer || currentCustomer.phone === "guest-preview") return "게스트 주문 모드";
        return currentCustomer.email || currentCustomer.phone || currentCustomer.id;
      }

      function riderForRegion(regionLabel) {
        if ((regionLabel || "").includes("오산")) return "오산 지금배송 라이더 02";
        if ((regionLabel || "").includes("동탄")) return "동탄 지금배송 라이더 01";
        return "핏나우 지금배송 라이더";
      }

      function currentDeliveryPartner() {
        if (!currentAdmin || currentAdmin.role !== "delivery") return null;
        return deliveryPartners.find((partner) => partner.name === currentAdmin.name) || null;
      }

      function orderAreaText(order) {
        return [order.region, order.address].filter(Boolean).join(" ");
      }

      function deliveryPartnerServesOrder(partner, order) {
        if (!partner || !order) return false;
        const areaText = orderAreaText(order);
        return (partner.areas || []).some((area) => areaText.includes(area));
      }

      function deliveryPartnerForOrder(order) {
        if (order.deliveryPartnerName) {
          return deliveryPartners.find((partner) => partner.name === order.deliveryPartnerName) || null;
        }
        const rider = order.riderName || riderForRegion(order.region);
        return deliveryPartners.find((partner) =>
          partner.riders.includes(rider) || deliveryPartnerServesOrder(partner, order)
        ) || deliveryPartners[0];
      }

      function isDeliveryOrderClaimed(order) {
        return !!(order && order.deliveryPartnerName);
      }

      function canCurrentAdminManageOrder(order) {
        if (!currentAdmin) return false;
        if (currentAdmin.role === "total") return true;
        if (!isDeliveryOrderClaimed(order)) return canCurrentDeliveryClaimOrder(order);
        const partner = deliveryPartnerForOrder(order);
        return partner && partner.name === currentAdmin.name;
      }

      function canCurrentDeliveryClaimOrder(order) {
        const partner = currentDeliveryPartner();
        return !!(
          partner &&
          order &&
          !isOrderCancelled(order) &&
          !isDeliveryOrderClaimed(order) &&
          (order.progressStep || 0) >= 2 &&
          deliveryPartnerServesOrder(partner, order)
        );
      }

      function ordersForCurrentAdmin(orders) {
        if (!currentAdmin || currentAdmin.role === "total") return orders;
        return orders.filter((order) => canCurrentAdminManageOrder(order));
      }

      function ordersForSettlementPartnerFilter(orders) {
        if (!currentAdmin || currentAdmin.role !== "total" || settlementPartnerFilter === "all") return orders;
        return orders.filter((order) => (order.deliveryPartnerName || "") === settlementPartnerFilter);
      }

      function assignedRiderLabel(order) {
        return order.riderName || (order.deliveryPartnerName ? "담당 기사 확인 중" : "배정 대기");
      }

      function readRiderNicknameStore() {
        try {
          return JSON.parse(localStorage.getItem(RIDER_NICKNAME_STORAGE_KEY) || "{}");
        } catch (error) {
          localStorage.removeItem(RIDER_NICKNAME_STORAGE_KEY);
          return {};
        }
      }

      function saveRiderNicknameStore(store) {
        localStorage.setItem(RIDER_NICKNAME_STORAGE_KEY, JSON.stringify(store || {}));
      }

      function riderKey(partnerName, index) {
        return partnerName + "::" + index;
      }

      function riderNicknamesForPartner(partner) {
        const saved = readRiderNicknameStore();
        return partner.riders.map((name, index) => saved[riderKey(partner.name, index)] || name);
      }

      function riderOptionsForPartner(partnerName, selected = "") {
        const partner = deliveryPartners.find((item) => item.name === partnerName);
        if (!partner) return "";
        return riderNicknamesForPartner(partner).map((name) =>
          '<option value="' + name + '"' + (name === selected ? " selected" : "") + '>' + name + '</option>'
        ).join("");
      }
      function updateRiderNickname(partnerName, index, value) {
        const partner = deliveryPartners.find((item) => item.name === partnerName);
        if (!partner) return;
        if (currentAdmin && currentAdmin.role === "delivery" && currentAdmin.name !== partnerName) {
          setSyncStatus("로그인한 배송사 기사만 수정할 수 있습니다");
          renderAdminOrders(orderHistory);
          return;
        }
        const saved = readRiderNicknameStore();
        const previousName = riderNicknamesForPartner(partner)[index] || partner.riders[index] || "";
        const nickname = (value || "").trim() || partner.riders[index] || "지금배송 기사";
        saved[riderKey(partner.name, index)] = nickname;
        saveRiderNicknameStore(saved);
        if (previousName && previousName !== nickname) {
          const rates = readSettlementRateStore();
          const oldKey = "rider::" + partner.name + "::" + previousName;
          const newKey = "rider::" + partner.name + "::" + nickname;
          if (rates[oldKey] && !rates[newKey]) {
            rates[newKey] = rates[oldKey];
            delete rates[oldKey];
            saveSettlementRateStore(rates);
          }
        }
        if (currentAdmin && currentAdmin.name === partner.name) currentAdmin.riders = riderNicknamesForPartner(partner);
        setSyncStatus(partner.name + " 기사 " + (index + 1) + " 닉네임 저장됨");
        renderAdminOrders(orderHistory);
      }

      function readSettlementRateStore() {
        try {
          return JSON.parse(localStorage.getItem(SETTLEMENT_RATE_STORAGE_KEY) || "{}");
        } catch (error) {
          localStorage.removeItem(SETTLEMENT_RATE_STORAGE_KEY);
          return {};
        }
      }

      function saveSettlementRateStore(store) {
        localStorage.setItem(SETTLEMENT_RATE_STORAGE_KEY, JSON.stringify(store || {}));
      }

      function defaultPartnerRate(partnerName) {
        const store = readSettlementRateStore();
        return Number(store["partner::" + partnerName] || 90);
      }

      function riderSettlementRate(partnerName, riderName) {
        const store = readSettlementRateStore();
        const riderRate = store["rider::" + partnerName + "::" + riderName];
        return Number(riderRate || defaultPartnerRate(partnerName));
      }

      function settlementPayout(deliveryFee, partnerName, riderName) {
        return Math.round((deliveryFee || 0) * riderSettlementRate(partnerName, riderName) / 100);
      }

      function settlementSummaryForOrder(order) {
        const partnerName = order.deliveryPartnerName || "미배정";
        const riderName = assignedRiderLabel(order);
        const rate = riderSettlementRate(partnerName, riderName);
        const payout = settlementPayout(order.deliveryFee || 0, partnerName, riderName);
        const ready = !isOrderCancelled(order) && (order.progressStep || 0) >= 4 && hasDeliveryProof(order, "arrival");
        return {
          partnerName,
          riderName,
          rate,
          payout,
          ready,
          status: ready ? settlementStatusLabel(order) : "배송완료 후 정산 예정",
        };
      }

      function updatePartnerSettlementRate(partnerName, value) {
        if (!currentAdmin || currentAdmin.role !== "total") {
          setSyncStatus("배송사 기본 정산율은 총관리자만 수정할 수 있습니다");
          renderAdminOrders(orderHistory);
          return;
        }
        const rate = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
        const store = readSettlementRateStore();
        store["partner::" + partnerName] = rate;
        saveSettlementRateStore(store);
        setSyncStatus(partnerName + " 기본 정산율 " + rate + "% 저장됨");
        renderAdminOrders(orderHistory);
      }

      function updateRiderSettlementRate(partnerName, riderName, value) {
        if (!currentAdmin) return;
        if (currentAdmin.role === "delivery" && currentAdmin.name !== partnerName) {
          setSyncStatus("로그인한 배송사 기사 정산율만 수정할 수 있습니다");
          renderAdminOrders(orderHistory);
          return;
        }
        const rate = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
        const store = readSettlementRateStore();
        store["rider::" + partnerName + "::" + riderName] = rate;
        saveSettlementRateStore(store);
        setSyncStatus(partnerName + " · " + riderName + " 예외 정산율 " + rate + "% 저장됨");
        renderAdminOrders(orderHistory);
      }

      function hasDeliveryProof(order, type) {
        return !!(order && (type === "pickup" ? order.pickupConfirmedAt : order.arrivalConfirmedAt));
      }

      function deliveryProofPhoto(order, type) {
        if (!order) return null;
        return type === "pickup" ? order.pickupProofPhoto : order.arrivalProofPhoto;
      }

      function deliveryProofPhotoSrc(photo) {
        if (!photo) return "";
        return photo.publicUrl || photo.url || photo.dataUrl || "";
      }

      function deliveryProofPhotoStorageLabel(photo) {
        if (!photo) return "";
        if (photo.publicUrl || photo.path) return "저장소 저장";
        if (photo.dataUrl) return "임시 저장";
        return "사진 기록";
      }

      function deliveryProofPhotoSizeLabel(photo) {
        const size = Number(photo && photo.size ? photo.size : 0);
        if (!size) return "";
        if (size >= 1024 * 1024) return (size / 1024 / 1024).toFixed(1) + "MB";
        if (size >= 1024) return Math.round(size / 1024) + "KB";
        return size + "B";
      }

      function deliveryProofPhotoMeta(photo) {
        if (!photo) return "";
        const parts = [deliveryProofPhotoStorageLabel(photo), deliveryProofPhotoSizeLabel(photo)].filter(Boolean);
        if (photo.capturedAt) {
          parts.push(new Date(photo.capturedAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }));
        }
        return parts.join(" · ");
      }

      function safeMediaUrl(value) {
        return String(value || "").replace(/"/g, "%22");
      }

      function renderDeliveryProofPhoto(photo, alt, className = "delivery-proof-preview") {
        const src = deliveryProofPhotoSrc(photo);
        if (!src) return "";
        const mediaSrc = safeMediaUrl(src);
        const meta = deliveryProofPhotoMeta(photo);
        return `
          <div class="delivery-proof-media">
            <img class="${className}" src="${mediaSrc}" alt="${alt}">
            ${meta ? '<span class="delivery-proof-meta">' + meta + '</span>' : ""}
            ${photo && photo.publicUrl ? '<a class="delivery-proof-link" href="' + mediaSrc + '" target="_blank" rel="noopener">사진 원본 보기</a>' : ""}
          </div>
        `;
      }

      function renderCustomerArrivalProof(order) {
        const photo = deliveryProofPhoto(order, "arrival");
        const src = deliveryProofPhotoSrc(photo);
        if (!src) return "";
        const mediaSrc = safeMediaUrl(src);
        const capturedAt = photo && photo.capturedAt
          ? new Date(photo.capturedAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
          : (order.arrivalConfirmedAt ? new Date(order.arrivalConfirmedAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
        return `
          <section class="summary-card customer-proof-card">
            <h3>도착 인증 사진</h3>
            <div class="delivery-proof-media">
              <img class="delivery-proof-preview" src="${mediaSrc}" alt="도착 인증 사진">
              <span class="delivery-proof-meta">${capturedAt ? "촬영 " + capturedAt : "도착 인증 완료"}</span>
              <a class="delivery-proof-link" href="${mediaSrc}" target="_blank" rel="noopener">사진 크게 보기</a>
            </div>
          </section>
        `;
      }

      function deliveryProofLabel(order, type) {
        const value = type === "pickup" ? order.pickupConfirmedAt : order.arrivalConfirmedAt;
        if (!value) return "미인증";
        const photo = deliveryProofPhoto(order, type);
        const photoLabel = deliveryProofPhotoSrc(photo) ? " · 사진 포함" + (deliveryProofPhotoStorageLabel(photo) ? " · " + deliveryProofPhotoStorageLabel(photo) : "") : "";
        return new Date(value).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) + photoLabel;
      }

      function deliveryProofCompletedAt(order) {
        if (!order || (order.progressStep || 0) < 4) return "";
        const logs = Array.isArray(order.deliveryLogs) ? order.deliveryLogs : [];
        const doneLog = logs.find((log) => log.action === "배송 완료");
        return (doneLog && doneLog.createdAt) || order.arrivalConfirmedAt || order.updatedAt || order.createdAt || "";
      }

      function isDeliveryProofRetentionExpired(order, now = Date.now()) {
        const completedAt = deliveryProofCompletedAt(order);
        if (!completedAt) return false;
        const time = new Date(completedAt).getTime();
        return Number.isFinite(time) && now - time > DELIVERY_PROOF_RETENTION_MS;
      }

      function deliveryProofPhotoPaths(order) {
        const paths = [];
        const pushPhoto = (photo) => {
          if (photo && photo.path && !paths.includes(photo.path)) paths.push(photo.path);
        };
        pushPhoto(order && order.pickupProofPhoto);
        pushPhoto(order && order.arrivalProofPhoto);
        (Array.isArray(order && order.deliveryLogs) ? order.deliveryLogs : []).forEach((log) => pushPhoto(log.photo));
        return paths;
      }

      function stripDeliveryProofPhotos(order) {
        if (!order) return 0;
        let removed = 0;
        if (deliveryProofPhotoSrc(order.pickupProofPhoto)) removed += 1;
        if (deliveryProofPhotoSrc(order.arrivalProofPhoto)) removed += 1;
        order.pickupProofPhoto = null;
        order.arrivalProofPhoto = null;
        if (Array.isArray(order.deliveryLogs)) {
          order.deliveryLogs = order.deliveryLogs.map((log) => {
            if (log && log.photo) removed += 1;
            return log && log.photo ? { ...log, photo: null } : log;
          });
        }
        return removed;
      }

      function deliveryLogActor() {
        if (currentVendor) return currentVendor.store;
        if (!currentAdmin) return "시스템";
        return currentAdmin.role === "total" ? "총관리자" : currentAdmin.name;
      }

      function addDeliveryLog(order, action, detail = "", options = {}) {
        if (!order) return;
        const previousLogs = Array.isArray(order.deliveryLogs) ? order.deliveryLogs : [];
        order.deliveryLogs = [
          {
            id: "log-" + Date.now() + "-" + Math.random().toString(16).slice(2, 6),
            action,
            detail,
            actor: deliveryLogActor(),
            partnerName: order.deliveryPartnerName || "",
            riderName: order.riderName || "",
            createdAt: new Date().toISOString(),
            photo: options.photo || null,
          },
          ...previousLogs,
        ].slice(0, 30);
      }

      function visibleDeliveryLogs(order) {
        const logs = Array.isArray(order.deliveryLogs) ? order.deliveryLogs : [];
        if (!currentAdmin || currentAdmin.role === "total") return logs;
        return logs.filter((log) => !log.partnerName || log.partnerName === currentAdmin.name || log.actor === currentAdmin.name);
      }

      function renderDeliveryLogs(order) {
        const logs = visibleDeliveryLogs(order);
        if (!logs.length) return '<div class="line-item"><span>아직 배송 운영 로그가 없습니다</span><strong>대기</strong></div>';
        return logs.map((log) => `
          <div class="vendor-product-row admin-order-row">
            <div>
              <strong>${log.action}</strong>
              <span>${log.detail || "상세 기록 없음"}</span>
              <span>${new Date(log.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · ${log.actor || "시스템"}</span>
              ${renderDeliveryProofPhoto(log.photo, log.action + " 사진", "delivery-proof-thumb")}
            </div>
          </div>
        `).join("");
      }

      function readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error || new Error("사진을 읽을 수 없습니다"));
          reader.readAsDataURL(file);
        });
      }

      async function compressDeliveryProofPhoto(file, type) {
        const source = await readFileAsDataUrl(file);
        const image = new Image();
        image.src = source;
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = () => reject(new Error("사진을 불러올 수 없습니다"));
        });
        const maxSize = 960;
        const scale = Math.min(1, maxSize / Math.max(image.width || maxSize, image.height || maxSize));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round((image.width || maxSize) * scale));
        canvas.height = Math.max(1, Math.round((image.height || maxSize) * scale));
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
        return {
          dataUrl,
          name: file.name || (type === "pickup" ? "pickup-proof.jpg" : "arrival-proof.jpg"),
          mimeType: "image/jpeg",
          size: dataUrl.length,
          capturedAt: new Date().toISOString(),
        };
      }

      function dataUrlToBlob(dataUrl) {
        const parts = String(dataUrl || "").split(",");
        const meta = parts[0] || "";
        const body = parts[1] || "";
        const mime = (meta.match(/data:(.*?);base64/) || [])[1] || "image/jpeg";
        const binary = atob(body);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }
        return new Blob([bytes], { type: mime });
      }

      function deliveryProofUploadPath(orderId, type, capturedAt) {
        const safeOrderId = String(orderId || "order").replace(/[^a-z0-9_-]/gi, "-").slice(0, 80);
        const stamp = String(capturedAt || new Date().toISOString()).replace(/[^0-9]/g, "").slice(0, 14) || Date.now();
        return safeOrderId + "/" + type + "-" + stamp + ".jpg";
      }

      async function uploadDeliveryProofPhoto(orderId, type, photo) {
        if (!supabaseClient || !photo || !photo.dataUrl) return photo;
        const path = deliveryProofUploadPath(orderId, type, photo.capturedAt);
        const blob = dataUrlToBlob(photo.dataUrl);
        const uploadResult = await supabaseClient.storage
          .from("delivery-proof-photos")
          .upload(path, blob, { cacheControl: "3600", upsert: true, contentType: photo.mimeType || "image/jpeg" });
        if (uploadResult.error) throw uploadResult.error;
        const publicResult = supabaseClient.storage.from("delivery-proof-photos").getPublicUrl(path);
        const publicUrl = publicResult && publicResult.data ? publicResult.data.publicUrl : "";
        return {
          name: photo.name,
          mimeType: photo.mimeType || "image/jpeg",
          size: blob.size,
          capturedAt: photo.capturedAt,
          path,
          publicUrl,
        };
      }

      function startDeliveryProofCapture(orderId, type) {
        if (!currentAdmin) {
          openAdminLogin();
          return;
        }
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.capture = "environment";
        input.style.display = "none";
        input.addEventListener("change", async () => {
          const file = input.files && input.files[0];
          input.remove();
          if (!file) {
            setSyncStatus("사진 인증이 취소되었습니다");
            return;
          }
          try {
            setSyncStatus((type === "pickup" ? "픽업" : "도착") + " 사진 압축 중");
            let photo = await compressDeliveryProofPhoto(file, type);
            if (supabaseClient) {
              try {
                setSyncStatus((type === "pickup" ? "픽업" : "도착") + " 사진 저장소 업로드 중");
                photo = await uploadDeliveryProofPhoto(orderId, type, photo);
              } catch (uploadError) {
                setSyncStatus("사진 저장소 업로드 실패 - 임시 사진으로 인증 계속");
              }
            }
            await confirmDeliveryProof(orderId, type, { photo });
            const detailModal = document.getElementById("adminOrderDetailModal");
            if (detailModal && detailModal.classList.contains("open")) {
              await openAdminOrderDetail(orderId);
            }
          } catch (error) {
            setSyncStatus("사진 인증 실패 - " + (error.message || "사진 파일 확인 필요"));
          }
        }, { once: true });
        document.body.appendChild(input);
        input.click();
      }

      function settlementAuditEvents(order) {
        const events = [];
        const pushEvent = (key, label, at, actor, detail, statusClass = "ready", from = "", to = "") => {
          if (!at) return;
          events.push({
            key,
            label,
            at,
            actor: actor || "시스템",
            detail: detail || "",
            statusClass,
            from,
            to,
          });
        };
        pushEvent("confirmed", "정산 확정", order.settlementConfirmedAt, order.settlementConfirmedBy || "총관리자", "확정대기에서 지급대기로 전환", "moving", "확정대기", "지급대기");
        pushEvent("paid", "지급 완료", order.settlementPaidAt, "총관리자", "기사 지급 완료 처리", "done", "지급대기", "지급완료");
        pushEvent("held", "정산 보류", order.settlementHeldAt, "총관리자", order.settlementHoldReason || "보류 사유 미입력", "waiting", "정산 예정", "보류");
        pushEvent("released", "보류 해제", order.settlementReleasedAt, "총관리자", "보류 해제 후 정산 예정으로 복귀", "ready", "보류", "정산 예정");
        pushEvent("closed", "정산 마감", order.settlementClosedAt, order.settlementClosedBy || "총관리자", order.settlementCloseLabel || "정산 마감", "done", "지급완료", "마감완료");
        visibleDeliveryLogs(order)
          .filter((log) => ["정산 확정", "지급 완료", "정산 보류", "정산 보류 해제", "정산 마감"].includes(log.action))
          .forEach((log) => pushEvent("log-" + log.id, log.action, log.createdAt, log.actor, log.detail, log.action === "지급 완료" || log.action === "정산 마감" ? "done" : log.action === "정산 보류" ? "waiting" : "moving"));
        const seen = new Set();
        return events
          .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime())
          .filter((event) => {
            const dedupeKey = [event.label, event.at, event.detail].join("|");
            if (seen.has(dedupeKey)) return false;
            seen.add(dedupeKey);
            return true;
          });
      }

      function renderSettlementAuditTrail(order, options = {}) {
        const events = settlementAuditEvents(order);
        if (!events.length) {
          return options.compact
            ? '<div class="settlement-audit-empty">정산 처리 이력이 아직 없습니다.</div>'
            : '<div class="line-item"><span>정산 처리 이력이 아직 없습니다</span><strong>대기</strong></div>';
        }
        return `
          <div class="settlement-audit-list">
            ${events.map((event, index) => `
              <div class="settlement-audit-item">
                <div class="settlement-audit-step">${events.length - index}</div>
                <div>
                  <span class="admin-status-badge ${event.statusClass}">${event.label}</span>
                  <strong>${settlementTimeLabel(event.at)} · ${event.actor}</strong>
                  ${event.from && event.to ? `<em>${event.from} → ${event.to}</em>` : ""}
                  <p>${event.detail || "상세 기록 없음"}</p>
                </div>
              </div>
            `).join("")}
          </div>
        `;
      }

      function stepFromStatus(status) {
        const stepsByStatus = {
          reserved: 0,
          stock_checked: 1,
          styled: 1,
          pickup: 2,
          arriving: 3,
          delivered: 4,
          cancelled: 0,
        };
        return stepsByStatus[status] || 0;
      }

      function statusFromStep(step) {
        if (step >= 4) return "delivered";
        if (step >= 3) return "arriving";
        if (step >= 2) return "pickup";
        if (step >= 1) return "stock_checked";
        return "reserved";
      }

      function labelFromStep(step) {
        const labels = ["예약 완료", "재고 확인", "픽업 요청", "배송 중", "배송 완료"];
        return labels[Math.max(0, Math.min(step, labels.length - 1))];
      }

      function paymentLabelFromStep(step) {
        return step >= 1 ? "결제 완료" : "결제 대기";
      }

      function paymentLabelForOrder(order) {
        if (isOrderCancelled(order)) return refundLabelForOrder(order);
        if (!order || !order.paid) return "결제 대기";
        return order.paymentMethod ? order.paymentMethod + " 결제 완료" : "결제 완료";
      }

      function refundLabelForOrder(order) {
        if (!order) return "주문 취소";
        if (order.refundStatus === "completed") return "환불 완료";
        if (order.refundStatus === "not_required") return "현장결제 취소";
        if (order.refundStatus === "pending") return "환불 대기";
        if (order.paymentMethod === "현장결제" || !order.paid) return "현장결제 취소";
        return "환불 대기";
      }

      function refundStatusFromOrder(order) {
        if (!isOrderCancelled(order)) return "";
        if (order.refundStatus) return order.refundStatus;
        if (order.paymentMethod === "현장결제" || !order.paid) return "not_required";
        return "pending";
      }

      function isOrderCancelled(order) {
        return !!(order && (order.cancelled || order.statusCode === "cancelled"));
      }

      function canCancelOrder(order) {
        return !!(order && !isOrderCancelled(order) && (order.progressStep || 0) < 3);
      }

      function returnRefundDeadline(order) {
        const completedAt = deliveryProofCompletedAt(order);
        if (!completedAt) return null;
        const time = new Date(completedAt).getTime();
        if (!Number.isFinite(time)) return null;
        return new Date(time + RETURN_REFUND_WINDOW_MS);
      }

      function canRequestReturnRefund(order, now = Date.now()) {
        if (!order || isOrderCancelled(order) || (order.progressStep || 0) < 4) return false;
        const deadline = returnRefundDeadline(order);
        return !!(deadline && now <= deadline.getTime());
      }

      function returnRefundWindowLabel(order) {
        const deadline = returnRefundDeadline(order);
        if (!deadline) return "배송완료 후 " + RETURN_REFUND_WINDOW_DAYS + "일";
        const expired = Date.now() > deadline.getTime();
        const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
        const dateLabel = deadline.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
        return expired ? "반품/환불 기간 만료" : "반품/환불 " + daysLeft + "일 남음 · " + dateLabel + "까지";
      }

      function customerCancelActionLabel(order) {
        if (isOrderCancelled(order)) return "취소됨";
        if ((order && order.progressStep || 0) >= 4) return canRequestReturnRefund(order) ? "반품/환불 요청" : "반품/환불 기간 만료";
        return "주문 취소";
      }

      function canCustomerCancelOrReturn(order) {
        return canCancelOrder(order) || canRequestReturnRefund(order);
      }

      function orderDisplayLabel(order) {
        if (isOrderCancelled(order)) return "취소됨";
        return order && order.statusLabel ? order.statusLabel : labelFromStep(order ? order.progressStep || 0 : 0);
      }

      function canCompleteRefund(order) {
        return isOrderCancelled(order) && refundStatusFromOrder(order) === "pending";
      }

      const cancelReasonOptions = [
        { key: "customer", label: "고객 요청" },
        { key: "stock", label: "재고 부족" },
        { key: "delay", label: "배송 지연" },
        { key: "operator", label: "운영자 취소" },
        { key: "other", label: "기타" },
      ];

      function cancelReasonLabel(order) {
        const option = cancelReasonOptions.find((item) => item.key === (order && order.cancelReasonCode));
        return option ? option.label : "기타";
      }

      function defaultCancelReasonCode(source) {
        if (source === "vendor") return "stock";
        if (source === "admin") return "operator";
        return "customer";
      }

      function normalizeCancelReasonCode(value, fallback = "other") {
        const text = String(value || "").trim().toLowerCase();
        if (!text) return fallback;
        if (["1", "customer", "고객", "고객 요청", "고객요청"].includes(text)) return "customer";
        if (["2", "stock", "재고", "재고 부족", "재고부족"].includes(text)) return "stock";
        if (["3", "delay", "배송", "배송 지연", "배송지연"].includes(text)) return "delay";
        if (["4", "operator", "운영", "운영자", "운영자 취소", "운영자취소"].includes(text)) return "operator";
        if (["5", "other", "기타"].includes(text)) return "other";
        const matched = cancelReasonOptions.find((item) => item.key === text || item.label.toLowerCase() === text);
        return matched ? matched.key : fallback;
      }

      function readOrderStatusStore() {
        try {
          return JSON.parse(localStorage.getItem(ORDER_STATUS_STORAGE_KEY) || "{}");
        } catch (error) {
          localStorage.removeItem(ORDER_STATUS_STORAGE_KEY);
          return {};
        }
      }

      function readSettlementStatusStore() {
        try {
          return JSON.parse(localStorage.getItem(SETTLEMENT_STATUS_STORAGE_KEY) || "{}");
        } catch (error) {
          localStorage.removeItem(SETTLEMENT_STATUS_STORAGE_KEY);
          return {};
        }
      }

      function saveSettlementStatus(order) {
        if (!order || !order.id) return;
        const store = readSettlementStatusStore();
        store[order.id] = {
          settlementStatus: order.settlementStatus || "",
          settlementConfirmedAt: order.settlementConfirmedAt || "",
          settlementConfirmedBy: order.settlementConfirmedBy || "",
          settlementPaidAt: order.settlementPaidAt || "",
          settlementHoldReason: order.settlementHoldReason || "",
          settlementHeldAt: order.settlementHeldAt || "",
          settlementReleasedAt: order.settlementReleasedAt || "",
          settlementClosedAt: order.settlementClosedAt || "",
          settlementClosedBy: order.settlementClosedBy || "",
          settlementCloseLabel: order.settlementCloseLabel || "",
        };
        localStorage.setItem(SETTLEMENT_STATUS_STORAGE_KEY, JSON.stringify(store));
      }

      function applyStoredSettlementStatus(order) {
        const stored = readSettlementStatusStore()[order.id];
        if (!stored) return order;
        order.settlementStatus = stored.settlementStatus || order.settlementStatus || "";
        order.settlementConfirmedAt = stored.settlementConfirmedAt || order.settlementConfirmedAt || "";
        order.settlementConfirmedBy = stored.settlementConfirmedBy || order.settlementConfirmedBy || "";
        order.settlementPaidAt = stored.settlementPaidAt || order.settlementPaidAt || "";
        order.settlementHoldReason = stored.settlementHoldReason || order.settlementHoldReason || "";
        order.settlementHeldAt = stored.settlementHeldAt || order.settlementHeldAt || "";
        order.settlementReleasedAt = stored.settlementReleasedAt || order.settlementReleasedAt || "";
        order.settlementClosedAt = stored.settlementClosedAt || order.settlementClosedAt || "";
        order.settlementClosedBy = stored.settlementClosedBy || order.settlementClosedBy || "";
        order.settlementCloseLabel = stored.settlementCloseLabel || order.settlementCloseLabel || "";
        return order;
      }

      function saveOrderStatusOverride(order, options = {}) {
        if (!order || !order.id) return;
        const store = readOrderStatusStore();
        const currentStep = Math.max(0, order.progressStep || 0);
        const savedStep = store[order.id] ? store[order.id].progressStep || 0 : 0;
        if (!options.allowStepBack && !isOrderCancelled(order) && currentStep < savedStep) return;
        store[order.id] = {
          progressStep: currentStep,
          statusCode: isOrderCancelled(order) ? "cancelled" : statusFromStep(currentStep),
          cancelled: isOrderCancelled(order),
          forceStep: !!options.allowStepBack,
          cancelReasonCode: order.cancelReasonCode || "",
          cancelReason: order.cancelReason || "",
          refundStatus: order.refundStatus || "",
          stockReserved: !!order.stockReserved,
          stockRestored: !!order.stockRestored,
          deliveryPartnerName: order.deliveryPartnerName || "",
          riderName: order.riderName || "",
          pickupConfirmedAt: order.pickupConfirmedAt || "",
          arrivalConfirmedAt: order.arrivalConfirmedAt || "",
          pickupProofPhoto: order.pickupProofPhoto || null,
          arrivalProofPhoto: order.arrivalProofPhoto || null,
          settlementStatus: order.settlementStatus || "",
          settlementConfirmedAt: order.settlementConfirmedAt || "",
          settlementConfirmedBy: order.settlementConfirmedBy || "",
          settlementPaidAt: order.settlementPaidAt || "",
          settlementHoldReason: order.settlementHoldReason || "",
          settlementHeldAt: order.settlementHeldAt || "",
          settlementReleasedAt: order.settlementReleasedAt || "",
          settlementClosedAt: order.settlementClosedAt || "",
          settlementClosedBy: order.settlementClosedBy || "",
          settlementCloseLabel: order.settlementCloseLabel || "",
          deliveryLogs: order.deliveryLogs || [],
          paid: !!order.paid,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(ORDER_STATUS_STORAGE_KEY, JSON.stringify(store));
      }

      function applyStoredOrderStatus(order) {
        const stored = readOrderStatusStore()[order.id];
        if (!stored) return applyStoredSettlementStatus(order);
        if (stored.cancelled || stored.statusCode === "cancelled") {
          order.cancelled = true;
          order.cancelReasonCode = stored.cancelReasonCode || order.cancelReasonCode || "other";
          order.cancelReason = stored.cancelReason || order.cancelReason || "";
          order.refundStatus = stored.refundStatus || order.refundStatus || refundStatusFromOrder(order);
          order.stockReserved = !!stored.stockReserved || !!order.stockReserved;
          order.stockRestored = !!stored.stockRestored || !!order.stockRestored;
          order.statusCode = "cancelled";
          order.statusLabel = "취소됨";
          order.paymentLabel = paymentLabelForOrder(order);
          return order;
        }
        const storedStep = stored.progressStep || stepFromStatus(stored.statusCode);
        if (stored.forceStep || storedStep > (order.progressStep || 0)) {
          order.progressStep = storedStep;
          order.statusCode = statusFromStep(storedStep);
          order.statusLabel = labelFromStep(storedStep);
        }
        if (stored.paid) order.paid = true;
        order.deliveryPartnerName = stored.deliveryPartnerName || order.deliveryPartnerName || "";
        order.riderName = stored.riderName || order.riderName || "";
        order.pickupConfirmedAt = stored.pickupConfirmedAt || order.pickupConfirmedAt || "";
        order.arrivalConfirmedAt = stored.arrivalConfirmedAt || order.arrivalConfirmedAt || "";
        order.pickupProofPhoto = stored.pickupProofPhoto || order.pickupProofPhoto || null;
        order.arrivalProofPhoto = stored.arrivalProofPhoto || order.arrivalProofPhoto || null;
        order.settlementStatus = stored.settlementStatus || order.settlementStatus || "";
        order.settlementConfirmedAt = stored.settlementConfirmedAt || order.settlementConfirmedAt || "";
        order.settlementConfirmedBy = stored.settlementConfirmedBy || order.settlementConfirmedBy || "";
        order.settlementPaidAt = stored.settlementPaidAt || order.settlementPaidAt || "";
        order.settlementHoldReason = stored.settlementHoldReason || order.settlementHoldReason || "";
        order.settlementHeldAt = stored.settlementHeldAt || order.settlementHeldAt || "";
        order.settlementReleasedAt = stored.settlementReleasedAt || order.settlementReleasedAt || "";
        order.settlementClosedAt = stored.settlementClosedAt || order.settlementClosedAt || "";
        order.settlementClosedBy = stored.settlementClosedBy || order.settlementClosedBy || "";
        order.settlementCloseLabel = stored.settlementCloseLabel || order.settlementCloseLabel || "";
        order.deliveryLogs = Array.isArray(stored.deliveryLogs) ? stored.deliveryLogs : (order.deliveryLogs || []);
        order.paymentLabel = paymentLabelForOrder(order);
        return applyStoredSettlementStatus(order);
      }

      function mergeOrderLists(primary, secondary) {
        const merged = [];
        [...primary, ...secondary].forEach((order) => {
          if (!order || !order.id) return;
          const existing = merged.find((item) => item.id === order.id);
          if (!existing) {
            merged.push(applyStoredOrderStatus(order));
            return;
          }
          const stronger = (order.progressStep || 0) > (existing.progressStep || 0) ? order : existing;
          Object.assign(existing, applyStoredOrderStatus({ ...existing, ...stronger }));
        });
        return merged
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          .slice(0, 10);
      }

      function saveCurrentCustomer() {
        localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(currentCustomer));
      }

      function restoreSavedCustomer() {
        const saved = localStorage.getItem(CUSTOMER_STORAGE_KEY);
        if (!saved) return;
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.id && parsed.id !== "guest-preview") {
            currentCustomer = parsed;
          }
        } catch (error) {
          localStorage.removeItem(CUSTOMER_STORAGE_KEY);
        }
      }

      function saveCurrentVendor() {
        if (!currentVendor) {
          localStorage.removeItem(VENDOR_STORAGE_KEY);
          return;
        }
        localStorage.setItem(VENDOR_STORAGE_KEY, JSON.stringify({ store: currentVendor.store }));
      }

      function restoreSavedVendor() {
        const saved = localStorage.getItem(VENDOR_STORAGE_KEY);
        if (!saved) return;
        try {
          const parsed = JSON.parse(saved);
          const account = vendorAccounts.find((item) => item.store === parsed.store);
          if (account) currentVendor = account;
        } catch (error) {
          localStorage.removeItem(VENDOR_STORAGE_KEY);
        }
      }

      function saveCurrentAdmin() {
        if (!currentAdmin) {
          localStorage.removeItem(ADMIN_STORAGE_KEY);
          return;
        }
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify({ name: currentAdmin.name, role: currentAdmin.role || "total" }));
      }

      function restoreSavedAdmin() {
        const saved = localStorage.getItem(ADMIN_STORAGE_KEY);
        if (!saved) return;
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.name === adminAccount.name) currentAdmin = { name: adminAccount.name, role: "total" };
          const partner = deliveryPartners.find((item) => item.name === parsed.name);
          if (partner) currentAdmin = { name: partner.name, role: "delivery", areas: partner.areas, riders: riderNicknamesForPartner(partner) };
        } catch (error) {
          localStorage.removeItem(ADMIN_STORAGE_KEY);
        }
      }

      function getOAuthRedirectUrl() {
        const url = new URL(window.location.href);
        url.searchParams.delete("code");
        url.searchParams.delete("error");
        url.searchParams.delete("error_code");
        url.searchParams.delete("error_description");
        url.hash = "";
        return url.toString();
      }

      function getAuthReturnParams() {
        const params = new URLSearchParams(window.location.search);
        const hash = window.location.hash.replace(/^#/, "");
        if (hash) {
          const hashParams = new URLSearchParams(hash);
          hashParams.forEach((value, key) => {
            if (!params.has(key)) params.set(key, value);
          });
        }
        return params;
      }

      function canUseSupabase() {
        return !!(window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY);
      }

      function setupClientIfNeeded() {
        if (!canUseSupabase()) return false;
        if (!supabaseClient) {
          supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          supabaseClient.auth.onAuthStateChange((event, session) => {
            if (session && session.user) {
              applyAuthSession(session);
            }
          });
        }
        return true;
      }

      async function syncAuthSession() {
        if (!setupClientIfNeeded()) return;
        const params = getAuthReturnParams();
        const authError = params.get("error_description") || params.get("error");
        if (authError) {
          const decoded = decodeURIComponent(authError.replace(/\+/g, " "));
          setSyncStatus("카카오 설정 확인: REST API 키, Client Secret, account_email 동의항목을 확인해 주세요");
          const note = document.getElementById("oauthNote");
          if (note) {
            note.textContent = "실패 원인: " + decoded + " / 카카오 account_email 선택동의, REST API 키, Client Secret이 Supabase와 같은지 확인해 주세요.";
          }
          window.history.replaceState({}, document.title, getOAuthRedirectUrl());
          return;
        }
        const code = params.get("code");
        if (code) {
          const exchange = await supabaseClient.auth.exchangeCodeForSession(code);
          if (exchange.error) {
            setSyncStatus("카카오 로그인 완료 정보를 앱에 적용하지 못했습니다: " + exchange.error.message);
          } else if (exchange.data && exchange.data.session) {
            applyAuthSession(exchange.data.session);
          }
          window.history.replaceState({}, document.title, getOAuthRedirectUrl());
        }
        const result = await supabaseClient.auth.getSession();
        if (result.data && result.data.session) {
          applyAuthSession(result.data.session);
        }
      }

      function applyAuthSession(session) {
        const user = session.user;
        const meta = user.user_metadata || {};
        currentCustomer = {
          name: meta.full_name || meta.name || meta.nickname || user.email || "소셜 로그인 고객",
          phone: user.email || user.id,
          email: user.email || "",
          id: "auth-" + user.id,
          provider: user.app_metadata && user.app_metadata.provider ? user.app_metadata.provider : "oauth",
        };
        orderHistory = [];
        lastOrder = null;
        saveCurrentCustomer();
        closeCustomerLogin();
        if (supabaseClient) {
          loadSupabaseOrders().catch(() => setSyncStatus("고객 주문 내역 불러오기 실패"));
          loadSupabaseWishlist().catch(() => setSyncStatus("관심상품 불러오기 실패 - wishlists SQL 확인 필요"));
        }
        if (document.getElementById("myModal").classList.contains("open")) {
          renderMyPage();
        }
        setSyncStatus(currentCustomer.name + " 소셜 로그인 완료");
      }

      async function checkSupabaseSetup() {
        const resultNode = document.getElementById("setupCheckResult");
        resultNode.textContent = "Supabase 설정을 확인 중입니다...";
        if (!setupClientIfNeeded()) {
          resultNode.textContent = "Supabase URL 또는 anon key가 앱에 주입되지 않았습니다.";
          return;
        }
        const checks = [];
        for (const table of ["showrooms", "products", "orders", "order_items", "look_sets", "look_set_items", "product_reviews", "wishlists"]) {
          const result = await supabaseClient.from(table).select("*").limit(1);
          checks.push({ name: table, ok: !result.error, error: result.error ? result.error.message : "" });
        }
        const storageChecks = [];
        try {
          const blob = new Blob(["fitnow storage check"], { type: "text/plain" });
          for (const bucket of ["product-images", "delivery-proof-photos"]) {
            const upload = await supabaseClient.storage.from(bucket).upload("health-check.txt", blob, { upsert: true });
            storageChecks.push({ name: bucket, ok: !upload.error, error: upload.error ? upload.error.message : "" });
          }
        } catch (error) {
          storageChecks.push({ name: "storage", ok: false, error: error.message });
        }
        const failed = checks.filter((item) => !item.ok);
        const failedStorage = storageChecks.filter((item) => !item.ok);
        if (!failed.length && !failedStorage.length) {
          resultNode.textContent = "정상입니다. 테이블 8개와 이미지 저장소 2개가 준비됐습니다.";
          setSyncStatus("Supabase SQL 확인 완료");
        } else {
          const tableText = failed.length ? "실패 테이블: " + failed.map((item) => item.name).join(", ") + ". " : "";
          const storageText = failedStorage.length ? "이미지 저장소 실패: " + failedStorage.map((item) => item.name + " " + item.error).join(", ") : "";
          resultNode.textContent = tableText + storageText;
          setSyncStatus("Supabase SQL 확인 필요");
        }
      }

      function showroomToStore(row) {
        return {
          dbId: row.id,
          slug: row.slug,
          name: row.name,
          area: row.area,
          address: row.address || "",
          pickup: row.pickup_enabled !== false,
          open: row.is_open !== false,
          prep: row.prep_minutes || 0,
        };
      }

      function productToItem(row) {
        return {
          dbId: row.id,
          key: row.slug,
          name: row.name,
          price: row.price,
          discountRate: row.discount_rate || 0,
          category: row.category === "fashion" || row.category === "의류" ? "상의" : (row.category || "상의"),
          showroom: row.showrooms ? row.showrooms.name : "입점 매장",
          showroomId: row.showroom_id,
          stock: row.stock_quantity,
          minutes: row.delivery_minutes,
          match: row.match_score || 80,
          material: row.material || "소재 미입력",
          visual: row.visual_key || "jacket",
          image: row.image_url || "",
          fit: row.fit || "업체 등록 상품",
          size: row.size_label || "Free",
          note: row.description || row.meta || "입점업체가 등록한 상품입니다.",
          vendorAdded: true,
        };
      }

      function lookSetRowToItem(row) {
        return {
          dbId: row.id,
          key: row.slug,
          title: row.title,
          store: row.showrooms ? row.showrooms.name : "입점 매장",
          showroomId: row.showroom_id,
          discountRate: row.discount_rate || 0,
          keys: (row.look_set_items || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map((item) => item.product_slug),
          note: row.description || "입점 매장이 직접 구성한 세트입니다.",
        };
      }

      function reviewRowToItem(row) {
        return {
          id: row.id,
          orderId: row.order_code,
          productKey: row.product_slug,
          productName: row.product_name,
          showroom: row.showroom_name,
          showroomId: row.showroom_id,
          size: row.size || "FREE",
          rating: row.rating,
          comment: row.comment || "",
          customerName: row.customer_name || "고객",
          customerId: row.user_id || "",
          createdAt: row.created_at,
        };
      }

      function mergeReviews(primary, secondary) {
        const merged = [];
        [...primary, ...secondary].forEach((review) => {
          if (!review || !review.orderId || !review.productKey) return;
          const key = [review.orderId, review.productKey, review.size || "FREE", review.customerId || ""].join("|");
          const existing = merged.find((item) => [item.orderId, item.productKey, item.size || "FREE", item.customerId || ""].join("|") === key);
          if (!existing) {
            merged.push(review);
            return;
          }
          if (new Date(review.createdAt || 0).getTime() >= new Date(existing.createdAt || 0).getTime()) {
            Object.assign(existing, review);
          }
        });
        return merged
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          .slice(0, 80);
      }

      function encodeDeliveryRequest(order) {
        return JSON.stringify({
          address: order.address || "",
          receiveType: order.receiveType || "문앞 수령",
          paymentMethod: order.paymentMethod || "",
          riderRequest: order.riderRequest || "",
          cancelReasonCode: order.cancelReasonCode || "",
          cancelReason: order.cancelReason || "",
          refundStatus: order.refundStatus || "",
          stockReserved: !!order.stockReserved,
          stockRestored: !!order.stockRestored,
          deliveryPartnerName: order.deliveryPartnerName || "",
          riderName: order.riderName || "",
          pickupConfirmedAt: order.pickupConfirmedAt || "",
          arrivalConfirmedAt: order.arrivalConfirmedAt || "",
          pickupProofPhoto: order.pickupProofPhoto || null,
          arrivalProofPhoto: order.arrivalProofPhoto || null,
          settlementStatus: order.settlementStatus || "",
          settlementConfirmedAt: order.settlementConfirmedAt || "",
          settlementConfirmedBy: order.settlementConfirmedBy || "",
          settlementPaidAt: order.settlementPaidAt || "",
          settlementHoldReason: order.settlementHoldReason || "",
          settlementHeldAt: order.settlementHeldAt || "",
          settlementReleasedAt: order.settlementReleasedAt || "",
          settlementClosedAt: order.settlementClosedAt || "",
          settlementClosedBy: order.settlementClosedBy || "",
          settlementCloseLabel: order.settlementCloseLabel || "",
          deliveryLogs: order.deliveryLogs || [],
        });
      }

      function decodeDeliveryRequest(value, fallbackRegion = "") {
        try {
          const parsed = JSON.parse(value || "{}");
          if (parsed && typeof parsed === "object") {
            return {
              address: parsed.address || fallbackRegion || "",
              receiveType: parsed.receiveType || "문앞 수령",
              paymentMethod: parsed.paymentMethod || "",
              riderRequest: parsed.riderRequest || "",
              cancelReasonCode: parsed.cancelReasonCode || "",
              cancelReason: parsed.cancelReason || "",
              refundStatus: parsed.refundStatus || "",
              stockReserved: !!parsed.stockReserved,
              stockRestored: !!parsed.stockRestored,
              deliveryPartnerName: parsed.deliveryPartnerName || "",
              riderName: parsed.riderName || "",
              pickupConfirmedAt: parsed.pickupConfirmedAt || "",
              arrivalConfirmedAt: parsed.arrivalConfirmedAt || "",
              pickupProofPhoto: parsed.pickupProofPhoto || null,
              arrivalProofPhoto: parsed.arrivalProofPhoto || null,
              settlementStatus: parsed.settlementStatus || "",
              settlementConfirmedAt: parsed.settlementConfirmedAt || "",
              settlementConfirmedBy: parsed.settlementConfirmedBy || "",
              settlementPaidAt: parsed.settlementPaidAt || "",
              settlementHoldReason: parsed.settlementHoldReason || "",
              settlementHeldAt: parsed.settlementHeldAt || "",
              settlementReleasedAt: parsed.settlementReleasedAt || "",
              settlementClosedAt: parsed.settlementClosedAt || "",
              settlementClosedBy: parsed.settlementClosedBy || "",
              settlementCloseLabel: parsed.settlementCloseLabel || "",
              deliveryLogs: Array.isArray(parsed.deliveryLogs) ? parsed.deliveryLogs : [],
            };
          }
        } catch (error) {
          return { address: value || fallbackRegion || "", receiveType: "문앞 수령", paymentMethod: "", riderRequest: "", cancelReasonCode: "", cancelReason: "", refundStatus: "", stockReserved: false, stockRestored: false, deliveryPartnerName: "", riderName: "", pickupConfirmedAt: "", arrivalConfirmedAt: "", pickupProofPhoto: null, arrivalProofPhoto: null, settlementStatus: "", settlementConfirmedAt: "", settlementConfirmedBy: "", settlementPaidAt: "", settlementHoldReason: "", settlementHeldAt: "", settlementReleasedAt: "", settlementClosedAt: "", settlementClosedBy: "", settlementCloseLabel: "", deliveryLogs: [] };
        }
        return { address: value || fallbackRegion || "", receiveType: "문앞 수령", paymentMethod: "", riderRequest: "", cancelReasonCode: "", cancelReason: "", refundStatus: "", stockReserved: false, stockRestored: false, deliveryPartnerName: "", riderName: "", pickupConfirmedAt: "", arrivalConfirmedAt: "", pickupProofPhoto: null, arrivalProofPhoto: null, settlementStatus: "", settlementConfirmedAt: "", settlementConfirmedBy: "", settlementPaidAt: "", settlementHoldReason: "", settlementHeldAt: "", settlementReleasedAt: "", settlementClosedAt: "", settlementClosedBy: "", settlementCloseLabel: "", deliveryLogs: [] };
      }

      async function initSupabase() {
        if (!canUseSupabase()) {
          setSyncStatus("Supabase 설정 없음 - 임시 데이터로 실행 중");
          return;
        }
        try {
          setupClientIfNeeded();
          await syncAuthSession();
          await loadSupabaseData();
          dbConnected = true;
          setSyncStatus("Supabase 연결됨 - DB 상품/매장 동기화 중");
        } catch (error) {
          dbConnected = false;
          setSyncStatus("Supabase 연결 실패 - 임시 데이터로 실행 중");
        }
      }

      async function loadSupabaseData() {
        const showroomResult = await supabaseClient.from("showrooms").select("*").order("created_at", { ascending: true });
        if (showroomResult.error) throw showroomResult.error;
        const productResult = await supabaseClient
          .from("products")
          .select("*, showrooms(name)")
          .order("created_at", { ascending: false });
        if (productResult.error) throw productResult.error;

        if (showroomResult.data && showroomResult.data.length) {
          partnerStores.splice(0, partnerStores.length, ...showroomResult.data.map(showroomToStore));
        }
        if (productResult.data && productResult.data.length) {
          products.splice(0, products.length, ...productResult.data.map(productToItem));
        }
        await loadSupabaseLookSets();
        await loadSupabaseReviews();
        await loadSupabaseWishlist();
        await loadSupabaseOrders();
      }

      async function loadSupabaseLookSets() {
        if (!supabaseClient) return;
        const result = await supabaseClient
          .from("look_sets")
          .select("*, showrooms(name), look_set_items(*)")
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        if (result.error) {
          if (String(result.error.message || "").includes("look_sets")) return;
          throw result.error;
        }
        if (result.data && result.data.length) {
          lookSets.splice(0, lookSets.length, ...result.data.map(lookSetRowToItem).filter((look) => look.keys.length));
        }
      }

      async function loadSupabaseReviews() {
        if (!supabaseClient) return;
        const result = await supabaseClient
          .from("product_reviews")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(80);
        if (result.error) {
          if (String(result.error.message || "").includes("product_reviews")) return;
          throw result.error;
        }
        reviews = mergeReviews((result.data || []).map(reviewRowToItem), reviews);
        saveReviewStore();
      }

      async function loadSupabaseWishlist() {
        if (!canSyncWishlist()) return;
        const result = await supabaseClient
          .from("wishlists")
          .select("product_slug")
          .eq("user_id", customerId())
          .order("created_at", { ascending: false })
          .limit(80);
        if (result.error) {
          if (String(result.error.message || "").includes("wishlists")) return;
          throw result.error;
        }
        mergeWishlistKeys((result.data || []).map((row) => row.product_slug));
        await syncLocalWishlistToSupabase();
        renderProducts();
        if (document.getElementById("myModal").classList.contains("open")) renderMyPage();
      }

      async function syncLocalWishlistToSupabase() {
        if (!canSyncWishlist()) return;
        for (const key of wishlist) {
          await syncWishlistToSupabase(key);
        }
      }

      async function loadSupabaseOrders() {
        const orderResult = await supabaseClient
          .from("orders")
          .select("*, order_items(*)")
          .eq("user_id", customerId())
          .order("created_at", { ascending: false })
          .limit(10);
        if (orderResult.error) throw orderResult.error;
        orderHistory = mergeOrderLists(
          (orderResult.data || []).map(orderRowToHistory).filter((order) => !isDiagnosticOrder(order)),
          orderHistory.filter((order) => !isDiagnosticOrder(order)),
        );
        if (orderHistory.length) {
          lastOrder = lastOrder ? orderHistory.find((order) => order.id === lastOrder.id) || orderHistory[0] : orderHistory[0];
        }
      }

      async function loadVendorOrders() {
        if (!supabaseClient || !currentVendor) return [];
        const orderResult = await supabaseClient
          .from("orders")
          .select("*, order_items(*)")
          .order("created_at", { ascending: false })
          .limit(30);
        if (orderResult.error) throw orderResult.error;
        return (orderResult.data || [])
          .map(orderRowToHistory)
          .filter((order) => !isDiagnosticOrder(order))
          .filter((order) => order.items.some((item) => item.showroom === currentVendor.store));
      }

      async function loadAdminOrders(options = {}) {
        if (!supabaseClient) return orderHistory;
        const includeDiagnostic = !!(options && options.includeDiagnostic);
        const orderResult = await supabaseClient
          .from("orders")
          .select("*, order_items(*)")
          .order("created_at", { ascending: false })
          .limit(50);
        if (orderResult.error) throw orderResult.error;
        return (orderResult.data || [])
          .map(orderRowToHistory)
          .filter((order) => includeDiagnostic || !isDiagnosticOrder(order));
      }

      function orderRowToHistory(row) {
        const items = (row.order_items || []).map((item) => {
          const product = products.find((candidate) => candidate.key === item.product_slug);
          return product ? {
            ...product,
            size: item.size || product.size || "FREE",
            quantity: item.quantity,
            salePrice: item.unit_price,
            normalPrice: product.price,
          } : {
            key: item.product_slug,
            name: item.product_name,
            price: item.unit_price,
            salePrice: item.unit_price,
            quantity: item.quantity,
            showroom: "저장된 주문",
            stock: 0,
            minutes: row.eta_minutes || 32,
            match: 80,
            material: "",
            visual: "bag",
            fit: "",
            size: item.size || "FREE",
            note: "",
          };
        });
        if (!items.length) {
          items.push({
            key: "pending-item",
            name: "상품 정보 확인 중",
            price: row.item_total || row.total || 0,
            salePrice: row.item_total || row.total || 0,
            quantity: 1,
            showroom: "저장된 주문",
            stock: 0,
            minutes: row.eta_minutes || 32,
            match: 0,
            material: "",
            visual: "bag",
            fit: "",
            size: "FREE",
            note: "주문 항목 동기화가 아직 완료되지 않았습니다.",
          });
        }
        const step = stepFromStatus(row.status);
        const deliveryRequest = decodeDeliveryRequest(row.request_note, row.destination_label);
        const cancelled = row.status === "cancelled";
        const paid = step >= 1 || (deliveryRequest.paymentMethod && deliveryRequest.paymentMethod !== "현장결제");
        return applyStoredOrderStatus({
          id: row.order_code,
          dbId: row.id,
          statusCode: row.status,
          progressStep: step,
          cancelled,
          cancelReasonCode: deliveryRequest.cancelReasonCode || "",
          cancelReason: deliveryRequest.cancelReason || "",
          refundStatus: deliveryRequest.refundStatus || "",
          stockReserved: !!deliveryRequest.stockReserved,
          stockRestored: !!deliveryRequest.stockRestored,
          region: row.destination_label || "오산, 동탄",
          address: deliveryRequest.address,
          receiveType: deliveryRequest.receiveType,
          paymentMethod: deliveryRequest.paymentMethod || "카카오페이",
          riderRequest: deliveryRequest.riderRequest,
          deliveryLogs: deliveryRequest.deliveryLogs || [],
          pickupConfirmedAt: deliveryRequest.pickupConfirmedAt || "",
          arrivalConfirmedAt: deliveryRequest.arrivalConfirmedAt || "",
          pickupProofPhoto: deliveryRequest.pickupProofPhoto || null,
          arrivalProofPhoto: deliveryRequest.arrivalProofPhoto || null,
          settlementStatus: deliveryRequest.settlementStatus || "",
          settlementConfirmedAt: deliveryRequest.settlementConfirmedAt || "",
          settlementConfirmedBy: deliveryRequest.settlementConfirmedBy || "",
          settlementPaidAt: deliveryRequest.settlementPaidAt || "",
          settlementHoldReason: deliveryRequest.settlementHoldReason || "",
          settlementHeldAt: deliveryRequest.settlementHeldAt || "",
          settlementReleasedAt: deliveryRequest.settlementReleasedAt || "",
          settlementClosedAt: deliveryRequest.settlementClosedAt || "",
          settlementClosedBy: deliveryRequest.settlementClosedBy || "",
          settlementCloseLabel: deliveryRequest.settlementCloseLabel || "",
          items,
          subtotal: row.item_total,
          deliveryFee: row.delivery_fee,
          total: row.total,
          fastest: row.eta_minutes || 32,
          statusLabel: cancelled ? "취소됨" : labelFromStep(step),
          paid,
          paymentLabel: paymentLabelForOrder({ cancelled, statusCode: row.status, paid, paymentMethod: deliveryRequest.paymentMethod || "카카오페이" }),
          deliveryPartnerName: deliveryRequest.deliveryPartnerName || "",
          riderName: deliveryRequest.riderName || "",
          createdAt: row.created_at,
          createdLabel: new Date(row.created_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
        });
      }

      function isDiagnosticOrder(order) {
        const id = String(order && order.id || "");
        return id.startsWith("FN-TEST-") || id.startsWith("FN-SET");
      }

      function orderStatusLabel(status) {
        const labels = {
          reserved: "예약 완료",
          stock_checked: "재고 확인",
          styled: "스타일 체크",
          pickup: "픽업 준비",
          arriving: "배송 중",
          delivered: "배송 완료",
          cancelled: "취소됨",
        };
        return labels[status] || "배송 진행 중";
      }

      function currentRegion() {
        return regions.find((region) => region.key === selectedRegion) || regions[0];
      }

      function eta(item) {
        const store = storeByName(item.showroom);
        const prep = store ? store.prep : 0;
        return item.minutes + currentRegion().offset + prep;
      }

      function storeByName(name) {
        return partnerStores.find((store) => store.name === name);
      }

      function productStatus(item) {
        if (!item) return "selling";
        if (item.status === "hidden") return "hidden";
        if (item.status === "soldout" || totalSizeStock(item) <= 0) return "soldout";
        return "selling";
      }

      function productStatusLabel(item) {
        const status = productStatus(item);
        if (status === "hidden") return "숨김";
        if (status === "soldout") return "품절";
        if (totalSizeStock(item) <= 2) return "재고 부족";
        return "판매중";
      }

      function productStatusClass(item) {
        const status = productStatus(item);
        if (status === "hidden" || status === "soldout") return "stop";
        if (totalSizeStock(item) <= 2) return "low";
        return "";
      }

      function storeIsVisible(item) {
        const store = storeByName(item.showroom);
        return productStatus(item) === "selling" && (!store || (store.open && store.pickup));
      }

      function renderRegions() {
        const region = currentRegion();
        document.querySelector(".brand small").textContent = "오산, 동탄 지금배송";
        document.getElementById("areaTitle").textContent = region.label + "로 받을게요";
        document.getElementById("areaCopy").textContent = region.copy;
        document.getElementById("regionGrid").innerHTML = regions.map((item) => `
          <button class="region-button ${item.key === selectedRegion ? "active-control" : ""}" type="button" onclick="setRegion('${item.key}')">
            ${item.name}
            <span>예상 +${item.offset}분</span>
          </button>
        `).join("");
        renderAddressSuggestions("home");
      }

      function vendorStores() {
        return currentVendor ? [currentVendor.store] : partnerStores.map((store) => store.name);
      }

      function renderVendorStores() {
        document.getElementById("vendorStore").innerHTML = vendorStores().map((store) =>
          '<option value="' + store + '">' + store + '</option>'
        ).join("");
      }

      function renderVendorProducts() {
        const vendorItems = products.filter((item) => !currentVendor || item.showroom === currentVendor.store);
        document.getElementById("vendorProductList").innerHTML = vendorItems.length ? vendorItems.map((item) => {
          const stock = totalSizeStock(item);
          return `
            <div class="vendor-product-row">
              <div>
                <strong>${item.name}</strong>
                <span>${item.category || "상품"} · 할인가 ${formatKRW(itemSalePrice(item))} · 총재고 ${stock}개</span>
                <span class="product-status-tag ${productStatusClass(item)}">${productStatusLabel(item)}</span>
              </div>
              <div class="mini-actions">
                <button type="button" onclick="openVendorProductDetail('${item.key}')">상세/수정</button>
              </div>
            </div>
          `;
        }).join("") : '<div class="line-item"><span>아직 등록된 상품이 없습니다</span><strong>등록 대기</strong></div>';
        renderVendorHomeBoard();
      }

      function renderVendorLookPicker() {
        const picker = document.getElementById("vendorLookProductPicker");
        if (!picker || !currentVendor) return;
        const vendorItems = products.filter((item) => item.showroom === currentVendor.store);
        const editingLook = lookSets.find((look) => look.key === editingLookKey && look.store === currentVendor.store);
        const selectedKeys = editingLook ? editingLook.keys : [];
        picker.innerHTML = vendorItems.length ? vendorItems.map((item) => `
          <label class="look-size-row">
            <div>
              <strong>${item.category || "상품"} · ${item.name}</strong>
              <span>${formatKRW(itemSalePrice(item))} · ${item.stock}개 재고</span>
            </div>
            <input type="checkbox" name="vendorLookItem" value="${item.key}" ${selectedKeys.includes(item.key) ? "checked" : ""} />
          </label>
        `).join("") : '<div class="line-item"><span>세트로 묶을 상품이 없습니다</span><strong>상품 등록 필요</strong></div>';
      }

      function renderVendorLooks() {
        const list = document.getElementById("vendorLookList");
        if (!list || !currentVendor) return;
        const vendorLooks = lookSets.filter((look) => look.store === currentVendor.store);
        list.innerHTML = vendorLooks.length ? vendorLooks.map((look) => {
          const items = lookItems(look);
          return `
            <div class="vendor-product-row">
              <div>
                <strong>${look.title}</strong>
                <span>${items.map((item) => (item.category || "상품") + " · " + item.name).join(", ")}</span>
                <span>${look.note}</span>
              </div>
              <div class="mini-actions">
                <button type="button" onclick="editVendorLook('${look.key}')">수정</button>
                <button class="danger" type="button" onclick="deleteVendorLook('${look.key}')">삭제</button>
              </div>
            </div>
          `;
        }).join("") : '<div class="line-item"><span>아직 등록된 세트가 없습니다</span><strong>세트 대기</strong></div>';
      }

      function renderVendorRoleSummary() {
        if (!currentVendor) return;
        const productCount = products.filter((item) => item.showroom === currentVendor.store).length;
        const reviewItems = storeReviews(currentVendor.store);
        const rating = averageRating(reviewItems);
        const pendingOrderCount = orderHistory.filter((order) =>
          !isOrderCancelled(order) && order.items.some((item) => item.showroom === currentVendor.store) && (order.progressStep || 0) < 2
        ).length;
        const strip = document.getElementById("vendorRoleStrip");
        if (strip) {
          strip.innerHTML = `
            <div class="role-pill">
              <strong>${currentVendor.store}</strong>
              <span>상품 ${productCount}개 관리 중 · 다른 매장 상품 접근 차단</span>
            </div>
            <div class="role-pill">
              <strong>업체 처리 범위</strong>
              <span>재고 확인, 픽업 준비 · 대기 주문 ${pendingOrderCount}건</span>
            </div>
            <div class="role-pill">
              <strong>업체 평점</strong>
              <span>${reviewItems.length ? rating.toFixed(1) + "점 · 리뷰 " + reviewItems.length + "개" : "아직 리뷰 없음"}</span>
            </div>
          `;
        }
        const title = document.getElementById("partnerStoreTitle");
        if (title) title.textContent = currentVendor.store + " 운영 설정";
      }

      function isTodayOrder(order) {
        if (!order || !order.createdAt) return false;
        const created = new Date(order.createdAt);
        const today = new Date();
        return created.getFullYear() === today.getFullYear()
          && created.getMonth() === today.getMonth()
          && created.getDate() === today.getDate();
      }

      function renderVendorHomeBoard(orders = orderHistory) {
        const board = document.getElementById("vendorHomeBoard");
        if (!board) return;
        if (!currentVendor) {
          board.innerHTML = "";
          return;
        }
        const vendorItems = products.filter((item) => item.showroom === currentVendor.store);
        const vendorOrders = (orders || []).filter((order) => vendorOrderItems(order).length);
        const activeOrders = vendorOrders.filter((order) => !isOrderCancelled(order) && (order.progressStep || 0) < 2);
        const lowStock = vendorItems.filter((item) => productStatus(item) === "selling" && totalSizeStock(item) <= 2).length;
        const stoppedItems = vendorItems.filter((item) => productStatus(item) !== "selling").length;
        const todaySales = vendorOrders
          .filter((order) => !isOrderCancelled(order) && (order.progressStep || 0) >= 4 && isTodayOrder(order))
          .reduce((sum, order) => sum + vendorOrderTotal(order), 0);
        const recentReviews = storeReviews(currentVendor.store).filter((review) => isTodayOrder(review)).length;
        const alerts = [];
        if (activeOrders.length) alerts.push({ text: "새 주문 " + activeOrders.length + "건이 재고 확인 또는 픽업 준비를 기다리고 있어요.", good: false });
        if (lowStock) alerts.push({ text: "재고 2개 이하 상품 " + lowStock + "개가 있어요. 상품 관리에서 재고를 확인해 주세요.", good: false });
        if (stoppedItems) alerts.push({ text: "품절/숨김 상품 " + stoppedItems + "개는 고객에게 노출되지 않고 있어요.", good: false });
        if (todaySales > 0) alerts.push({ text: "오늘 배송완료 매출은 " + formatKRW(todaySales) + "입니다.", good: true });
        if (recentReviews) alerts.push({ text: "오늘 새 리뷰 " + recentReviews + "개가 등록됐어요.", good: true });
        if (!alerts.length) alerts.push({ text: "현재 급하게 처리할 알림이 없습니다. 운영 상태가 깔끔해요.", good: true });
        board.innerHTML = `
          <div class="vendor-home-grid">
            <div class="vendor-home-tile"><span>처리할 주문</span><strong>${activeOrders.length}건</strong></div>
            <div class="vendor-home-tile"><span>재고 부족</span><strong>${lowStock}개</strong></div>
            <div class="vendor-home-tile"><span>품절/숨김</span><strong>${stoppedItems}개</strong></div>
            <div class="vendor-home-tile"><span>오늘 매출</span><strong>${formatKRW(todaySales)}</strong></div>
          </div>
          <div class="vendor-alert-list">
            ${alerts.map((alert) => '<div class="vendor-alert-row ' + (alert.good ? 'good' : '') + '">' + alert.text + '</div>').join("")}
          </div>
          <div class="vendor-home-actions">
            <button type="button" onclick="focusVendorSection('vendorProductFormSection')">상품 등록</button>
            <button type="button" onclick="focusVendorSection('vendorOrderSection')">주문 보기</button>
            <button type="button" onclick="focusVendorSection('vendorProductManageSection')">상품 관리</button>
          </div>
        `;
      }

      function focusVendorSection(id) {
        const section = document.getElementById(id);
        if (!section) return;
        if (section.tagName === "DETAILS") section.open = true;
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      function renderVendorReviews() {
        const list = document.getElementById("vendorReviewList");
        if (!list) return;
        if (!currentVendor) {
          list.innerHTML = '<div class="line-item"><span>업체 로그인 후 확인할 수 있습니다</span><strong>로그인 필요</strong></div>';
          return;
        }
        const items = storeReviews(currentVendor.store).slice(0, 8);
        list.innerHTML = items.length ? items.map((review) => `
          <div class="vendor-product-row">
            <div>
              <strong>${review.productName} · 별점 ${review.rating}</strong>
              <span>${review.comment}</span>
              <span>${review.customerName} · ${review.size || "FREE"}</span>
            </div>
            <strong>${new Date(review.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</strong>
          </div>
        `).join("") : '<div class="line-item"><span>아직 등록된 리뷰가 없습니다</span><strong>리뷰 대기</strong></div>';
      }

      function vendorOrderItems(order) {
        if (!currentVendor || !order) return [];
        return (order.items || []).filter((item) => item.showroom === currentVendor.store);
      }

      function vendorOrderTotal(order) {
        return vendorOrderItems(order).reduce((sum, item) => sum + itemSalePrice(item) * (item.quantity || 0), 0);
      }

      function vendorOrderFilterMatches(order, filter) {
        const step = order.progressStep || 0;
        const cancelled = isOrderCancelled(order);
        if (filter === "cancelled") return cancelled;
        if (filter === "completed") return !cancelled && step >= 4;
        if (filter === "all") return true;
        return !cancelled && step < 4;
      }

      function renderVendorOrderFilters(orders) {
        const node = document.getElementById("vendorOrderFilters");
        if (!node) return;
        const filters = [
          { key: "active", label: "처리할 주문" },
          { key: "completed", label: "완료" },
          { key: "cancelled", label: "취소·환불" },
          { key: "all", label: "전체" },
        ];
        node.innerHTML = filters.map((filter) => {
          const count = orders.filter((order) => vendorOrderFilterMatches(order, filter.key)).length;
          return '<button class="chip ' + (vendorOrderFilter === filter.key ? 'active-control' : '') + '" type="button" onclick="setVendorOrderFilter(\'' + filter.key + '\')">' + filter.label + ' ' + count + '</button>';
        }).join("");
      }

      async function setVendorOrderFilter(filter) {
        vendorOrderFilter = filter;
        await renderVendorOrders();
      }

      function renderVendorSettlement(orders = []) {
        const summary = document.getElementById("vendorSettlementSummary");
        const list = document.getElementById("vendorSettlementList");
        if (!summary || !list) return;
        if (!currentVendor) {
          summary.innerHTML = '<div class="line-item"><span>업체 로그인 후 확인할 수 있습니다</span><strong>로그인 필요</strong></div>';
          list.innerHTML = "";
          return;
        }
        const vendorOrders = orders.filter((order) => vendorOrderItems(order).length);
        const completedOrders = vendorOrders.filter((order) => !isOrderCancelled(order) && (order.progressStep || 0) >= 4);
        const activeOrders = vendorOrders.filter((order) => !isOrderCancelled(order) && (order.progressStep || 0) < 4);
        const cancelledOrders = vendorOrders.filter(isOrderCancelled);
        const grossSales = completedOrders.reduce((sum, order) => sum + vendorOrderTotal(order), 0);
        const pendingSales = activeOrders.reduce((sum, order) => sum + vendorOrderTotal(order), 0);
        const cancelledSales = cancelledOrders.reduce((sum, order) => sum + vendorOrderTotal(order), 0);
        const refundPending = cancelledOrders.filter((order) => refundStatusFromOrder(order) === "pending").reduce((sum, order) => sum + vendorOrderTotal(order), 0);
        const refundCompleted = cancelledOrders.filter((order) => refundStatusFromOrder(order) === "completed").reduce((sum, order) => sum + vendorOrderTotal(order), 0);
        const platformFee = Math.round(grossSales * 0.12);
        const payout = Math.max(0, grossSales - platformFee);
        summary.innerHTML = `
          <div class="line-item"><span>완료 매출</span><strong>${formatKRW(grossSales)}</strong></div>
          <div class="line-item"><span>정산 예정</span><strong>${formatKRW(payout)}</strong></div>
          <div class="line-item"><span>플랫폼 수수료 12%</span><strong>${formatKRW(platformFee)}</strong></div>
          <div class="line-item"><span>진행 중 주문</span><strong>${activeOrders.length}건 · ${formatKRW(pendingSales)}</strong></div>
          <div class="line-item"><span>취소 주문</span><strong>${cancelledOrders.length}건 · ${formatKRW(cancelledSales)}</strong></div>
          <div class="line-item"><span>환불 대기</span><strong>${formatKRW(refundPending)}</strong></div>
          <div class="line-item"><span>환불 완료</span><strong>${formatKRW(refundCompleted)}</strong></div>
        `;
        const settlementRows = vendorOrders
          .filter((order) => (order.progressStep || 0) >= 4 || isOrderCancelled(order))
          .slice(0, 8);
        list.innerHTML = settlementRows.length ? settlementRows.map((order) => {
          const total = vendorOrderTotal(order);
          const cancelled = isOrderCancelled(order);
          const payoutAmount = cancelled ? 0 : Math.max(0, total - Math.round(total * 0.12));
          return `
            <div class="vendor-product-row">
              <div>
                <strong>${order.id} · ${cancelled ? "정산 제외" : "정산 예정"}</strong>
                <span>${vendorOrderItems(order).map((item) => item.name + " x " + (item.quantity || 0)).join(", ")}</span>
                <span>${cancelled ? cancelReasonLabel(order) + " · " + paymentLabelForOrder(order) : "완료 매출 " + formatKRW(total)}</span>
              </div>
              <strong>${formatKRW(payoutAmount)}</strong>
            </div>
          `;
        }).join("") : '<div class="line-item"><span>완료 또는 취소된 주문이 없습니다</span><strong>정산 대기</strong></div>';
      }

      async function renderVendorOrders(ordersOverride) {
        const list = document.getElementById("vendorOrderList");
        if (!list) return;
        if (!currentVendor) {
          list.innerHTML = '<div class="line-item"><span>업체 로그인 후 확인할 수 있습니다</span><strong>로그인 필요</strong></div>';
          renderVendorOrderFilters([]);
          renderVendorSettlement([]);
          return;
        }
        let orders = ordersOverride || orderHistory.filter((order) => order.items.some((item) => item.showroom === currentVendor.store));
        if (!ordersOverride && supabaseClient) {
          try {
            orders = await loadVendorOrders();
          } catch (error) {
            setSyncStatus("업체 주문은 화면 기록 기준으로 표시됨 - DB 불러오기 실패");
          }
        }
        renderVendorOrderFilters(orders);
        const visibleOrders = orders.filter((order) => vendorOrderFilterMatches(order, vendorOrderFilter));
        const emptyLabel = vendorOrderFilter === "cancelled" ? "취소·환불 주문이 없습니다" : vendorOrderFilter === "completed" ? "완료된 주문이 없습니다" : vendorOrderFilter === "all" ? "아직 이 매장 주문이 없습니다" : "처리할 주문이 없습니다";
        const emptyStatus = vendorOrderFilter === "active" ? "현재 깔끔함" : "주문 대기";
        list.innerHTML = visibleOrders.length ? visibleOrders.map((order) => {
          const vendorItems = order.items.filter((item) => item.showroom === currentVendor.store);
          const vendorTotal = vendorItems.reduce((sum, item) => sum + itemSalePrice(item) * item.quantity, 0);
          return `
            <div class="vendor-product-row vendor-order-row">
              <div>
                <strong>${order.id} · ${orderDisplayLabel(order)}</strong>
                <span>${vendorItems.length}개 상품 · ${vendorItems.map((item) => item.name).join(", ")}</span>
                <span>${formatKRW(vendorTotal)} · ${paymentLabelForOrder(order)}</span>
              </div>
              <div class="mini-actions order-detail-action">
                <button type="button" onclick="openVendorOrderDetail('${order.id}')">상세보기</button>
              </div>
            </div>
          `;
        }).join("") : '<div class="line-item"><span>' + emptyLabel + '</span><strong>' + emptyStatus + '</strong></div>';
        renderVendorSettlement(orders);
        renderVendorHomeBoard(orders);
      }

      async function findVendorOrder(orderId) {
        let order = orderHistory.find((item) => item.id === orderId);
        if (supabaseClient) {
          const orders = await loadVendorOrders().catch(() => []);
          const dbOrder = orders.find((item) => item.id === orderId);
          if (dbOrder) order = dbOrder;
        }
        if (!order && lastOrder && lastOrder.id === orderId) order = lastOrder;
        return order;
      }

      async function openVendorOrderDetail(orderId) {
        if (!currentVendor) {
          openVendorLogin();
          return;
        }
        const title = document.getElementById("vendorOrderDetailTitle");
        const body = document.getElementById("vendorOrderDetailBody");
        const order = await findVendorOrder(orderId);
        if (!body) return;
        if (!order || !vendorOrderItems(order).length) {
          body.innerHTML = '<div class="line-item"><span>이 매장의 주문을 찾을 수 없습니다</span><strong>확인 필요</strong></div>';
          document.getElementById("vendorOrderDetailModal").classList.add("open");
          document.getElementById("vendorOrderDetailModal").setAttribute("aria-hidden", "false");
          return;
        }
        const vendorItems = vendorOrderItems(order);
        const vendorTotal = vendorOrderTotal(order);
        const cancelled = isOrderCancelled(order);
        const paidAndActive = order.paid && !cancelled;
        if (title) title.textContent = order.id;
        body.innerHTML = `
          <div class="order-detail-grid">
            <div class="order-detail-block">
              <strong>${orderDisplayLabel(order)} · ${formatKRW(vendorTotal)}</strong>
              <span>결제 상태: ${paymentLabelForOrder(order)}</span>
              <span>배송 담당: ${assignedRiderLabel(order)}</span>
            </div>
            <div class="order-detail-block">
              <strong>상품 · 사이즈</strong>
              ${vendorItems.map((item) => '<span>' + item.name + ' · ' + (item.size || 'One size') + ' · ' + (item.quantity || 0) + '개</span>').join("")}
            </div>
            <div class="order-detail-block">
              <strong>수령 정보</strong>
              <span>${order.address}</span>
              <span>${order.receiveType || "문앞 수령"} · 요청: ${order.riderRequest || "없음"}</span>
              <span>결제수단: ${order.paymentMethod || "카카오페이"}</span>
            </div>
            ${cancelled ? `
              <div class="order-detail-block">
                <strong>취소 · 환불</strong>
                <span>취소 분류: ${cancelReasonLabel(order)}</span>
                <span>취소 사유: ${order.cancelReason || "사유 미입력"}</span>
                <span>환불 상태: ${paymentLabelForOrder(order)}</span>
              </div>
            ` : ""}
            <div class="mini-actions">
              <button type="button" ${paidAndActive ? "" : "disabled"} onclick="vendorAdvanceOrderFromDetail('${order.id}', 1)">${cancelled ? "취소됨" : !order.paid ? "결제 대기" : (order.progressStep || 0) >= 1 ? "재고 확인됨" : "재고 확인"}</button>
              <button type="button" ${paidAndActive ? "" : "disabled"} onclick="vendorAdvanceOrderFromDetail('${order.id}', 2)">${cancelled ? "취소됨" : !order.paid ? "결제 대기" : (order.progressStep || 0) >= 2 ? "픽업 준비됨" : "픽업 준비"}</button>
              <button class="danger" type="button" ${canCancelOrder(order) ? "" : "disabled"} onclick="cancelVendorOrderFromDetail('${order.id}')">${cancelled ? "취소됨" : "주문 취소"}</button>
            </div>
          </div>
        `;
        document.getElementById("vendorOrderDetailModal").classList.add("open");
        document.getElementById("vendorOrderDetailModal").setAttribute("aria-hidden", "false");
      }

      function closeVendorOrderDetail() {
        document.getElementById("vendorOrderDetailModal").classList.remove("open");
        document.getElementById("vendorOrderDetailModal").setAttribute("aria-hidden", "true");
      }

      async function vendorAdvanceOrderFromDetail(orderId, step) {
        await vendorAdvanceOrder(orderId, step);
        await openVendorOrderDetail(orderId);
      }

      async function cancelVendorOrderFromDetail(orderId) {
        await cancelOrder(orderId, "vendor");
        await openVendorOrderDetail(orderId);
      }

      function resetVendorForm() {
        editingProductKey = "";
        document.getElementById("vendorSubmitButton").textContent = "상품 등록";
        document.getElementById("vendorName").value = "신규 등록 상품 " + (vendorProductCount + 1);
        document.getElementById("vendorCategory").value = "상의";
        document.getElementById("vendorPrice").value = 69000;
        document.getElementById("vendorDiscount").value = 10;
        document.getElementById("vendorStock").value = 3;
        document.getElementById("vendorMinutes").value = 36;
        document.getElementById("vendorMatch").value = 86;
        document.getElementById("vendorMaterial").value = "코튼 니트";
        document.getElementById("vendorSize").value = "Free / 44-66";
        document.getElementById("vendorNote").value = "동탄, 오산 퇴근길에 바로 받기 좋은 레이어드 아이템이에요.";
        document.getElementById("vendorImage").value = "";
        vendorImageData = "";
        vendorImageFile = null;
        document.getElementById("vendorImagePreview").textContent = "이미지 미리보기";
        renderVendorSizeStockInputs({ "Free": 2, "44-66": 1 });
      }

      function vendorSizeOptionsFromInput() {
        return sizeOptions({ size: document.getElementById("vendorSize").value.trim() || "FREE" });
      }

      function renderVendorSizeStockInputs(stockMap = {}) {
        const grid = document.getElementById("vendorSizeStockGrid");
        if (!grid) return;
        const sizes = vendorSizeOptionsFromInput();
        grid.innerHTML = sizes.map((size) => `
          <label>${size}
            <input class="vendor-size-stock" data-size="${size}" type="number" min="0" value="${Math.max(0, Number(stockMap[size]) || 0)}" oninput="updateVendorStockTotal()" />
          </label>
        `).join("");
        updateVendorStockTotal();
      }

      function readVendorSizeStock() {
        const stockMap = {};
        document.querySelectorAll(".vendor-size-stock").forEach((input) => {
          stockMap[input.dataset.size] = Math.max(0, Number(input.value) || 0);
        });
        return stockMap;
      }

      function updateVendorStockTotal() {
        const total = Object.values(readVendorSizeStock()).reduce((sum, value) => sum + value, 0);
        document.getElementById("vendorStock").value = total;
      }

      function editVendorProduct(key) {
        const item = products.find((product) => product.key === key);
        if (!item) return;
        if (currentVendor && item.showroom !== currentVendor.store) {
          setSyncStatus("다른 매장의 상품은 수정할 수 없습니다");
          return;
        }
        editingProductKey = key;
        document.getElementById("vendorSubmitButton").textContent = "상품 수정 저장";
        document.getElementById("vendorStore").value = item.showroom;
        document.getElementById("vendorName").value = item.name;
        document.getElementById("vendorCategory").value = item.category === "의류" ? "상의" : (item.category || "상의");
        document.getElementById("vendorPrice").value = item.price;
        document.getElementById("vendorDiscount").value = normalizedDiscount(item.discountRate);
        document.getElementById("vendorStock").value = item.stock;
        document.getElementById("vendorMinutes").value = item.minutes;
        document.getElementById("vendorMatch").value = item.match;
        document.getElementById("vendorMaterial").value = item.material;
        document.getElementById("vendorSize").value = item.size;
        ensureSizeStock(item);
        renderVendorSizeStockInputs(item.sizeStock);
        document.getElementById("vendorNote").value = item.note;
        vendorImageData = item.image || "";
        vendorImageFile = null;
        document.getElementById("vendorImagePreview").innerHTML = item.image ? '<img src="' + item.image + '" alt="상품 이미지" />' : "이미지 미리보기";
      }

      function openVendorProductDetail(key) {
        const item = products.find((product) => product.key === key);
        const title = document.getElementById("vendorProductDetailTitle");
        const body = document.getElementById("vendorProductDetailBody");
        if (!body) return;
        if (!item || (currentVendor && item.showroom !== currentVendor.store)) {
          body.innerHTML = '<div class="line-item"><span>이 매장의 상품을 찾을 수 없습니다</span><strong>확인 필요</strong></div>';
          document.getElementById("vendorProductDetailModal").classList.add("open");
          document.getElementById("vendorProductDetailModal").setAttribute("aria-hidden", "false");
          return;
        }
        ensureSizeStock(item);
        const stockRows = Object.entries(item.sizeStock || {}).map(([size, stock]) =>
          '<span>' + size + ' · ' + (Number(stock) > 0 ? Number(stock) + '개' : '품절') + '</span>'
        ).join("");
        if (title) title.textContent = item.name;
        body.innerHTML = `
          <div class="order-detail-grid">
            ${item.image ? '<div class="image-preview"><img src="' + item.image + '" alt="상품 이미지" /></div>' : ""}
            <div class="order-detail-block">
              <strong>${item.category || "상품"} · ${item.showroom}</strong>
              <span class="product-status-tag ${productStatusClass(item)}">${productStatusLabel(item)}</span>
              <span>정상가 ${formatKRW(item.price)} · 할인율 ${normalizedDiscount(item.discountRate)}% · 할인가 ${formatKRW(itemSalePrice(item))}</span>
              <span>도착 기준 ${item.minutes}분 · 매칭률 ${item.match}%</span>
            </div>
            <div class="order-detail-block">
              <strong>사이즈별 재고</strong>
              ${stockRows || '<span>등록된 사이즈 재고가 없습니다</span>'}
            </div>
            <div class="order-detail-block">
              <strong>상세 설명</strong>
              <span>${item.material || "소재 미입력"} · ${item.size || "One size"}</span>
              <span>${item.note || "상품 설명이 없습니다"}</span>
            </div>
            <div class="mini-actions">
              <button type="button" class="${productStatus(item) === "selling" ? "active-control" : ""}" onclick="setVendorProductStatus('${item.key}', 'selling')">판매중</button>
              <button type="button" class="${productStatus(item) === "soldout" ? "active-control" : ""}" onclick="setVendorProductStatus('${item.key}', 'soldout')">품절</button>
              <button type="button" class="${productStatus(item) === "hidden" ? "active-control" : ""}" onclick="setVendorProductStatus('${item.key}', 'hidden')">숨김</button>
            </div>
            <div class="mini-actions">
              <button type="button" onclick="editVendorProductFromDetail('${item.key}')">수정 폼 열기</button>
              <button class="danger" type="button" onclick="deleteVendorProductFromDetail('${item.key}')">삭제</button>
            </div>
          </div>
        `;
        document.getElementById("vendorProductDetailModal").classList.add("open");
        document.getElementById("vendorProductDetailModal").setAttribute("aria-hidden", "false");
      }

      function closeVendorProductDetail() {
        document.getElementById("vendorProductDetailModal").classList.remove("open");
        document.getElementById("vendorProductDetailModal").setAttribute("aria-hidden", "true");
      }

      function setVendorProductStatus(key, status) {
        const item = products.find((product) => product.key === key);
        if (!item || (currentVendor && item.showroom !== currentVendor.store)) return;
        item.status = status;
        renderProducts();
        renderVendorProducts();
        renderVendorLookPicker();
        renderVendorRoleSummary();
        openVendorProductDetail(key);
        setSyncStatus(item.name + " 상태 변경 - " + productStatusLabel(item));
      }

      function editVendorProductFromDetail(key) {
        editVendorProduct(key);
        closeVendorProductDetail();
        document.getElementById("vendorName").scrollIntoView({ behavior: "smooth", block: "center" });
      }

      async function deleteVendorProductFromDetail(key) {
        closeVendorProductDetail();
        await deleteVendorProduct(key);
      }

      async function deleteVendorProduct(key) {
        const index = products.findIndex((product) => product.key === key);
        if (index < 0) return;
        const item = products[index];
        if (currentVendor && item.showroom !== currentVendor.store) {
          setSyncStatus("다른 매장의 상품은 삭제할 수 없습니다");
          return;
        }
        products.splice(index, 1);
        cart = cart.filter((line) => line.key !== key);
        wishlist = wishlist.filter((itemKey) => itemKey !== key);
        recentViews = recentViews.filter((itemKey) => itemKey !== key);
        saveWishlistStore();
        saveRecentViewStore();
        if (editingProductKey === key) resetVendorForm();
        renderProducts();
        renderCart();
        renderVendorProducts();
        renderVendorLookPicker();
        renderVendorLooks();
        renderVendorRoleSummary();
        try {
          await deleteProductFromSupabase(item);
          setSyncStatus("상품이 삭제됨 - " + item.name);
        } catch (error) {
          setSyncStatus("상품은 화면에서 삭제됨 - DB 삭제 실패");
        }
      }

      function resetVendorLookForm() {
        editingLookKey = "";
        document.getElementById("vendorLookSubmitButton").textContent = "선택 상품으로 세트 등록";
        document.getElementById("vendorLookTitle").value = currentVendor ? currentVendor.store + " 추천 세트" : "오늘 바로 입는 세트";
        document.getElementById("vendorLookNote").value = "입점 매장이 직접 고른 지금배송 세트입니다.";
        document.getElementById("vendorLookDiscount").value = 5;
        document.querySelectorAll('input[name="vendorLookItem"]').forEach((input) => input.checked = false);
        renderVendorLookPicker();
      }

      function editVendorLook(key) {
        const look = lookSets.find((item) => item.key === key);
        if (!look) return;
        if (currentVendor && look.store !== currentVendor.store) {
          setSyncStatus("로그인한 매장의 세트만 수정할 수 있습니다");
          return;
        }
        editingLookKey = key;
        document.getElementById("vendorLookTitle").value = look.title;
        document.getElementById("vendorLookNote").value = look.note;
        document.getElementById("vendorLookDiscount").value = normalizedDiscount(look.discountRate);
        document.getElementById("vendorLookSubmitButton").textContent = "세트 수정 저장";
        renderVendorLookPicker();
        setSyncStatus("세트 수정 중 - " + look.title);
      }

      async function submitVendorLook(event) {
        event.preventDefault();
        if (!currentVendor) {
          openVendorLogin();
          return;
        }
        const selectedKeys = [...document.querySelectorAll('input[name="vendorLookItem"]:checked')].map((input) => input.value);
        if (!selectedKeys.length) {
          setSyncStatus("세트로 묶을 상품을 하나 이상 선택해 주세요");
          return;
        }
        const validKeys = selectedKeys.filter((key) => {
          const item = products.find((product) => product.key === key);
          return item && item.showroom === currentVendor.store;
        });
        if (!validKeys.length) {
          setSyncStatus("로그인한 매장의 상품만 세트로 구성할 수 있습니다");
          return;
        }
        let look = lookSets.find((item) => item.key === editingLookKey && item.store === currentVendor.store);
        if (look) {
          look.title = document.getElementById("vendorLookTitle").value.trim() || currentVendor.store + " 세트";
          look.keys = validKeys;
          look.note = document.getElementById("vendorLookNote").value.trim() || "입점 매장이 직접 구성한 세트입니다.";
          look.discountRate = normalizedDiscount(document.getElementById("vendorLookDiscount").value);
        } else {
          look = {
            key: "look-" + Date.now(),
            title: document.getElementById("vendorLookTitle").value.trim() || currentVendor.store + " 세트",
            store: currentVendor.store,
            discountRate: normalizedDiscount(document.getElementById("vendorLookDiscount").value),
            keys: validKeys,
            note: document.getElementById("vendorLookNote").value.trim() || "입점 매장이 직접 구성한 세트입니다.",
          };
          lookSets.unshift(look);
        }
        resetVendorLookForm();
        renderVendorLooks();
        renderLooks();
        try {
          await syncLookToSupabase(look);
          setSyncStatus("룩 세트가 Supabase에 저장됨 - " + look.title);
        } catch (error) {
          setSyncStatus("룩 세트는 화면에 등록됨 - DB 저장 실패, SQL 테이블 확인 필요");
        }
      }

      async function deleteVendorLook(key) {
        const index = lookSets.findIndex((look) => look.key === key);
        if (index < 0) return;
        if (currentVendor && lookSets[index].store !== currentVendor.store) {
          setSyncStatus("로그인한 매장의 세트만 삭제할 수 있습니다");
          return;
        }
        const removed = lookSets.splice(index, 1)[0];
        if (editingLookKey === removed.key) resetVendorLookForm();
        renderVendorLooks();
        renderLooks();
        try {
          await deleteLookFromSupabase(removed);
          setSyncStatus("룩 세트가 Supabase에서 삭제됨 - " + removed.title);
        } catch (error) {
          setSyncStatus("룩 세트는 화면에서 삭제됨 - DB 삭제 실패");
        }
      }

      function renderPartnerStores() {
        const stores = currentVendor ? partnerStores.filter((store) => store.name === currentVendor.store) : partnerStores;
        document.getElementById("partnerStoreList").innerHTML = stores.map((store) => `
          <div class="store-admin-card">
            <div class="store-admin-head">
              <div>
                <strong>${store.name}</strong>
                <span>${store.area} - ${store.address}</span>
              </div>
              <button class="store-toggle ${store.open && store.pickup ? "" : "paused"}" type="button" onclick="toggleStore('${store.name}')">
                ${store.open && store.pickup ? "픽업 가능" : "픽업 중지"}
              </button>
            </div>
            <div class="form-grid">
              <label>준비시간
                <input type="number" min="0" value="${store.prep}" onchange="updateStorePrep('${store.name}', this.value)" />
              </label>
              <label>운영지역
                <input type="text" value="${store.area}" onchange="updateStoreArea('${store.name}', this.value)" />
              </label>
            </div>
          </div>
        `).join("");
      }

      async function vendorAdvanceOrder(orderId, step) {
        if (!currentVendor) {
          openVendorLogin();
          return;
        }
        let order = orderHistory.find((item) => item.id === orderId);
        if (supabaseClient) {
          const orders = await loadVendorOrders().catch(() => []);
          const dbOrder = orders.find((item) => item.id === orderId);
          if (dbOrder) {
            order = { ...dbOrder, progressStep: Math.max(order ? (order.progressStep || 0) : 0, dbOrder.progressStep || 0) };
          }
        }
        if (!order) {
          setSyncStatus("업체 주문을 찾을 수 없습니다");
          return;
        }
        if (!order.items.some((item) => item.showroom === currentVendor.store)) {
          setSyncStatus("로그인한 매장의 주문만 처리할 수 있습니다");
          return;
        }
        if (isOrderCancelled(order)) {
          setSyncStatus("취소된 주문은 처리할 수 없습니다");
          renderVendorOrders();
          return;
        }
        if (!order.paid) {
          setSyncStatus("결제 완료 후 재고 확인이 가능합니다");
          renderVendorOrders();
          return;
        }
        lastOrder = order;
        const previousStep = lastOrder.progressStep || 0;
        lastOrder.progressStep = Math.max(previousStep, step);
        lastOrder.statusCode = statusFromStep(lastOrder.progressStep);
        lastOrder.statusLabel = labelFromStep(lastOrder.progressStep);
        lastOrder.paymentLabel = paymentLabelForOrder(lastOrder);
        if (lastOrder.progressStep > previousStep) {
          addDeliveryLog(lastOrder, step >= 2 ? "픽업 준비 완료" : "재고 확인", currentVendor.store + " 업체 처리");
        }
        saveOrderStatusOverride(lastOrder);
        saveOrderHistory(lastOrder);
        const visibleOrders = orderHistory.filter((item) => item.items.some((line) => line.showroom === currentVendor.store));
        renderVendorRoleSummary();
        renderVendorOrders(visibleOrders);
        renderTracking();
        if (document.getElementById("ordersModal").classList.contains("open")) renderOrders();
        if (document.getElementById("myModal").classList.contains("open")) renderMyPage();
        try {
          await syncOrderStatusToSupabase(lastOrder);
          setSyncStatus((step >= 2 ? "픽업 준비 완료" : "재고 확인 완료") + " - Supabase 주문 상태 업데이트 완료");
        } catch (error) {
          setSyncStatus((step >= 2 ? "픽업 준비 완료" : "재고 확인 완료") + " - 화면에 먼저 반영됨, DB 업데이트 권한 확인 필요");
        }
      }

      function deliveryAreaLabel(order) {
        const text = [order.region, order.address].filter(Boolean).join(" ");
        if (text.includes("오산")) return "오산";
        if (text.includes("동탄")) return "동탄";
        if (text.includes("세교")) return "오산/세교";
        return "오산/동탄";
      }

      function riderLoadBadge(riderOrders, badge) {
        if (riderOrders.length >= 3 && badge.cls !== "done") return { label: "주문 많음", cls: "ready" };
        if (badge.cls === "moving") return { label: "배송중", cls: "moving" };
        if (badge.cls === "done") return { label: "완료", cls: "done" };
        return { label: "픽업대기", cls: "ready" };
      }

      function deliveryNextActionState(order) {
        if (!order) return { label: "주문 확인 필요", detail: "주문 정보를 다시 불러와 주세요.", cls: "waiting" };
        if (isOrderCancelled(order)) return { label: "취소 완료", detail: "취소된 주문입니다.", cls: "refund" };
        const step = order.progressStep || 0;
        if (step < 2) return { label: "픽업 준비 대기", detail: "입점업체의 픽업 준비 완료를 기다리는 주문입니다.", cls: "waiting" };
        if (!isDeliveryOrderClaimed(order)) return { label: "배정 대기", detail: "배송사가 주문을 배정받아야 다음 단계로 진행됩니다.", cls: "ready" };
        if (!hasDeliveryProof(order, "pickup")) return { label: "픽업 인증 필요", detail: "상품 픽업을 인증하면 배송중 처리가 가능합니다.", cls: "ready" };
        if (step < 3) return { label: "배송중 처리 가능", detail: "픽업 인증 완료. 배송중 버튼을 눌러 이동을 시작하세요.", cls: "moving" };
        if (!hasDeliveryProof(order, "arrival")) return { label: "도착 인증 필요", detail: "고객 도착 인증 후 배송완료 처리가 가능합니다.", cls: "moving" };
        if (step < 4) return { label: "배송완료 가능", detail: "도착 인증 완료. 배송완료 버튼으로 마감하세요.", cls: "done" };
        return { label: "배송완료", detail: "배송 플로우가 완료된 주문입니다.", cls: "done" };
      }

      function deliveryItemCount(order) {
        return (order.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
      }

      function deliveryPickupSummary(order) {
        const stores = (order.items || [])
          .map((item) => item.showroom || "업체 미확인")
          .filter((store, index, list) => list.indexOf(store) === index);
        return stores.length ? stores.join(", ") : "픽업지 확인 필요";
      }

      function deliveryItemSummary(order) {
        const items = order.items || [];
        if (!items.length) return "상품 정보 확인 필요";
        const preview = items.slice(0, 2).map((item) => item.name + " " + (item.size || "FREE") + " x " + (item.quantity || 0));
        const more = items.length > 2 ? " 외 " + (items.length - 2) + "개" : "";
        return preview.join(", ") + more;
      }

      function renderDeliveryRiderGroups(orders, emptyText, badge, actionLabel, actionStep) {
        if (!orders.length) return '<div class="line-item"><span>' + emptyText + '</span><strong>대기</strong></div>';
        const grouped = orders.reduce((groups, order) => {
          const rider = assignedRiderLabel(order);
          groups[rider] = groups[rider] || [];
          groups[rider].push(order);
          return groups;
        }, {});
        return Object.entries(grouped).map(([rider, riderOrders], index) => `
          ${(() => {
            const riderAreas = riderOrders.map(deliveryAreaLabel).filter((area, idx, areas) => areas.indexOf(area) === idx).join(" / ");
            const riderFeeTotal = riderOrders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);
            const loadBadge = riderLoadBadge(riderOrders, badge);
            return `
          <details class="admin-store-group" ${index === 0 ? "open" : ""}>
            <summary>${rider} <span class="admin-status-badge admin-store-risk ${loadBadge.cls}">${loadBadge.label}</span> <span>${badge.label} ${riderOrders.length}건 · ${riderAreas}</span></summary>
            <div class="rider-summary-grid">
              <div>
                <span>${badge.label}</span>
                <strong>${riderOrders.length}건</strong>
              </div>
              <div>
                <span>담당 지역</span>
                <strong>${riderAreas}</strong>
              </div>
              <div>
                <span>총 배송비</span>
                <strong>${formatKRW(riderFeeTotal)}</strong>
              </div>
              <div>
                <span>현재 상태</span>
                <strong>${loadBadge.label}</strong>
              </div>
            </div>
            <div class="admin-store-orders">
              ${riderOrders.map((order) => {
                const storeNames = order.items.map((item) => item.showroom).filter((store, idx, stores) => stores.indexOf(store) === idx).join(", ");
                const nextState = deliveryNextActionState(order);
                const canRunAction = actionLabel && (
                  (actionStep === 3 && nextState.label === "배송중 처리 가능") ||
                  (actionStep === 4 && nextState.label === "배송완료 가능")
                );
                let actionMarkup = "";
                if (actionLabel) {
                  let buttonLabel = canRunAction ? actionLabel : nextState.label;
                  let buttonAction = `adminAdvanceOrder('${order.id}', ${actionStep})`;
                  let buttonEnabled = canRunAction;
                  if (actionStep === 3 && nextState.label === "픽업 인증 필요") {
                    buttonLabel = "픽업 인증";
                    buttonAction = `startDeliveryProofCapture('${order.id}', 'pickup')`;
                    buttonEnabled = canCurrentAdminManageOrder(order);
                  } else if (actionStep === 4 && nextState.label === "도착 인증 필요") {
                    buttonLabel = "도착 인증";
                    buttonAction = `startDeliveryProofCapture('${order.id}', 'arrival')`;
                    buttonEnabled = canCurrentAdminManageOrder(order);
                  }
                  actionMarkup = `<div class="mini-actions order-detail-action"><button type="button" ${buttonEnabled ? "" : "disabled"} onclick="${buttonAction}">${buttonLabel}</button></div>`;
                }
                return `
                  <div class="vendor-product-row admin-order-row">
                    <div>
                      <strong>${order.id} · ${badge.label} <span class="admin-status-badge ${nextState.cls}">${nextState.label}</span></strong>
                      <span>${storeNames || "업체 미확인"} · ${order.deliveryPartnerName || "지금배송 배정"}</span>
                      <span>${order.address}</span>
                      <span>다음 작업: ${nextState.detail}</span>
                      <span>픽업 ${hasDeliveryProof(order, "pickup") ? "인증완료" : "미인증"} · 도착 ${hasDeliveryProof(order, "arrival") ? "인증완료" : "미인증"}</span>
                    </div>
                    ${actionMarkup}
                  </div>
                `;
              }).join("")}
            </div>
          </details>
            `;
          })()}
        `).join("");
      }

      function renderDeliveryClaimOrders(orders) {
        if (!orders.length) return '<div class="line-item"><span>현재 배정 대기 주문이 없습니다</span><strong>대기</strong></div>';
        return orders.map((order) => {
          const storeNames = order.items.map((item) => item.showroom).filter((store, idx, stores) => stores.indexOf(store) === idx).join(", ");
          const pickupText = storeNames || "픽업지 확인 필요";
          const nextState = deliveryNextActionState(order);
          const canClaim = canCurrentDeliveryClaimOrder(order);
          const totalAdminActions = currentAdmin && currentAdmin.role === "total";
          const deliverySelectId = "claimRider-" + order.id;
          const dongtanSelectId = "claimDongtanRider-" + order.id;
          const osanSelectId = "claimOsanRider-" + order.id;
          return `
            <div class="vendor-product-row admin-order-row">
              <div>
                <strong>${order.id} · 오픈콜 <span class="admin-status-badge ${nextState.cls}">${nextState.label}</span></strong>
                <span>픽업지: ${pickupText}</span>
                <span>도착지: ${order.address}</span>
                <span>다음 작업: ${nextState.detail}</span>
                <span>상품 ${order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)}개 · 배송비 ${order.deliveryFee ? formatKRW(order.deliveryFee) : "무료"}</span>
              </div>
              <div class="mini-actions order-detail-action">
                ${totalAdminActions ? `
                  <select id="${dongtanSelectId}">${riderOptionsForPartner("지금배송 동탄센터")}</select>
                  <button type="button" onclick="adminAssignDelivery('${order.id}', '지금배송 동탄센터', selectedValue('${dongtanSelectId}'))">동탄센터 배정</button>
                  <select id="${osanSelectId}">${riderOptionsForPartner("지금배송 오산센터")}</select>
                  <button type="button" onclick="adminAssignDelivery('${order.id}', '지금배송 오산센터', selectedValue('${osanSelectId}'))">오산센터 배정</button>
                ` : `
                  ${canClaim ? `<select id="${deliverySelectId}">${riderOptionsForPartner(currentAdmin.name)}</select>` : ""}
                  <button type="button" ${canClaim ? "" : "disabled"} onclick="claimDeliveryOrder('${order.id}', selectedValue('${deliverySelectId}'))">${canClaim ? "내가 배정받기" : "배송사 로그인 필요"}</button>
                `}
              </div>
            </div>
          `;
        }).join("");
      }

      function minutesSince(value) {
        const time = new Date(value || Date.now()).getTime();
        if (!Number.isFinite(time)) return 0;
        return Math.max(0, Math.round((Date.now() - time) / 60000));
      }

      function latestDeliveryLogTime(order, action) {
        const logs = Array.isArray(order.deliveryLogs) ? order.deliveryLogs : [];
        const actions = Array.isArray(action) ? action : [action];
        const found = logs.find((log) => actions.includes(log.action));
        return found ? found.createdAt : order.createdAt;
      }

      const deliveryWarningRules = {
        openCall: { limit: 15, title: "오픈콜 대기", action: "배송사 배정 필요" },
        pickupProof: { limit: 10, title: "픽업 인증 누락", action: "픽업 인증 필요" },
        arrivalProof: { limit: 20, title: "도착 인증 누락", action: "도착 인증 필요" },
      };

      function deliveryWarningSeverity(minutes, limit, activeClass = "ready") {
        if (minutes >= limit) return { label: "지연", cls: "refund", overdue: minutes - limit };
        if (minutes >= Math.max(1, limit - 5)) return { label: "주의", cls: activeClass, overdue: 0 };
        return { label: "관찰", cls: activeClass, overdue: 0 };
      }

      function deliveryWarning(ruleKey, order, minutes, detail, activeClass = "ready") {
        const rule = deliveryWarningRules[ruleKey];
        const severity = deliveryWarningSeverity(minutes, rule.limit, activeClass);
        return {
          title: rule.title,
          action: rule.action,
          detail,
          minutes,
          limit: rule.limit,
          remaining: Math.max(0, rule.limit - minutes),
          overdue: severity.overdue,
          severity: severity.label,
          cls: severity.cls,
        };
      }

      function deliveryWarningForOrder(order) {
        if (!order || isOrderCancelled(order) || (order.progressStep || 0) >= 4) return null;
        const step = order.progressStep || 0;
        if (step >= 2 && step < 3 && !isDeliveryOrderClaimed(order)) {
          const minutes = minutesSince(order.createdAt);
          return deliveryWarning("openCall", order, minutes, "픽업 준비 후 아직 배송사가 잡지 않았습니다.", "ready");
        }
        if (step >= 2 && step < 3 && isDeliveryOrderClaimed(order) && !hasDeliveryProof(order, "pickup")) {
          const minutes = minutesSince(latestDeliveryLogTime(order, ["오픈콜 배정", "센터 배정 변경"]));
          return deliveryWarning("pickupProof", order, minutes, "배정은 완료됐지만 픽업 인증이 없습니다.", "ready");
        }
        if (step >= 3 && !hasDeliveryProof(order, "arrival")) {
          const minutes = minutesSince(latestDeliveryLogTime(order, "배송중 처리"));
          return deliveryWarning("arrivalProof", order, minutes, "배송중 상태지만 도착 인증이 없습니다.", "moving");
        }
        return null;
      }

      function deliveryWarningOrders(orders) {
        return orders
          .map((order) => ({ order, warning: deliveryWarningForOrder(order) }))
          .filter((item) => item.warning)
          .sort((a, b) => b.warning.minutes - a.warning.minutes);
      }

      function renderDeliveryWarnings(items) {
        if (!items.length) return '<div class="line-item"><span>주의 주문이 없습니다</span><strong>정상</strong></div>';
        return items.map(({ order, warning }) => {
          const storeNames = order.items.map((item) => item.showroom).filter((store, idx, stores) => stores.indexOf(store) === idx).join(", ");
          const timeText = warning.overdue > 0
            ? "기준 " + warning.limit + "분 초과 +" + warning.overdue + "분"
            : "기준 " + warning.limit + "분 · 남은 " + warning.remaining + "분";
          return `
            <div class="vendor-product-row admin-order-row">
              <div>
                <strong>${order.id} · ${warning.title} <span class="admin-status-badge ${warning.cls}">${warning.severity} ${warning.minutes}분</span></strong>
                <span>${warning.detail}</span>
                <span>필요 조치: ${warning.action} · ${timeText}</span>
                <span>${storeNames || "업체 미확인"} → ${order.address}</span>
                <span>${order.deliveryPartnerName || "오픈콜 대기"} · ${assignedRiderLabel(order)}</span>
              </div>
              <div class="mini-actions order-detail-action">
                <button type="button" onclick="openAdminOrderDetail('${order.id}')">상세보기</button>
              </div>
            </div>
          `;
        }).join("");
      }

      function settlementPeriodStart() {
        if (settlementPeriodFilter === "today") {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          return start;
        }
        if (settlementPeriodFilter === "7d") return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        if (settlementPeriodFilter === "30d") return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return null;
      }

      function settlementDateForOrder(order, mode = "open") {
        if (mode === "paid") return order.settlementPaidAt || order.arrivalConfirmedAt || order.createdAt;
        if (mode === "held") return order.settlementHeldAt || order.arrivalConfirmedAt || order.createdAt;
        return order.arrivalConfirmedAt || order.settlementConfirmedAt || order.createdAt;
      }

      function matchesSettlementPeriod(order, mode = "open") {
        const start = settlementPeriodStart();
        if (!start) return true;
        const value = new Date(settlementDateForOrder(order, mode)).getTime();
        return Number.isFinite(value) && value >= start.getTime();
      }

      function renderSettlementPeriodFilters() {
        const node = document.getElementById("adminSettlementPeriodFilters");
        if (!node) return;
        const filters = [
          { key: "today", label: "오늘" },
          { key: "7d", label: "7일" },
          { key: "30d", label: "30일" },
          { key: "all", label: "전체" },
        ];
        node.innerHTML = filters.map((filter) =>
          '<button class="chip ' + (settlementPeriodFilter === filter.key ? 'active-control' : '') + '" type="button" onclick="setSettlementPeriodFilter(\'' + filter.key + '\')">' + filter.label + '</button>'
        ).join("");
      }

      function renderSettlementPartnerFilters() {
        const node = document.getElementById("adminSettlementPartnerFilters");
        if (!node) return;
        if (!currentAdmin || currentAdmin.role !== "total") {
          node.innerHTML = "";
          return;
        }
        const filters = [{ key: "all", label: "전체 배송사" }, ...deliveryPartners.map((partner) => ({ key: partner.name, label: partner.name }))];
        node.innerHTML = filters.map((filter) =>
          '<button class="chip ' + (settlementPartnerFilter === filter.key ? 'active-control' : '') + '" type="button" onclick="setSettlementPartnerFilter(decodeURIComponent(\'' + encodeURIComponent(filter.key) + '\'))">' + filter.label + '</button>'
        ).join("");
      }

      function renderSettlementResultSummary() {
        const node = document.getElementById("adminSettlementResultSummary");
        if (!node) return;
        if (!lastSettlementResult) {
          node.innerHTML = "";
          return;
        }
        const result = lastSettlementResult;
        const statusClass = result.saved ? "done" : "ready";
        node.innerHTML = `
          <div class="settlement-result-summary">
            <div>
              <span>최근 정산 처리</span>
              <strong>${result.message}</strong>
              <p>${result.beforeStatus} → ${result.afterStatus} · ${result.count}건 · ${formatKRW(result.payoutTotal)}</p>
            </div>
            <em class="admin-status-badge ${statusClass}">${result.saved ? "저장 완료" : "화면 반영"}</em>
          </div>
        `;
      }

      function readSettlementFlowCheckLogs() {
        try {
          const parsed = JSON.parse(localStorage.getItem(SETTLEMENT_FLOW_CHECK_LOG_KEY) || "[]");
          return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
          localStorage.removeItem(SETTLEMENT_FLOW_CHECK_LOG_KEY);
          return [];
        }
      }

      function saveSettlementFlowCheckLogs() {
        localStorage.setItem(SETTLEMENT_FLOW_CHECK_LOG_KEY, JSON.stringify(settlementFlowCheckLogs.slice(0, 8)));
      }

      function addSettlementFlowCheckLog(log) {
        settlementFlowCheckLogs = [log, ...settlementFlowCheckLogs].slice(0, 8);
        saveSettlementFlowCheckLogs();
        renderSettlementFlowCheckLogs();
      }

      function renderSettlementFlowCheckLogs() {
        const node = document.getElementById("adminSettlementFlowCheckLogs");
        if (!node) return;
        if (!currentAdmin || currentAdmin.role !== "total") {
          node.innerHTML = "";
          return;
        }
        if (!settlementFlowCheckLogs.length) {
          node.innerHTML = `
            <div class="settlement-check-log settlement-check-log-empty">
              <div>
                <span>정산 플로우 점검 로그</span>
                <strong>아직 실행된 점검이 없습니다.</strong>
                <p>정산 플로우 점검을 실행하면 생성, 확정, 지급 결과가 여기에 남습니다.</p>
              </div>
            </div>
          `;
          return;
        }
        node.innerHTML = `
          <div class="settlement-check-log">
            <div class="settlement-check-log-head">
              <div>
                <span>정산 플로우 점검 로그</span>
                <strong>최근 ${settlementFlowCheckLogs.length}건</strong>
              </div>
              <div class="settlement-check-log-head-actions">
                <button type="button" onclick="openLatestSettlementFlowCheckReport()">최근 리포트</button>
                <button type="button" onclick="clearSettlementFlowCheckLogs()">초기화</button>
              </div>
            </div>
            <div class="settlement-check-log-list">
              ${settlementFlowCheckLogs.map((log, index) => `
                <div class="settlement-check-log-item">
                  <div class="settlement-audit-step">${settlementFlowCheckLogs.length - index}</div>
                  <div>
                    <span class="admin-status-badge ${log.ok ? "done" : "waiting"}">${log.ok ? "통과" : "확인 필요"}</span>
                    <strong>${log.orderId} · ${log.partnerName} · ${log.riderName}</strong>
                    <p>${log.steps.join(" → ")} · ${formatKRW(log.payoutTotal)} · ${settlementTimeLabel(log.createdAt)}</p>
                    <em>${log.message}</em>
                    <div class="mini-actions settlement-check-log-actions">
                      <button type="button" onclick="openSettlementFlowCheckReport('${log.orderId}')">상세보기</button>
                    </div>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        `;
      }

      async function openSettlementFlowCheckReport(orderId) {
        if (!currentAdmin || currentAdmin.role !== "total") {
          openAdminLogin();
          return;
        }
        const log = settlementFlowCheckLogs.find((item) => item.orderId === orderId);
        const title = document.getElementById("adminOrderDetailTitle");
        const body = document.getElementById("adminOrderDetailBody");
        if (!body) return;
        if (title) title.textContent = "정산 점검 리포트";
        if (!log) {
          body.innerHTML = '<div class="line-item"><span>점검 로그를 찾을 수 없습니다</span><strong>확인 필요</strong></div>';
        } else {
          const order = await findAdminOrder(orderId);
          const orderStatus = order ? settlementStatusLabel(applyStoredSettlementStatus(order)) : "주문 기록 없음";
          const orderTotal = order ? formatKRW(order.deliveryFee || 0) : "확인 불가";
          body.innerHTML = `
            <div class="settlement-check-report">
              <div class="order-detail-block">
                <strong>${log.orderId}</strong>
                <span>${log.partnerName} · ${log.riderName}</span>
                <span>${settlementTimeLabel(log.createdAt)} · ${log.ok ? "자동 점검 통과" : "확인 필요"}</span>
              </div>
              <div class="settlement-detail-progress">
                <div><span>정산 상태</span><strong>${orderStatus}</strong></div>
                <div><span>배송비</span><strong>${orderTotal}</strong></div>
                <div><span>지급액</span><strong>${formatKRW(log.payoutTotal)}</strong></div>
              </div>
              <div class="settlement-check-report-steps">
                ${log.steps.map((step, index) => `
                  <div class="settlement-check-report-step">
                    <div class="settlement-audit-step">${index + 1}</div>
                    <div>
                      <span class="admin-status-badge done">완료</span>
                      <strong>${step}</strong>
                      <p>${index === 0 ? "테스트 주문과 정산 상태를 준비했습니다." : index === 1 ? "확정대기 항목을 지급대기로 전환했습니다." : index === 2 ? "지급대기 항목을 지급완료로 처리했습니다." : "지급 완료 탭과 결과 요약에 반영했습니다."}</p>
                    </div>
                  </div>
                `).join("")}
              </div>
              <div class="line-item"><span>점검 메시지</span><strong>${log.message}</strong></div>
              <div class="mini-actions settlement-check-report-actions">
                <button type="button" onclick="copySettlementFlowCheckReport('${log.orderId}')">텍스트 복사</button>
                <button type="button" onclick="downloadSettlementFlowCheckReportCsv('${log.orderId}')">CSV 다운로드</button>
              </div>
            </div>
          `;
        }
        document.getElementById("adminOrderDetailModal").classList.add("open");
        document.getElementById("adminOrderDetailModal").setAttribute("aria-hidden", "false");
      }

      function settlementFlowCheckReportData(orderId) {
        const log = settlementFlowCheckLogs.find((item) => item.orderId === orderId);
        if (!log) return null;
        const order = orderHistory.find((item) => item.id === orderId) || (lastOrder && lastOrder.id === orderId ? lastOrder : null);
        const storedOrder = order ? applyStoredSettlementStatus(order) : null;
        return {
          log,
          orderStatus: storedOrder ? settlementStatusLabel(storedOrder) : "주문 기록 없음",
          deliveryFee: storedOrder ? (storedOrder.deliveryFee || 0) : "",
          payoutTotal: log.payoutTotal || 0,
          rows: log.steps.map((step, index) => ({
            order: index + 1,
            step,
            status: log.ok ? "완료" : "확인 필요",
            detail: index === 0 ? "테스트 주문과 정산 상태를 준비했습니다." : index === 1 ? "확정대기 항목을 지급대기로 전환했습니다." : index === 2 ? "지급대기 항목을 지급완료로 처리했습니다." : "지급 완료 탭과 결과 요약에 반영했습니다.",
          })),
        };
      }

      function settlementFlowCheckReportText(orderId) {
        const data = settlementFlowCheckReportData(orderId);
        if (!data) return "";
        const { log, rows } = data;
        return [
          "FitNow 정산 플로우 점검 리포트",
          "주문번호: " + log.orderId,
          "배송사/기사: " + log.partnerName + " · " + log.riderName,
          "점검시각: " + settlementTimeLabel(log.createdAt),
          "정산상태: " + data.orderStatus,
          "배송비: " + (data.deliveryFee === "" ? "확인 불가" : formatKRW(data.deliveryFee)),
          "지급액: " + formatKRW(data.payoutTotal),
          "결과: " + (log.ok ? "통과" : "확인 필요"),
          "메시지: " + log.message,
          "",
          "단계",
          ...rows.map((row) => row.order + ". " + row.step + " - " + row.status + " - " + row.detail),
        ].join("\n");
      }

      async function copySettlementFlowCheckReport(orderId) {
        const text = settlementFlowCheckReportText(orderId);
        if (!text) {
          setSyncStatus("복사할 정산 점검 리포트가 없습니다");
          return;
        }
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
          } else {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.left = "-9999px";
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            textarea.remove();
          }
          setSyncStatus("정산 점검 리포트 텍스트 복사 완료 - " + orderId);
        } catch (error) {
          setSyncStatus("정산 점검 리포트 복사 실패 - 브라우저 권한을 확인하세요");
        }
      }

      function downloadSettlementFlowCheckReportCsv(orderId) {
        const data = settlementFlowCheckReportData(orderId);
        if (!data) {
          setSyncStatus("다운로드할 정산 점검 리포트가 없습니다");
          return;
        }
        const { log, rows } = data;
        const headers = ["주문번호", "배송사", "기사", "점검시각", "정산상태", "배송비", "지급액", "결과", "단계번호", "단계", "단계상태", "상세", "메시지"];
        const csvRows = rows.map((row) => [
          log.orderId,
          log.partnerName,
          log.riderName,
          settlementTimeLabel(log.createdAt),
          data.orderStatus,
          data.deliveryFee === "" ? "" : data.deliveryFee,
          data.payoutTotal,
          log.ok ? "통과" : "확인 필요",
          row.order,
          row.step,
          row.status,
          row.detail,
          log.message,
        ]);
        const csv = [headers, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\r\n");
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const today = new Date().toISOString().slice(0, 10);
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = "fitnow-정산-점검-리포트-" + log.orderId + "-" + today + ".csv";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setSyncStatus("정산 점검 리포트 CSV 다운로드 완료 - " + log.orderId);
      }

      function openLatestSettlementFlowCheckReport() {
        const latest = settlementFlowCheckLogs[0];
        if (!latest) {
          setSyncStatus("확인할 정산 플로우 점검 로그가 없습니다");
          return;
        }
        openSettlementFlowCheckReport(latest.orderId);
      }

      function clearSettlementFlowCheckLogs() {
        settlementFlowCheckLogs = [];
        saveSettlementFlowCheckLogs();
        renderSettlementFlowCheckLogs();
        setSyncStatus("정산 플로우 점검 로그를 초기화했습니다");
      }

      function testDataRetentionKey() {
        const saved = localStorage.getItem(TEST_DATA_RETENTION_KEY) || "24h";
        return TEST_DATA_RETENTION_OPTIONS[saved] ? saved : "24h";
      }

      function testDataRetentionOption() {
        return TEST_DATA_RETENTION_OPTIONS[testDataRetentionKey()];
      }

      function readTestToolMeta() {
        try {
          const parsed = JSON.parse(localStorage.getItem(TEST_TOOL_META_KEY) || "{}");
          return parsed && typeof parsed === "object" ? parsed : {};
        } catch (error) {
          localStorage.removeItem(TEST_TOOL_META_KEY);
          return {};
        }
      }

      function saveTestToolMeta(patch) {
        localStorage.setItem(TEST_TOOL_META_KEY, JSON.stringify({ ...readTestToolMeta(), ...patch }));
      }

      function testToolTimeLabel(value) {
        return value ? settlementTimeLabel(value) : "기록 없음";
      }

      function adminQaChecklistSections() {
        return [
          {
            id: "admin-basics",
            title: "총관리자 기본 상태",
            items: [
              { id: "mode-banner", label: "운영/테스트 모드 배너 표시" },
              { id: "rider-board-collapsed", label: "기사별 업무판 기본 접힘" },
              { id: "nickname-board-collapsed", label: "기사 닉네임 관리 기본 접힘" },
              { id: "home-layout", label: "운영 홈 할 일 카드 겹침 없음" },
            ],
          },
          {
            id: "test-tools",
            title: "관리자 테스트 도구",
            items: [
              { id: "tools-collapsed", label: "테스트 도구 기본 접힘" },
              { id: "meta-visible", label: "마지막 점검/정리 시간 표시" },
              { id: "retention-controls", label: "보관 기간 1시간/24시간/7일 선택" },
              { id: "buttons-in-view", label: "테스트 도구 버튼이 화면 안에 표시" },
            ],
          },
          {
            id: "settlement-flow",
            title: "정산 플로우 점검",
            items: [
              { id: "test-order-created", label: "FN-SET001 생성" },
              { id: "paid", label: "정산 확정 후 지급완료 처리" },
              { id: "paid-tab", label: "지급완료 탭 활성화" },
              { id: "logs-updated", label: "점검 로그와 최근 점검 시간 갱신" },
            ],
          },
          {
            id: "settlement-report",
            title: "정산 점검 리포트",
            items: [
              { id: "modal-open", label: "최근 리포트/상세보기 모달 열림" },
              { id: "four-steps", label: "4단계 진행 내역 표시" },
              { id: "copy-button", label: "텍스트 복사 버튼 표시" },
              { id: "csv-button", label: "CSV 다운로드 버튼 표시" },
            ],
          },
          {
            id: "cleanup",
            title: "테스트 데이터 정리",
            items: [
              { id: "remove-diagnostics", label: "진단 주문과 로그 제거" },
              { id: "cleanup-time", label: "최근 정리 시간 갱신" },
              { id: "operating-mode", label: "OPERATING MODE 전환" },
              { id: "notice-hidden", label: "운영 홈 테스트 안내 제거" },
            ],
          },
          {
            id: "regression",
            title: "회귀 확인",
            items: [
              { id: "order-detail", label: "주문 상세/기사 배정 정상" },
              { id: "operation-actions", label: "정산 운영 버튼은 테스트 도구 밖에 유지" },
              { id: "mobile-layout", label: "모바일 폭에서 텍스트 겹침 없음" },
              { id: "build-pass", label: "배포 전 Vite 빌드 통과" },
            ],
          },
        ];
      }

      function adminQaChecklistItemKey(sectionId, itemId) {
        return sectionId + "." + itemId;
      }

      function readAdminQaChecklistStore() {
        try {
          const parsed = JSON.parse(localStorage.getItem(ADMIN_QA_CHECKLIST_KEY) || "{}");
          return parsed && typeof parsed === "object" && parsed.checked && typeof parsed.checked === "object"
            ? parsed
            : { checked: {}, updatedAt: "" };
        } catch (error) {
          localStorage.removeItem(ADMIN_QA_CHECKLIST_KEY);
          return { checked: {}, updatedAt: "" };
        }
      }

      function saveAdminQaChecklistStore(store) {
        localStorage.setItem(ADMIN_QA_CHECKLIST_KEY, JSON.stringify(store));
      }

      function adminQaChecklistProgress(store = readAdminQaChecklistStore()) {
        const sections = adminQaChecklistSections();
        const total = sections.reduce((sum, section) => sum + section.items.length, 0);
        const checked = sections.reduce((sum, section) => (
          sum + section.items.filter((item) => !!store.checked[adminQaChecklistItemKey(section.id, item.id)]).length
        ), 0);
        return { checked, total, done: total > 0 && checked === total };
      }

      function setAdminQaChecklistItem(key, checked) {
        const store = readAdminQaChecklistStore();
        store.checked = { ...(store.checked || {}), [key]: !!checked };
        store.updatedAt = new Date().toISOString();
        const progress = adminQaChecklistProgress(store);
        store.completedAt = progress.done ? store.updatedAt : "";
        saveAdminQaChecklistStore(store);
        renderSettlementExportActions();
        renderAdminReleaseReadiness(adminRenderedOrders.length ? adminRenderedOrders : orderHistory);
        const summary = document.getElementById("adminQaChecklistSummary");
        if (summary) {
          summary.innerHTML = `
            <strong>${progress.done ? "QA 점검 완료" : "QA 점검 진행 중"}</strong>
            <span>${progress.checked}/${progress.total}개 완료 · 마지막 저장 ${testToolTimeLabel(store.updatedAt)}</span>
          `;
        }
        setSyncStatus("QA 체크리스트 저장 완료 - " + progress.checked + "/" + progress.total);
      }

      function markAdminQaChecklistItems(updates = {}, options = {}) {
        const keys = Object.keys(updates);
        if (!keys.length) return;
        const store = readAdminQaChecklistStore();
        store.checked = { ...(store.checked || {}) };
        keys.forEach((key) => {
          store.checked[key] = !!updates[key];
        });
        store.updatedAt = new Date().toISOString();
        const progress = adminQaChecklistProgress(store);
        store.completedAt = progress.done ? store.updatedAt : "";
        saveAdminQaChecklistStore(store);
        if (options.render === false) return;
        renderSettlementExportActions();
        renderAdminReleaseReadiness(adminRenderedOrders.length ? adminRenderedOrders : orderHistory);
        const summary = document.getElementById("adminQaChecklistSummary");
        if (summary) {
          summary.innerHTML = `
            <strong>${progress.done ? "QA 점검 완료" : "QA 점검 진행 중"}</strong>
            <span>${progress.checked}/${progress.total}개 완료 · 마지막 저장 ${testToolTimeLabel(store.updatedAt)}</span>
          `;
        }
      }

      function clearAdminQaChecklist() {
        localStorage.removeItem(ADMIN_QA_CHECKLIST_KEY);
        renderSettlementExportActions();
        renderAdminReleaseReadiness(adminRenderedOrders.length ? adminRenderedOrders : orderHistory);
        if (document.getElementById("adminOrderDetailModal").classList.contains("open")) {
          openAdminQaChecklist();
        }
        setSyncStatus("QA 체크리스트를 초기화했습니다");
      }

      function adminQaChecklistReportRows(store = readAdminQaChecklistStore()) {
        return adminQaChecklistSections().flatMap((section, sectionIndex) => (
          section.items.map((item, itemIndex) => {
            const key = adminQaChecklistItemKey(section.id, item.id);
            return {
              sectionOrder: sectionIndex + 1,
              itemOrder: itemIndex + 1,
              section: section.title,
              item: item.label,
              status: store.checked[key] ? "완료" : "미완료",
            };
          })
        ));
      }

      function adminQaChecklistReportText() {
        const store = readAdminQaChecklistStore();
        const progress = adminQaChecklistProgress(store);
        const rows = adminQaChecklistReportRows(store);
        return [
          "FitNow 관리자 QA 체크리스트 리포트",
          "결과: " + (progress.done ? "완료" : "진행 중"),
          "진행률: " + progress.checked + "/" + progress.total,
          "마지막 저장: " + testToolTimeLabel(store.updatedAt),
          "완료 시각: " + testToolTimeLabel(store.completedAt),
          "",
          "항목",
          ...rows.map((row) => row.sectionOrder + "-" + row.itemOrder + ". " + row.section + " / " + row.item + " - " + row.status),
        ].join("\n");
      }

      async function copyAdminQaChecklistReport() {
        const text = adminQaChecklistReportText();
        if (!text) return;
        const fallbackCopy = () => {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.style.position = "fixed";
          textarea.style.left = "-9999px";
          textarea.style.top = "0";
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          const copied = document.execCommand("copy");
          textarea.remove();
          return copied;
        };
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
          } else if (!fallbackCopy()) {
            throw new Error("fallback copy failed");
          }
          setSyncStatus("QA 체크리스트 리포트를 복사했습니다");
        } catch (error) {
          try {
            if (!fallbackCopy()) throw error;
            setSyncStatus("QA 체크리스트 리포트를 복사했습니다");
          } catch (fallbackError) {
            setSyncStatus("QA 체크리스트 리포트 복사에 실패했습니다");
          }
        }
      }

      function downloadAdminQaChecklistCsv() {
        const store = readAdminQaChecklistStore();
        const progress = adminQaChecklistProgress(store);
        const headers = ["구분번호", "항목번호", "구분", "항목", "상태", "진행률", "마지막저장", "완료시각"];
        const rows = adminQaChecklistReportRows(store).map((row) => [
          row.sectionOrder,
          row.itemOrder,
          row.section,
          row.item,
          row.status,
          progress.checked + "/" + progress.total,
          store.updatedAt || "",
          store.completedAt || "",
        ]);
        const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const today = new Date().toISOString().slice(0, 10);
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = "fitnow-관리자-QA-체크리스트-" + today + ".csv";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setSyncStatus("QA 체크리스트 CSV 다운로드 완료 - " + progress.checked + "/" + progress.total);
      }

      async function setTestDataRetention(key) {
        const nextKey = TEST_DATA_RETENTION_OPTIONS[key] ? key : "24h";
        localStorage.setItem(TEST_DATA_RETENTION_KEY, nextKey);
        renderSettlementExportActions();
        renderAdminModeBanner(adminRenderedOrders.length ? adminRenderedOrders : orderHistory);
        renderAdminHomeBoard(adminRenderedOrders.length ? adminRenderedOrders : orderHistory, currentAdmin && currentAdmin.role === "total");
        await clearAdminTestData({ expiredOnly: true, auto: true });
        setSyncStatus("테스트 데이터 보관 기간 " + TEST_DATA_RETENTION_OPTIONS[nextKey].label + " 적용 완료");
      }

      function isExpiredTestTimestamp(value, now = Date.now()) {
        if (!value) return false;
        const time = new Date(value).getTime();
        return Number.isFinite(time) && now - time > testDataRetentionOption().ms;
      }

      function isExpiredDiagnosticOrder(order, now = Date.now()) {
        if (!isDiagnosticOrder(order)) return false;
        return isExpiredTestTimestamp(order.createdAt || order.updatedAt, now);
      }

      function isExpiredDiagnosticLog(log, now = Date.now()) {
        return !!(log && log.orderId && (String(log.orderId).startsWith("FN-TEST-") || String(log.orderId).startsWith("FN-SET")) && isExpiredTestTimestamp(log.createdAt, now));
      }

      async function clearAdminTestData(options = {}) {
        if (!currentAdmin || currentAdmin.role !== "total") {
          setSyncStatus("테스트 데이터 정리는 총관리자만 가능합니다");
          return;
        }
        const expiredOnly = !!options.expiredOnly;
        const now = Date.now();
        const beforeOrderCount = orderHistory.length;
        const shouldRemoveOrder = (order) => expiredOnly ? isExpiredDiagnosticOrder(order, now) : isDiagnosticOrder(order);
        const shouldRemoveLog = (log) => expiredOnly ? isExpiredDiagnosticLog(log, now) : !!(log && log.orderId);
        const testIds = new Set(orderHistory.filter(shouldRemoveOrder).map((order) => order.id));
        settlementFlowCheckLogs.forEach((log) => {
          if (shouldRemoveLog(log)) testIds.add(log.orderId);
        });
        orderHistory = orderHistory.filter((order) => !shouldRemoveOrder(order));
        const removeStoredKeys = (storageKey) => {
          try {
            const store = JSON.parse(localStorage.getItem(storageKey) || "{}");
            if (!store || typeof store !== "object") return 0;
            let removed = 0;
            Object.keys(store).forEach((key) => {
              if ((!expiredOnly && (key.startsWith("FN-TEST-") || key.startsWith("FN-SET"))) || testIds.has(key)) {
                delete store[key];
                removed += 1;
              }
            });
            localStorage.setItem(storageKey, JSON.stringify(store));
            return removed;
          } catch (error) {
            localStorage.removeItem(storageKey);
            return 0;
          }
        };
        const removedStatusCount = removeStoredKeys(ORDER_STATUS_STORAGE_KEY) + removeStoredKeys(SETTLEMENT_STATUS_STORAGE_KEY);
        const beforeLogCount = settlementFlowCheckLogs.length;
        settlementFlowCheckLogs = settlementFlowCheckLogs.filter((log) => !shouldRemoveLog(log));
        saveSettlementFlowCheckLogs();
        if (lastOrder && shouldRemoveOrder(lastOrder)) {
          lastOrder = orderHistory[0] || null;
        }
        if (lastSettlementResult && (beforeOrderCount - orderHistory.length > 0 || testIds.has(lastSettlementResult.orderId))) {
          lastSettlementResult = null;
        }
        activeAdminTodoFocus = null;
        adminSettlementView = "open";
        const removedOrderTotal = beforeOrderCount - orderHistory.length;
        const removedLogTotal = beforeLogCount - settlementFlowCheckLogs.length;
        if (options.auto && !removedOrderTotal && !removedStatusCount && !removedLogTotal) return;
        const diagnosticAfterCleanup = adminDiagnosticState(orderHistory);
        if (!expiredOnly && !options.auto && !diagnosticAfterCleanup.hasTestState) {
          markAdminQaChecklistItems({
            [adminQaChecklistItemKey("cleanup", "remove-diagnostics")]: true,
            [adminQaChecklistItemKey("cleanup", "cleanup-time")]: true,
            [adminQaChecklistItemKey("cleanup", "operating-mode")]: true,
            [adminQaChecklistItemKey("cleanup", "notice-hidden")]: true,
          }, { render: false });
        }
        await renderAdminOrders(orderHistory);
        renderOrders();
        renderTracking();
        renderSettlementFlowCheckLogs();
        saveTestToolMeta({ lastCleanupAt: new Date().toISOString(), lastCleanupMode: expiredOnly ? "expired" : "manual" });
        renderSettlementExportActions();
        renderAdminReleaseReadiness(adminRenderedOrders.length ? adminRenderedOrders : orderHistory);
        setSyncStatus((expiredOnly ? "만료 테스트 데이터 자동 정리 완료 - " : "테스트 데이터 정리 완료 - ") + "주문 " + removedOrderTotal + "건, 상태 " + removedStatusCount + "건, 로그 " + removedLogTotal + "건 삭제");
      }

      function deliveryProofCleanupCandidates(orders = orderHistory) {
        const now = Date.now();
        return (orders || []).filter((order) =>
          !isDiagnosticOrder(order) &&
          isDeliveryProofRetentionExpired(order, now) &&
          (deliveryProofPhotoSrc(order.pickupProofPhoto) || deliveryProofPhotoSrc(order.arrivalProofPhoto) || deliveryProofPhotoPaths(order).length)
        );
      }

      async function clearExpiredDeliveryProofPhotos(options = {}) {
        if (!currentAdmin || currentAdmin.role !== "total") {
          setSyncStatus("인증사진 정리는 총관리자만 가능합니다");
          return;
        }
        let sourceOrders = adminRenderedOrders.length ? adminRenderedOrders : orderHistory;
        if (supabaseClient) {
          sourceOrders = await loadAdminOrders({ includeDiagnostic: false }).catch(() => sourceOrders);
        }
        const candidates = deliveryProofCleanupCandidates(sourceOrders);
        if (!candidates.length) {
          if (!options.auto) setSyncStatus("30일 지난 배송 인증사진이 없습니다");
          return;
        }
        let removedPhotoRefs = 0;
        let removedStorageFiles = 0;
        for (const order of candidates) {
          const paths = deliveryProofPhotoPaths(order);
          if (supabaseClient && paths.length) {
            const result = await supabaseClient.storage.from("delivery-proof-photos").remove(paths);
            if (result.error) throw result.error;
            removedStorageFiles += paths.length;
          }
          removedPhotoRefs += stripDeliveryProofPhotos(order);
          addDeliveryLog(order, "인증사진 보관 만료", "배송완료 후 " + DELIVERY_PROOF_RETENTION_DAYS + "일 경과로 사진 참조 정리");
          saveOrderStatusOverride(order);
          saveOrderHistory(order);
          if (supabaseClient) await syncOrderStatusToSupabase(order);
        }
        if (supabaseClient) {
          orderHistory = mergeOrderLists(
            await loadAdminOrders({ includeDiagnostic: shouldIncludeDiagnosticAdminOrders() }).catch(() => candidates),
            orderHistory,
          );
        }
        await renderAdminOrders(orderHistory);
        renderOrders();
        renderTracking();
        setSyncStatus("만료 인증사진 정리 완료 - 주문 " + candidates.length + "건, 사진 " + removedPhotoRefs + "개, 저장소 파일 " + removedStorageFiles + "개");
      }

      function renderSettlementViewTabs(orders = []) {
        const node = document.getElementById("adminSettlementViewTabs");
        if (!node) return;
        const openCount = deliverySettlementRows(orders).reduce((sum, row) => sum + row.count, 0);
        const paidCount = paidSettlementRows(orders).reduce((sum, row) => sum + row.count, 0);
        const heldCount = heldSettlementRows(orders).reduce((sum, row) => sum + row.count, 0);
        const tabs = [
          { key: "open", label: "정산 예정", count: openCount },
          { key: "paid", label: "지급 완료", count: paidCount },
          { key: "held", label: "보류", count: heldCount },
        ];
        node.innerHTML = tabs.map((tab) =>
          '<button type="button" data-admin-settlement-view="' + tab.key + '" class="' + (adminSettlementView === tab.key ? 'active-control' : '') + '" onclick="setAdminSettlementView(\'' + tab.key + '\')">' + tab.label + ' ' + tab.count + '</button>'
        ).join("");
        applyAdminSettlementView();
      }

      function applyAdminSettlementView() {
        const sections = {
          open: document.getElementById("adminOpenSettlementSection"),
          paid: document.getElementById("adminPaidSettlementSection"),
          held: document.getElementById("adminHeldSettlementSection"),
        };
        Object.entries(sections).forEach(([key, section]) => {
          if (!section) return;
          const isActive = adminSettlementView === key;
          section.style.display = isActive ? "" : "none";
          if (isActive) section.open = true;
        });
      }

      function setAdminSettlementView(view) {
        adminSettlementView = ["open", "paid", "held"].includes(view) ? view : "open";
        renderSettlementViewTabs(adminRenderedOrders.length ? adminRenderedOrders : ordersForCurrentAdmin(orderHistory));
      }

      function findAdminSettlementViewButtonFromEvent(event) {
        if (event.target && event.target.closest) {
          const directButton = event.target.closest("[data-admin-settlement-view]");
          if (directButton) return directButton;
        }
        const buttons = Array.from(document.querySelectorAll("[data-admin-settlement-view]"));
        return buttons.find((button) => {
          const rect = button.getBoundingClientRect();
          return (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
          );
        }) || null;
      }

      function setupAdminSettlementViewHandlers() {
        if (setupAdminSettlementViewHandlers.ready) return;
        setupAdminSettlementViewHandlers.ready = true;
        document.addEventListener("click", (event) => {
          const button = findAdminSettlementViewButtonFromEvent(event);
          if (!button || button.disabled) return;
          event.preventDefault();
          setAdminSettlementView(button.getAttribute("data-admin-settlement-view"));
        });
      }

      async function setSettlementPeriodFilter(filter) {
        settlementPeriodFilter = filter || "all";
        activeAdminTodoFocus = null;
        await renderAdminOrders();
      }

      async function setSettlementPartnerFilter(filter) {
        settlementPartnerFilter = filter || "all";
        activeAdminTodoFocus = null;
        await renderAdminOrders();
      }

      function settlementPartnerLabel() {
        if (currentAdmin && currentAdmin.role === "delivery") return currentAdmin.name;
        return settlementPartnerFilter === "all" ? "전체 배송사" : settlementPartnerFilter;
      }

      function settlementPeriodLabel() {
        if (settlementPeriodFilter === "today") return "오늘";
        if (settlementPeriodFilter === "7d") return "최근 7일";
        if (settlementPeriodFilter === "30d") return "최근 30일";
        return "전체";
      }

      function settlementStatusLabel(order) {
        if (order.settlementClosedAt) return "마감완료";
        if (order.settlementStatus === "paid") return "지급완료";
        if (order.settlementStatus === "held") return "보류";
        if (order.settlementStatus === "confirmed") return "지급대기";
        return "확정대기";
      }

      function settlementExportModeLabel(mode) {
        if (mode === "closed") return "마감완료";
        if (mode === "open") return "정산예정";
        if (mode === "paid") return "지급완료";
        if (mode === "held") return "보류";
        return "전체";
      }

      function csvCell(value) {
        const text = String(value ?? "").replace(/\r?\n/g, " ");
        return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
      }

      function settlementExportOrders(mode = "all") {
        const sourceOrders = ordersForSettlementPartnerFilter(adminRenderedOrders.length ? adminRenderedOrders : ordersForCurrentAdmin(orderHistory));
        return sourceOrders.map(applyStoredSettlementStatus).filter((order) => {
          if (isOrderCancelled(order) || (order.progressStep || 0) < 4 || !hasDeliveryProof(order, "arrival")) return false;
          if (mode === "open") return order.settlementStatus !== "paid" && order.settlementStatus !== "held" && matchesSettlementPeriod(order, "open");
          if (mode === "paid") return order.settlementStatus === "paid" && matchesSettlementPeriod(order, "paid");
          if (mode === "held") return order.settlementStatus === "held" && matchesSettlementPeriod(order, "held");
          if (mode === "closed") return !!order.settlementClosedAt && matchesSettlementPeriod(order, "paid");
          return matchesSettlementPeriod(order, order.settlementStatus === "paid" ? "paid" : order.settlementStatus === "held" ? "held" : "open");
        });
      }

      function settlementClosableOrders() {
        return settlementExportOrders("paid").filter((order) => !order.settlementClosedAt);
      }

      function downloadSettlementCsv(mode = "all") {
        if (!currentAdmin) {
          openAdminLogin();
          return;
        }
        const orders = settlementExportOrders(mode);
        if (!orders.length) {
          setSyncStatus(settlementExportModeLabel(mode) + " 다운로드할 정산 데이터가 없습니다");
          return;
        }
        const headers = ["구분", "주문번호", "배송사", "기사", "주문상태", "정산상태", "기간필터", "도착인증일", "정산확정일", "정산확정자", "지급완료일", "보류일", "보류사유", "마감일", "마감자", "마감명", "배송비", "정산율", "지급액", "픽업지/매장", "도착지", "고객", "상품"];
        const rows = orders.map((order) => {
          const partnerName = order.deliveryPartnerName || "미배정";
          const riderName = assignedRiderLabel(order);
          const rate = riderSettlementRate(partnerName, riderName);
          const payout = settlementPayout(order.deliveryFee || 0, partnerName, riderName);
          const stores = order.items.map((item) => item.showroom).filter((store, index, list) => store && list.indexOf(store) === index).join(" / ");
          const productsText = order.items.map((item) => item.name + " " + (item.size || "One size") + " x" + (item.quantity || 1)).join(" / ");
          return [
            settlementExportModeLabel(mode),
            order.id,
            partnerName,
            riderName,
            orderDisplayLabel(order),
            settlementStatusLabel(order),
            settlementPeriodLabel(),
            settlementTimeLabel(order.arrivalConfirmedAt),
            settlementTimeLabel(order.settlementConfirmedAt),
            order.settlementConfirmedBy || "",
            settlementTimeLabel(order.settlementPaidAt),
            settlementTimeLabel(order.settlementHeldAt),
            order.settlementHoldReason || "",
            settlementTimeLabel(order.settlementClosedAt),
            order.settlementClosedBy || "",
            order.settlementCloseLabel || "",
            order.deliveryFee || 0,
            rate + "%",
            payout,
            stores,
            order.address || order.region || "",
            order.customerName || currentCustomer.name || "",
            productsText,
          ];
        });
        const totals = rows.reduce((sum, row) => {
          sum.fee += Number(row[15]) || 0;
          sum.payout += Number(row[17]) || 0;
          return sum;
        }, { fee: 0, payout: 0 });
        const footer = ["합계", orders.length + "건", "", "", "", "", settlementPeriodLabel(), "", "", "", "", "", "", "", "", "", totals.fee, "", totals.payout, "", "", "", ""];
        const csv = [headers, ...rows, footer].map((row) => row.map(csvCell).join(",")).join("\r\n");
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const today = new Date().toISOString().slice(0, 10);
        const scope = settlementPartnerLabel().replace(/\s+/g, "-");
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = "fitnow-지금배송-정산-" + scope + "-" + settlementExportModeLabel(mode) + "-" + today + ".csv";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setSyncStatus(settlementExportModeLabel(mode) + " 정산 CSV 다운로드 완료 - " + orders.length + "건");
      }

      function openAdminQaChecklist() {
        if (!currentAdmin || currentAdmin.role !== "total") {
          openAdminLogin();
          return;
        }
        const title = document.getElementById("adminOrderDetailTitle");
        const body = document.getElementById("adminOrderDetailBody");
        if (!body) return;
        const sections = adminQaChecklistSections();
        const store = readAdminQaChecklistStore();
        const progress = adminQaChecklistProgress(store);
        if (title) title.textContent = "관리자 QA 체크리스트";
        body.innerHTML = `
          <div class="admin-qa-checklist">
            <div class="order-detail-block">
              <strong>배포 전 관리자 점검</strong>
              <span>정산 플로우, 리포트, 테스트 데이터 정리 기능을 같은 순서로 확인합니다.</span>
              <span>상세 문서: docs/admin-qa-checklist.md</span>
            </div>
            <div class="admin-qa-summary" id="adminQaChecklistSummary">
              <strong>${progress.done ? "QA 점검 완료" : "QA 점검 진행 중"}</strong>
              <span>${progress.checked}/${progress.total}개 완료 · 마지막 저장 ${testToolTimeLabel(store.updatedAt)}</span>
            </div>
            ${sections.map((section, sectionIndex) => `
              <div class="admin-qa-section">
                <div class="settlement-audit-step">${sectionIndex + 1}</div>
                <div>
                  <strong>${section.title}</strong>
                  <div class="admin-qa-items">
                    ${section.items.map((item) => {
                      const key = adminQaChecklistItemKey(section.id, item.id);
                      return `
                      <label>
                        <input type="checkbox" ${store.checked[key] ? "checked" : ""} onchange="setAdminQaChecklistItem('${key}', this.checked)" />
                        <span>${item.label}</span>
                      </label>
                    `;
                    }).join("")}
                  </div>
                </div>
              </div>
            `).join("")}
            <div class="line-item"><span>권장 최종 확인</span><strong>.\\node_modules\\.bin\\vite.cmd build</strong></div>
            <div class="mini-actions settlement-check-report-actions">
              <button type="button" onclick="copyAdminQaChecklistReport()">리포트 복사</button>
              <button type="button" onclick="downloadAdminQaChecklistCsv()">CSV 다운로드</button>
              <button type="button" onclick="clearAdminQaChecklist()">체크 초기화</button>
              <button type="button" onclick="closeAdminOrderDetail()">닫기</button>
            </div>
          </div>
        `;
        document.getElementById("adminOrderDetailModal").classList.add("open");
        document.getElementById("adminOrderDetailModal").setAttribute("aria-hidden", "false");
      }

      function renderSettlementExportActions() {
        const node = document.getElementById("adminSettlementExportActions");
        const testNode = document.getElementById("adminSettlementTestActions");
        const testSection = document.getElementById("adminSettlementTestToolsSection");
        if (!node) return;
        const counts = {
          all: settlementExportOrders("all").length,
          open: settlementExportOrders("open").length,
          paid: settlementExportOrders("paid").length,
          held: settlementExportOrders("held").length,
          closed: settlementExportOrders("closed").length,
          closable: settlementClosableOrders().length,
        };
        node.innerHTML = `
          <button type="button" onclick="openSettlementStatement()">정산서 미리보기</button>
          <button type="button" onclick="downloadSettlementCsv('all')">전체 ${counts.all}건</button>
          <button type="button" onclick="downloadSettlementCsv('open')">정산예정 ${counts.open}건</button>
          <button type="button" onclick="downloadSettlementCsv('paid')">지급완료 ${counts.paid}건</button>
          <button type="button" onclick="downloadSettlementCsv('held')">보류 ${counts.held}건</button>
          <button type="button" onclick="downloadSettlementCsv('closed')">마감완료 ${counts.closed}건</button>
          ${currentAdmin && currentAdmin.role === "total" ? '<button type="button" onclick="closeSettlementPeriod()">이번 기간 마감 ' + counts.closable + '건</button>' : ""}
        `;
        if (!testNode || !testSection) return;
        if (!currentAdmin || currentAdmin.role !== "total") {
          testNode.innerHTML = "";
          testSection.style.display = "none";
          return;
        }
        testSection.style.display = "";
        const retentionKey = testDataRetentionKey();
        const testMeta = readTestToolMeta();
        const qaProgress = adminQaChecklistProgress();
        const qaStore = readAdminQaChecklistStore();
        const qaRemaining = Math.max(qaProgress.total - qaProgress.checked, 0);
        const expiredProofCount = deliveryProofCleanupCandidates(adminRenderedOrders.length ? adminRenderedOrders : orderHistory).length;
        testNode.innerHTML = `
          <div class="settlement-test-status">
            <div><span>마지막 점검</span><strong>${testToolTimeLabel(testMeta.lastCheckAt)}</strong></div>
            <div><span>마지막 정리</span><strong>${testToolTimeLabel(testMeta.lastCleanupAt)}</strong></div>
            <div><span>QA 체크</span><strong>${qaProgress.checked}/${qaProgress.total}개 · ${qaProgress.done ? "완료" : testToolTimeLabel(qaStore.updatedAt)}</strong></div>
          </div>
          <div class="admin-qa-gate ${qaProgress.done ? "done" : "pending"}">
            <div>
              <span>${qaProgress.done ? "QA 완료" : "배포 전 확인 필요"}</span>
              <strong>${qaProgress.done ? "관리자 QA 체크리스트가 모두 완료되었습니다" : "관리자 QA 체크리스트 " + qaRemaining + "개 항목이 남아 있습니다"}</strong>
            </div>
            <em>${qaProgress.done ? testToolTimeLabel(qaStore.completedAt || qaStore.updatedAt) : qaProgress.checked + "/" + qaProgress.total}</em>
          </div>
          <div class="settlement-test-retention">
            <span>테스트 데이터 보관 기간</span>
            <div>
              ${Object.entries(TEST_DATA_RETENTION_OPTIONS).map(([key, option]) =>
                '<button type="button" class="' + (retentionKey === key ? 'active-control' : '') + '" onclick="setTestDataRetention(\'' + key + '\')">' + option.label + '</button>'
              ).join("")}
            </div>
          </div>
          <div class="settlement-test-retention">
            <span>배송 인증사진 보관</span>
            <div>
              <button type="button" class="active-control" disabled>배송완료 후 ${DELIVERY_PROOF_RETENTION_DAYS}일</button>
              <button type="button" ${expiredProofCount ? "" : "disabled"} onclick="clearExpiredDeliveryProofPhotos()">만료 사진 정리 ${expiredProofCount}건</button>
            </div>
          </div>
          <button type="button" onclick="runSettlementFlowAutoCheck()">정산 플로우 점검</button>
          <button type="button" onclick="openAdminQaChecklist()">QA 체크리스트</button>
          <button type="button" onclick="createSettlementExcelDemoOrders()">엑셀 테스트 6건 생성</button>
          <button class="settlement-cleanup-action" type="button" onclick="clearAdminTestData()">테스트 데이터 정리</button>
        `;
      }

      function settlementStatementRows() {
        const rows = [];
        settlementExportOrders("all").forEach((order) => {
          const partnerName = order.deliveryPartnerName || "미배정";
          const riderName = assignedRiderLabel(order);
          let row = rows.find((item) => item.partnerName === partnerName && item.riderName === riderName);
          if (!row) {
            row = { partnerName, riderName, count: 0, open: 0, confirmed: 0, paid: 0, held: 0, closed: 0, feeTotal: 0, payout: 0 };
            rows.push(row);
          }
          row.count += 1;
          if (order.settlementStatus === "paid") row.paid += 1;
          else if (order.settlementStatus === "held") row.held += 1;
          else if (order.settlementStatus === "confirmed") row.confirmed += 1;
          else row.open += 1;
          if (order.settlementClosedAt) row.closed += 1;
          row.feeTotal += order.deliveryFee || 0;
          row.payout += settlementPayout(order.deliveryFee || 0, partnerName, riderName);
        });
        return rows.sort((a, b) => a.partnerName.localeCompare(b.partnerName) || a.riderName.localeCompare(b.riderName));
      }

      function openSettlementStatement() {
        if (!currentAdmin) {
          openAdminLogin();
          return;
        }
        const title = document.getElementById("adminOrderDetailTitle");
        const body = document.getElementById("adminOrderDetailBody");
        if (!body) return;
        const rows = settlementStatementRows();
        const totals = rows.reduce((sum, row) => {
          sum.count += row.count;
          sum.open += row.open;
          sum.confirmed += row.confirmed;
          sum.paid += row.paid;
          sum.held += row.held;
          sum.closed += row.closed;
          sum.feeTotal += row.feeTotal;
          sum.payout += row.payout;
          return sum;
        }, { count: 0, open: 0, confirmed: 0, paid: 0, held: 0, closed: 0, feeTotal: 0, payout: 0 });
        const scope = settlementPartnerLabel();
        const issuedAt = new Date().toLocaleString("ko-KR", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
        if (title) title.textContent = "지금배송 정산서";
        body.innerHTML = `
          <div class="settlement-statement">
            <div class="statement-title">
              <strong>FITNOW 지금배송 정산서</strong>
              <span>${scope} · ${settlementPeriodLabel()} · 발행 ${issuedAt}</span>
            </div>
            <div class="mini-actions settlement-export-actions">
              <button type="button" onclick="window.print()">인쇄 / PDF 저장</button>
              <button type="button" onclick="downloadSettlementCsv('all')">CSV 다운로드</button>
            </div>
            <div class="statement-grid">
              <div class="statement-tile"><span>정산 대상</span><strong>${totals.count}건</strong></div>
              <div class="statement-tile"><span>총 배송비</span><strong>${formatKRW(totals.feeTotal)}</strong></div>
              <div class="statement-tile"><span>지급 예정액</span><strong>${formatKRW(totals.payout)}</strong></div>
              <div class="statement-tile"><span>상태</span><strong>예정 ${totals.open} · 대기 ${totals.confirmed} · 완료 ${totals.paid} · 보류 ${totals.held} · 마감 ${totals.closed}</strong></div>
            </div>
            <table class="statement-table">
              <thead>
                <tr>
                  <th>배송사</th>
                  <th>기사</th>
                  <th>건수</th>
                  <th>상태</th>
                  <th>배송비</th>
                  <th>지급액</th>
                </tr>
              </thead>
              <tbody>
                ${rows.length ? rows.map((row) => `
                  <tr>
                    <td>${row.partnerName}</td>
                    <td>${row.riderName}</td>
                    <td>${row.count}건</td>
                    <td>예정 ${row.open} · 대기 ${row.confirmed} · 완료 ${row.paid} · 보류 ${row.held} · 마감 ${row.closed}</td>
                    <td>${formatKRW(row.feeTotal)}</td>
                    <td>${formatKRW(row.payout)}</td>
                  </tr>
                `).join("") : `
                  <tr>
                    <td colspan="6">현재 기간에 출력할 정산 데이터가 없습니다.</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        `;
        document.getElementById("adminOrderDetailModal").classList.add("open");
        document.getElementById("adminOrderDetailModal").setAttribute("aria-hidden", "false");
      }

      function deliverySettlementRows(orders) {
        const rows = [];
        orders.map(applyStoredSettlementStatus)
          .filter((order) => !isOrderCancelled(order) && (order.progressStep || 0) >= 4 && hasDeliveryProof(order, "arrival") && order.settlementStatus !== "paid" && order.settlementStatus !== "held" && matchesSettlementPeriod(order, "open"))
          .forEach((order) => {
            const partnerName = order.deliveryPartnerName || "미배정";
            const riderName = assignedRiderLabel(order);
            let row = rows.find((item) => item.partnerName === partnerName && item.riderName === riderName);
            if (!row) {
              row = { partnerName, riderName, count: 0, pendingCount: 0, confirmedCount: 0, feeTotal: 0, payout: 0, orderIds: [] };
              rows.push(row);
            }
            row.count += 1;
            row.orderIds.push(order.id);
            if (order.settlementStatus === "confirmed") row.confirmedCount += 1;
            else row.pendingCount += 1;
            row.feeTotal += order.deliveryFee || 0;
            row.payout += settlementPayout(order.deliveryFee || 0, partnerName, riderName);
          });
        return rows.sort((a, b) => b.payout - a.payout || a.partnerName.localeCompare(b.partnerName));
      }

      function renderDeliverySettlement(orders) {
        const rows = deliverySettlementRows(orders);
        const countNode = document.getElementById("adminDeliverySettlementCount");
        if (countNode) countNode.textContent = rows.reduce((sum, row) => sum + row.count, 0) + "건";
        renderSettlementResultSummary();
        const demoButton = currentAdmin && currentAdmin.role === "total"
          ? '<div class="mini-actions order-detail-action"><button type="button" onclick="createSettlementDemoOrders()">정산 테스트 3건 생성</button></div>'
          : "";
        if (!rows.length) return '<div class="line-item"><span>도착 인증 완료된 배송이 없습니다</span><strong>정산 대기</strong></div>' + demoButton;
        return demoButton + rows.map((row) => {
          const status = row.confirmedCount && !row.pendingCount ? { label: "지급대기", cls: "moving" } : row.confirmedCount ? { label: "부분확정", cls: "ready" } : { label: "확정대기", cls: "ready" };
          const focusConfirm = activeAdminTodoFocus === "settlement_pending" && row.pendingCount;
          const focusPaid = activeAdminTodoFocus === "payment_pending" && row.confirmedCount;
          const focusClass = focusConfirm || focusPaid ? " settlement-action-focus" : "";
          const focusNote = focusConfirm
            ? '<div class="settlement-next-action"><span>다음 처리</span><strong>확정대기 ' + row.pendingCount + '건을 정산 확정하세요.</strong></div>'
            : focusPaid
              ? '<div class="settlement-next-action"><span>다음 처리</span><strong>지급대기 ' + row.confirmedCount + '건을 지급 완료하세요.</strong></div>'
              : "";
          return `
          <div class="vendor-product-row admin-order-row${focusClass}">
            <div>
              <strong>${row.partnerName} · ${row.riderName} <span class="admin-status-badge ${status.cls}">${status.label}</span></strong>
              <span>정산 대상 ${row.count}건 · 확정대기 ${row.pendingCount}건 · 지급대기 ${row.confirmedCount}건</span>
              <span>기사 정산 예정액 ${formatKRW(row.payout)} · 적용 정산율 ${riderSettlementRate(row.partnerName, row.riderName)}%</span>
              ${focusNote}
            </div>
            <div class="mini-actions order-detail-action">
              <button type="button" onclick="openSettlementDetail(decodeURIComponent('${encodeURIComponent(row.partnerName)}'), decodeURIComponent('${encodeURIComponent(row.riderName)}'), 'open')">상세보기</button>
              <button class="settlement-waiting" type="button" ${currentAdmin && currentAdmin.role === "total" ? "" : "disabled"} onclick="holdSettlementBatch(decodeURIComponent('${encodeURIComponent(row.partnerName)}'), decodeURIComponent('${encodeURIComponent(row.riderName)}'))">보류</button>
              <button class="${row.pendingCount ? "settlement-confirm" : "settlement-waiting"}${focusConfirm ? " primary-settlement-action" : ""}" type="button" ${currentAdmin && currentAdmin.role === "total" && row.pendingCount ? "" : "disabled"} onclick="confirmSettlementBatch(decodeURIComponent('${encodeURIComponent(row.partnerName)}'), decodeURIComponent('${encodeURIComponent(row.riderName)}'))">${row.pendingCount ? "정산 확정" : "확정 완료"}</button>
              <button class="${row.confirmedCount ? "settlement-paid" : "settlement-waiting"}${focusPaid ? " primary-settlement-action" : ""}" type="button" ${currentAdmin && currentAdmin.role === "total" && row.confirmedCount ? "" : "disabled"} onclick="paySettlementBatch(decodeURIComponent('${encodeURIComponent(row.partnerName)}'), decodeURIComponent('${encodeURIComponent(row.riderName)}'))">${row.confirmedCount ? "지급 완료" : "지급 대기"}</button>
            </div>
          </div>
          `;
        }).join("");
      }

      function paidSettlementRows(orders) {
        const rows = [];
        orders.map(applyStoredSettlementStatus)
          .filter((order) => !isOrderCancelled(order) && order.settlementStatus === "paid" && matchesSettlementPeriod(order, "paid"))
          .forEach((order) => {
            const partnerName = order.deliveryPartnerName || "미배정";
            const riderName = assignedRiderLabel(order);
            const paidDate = order.settlementPaidAt ? new Date(order.settlementPaidAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "지급일 미기록";
            let row = rows.find((item) => item.partnerName === partnerName && item.riderName === riderName && item.paidDate === paidDate);
            if (!row) {
              row = { partnerName, riderName, paidDate, count: 0, feeTotal: 0, payout: 0 };
              rows.push(row);
            }
            row.count += 1;
            row.feeTotal += order.deliveryFee || 0;
            row.payout += settlementPayout(order.deliveryFee || 0, partnerName, riderName);
          });
        return rows.sort((a, b) => b.paidDate.localeCompare(a.paidDate));
      }

      function renderPaidSettlements(orders) {
        const rows = paidSettlementRows(orders);
        const countNode = document.getElementById("adminPaidSettlementCount");
        if (countNode) countNode.textContent = rows.reduce((sum, row) => sum + row.count, 0) + "건";
        if (!rows.length) return '<div class="line-item"><span>아직 지급 완료된 정산이 없습니다</span><strong>완료 대기</strong></div>';
        return rows.map((row) => {
          const recentPaid = lastSettlementResult &&
            lastSettlementResult.afterStatus === "지급완료" &&
            lastSettlementResult.partnerName === row.partnerName &&
            lastSettlementResult.riderName === row.riderName;
          return `
          <div class="vendor-product-row admin-order-row${recentPaid ? " settlement-paid-focus" : ""}">
            <div>
              <strong>${row.partnerName} · ${row.riderName} <span class="admin-status-badge done">지급완료</span></strong>
              <span>완료 ${row.count}건 · 총 배송비 ${formatKRW(row.feeTotal)}</span>
              <span>지급액 ${formatKRW(row.payout)} · ${row.paidDate}</span>
              ${recentPaid ? '<div class="settlement-next-action"><span>방금 처리됨</span><strong>지급완료 처리 결과가 완료 내역에 반영됐습니다.</strong></div>' : ""}
            </div>
            <div class="mini-actions order-detail-action">
              <button type="button" onclick="openSettlementDetail(decodeURIComponent('${encodeURIComponent(row.partnerName)}'), decodeURIComponent('${encodeURIComponent(row.riderName)}'), 'paid')">상세보기</button>
            </div>
          </div>
        `;
        }).join("");
      }

      function heldSettlementRows(orders) {
        const rows = [];
        orders.map(applyStoredSettlementStatus)
          .filter((order) => !isOrderCancelled(order) && order.settlementStatus === "held" && matchesSettlementPeriod(order, "held"))
          .forEach((order) => {
            const partnerName = order.deliveryPartnerName || "미배정";
            const riderName = assignedRiderLabel(order);
            const reason = order.settlementHoldReason || "사유 미입력";
            const heldDate = order.settlementHeldAt ? new Date(order.settlementHeldAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "보류일 미기록";
            let row = rows.find((item) => item.partnerName === partnerName && item.riderName === riderName && item.reason === reason);
            if (!row) {
              row = { partnerName, riderName, reason, heldDate, count: 0, feeTotal: 0, payout: 0 };
              rows.push(row);
            }
            row.count += 1;
            row.feeTotal += order.deliveryFee || 0;
            row.payout += settlementPayout(order.deliveryFee || 0, partnerName, riderName);
          });
        return rows.sort((a, b) => b.heldDate.localeCompare(a.heldDate) || b.payout - a.payout);
      }

      function renderHeldSettlements(orders) {
        const rows = heldSettlementRows(orders);
        const countNode = document.getElementById("adminHeldSettlementCount");
        if (countNode) countNode.textContent = rows.reduce((sum, row) => sum + row.count, 0) + "건";
        if (!rows.length) return '<div class="line-item"><span>보류 중인 정산이 없습니다</span><strong>정상</strong></div>';
        return rows.map((row) => `
          <div class="vendor-product-row admin-order-row">
            <div>
              <strong>${row.partnerName} · ${row.riderName} <span class="admin-status-badge waiting">보류</span></strong>
              <span>보류 ${row.count}건 · 배송비 ${formatKRW(row.feeTotal)} · 예정 정산 ${formatKRW(row.payout)}</span>
              <span>사유: ${row.reason} · ${row.heldDate}</span>
            </div>
            <div class="mini-actions order-detail-action">
              <button type="button" onclick="openSettlementDetail(decodeURIComponent('${encodeURIComponent(row.partnerName)}'), decodeURIComponent('${encodeURIComponent(row.riderName)}'), 'held')">상세보기</button>
              <button class="settlement-confirm" type="button" ${currentAdmin && currentAdmin.role === "total" ? "" : "disabled"} onclick="releaseSettlementHold(decodeURIComponent('${encodeURIComponent(row.partnerName)}'), decodeURIComponent('${encodeURIComponent(row.riderName)}'), decodeURIComponent('${encodeURIComponent(row.reason)}'))">보류 해제</button>
            </div>
          </div>
        `).join("");
      }

      function settlementDetailOrders(partnerName, riderName, mode) {
        const sourceOrders = adminRenderedOrders.length ? adminRenderedOrders : orderHistory;
        return sourceOrders.map(applyStoredSettlementStatus).filter((order) =>
          !isOrderCancelled(order) &&
          (order.progressStep || 0) >= 4 &&
          hasDeliveryProof(order, "arrival") &&
          !order.settlementClosedAt &&
          order.deliveryPartnerName === partnerName &&
          assignedRiderLabel(order) === riderName &&
          (mode === "paid" ? order.settlementStatus === "paid" : mode === "held" ? order.settlementStatus === "held" : order.settlementStatus !== "paid" && order.settlementStatus !== "held") &&
          matchesSettlementPeriod(order, mode)
        );
      }

      function settlementTimeLabel(value) {
        return value ? new Date(value).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "미처리";
      }

      function openSettlementDetail(partnerName, riderName, mode = "open") {
        if (!currentAdmin) {
          openAdminLogin();
          return;
        }
        const title = document.getElementById("adminOrderDetailTitle");
        const body = document.getElementById("adminOrderDetailBody");
        const rows = settlementDetailOrders(partnerName, riderName, mode);
        if (title) title.textContent = (mode === "paid" ? "정산 완료 상세" : mode === "held" ? "정산 보류 상세" : "정산 예정 상세");
        if (!body) return;
        const totalFee = rows.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);
        const totalPayout = rows.reduce((sum, order) => sum + settlementPayout(order.deliveryFee || 0, partnerName, riderName), 0);
        body.innerHTML = `
          <div class="order-detail-grid">
            <div class="order-detail-block">
              <strong>${partnerName} · ${riderName}</strong>
              <span>${mode === "paid" ? "지급 완료 내역" : mode === "held" ? "보류 내역" : "주문별 정산 예정/지급 대기 내역"} · ${rows.length}건</span>
              <span>총 배송비 ${formatKRW(totalFee)} · 지급액 ${formatKRW(totalPayout)}</span>
            </div>
            <div class="admin-store-orders">
              ${rows.length ? rows.map((order) => {
                const rate = riderSettlementRate(partnerName, riderName);
                const payout = settlementPayout(order.deliveryFee || 0, partnerName, riderName);
                const statusLabel = order.settlementStatus === "paid" ? "지급완료" : order.settlementStatus === "held" ? "보류" : order.settlementStatus === "confirmed" ? "지급대기" : "확정대기";
                const statusClass = order.settlementStatus === "paid" ? "done" : order.settlementStatus === "held" ? "waiting" : order.settlementStatus === "confirmed" ? "moving" : "ready";
                const confirmer = order.settlementConfirmedBy || (order.settlementConfirmedAt ? "총관리자" : "미확정");
                const confirmDisabled = currentAdmin && currentAdmin.role === "total" && !order.settlementStatus ? "" : "disabled";
                const auditEvents = settlementAuditEvents(order);
                const latestAudit = auditEvents[0];
                return `
                  <div class="vendor-product-row admin-order-row">
                    <div>
                      <strong>${order.id} <span class="admin-status-badge ${statusClass}">${statusLabel}</span></strong>
                      <div class="settlement-detail-progress">
                        <div><span>현재 상태</span><strong>${statusLabel}</strong></div>
                        <div><span>최근 처리</span><strong>${latestAudit ? latestAudit.label : "처리 대기"}</strong></div>
                        <div><span>최근 시각</span><strong>${latestAudit ? settlementTimeLabel(latestAudit.at) : "미처리"}</strong></div>
                      </div>
                      <span>배송비 ${formatKRW(order.deliveryFee || 0)} · 정산율 ${rate}% · 지급액 ${formatKRW(payout)}</span>
                      <span>정산확정 ${settlementTimeLabel(order.settlementConfirmedAt)} · 확정자 ${confirmer}</span>
                      <span>지급완료 ${settlementTimeLabel(order.settlementPaidAt)}</span>
                      ${order.settlementClosedAt ? `<span>정산마감 ${settlementTimeLabel(order.settlementClosedAt)} · ${order.settlementCloseLabel || "마감명 없음"}</span>` : ""}
                      ${order.settlementStatus === "held" ? `<span>보류 사유: ${order.settlementHoldReason || "사유 미입력"} · 보류일 ${settlementTimeLabel(order.settlementHeldAt)}</span>` : ""}
                      ${renderSettlementAuditTrail(order, { compact: true })}
                    </div>
                    <div class="mini-actions order-detail-action">
                      ${mode === "open" ? `<button class="${order.settlementStatus ? "settlement-waiting" : "settlement-confirm"}" type="button" ${confirmDisabled} onclick="confirmSettlementOrder('${order.id}', true)">${order.settlementStatus === "confirmed" ? "확정됨" : "정산 확정"}</button>` : ""}
                      <button type="button" onclick="openAdminOrderDetail('${order.id}')">주문 상세</button>
                    </div>
                  </div>
                `;
              }).join("") : '<div class="line-item"><span>표시할 정산 주문이 없습니다</span><strong>비어있음</strong></div>'}
            </div>
          </div>
        `;
        document.getElementById("adminOrderDetailModal").classList.add("open");
        document.getElementById("adminOrderDetailModal").setAttribute("aria-hidden", "false");
      }

      function settlementDemoOrder(index, partnerName, riderName, product, minutesAgo) {
        const now = Date.now();
        const createdAt = new Date(now - minutesAgo * 60000).toISOString();
        const deliveryFee = 3500 + index * 500;
        const subtotal = itemSalePrice(product);
        const order = {
          id: "FN-SET" + String(index).padStart(3, "0"),
          region: partnerName.includes("오산") ? "오산 도심" : "동탄2 신도시",
          address: partnerName.includes("오산") ? "오산역 로데오거리 근처" : "동탄역 센트럴 상권 근처",
          receiveType: "문앞 수령",
          paymentMethod: "카카오페이",
          riderRequest: "정산 테스트 주문",
          items: [{ ...product, quantity: 1 }],
          subtotal,
          deliveryFee,
          total: subtotal + deliveryFee,
          fastest: product.minutes || 32,
          customerId: "settlement-demo",
          customerName: "정산 테스트 고객",
          customerContact: "01000000000",
          progressStep: 4,
          statusCode: "delivered",
          statusLabel: "배송 완료",
          paid: true,
          paymentLabel: "카카오페이 결제 완료",
          deliveryPartnerName: partnerName,
          riderName,
          pickupConfirmedAt: new Date(now - (minutesAgo - 20) * 60000).toISOString(),
          arrivalConfirmedAt: new Date(now - (minutesAgo - 5) * 60000).toISOString(),
          settlementStatus: "",
          settlementConfirmedAt: "",
          settlementConfirmedBy: "",
          settlementPaidAt: "",
          settlementHoldReason: "",
          settlementHeldAt: "",
          settlementReleasedAt: "",
          settlementClosedAt: "",
          settlementClosedBy: "",
          settlementCloseLabel: "",
          createdAt,
          createdLabel: new Date(createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
          deliveryLogs: [
            { id: "demo-log-arrival-" + index, action: "도착 인증", detail: partnerName + " · " + riderName, actor: partnerName, partnerName, riderName, createdAt: new Date(now - (minutesAgo - 5) * 60000).toISOString() },
            { id: "demo-log-pickup-" + index, action: "픽업 인증", detail: partnerName + " · " + riderName, actor: partnerName, partnerName, riderName, createdAt: new Date(now - (minutesAgo - 20) * 60000).toISOString() },
            { id: "demo-log-assign-" + index, action: "오픈콜 배정", detail: partnerName + "에서 " + riderName + " 기사로 직접 배정", actor: partnerName, partnerName, riderName, createdAt: new Date(now - (minutesAgo - 30) * 60000).toISOString() },
          ],
        };
        return order;
      }

      function applyExcelDemoSettlementState(order, status, minutesAgo, reason = "") {
        const now = Date.now();
        order.settlementStatus = status || "";
        order.settlementConfirmedAt = "";
        order.settlementConfirmedBy = "";
        order.settlementPaidAt = "";
        order.settlementHoldReason = "";
        order.settlementHeldAt = "";
        order.settlementReleasedAt = "";
        order.settlementClosedAt = "";
        order.settlementClosedBy = "";
        order.settlementCloseLabel = "";
        if (status === "confirmed" || status === "paid") {
          order.settlementConfirmedAt = new Date(now - Math.max(10, minutesAgo - 8) * 60000).toISOString();
          order.settlementConfirmedBy = "총관리자";
          addDeliveryLog(order, "정산 확정", order.deliveryPartnerName + " · " + assignedRiderLabel(order) + " 엑셀 테스트 정산 확정");
        }
        if (status === "paid") {
          order.settlementPaidAt = new Date(now - Math.max(5, minutesAgo - 4) * 60000).toISOString();
          addDeliveryLog(order, "지급 완료", order.deliveryPartnerName + " · " + assignedRiderLabel(order) + " 엑셀 테스트 지급 완료");
        }
        if (status === "held") {
          order.settlementHoldReason = reason || "엑셀 다운로드 테스트 보류";
          order.settlementHeldAt = new Date(now - Math.max(5, minutesAgo - 6) * 60000).toISOString();
          addDeliveryLog(order, "정산 보류", order.deliveryPartnerName + " · " + assignedRiderLabel(order) + " 엑셀 테스트 보류: " + order.settlementHoldReason);
        }
        return order;
      }

      async function createSettlementExcelDemoOrders() {
        if (!currentAdmin || currentAdmin.role !== "total") {
          setSyncStatus("엑셀 테스트 정산 생성은 총관리자만 가능합니다");
          return;
        }
        const dongtan = deliveryPartners.find((partner) => partner.name.includes("동탄")) || deliveryPartners[0];
        const osan = deliveryPartners.find((partner) => partner.name.includes("오산")) || deliveryPartners[1] || deliveryPartners[0];
        const dongtanRiders = riderNicknamesForPartner(dongtan);
        const osanRiders = riderNicknamesForPartner(osan);
        const specs = [
          { index: 11, partner: dongtan, rider: dongtanRiders[0], product: products[0], minutes: 155, status: "" },
          { index: 12, partner: dongtan, rider: dongtanRiders[1] || dongtanRiders[0], product: products[1], minutes: 140, status: "confirmed" },
          { index: 13, partner: dongtan, rider: dongtanRiders[2] || dongtanRiders[0], product: products[2], minutes: 125, status: "paid" },
          { index: 14, partner: osan, rider: osanRiders[0], product: products[3] || products[0], minutes: 110, status: "" },
          { index: 15, partner: osan, rider: osanRiders[1] || osanRiders[0], product: products[4] || products[1], minutes: 95, status: "paid" },
          { index: 16, partner: osan, rider: osanRiders[2] || osanRiders[0], product: products[5] || products[2], minutes: 80, status: "held", reason: "기사 정산율 확인 필요" },
        ];
        const demoOrders = specs.map((spec) =>
          applyExcelDemoSettlementState(
            settlementDemoOrder(spec.index, spec.partner.name, spec.rider, spec.product, spec.minutes),
            spec.status,
            spec.minutes,
            spec.reason
          )
        );
        demoOrders.forEach((order) => {
          saveSettlementStatus(order);
          saveOrderStatusOverride(order, { allowStepBack: true });
          saveOrderHistory(order);
        });
        lastOrder = demoOrders[0];
        await renderAdminOrders(orderHistory);
        renderOrders();
        renderTracking();
        setSyncStatus("엑셀 테스트용 정산 6건 생성 완료 - 예정/지급완료/보류 포함");
      }

      function buildSettlementDemoOrders() {
        const dongtan = deliveryPartners.find((partner) => partner.name === "지금배송 동탄센터");
        const osan = deliveryPartners.find((partner) => partner.name === "지금배송 오산센터");
        const dongtanRiders = riderNicknamesForPartner(dongtan);
        const osanRiders = riderNicknamesForPartner(osan);
        return [
          settlementDemoOrder(1, dongtan.name, dongtanRiders[0], products[0], 90),
          settlementDemoOrder(2, dongtan.name, dongtanRiders[1] || dongtanRiders[0], products[1], 75),
          settlementDemoOrder(3, osan.name, osanRiders[0], products[2], 60),
        ];
      }

      async function createSettlementDemoOrders() {
        if (!currentAdmin || currentAdmin.role !== "total") {
          setSyncStatus("정산 테스트 주문 생성은 총관리자만 가능합니다");
          return;
        }
        const demoOrders = buildSettlementDemoOrders();
        demoOrders.forEach((order) => {
          saveSettlementStatus(order);
          saveOrderStatusOverride(order, { allowStepBack: true });
          saveOrderHistory(order);
        });
        lastOrder = demoOrders[0];
        await renderAdminOrders(orderHistory);
        renderOrders();
        renderTracking();
        setSyncStatus("정산 테스트 대상 3건 생성 완료");
      }

      async function runSettlementFlowAutoCheck() {
        if (!currentAdmin || currentAdmin.role !== "total") {
          setSyncStatus("정산 플로우 점검은 총관리자만 가능합니다");
          return;
        }
        const demoOrder = buildSettlementDemoOrders()[0];
        saveSettlementStatus(demoOrder);
        saveOrderStatusOverride(demoOrder, { allowStepBack: true });
        saveOrderHistory(demoOrder);
        lastOrder = demoOrder;
        const partnerName = demoOrder.deliveryPartnerName || "미배정";
        const riderName = assignedRiderLabel(demoOrder);
        await confirmSettlementBatchNow(partnerName, riderName, [demoOrder]);
        await paySettlementBatchNow(partnerName, riderName, [demoOrder]);
        adminSettlementView = "paid";
        await renderAdminOrders(orderHistory);
        addSettlementFlowCheckLog({
          createdAt: new Date().toISOString(),
          orderId: demoOrder.id,
          partnerName,
          riderName,
          payoutTotal: settlementPayout(demoOrder.deliveryFee || 0, partnerName, riderName),
          steps: ["테스트 주문 생성", "정산 확정", "지급 완료", "화면 반영"],
          ok: true,
          message: "확정대기에서 지급완료까지 자동 점검을 통과했습니다.",
        });
        renderOrders();
        renderTracking();
        saveTestToolMeta({ lastCheckAt: new Date().toISOString(), lastCheckType: "settlement" });
        renderSettlementExportActions();
        renderAdminReleaseReadiness(adminRenderedOrders.length ? adminRenderedOrders : orderHistory);
        setSyncStatus("정산 플로우 자동 점검 완료 - " + demoOrder.id + " 지급완료");
      }

      async function createDeliveryFlowTestOrder() {
        if (!currentAdmin || currentAdmin.role !== "total") {
          setSyncStatus("배송 테스트 주문 생성은 총관리자만 가능합니다");
          return null;
        }
        const product = products.find((item) => item.stock > 0) || products[0];
        if (!product) {
          setSyncStatus("테스트 주문에 사용할 상품이 없습니다");
          return null;
        }
        const createdAt = new Date().toISOString();
        const subtotal = itemSalePrice(product);
        const deliveryFee = 3500;
        const order = {
          id: "FN-TEST-FLOW-" + Date.now(),
          region: "동탄2 신도시",
          address: "동탄역 센트럴 상권 근처",
          receiveType: "문앞 수령",
          paymentMethod: "카카오페이",
          riderRequest: "배송 플로우 테스트 주문",
          items: [{ ...product, quantity: 1, size: availableSizeOptions(product)[0] || product.size || "FREE" }],
          subtotal,
          deliveryFee,
          total: subtotal + deliveryFee,
          fastest: product.minutes || 36,
          customerId: "delivery-flow-test",
          customerName: "배송 테스트 고객",
          customerContact: "01000000000",
          progressStep: 2,
          statusCode: "pickup",
          statusLabel: "픽업 요청",
          paid: true,
          paymentLabel: "카카오페이 결제 완료",
          deliveryPartnerName: "",
          riderName: "",
          pickupConfirmedAt: "",
          arrivalConfirmedAt: "",
          pickupProofPhoto: null,
          arrivalProofPhoto: null,
          settlementStatus: "",
          settlementConfirmedAt: "",
          settlementPaidAt: "",
          settlementHoldReason: "",
          settlementHeldAt: "",
          settlementReleasedAt: "",
          settlementClosedAt: "",
          settlementClosedBy: "",
          settlementCloseLabel: "",
          createdAt,
          createdLabel: new Date(createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
          deliveryLogs: [],
        };
        addDeliveryLog(order, "배송 테스트 주문 생성", "총관리자가 픽업 준비 상태의 오픈콜 테스트 주문을 생성");
        lastOrder = order;
        saveOrderStatusOverride(order, { allowStepBack: true });
        saveOrderHistory(order);
        try {
          if (supabaseClient) {
            await syncOrderToSupabase(order);
            const refreshedOrders = await loadAdminOrders({ includeDiagnostic: true });
            await renderAdminOrders(refreshedOrders);
            setSyncStatus("배송 테스트 주문 생성 완료 - Supabase 반영 " + order.id);
          } else {
            await renderAdminOrders(orderHistory);
            setSyncStatus("배송 테스트 주문 생성 완료 - 화면 기록 " + order.id);
          }
        } catch (error) {
          await renderAdminOrders(orderHistory);
          setSyncStatus("배송 테스트 주문 생성 완료 - 화면 반영, DB 저장 확인 필요");
        }
        renderOrders();
        renderTracking();
        return order;
      }

      async function runDeliveryFlowAutoCheck() {
        if (!currentAdmin || currentAdmin.role !== "total") {
          setSyncStatus("배송 플로우 자동 점검은 총관리자만 가능합니다");
          return;
        }
        const partner = deliveryPartners.find((item) => item.name === "지금배송 동탄센터") || deliveryPartners[0];
        const rider = riderNicknamesForPartner(partner)[0] || (partner.riders && partner.riders[0]) || "지금배송 라이더";
        const order = await createDeliveryFlowTestOrder();
        if (!order) return;
        await adminAssignDelivery(order.id, partner.name, rider);
        await confirmDeliveryProof(order.id, "pickup");
        await adminAdvanceOrder(order.id, 3);
        await confirmDeliveryProof(order.id, "arrival");
        await adminAdvanceOrder(order.id, 4);
        const checkedOrder = await findAdminOrder(order.id);
        if (checkedOrder && (checkedOrder.progressStep || 0) >= 4 && hasDeliveryProof(checkedOrder, "pickup") && hasDeliveryProof(checkedOrder, "arrival")) {
          saveTestToolMeta({ lastCheckAt: new Date().toISOString(), lastCheckType: "delivery" });
          renderSettlementExportActions();
          renderAdminReleaseReadiness(adminRenderedOrders.length ? adminRenderedOrders : orderHistory);
          setSyncStatus("배송 플로우 자동 점검 완료 - " + order.id);
        } else {
          saveTestToolMeta({ lastCheckAt: new Date().toISOString(), lastCheckType: "delivery_check_needed" });
          renderSettlementExportActions();
          renderAdminReleaseReadiness(adminRenderedOrders.length ? adminRenderedOrders : orderHistory);
          setSyncStatus("배송 플로우 자동 점검 확인 필요 - " + order.id);
        }
      }

      function renderSettlementRateManager() {
        const visiblePartners = currentAdmin && currentAdmin.role === "delivery"
          ? deliveryPartners.filter((partner) => partner.name === currentAdmin.name)
          : deliveryPartners;
        return visiblePartners.map((partner) => {
          const nicknames = riderNicknamesForPartner(partner);
          const partnerRate = defaultPartnerRate(partner.name);
          return `
            <details class="admin-store-group" open>
              <summary>${partner.name} <span>기본 ${partnerRate}%</span></summary>
              <div class="vendor-form" style="margin-top: 9px;">
                <label>배송사 기본 정산율
                  <input type="number" min="0" max="100" value="${partnerRate}" ${currentAdmin && currentAdmin.role === "total" ? "" : "disabled"} onchange="updatePartnerSettlementRate('${partner.name}', this.value)" />
                </label>
              </div>
              <div class="vendor-form size-stock-grid" style="margin-top: 9px;">
                ${nicknames.map((name) => `
                  <label>${name}
                    <input type="number" min="0" max="100" value="${riderSettlementRate(partner.name, name)}" onchange="updateRiderSettlementRate('${partner.name}', '${name}', this.value)" />
                  </label>
                `).join("")}
              </div>
            </details>
          `;
        }).join("");
      }

      function settlementBatchOrders(partnerName, riderName, targetStatus) {
        const sourceOrders = adminRenderedOrders.length ? adminRenderedOrders : orderHistory;
        return sourceOrders.map(applyStoredSettlementStatus).filter((order) =>
          !isOrderCancelled(order) &&
          (order.progressStep || 0) >= 4 &&
          hasDeliveryProof(order, "arrival") &&
          order.deliveryPartnerName === partnerName &&
          assignedRiderLabel(order) === riderName &&
          (targetStatus === "open"
            ? order.settlementStatus !== "paid" && order.settlementStatus !== "held"
            : targetStatus === "pending"
              ? order.settlementStatus !== "confirmed" && order.settlementStatus !== "paid" && order.settlementStatus !== "held"
              : order.settlementStatus === targetStatus)
        );
      }

      function heldSettlementBatchOrders(partnerName, riderName, reason) {
        return settlementBatchOrders(partnerName, riderName, "held")
          .filter((order) => (order.settlementHoldReason || "사유 미입력") === reason);
      }

      function settlementActionSummary(orders, partnerName, riderName) {
        return {
          count: orders.length,
          feeTotal: orders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0),
          payoutTotal: orders.reduce((sum, order) => sum + settlementPayout(order.deliveryFee || 0, partnerName, riderName), 0),
          orderIds: orders.map((order) => order.id).slice(0, 4),
        };
      }

      function settlementTransitionPreview(orders, beforeStatus, afterStatus) {
        return orders.slice(0, 4).map((order) => {
          const currentStatus = beforeStatus || settlementStatusLabel(order);
          const amount = settlementPayout(order.deliveryFee || 0, order.deliveryPartnerName || "미배정", assignedRiderLabel(order));
          return `
            <div class="settlement-transition-row">
              <strong>${order.id}</strong>
              <span>${currentStatus} → ${afterStatus}</span>
              <small>${formatKRW(amount)}</small>
            </div>
          `;
        }).join("");
      }

      function openSettlementConfirm(options) {
        const modal = document.getElementById("settlementConfirmModal");
        const body = document.getElementById("settlementConfirmBody");
        const title = document.getElementById("settlementConfirmTitle");
        const button = document.getElementById("settlementConfirmButton");
        if (!modal || !body || !title || !button) {
          setSyncStatus("정산 확인 모달을 찾을 수 없습니다");
          return;
        }
        const orders = options.orders || [];
        if (!orders.length) {
          setSyncStatus("처리할 정산 주문이 없습니다");
          return;
        }
        const summary = settlementActionSummary(orders, options.partnerName, options.riderName);
        const beforeStatus = options.beforeStatus || "현재 상태";
        const afterStatus = options.resultStatus || options.nextStatus || "상태 변경";
        pendingSettlementAction = options;
        title.textContent = options.title || "정산 처리 확인";
        button.textContent = options.actionLabel || "확인하고 처리";
        button.className = options.confirmClass || "";
        body.innerHTML = `
          <div class="settlement-confirm-panel">
            <div class="settlement-confirm-alert">
              <strong>${options.nextStatus || "정산 상태 변경"}</strong>
              <span>아래 정산 내용을 확인한 뒤 처리하세요. 확인 후에는 주문 이력과 정산 상태가 함께 저장됩니다.</span>
            </div>
            <div class="settlement-confirm-grid">
              <div><span>배송사</span><strong>${options.partnerName}</strong></div>
              <div><span>기사</span><strong>${options.riderName}</strong></div>
              <div><span>처리 주문</span><strong>${summary.count}건</strong></div>
              <div><span>총 배송비</span><strong>${formatKRW(summary.feeTotal)}</strong></div>
              <div><span>기사 지급액</span><strong>${formatKRW(summary.payoutTotal)}</strong></div>
              <div><span>처리 후 상태</span><strong>${afterStatus}</strong></div>
            </div>
            <div class="settlement-transition-panel">
              <div class="settlement-transition-status">
                <div><span>처리 전</span><strong>${beforeStatus}</strong></div>
                <i></i>
                <div><span>처리 후</span><strong>${afterStatus}</strong></div>
              </div>
              <div class="settlement-transition-list">
                ${settlementTransitionPreview(orders, beforeStatus, afterStatus)}
                ${summary.count > 4 ? `<p>외 ${summary.count - 4}건도 같은 상태로 처리됩니다.</p>` : ""}
              </div>
            </div>
            <div class="settlement-confirm-orders">
              <span>대상 주문</span>
              <strong>${summary.orderIds.join(", ")}${summary.count > summary.orderIds.length ? " 외 " + (summary.count - summary.orderIds.length) + "건" : ""}</strong>
            </div>
            ${options.reason ? `<div class="settlement-confirm-orders"><span>처리 사유</span><strong>${options.reason}</strong></div>` : ""}
          </div>
        `;
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
      }

      function closeSettlementConfirm() {
        pendingSettlementAction = null;
        const modal = document.getElementById("settlementConfirmModal");
        if (modal) {
          modal.classList.remove("open");
          modal.setAttribute("aria-hidden", "true");
        }
      }

      async function runSettlementConfirmAction() {
        const action = pendingSettlementAction;
        if (!action || typeof action.execute !== "function") {
          closeSettlementConfirm();
          setSyncStatus("실행할 정산 작업이 없습니다");
          return;
        }
        pendingSettlementAction = null;
        const modal = document.getElementById("settlementConfirmModal");
        if (modal) {
          modal.classList.remove("open");
          modal.setAttribute("aria-hidden", "true");
        }
        await action.execute();
      }

      async function closeSettlementPeriod() {
        if (!currentAdmin || currentAdmin.role !== "total") {
          setSyncStatus("정산 마감은 총관리자만 처리할 수 있습니다");
          return;
        }
        const orders = settlementClosableOrders();
        if (!orders.length) {
          setSyncStatus("현재 기간/배송사에 마감할 지급완료 정산이 없습니다");
          return;
        }
        const closeLabel = settlementPartnerLabel() + " · " + settlementPeriodLabel();
        if (!window.confirm(closeLabel + " 정산 " + orders.length + "건을 마감할까요? 마감 후에는 보류/지급 상태 변경이 제한됩니다.")) return;
        const now = new Date().toISOString();
        orders.forEach((order) => {
          order.settlementClosedAt = now;
          order.settlementClosedBy = currentAdmin.name || "총관리자";
          order.settlementCloseLabel = closeLabel;
          addDeliveryLog(order, "정산 마감", closeLabel + " 정산 마감");
        });
        await persistSettlementBatch(orders, closeLabel + " 정산 마감 완료", { beforeStatus: "지급완료", afterStatus: "마감완료" });
      }

      function updateSettlementResultSummary(orders, message, options = {}) {
        if (!orders.length) return;
        const partnerName = options.partnerName || orders[0].deliveryPartnerName || "미배정";
        const riderName = options.riderName || assignedRiderLabel(orders[0]);
        lastSettlementResult = {
          message,
          count: orders.length,
          partnerName,
          riderName,
          beforeStatus: options.beforeStatus || "처리 전",
          afterStatus: options.afterStatus || "처리 후",
          payoutTotal: orders.reduce((sum, order) => sum + settlementPayout(order.deliveryFee || 0, order.deliveryPartnerName || partnerName, assignedRiderLabel(order) || riderName), 0),
          saved: !!options.saved,
        };
        if (lastSettlementResult.afterStatus === "지급완료") {
          adminSettlementView = "paid";
        }
        renderSettlementResultSummary();
        applyAdminSettlementView();
      }

      async function persistSettlementBatch(orders, message, options = {}) {
        if (!orders.length) {
          setSyncStatus("처리할 정산 주문이 없습니다");
          return;
        }
        orders.forEach((order) => {
          saveSettlementStatus(order);
          saveOrderStatusOverride(order);
          saveOrderHistory(order);
        });
        updateSettlementResultSummary(orders, message, { ...options, saved: false });
        await renderAdminOrders(orderHistory);
        try {
          for (const order of orders) {
            await syncOrderStatusToSupabase(order);
          }
          updateSettlementResultSummary(orders, message, { ...options, saved: true });
          setSyncStatus(message + " - Supabase 반영 완료");
        } catch (error) {
          updateSettlementResultSummary(orders, message, { ...options, saved: false });
          setSyncStatus(message + " - 화면 반영, DB 업데이트 권한 확인 필요");
        }
      }

      async function confirmSettlementBatch(partnerName, riderName) {
        if (!currentAdmin || currentAdmin.role !== "total") {
          setSyncStatus("정산 확정은 총관리자만 처리할 수 있습니다");
          return;
        }
        const orders = settlementBatchOrders(partnerName, riderName, "pending");
        openSettlementConfirm({
          title: "정산 확정 확인",
          actionLabel: "확인하고 정산 확정",
          confirmClass: "settlement-confirm",
          partnerName,
          riderName,
          orders,
          nextStatus: "확정대기 주문을 지급대기로 전환합니다",
          beforeStatus: "확정대기",
          resultStatus: "지급대기",
          execute: () => confirmSettlementBatchNow(partnerName, riderName, orders),
        });
      }

      async function confirmSettlementBatchNow(partnerName, riderName, orders) {
        const now = new Date().toISOString();
        orders.forEach((order) => {
          order.settlementStatus = "confirmed";
          order.settlementConfirmedAt = now;
          order.settlementConfirmedBy = currentAdmin.name || "총관리자";
          addDeliveryLog(order, "정산 확정", partnerName + " · " + riderName + " 정산 확정");
        });
        await persistSettlementBatch(orders, partnerName + " · " + riderName + " 정산 확정 완료", { partnerName, riderName, beforeStatus: "확정대기", afterStatus: "지급대기" });
      }

      async function confirmSettlementOrder(orderId, reopenDetail = false) {
        if (!currentAdmin || currentAdmin.role !== "total") {
          setSyncStatus("정산 확정은 총관리자만 처리할 수 있습니다");
          return;
        }
        const order = (adminRenderedOrders.length ? adminRenderedOrders : orderHistory)
          .map(applyStoredSettlementStatus)
          .find((item) => item.id === orderId);
        if (!order) {
          setSyncStatus("정산 확정할 주문을 찾을 수 없습니다");
          return;
        }
        if (isOrderCancelled(order) || (order.progressStep || 0) < 4 || !hasDeliveryProof(order, "arrival")) {
          setSyncStatus("도착 인증 완료 주문만 정산 확정할 수 있습니다");
          return;
        }
        if (order.settlementStatus === "confirmed") {
          setSyncStatus(order.id + " 이미 정산 확정됨");
          return;
        }
        if (order.settlementStatus === "paid" || order.settlementStatus === "held") {
          setSyncStatus(order.id + " 현재 상태에서는 정산 확정할 수 없습니다");
          return;
        }
        const partnerName = order.deliveryPartnerName || "미배정";
        const riderName = assignedRiderLabel(order);
        openSettlementConfirm({
          title: "주문별 정산 확정 확인",
          actionLabel: "확인하고 정산 확정",
          confirmClass: "settlement-confirm",
          partnerName,
          riderName,
          orders: [order],
          nextStatus: "선택한 주문을 지급대기로 전환합니다",
          beforeStatus: "확정대기",
          resultStatus: "지급대기",
          execute: () => confirmSettlementOrderNow(order, partnerName, riderName, reopenDetail),
        });
      }

      async function confirmSettlementOrderNow(order, partnerName, riderName, reopenDetail = false) {
        const now = new Date().toISOString();
        order.settlementStatus = "confirmed";
        order.settlementConfirmedAt = now;
        order.settlementConfirmedBy = currentAdmin.name || "총관리자";
        addDeliveryLog(order, "정산 확정", partnerName + " · " + riderName + " 주문별 정산 확정");
        await persistSettlementBatch([order], order.id + " 정산 확정 완료", { partnerName, riderName, beforeStatus: "확정대기", afterStatus: "지급대기" });
        if (reopenDetail) openSettlementDetail(partnerName, riderName, "open");
      }

      async function paySettlementBatch(partnerName, riderName) {
        if (!currentAdmin || currentAdmin.role !== "total") {
          setSyncStatus("지급 완료는 총관리자만 처리할 수 있습니다");
          return;
        }
        const orders = settlementBatchOrders(partnerName, riderName, "confirmed");
        openSettlementConfirm({
          title: "지급 완료 확인",
          actionLabel: "확인하고 지급 완료",
          confirmClass: "settlement-paid",
          partnerName,
          riderName,
          orders,
          nextStatus: "지급대기 정산을 지급완료로 전환합니다",
          beforeStatus: "지급대기",
          resultStatus: "지급완료",
          execute: () => paySettlementBatchNow(partnerName, riderName, orders),
        });
      }

      async function paySettlementBatchNow(partnerName, riderName, orders) {
        const now = new Date().toISOString();
        orders.forEach((order) => {
          order.settlementStatus = "paid";
          order.settlementPaidAt = now;
          addDeliveryLog(order, "지급 완료", partnerName + " · " + riderName + " 지급 완료");
        });
        await persistSettlementBatch(orders, partnerName + " · " + riderName + " 지급 완료", { partnerName, riderName, beforeStatus: "지급대기", afterStatus: "지급완료" });
      }

      async function holdSettlementBatch(partnerName, riderName) {
        if (!currentAdmin || currentAdmin.role !== "total") {
          setSyncStatus("정산 보류는 총관리자만 처리할 수 있습니다");
          return;
        }
        const reason = (window.prompt("정산 보류 사유를 입력해주세요.", "") || "").trim();
        if (!reason) {
          setSyncStatus("보류 사유가 없어 정산 보류를 취소했습니다");
          return;
        }
        const orders = settlementBatchOrders(partnerName, riderName, "open");
        openSettlementConfirm({
          title: "정산 보류 확인",
          actionLabel: "확인하고 보류",
          confirmClass: "settlement-waiting",
          partnerName,
          riderName,
          orders,
          reason,
          nextStatus: "정산 예정/지급대기 주문을 보류로 전환합니다",
          beforeStatus: "정산 예정/지급대기",
          resultStatus: "보류",
          execute: () => holdSettlementBatchNow(partnerName, riderName, reason, orders),
        });
      }

      async function holdSettlementBatchNow(partnerName, riderName, reason, orders) {
        const now = new Date().toISOString();
        orders.forEach((order) => {
          order.settlementStatus = "held";
          order.settlementHoldReason = reason;
          order.settlementHeldAt = now;
          order.settlementReleasedAt = "";
          addDeliveryLog(order, "정산 보류", partnerName + " · " + riderName + " 정산 보류: " + reason);
        });
        await persistSettlementBatch(orders, partnerName + " · " + riderName + " 정산 보류 완료", { partnerName, riderName, beforeStatus: "정산 예정/지급대기", afterStatus: "보류" });
      }

      async function releaseSettlementHold(partnerName, riderName, reason) {
        if (!currentAdmin || currentAdmin.role !== "total") {
          setSyncStatus("정산 보류 해제는 총관리자만 처리할 수 있습니다");
          return;
        }
        const orders = heldSettlementBatchOrders(partnerName, riderName, reason || "사유 미입력");
        openSettlementConfirm({
          title: "정산 보류 해제 확인",
          actionLabel: "확인하고 보류 해제",
          confirmClass: "settlement-confirm",
          partnerName,
          riderName,
          orders,
          reason: reason || "사유 미입력",
          nextStatus: "보류 주문을 정산 예정으로 되돌립니다",
          beforeStatus: "보류",
          resultStatus: "정산 예정",
          execute: () => releaseSettlementHoldNow(partnerName, riderName, reason, orders),
        });
      }

      async function releaseSettlementHoldNow(partnerName, riderName, reason, orders) {
        const now = new Date().toISOString();
        orders.forEach((order) => {
          order.settlementStatus = "";
          order.settlementConfirmedBy = "";
          order.settlementHoldReason = "";
          order.settlementReleasedAt = now;
          addDeliveryLog(order, "정산 보류 해제", partnerName + " · " + riderName + " 정산 보류 해제");
        });
        await persistSettlementBatch(orders, partnerName + " · " + riderName + " 정산 보류 해제 완료", { partnerName, riderName, beforeStatus: "보류", afterStatus: "정산 예정" });
      }

      function riderWorkRows(orders) {
        const visiblePartners = currentAdmin && currentAdmin.role === "delivery"
          ? deliveryPartners.filter((partner) => partner.name === currentAdmin.name)
          : deliveryPartners;
        const rows = [];
        visiblePartners.forEach((partner) => {
          riderNicknamesForPartner(partner).forEach((riderName) => {
            const riderOrders = orders.map(applyStoredSettlementStatus).filter((order) =>
              !isOrderCancelled(order) &&
              order.deliveryPartnerName === partner.name &&
              assignedRiderLabel(order) === riderName
            );
            const assigned = riderOrders.filter((order) => (order.progressStep || 0) >= 2 && (order.progressStep || 0) < 4).length;
            const pickupMissing = riderOrders.filter((order) => (order.progressStep || 0) >= 2 && (order.progressStep || 0) < 3 && !hasDeliveryProof(order, "pickup")).length;
            const deliveryStartReady = riderOrders.filter((order) => (order.progressStep || 0) >= 2 && (order.progressStep || 0) < 3 && hasDeliveryProof(order, "pickup")).length;
            const active = riderOrders.filter((order) => (order.progressStep || 0) === 3).length;
            const arrivalMissing = riderOrders.filter((order) => (order.progressStep || 0) === 3 && !hasDeliveryProof(order, "arrival")).length;
            const completionReady = riderOrders.filter((order) => (order.progressStep || 0) === 3 && hasDeliveryProof(order, "arrival")).length;
            const done = riderOrders.filter((order) => (order.progressStep || 0) >= 4 && hasDeliveryProof(order, "arrival")).length;
            const payout = riderOrders
              .filter((order) => (order.progressStep || 0) >= 4 && hasDeliveryProof(order, "arrival") && order.settlementStatus !== "paid" && order.settlementStatus !== "held")
              .reduce((sum, order) => sum + settlementPayout(order.deliveryFee || 0, partner.name, riderName), 0);
            rows.push({ partnerName: partner.name, riderName, assigned, pickupMissing, deliveryStartReady, active, arrivalMissing, completionReady, done, payout });
          });
        });
        return rows.sort((a, b) => (b.assigned + b.active + b.done) - (a.assigned + a.active + a.done) || a.partnerName.localeCompare(b.partnerName));
      }

      function riderWorkBadge(row) {
        if (row.pickupMissing + row.arrivalMissing >= 2 || row.active >= 3) return { label: "바쁨", cls: "refund" };
        if (row.pickupMissing || row.arrivalMissing || row.active >= 1 || row.assigned >= 2) return { label: "주의", cls: "ready" };
        return { label: "여유", cls: "done" };
      }

      function renderRiderWorkBoard(orders) {
        const rows = riderWorkRows(orders);
        const countNode = document.getElementById("adminRiderWorkCount");
        if (countNode) countNode.textContent = rows.length + "명";
        if (!rows.length) return '<div class="line-item"><span>등록된 기사가 없습니다</span><strong>확인 필요</strong></div>';
        return rows.map((row) => {
          const badge = riderWorkBadge(row);
          return `
            <div class="vendor-product-row admin-order-row">
              <div>
                <strong>${row.riderName} <span class="admin-status-badge ${badge.cls}">${badge.label}</span></strong>
                <span>${row.partnerName}</span>
                <span>배정 ${row.assigned}건 · 픽업필요 ${row.pickupMissing}건 · 배송시작 ${row.deliveryStartReady}건 · 도착필요 ${row.arrivalMissing}건</span>
                <span>완료 ${row.done}건 · 정산 예정 ${formatKRW(row.payout)}</span>
              </div>
              <div class="mini-actions">
                <button type="button" onclick="focusRiderOrders('${row.riderName}', 'all')">전체</button>
                <button type="button" ${row.pickupMissing ? "" : "disabled"} onclick="focusRiderOrders('${row.riderName}', 'pickup_proof')">픽업 인증</button>
                <button type="button" ${row.deliveryStartReady ? "" : "disabled"} onclick="focusRiderOrders('${row.riderName}', 'delivery_start')">배송 시작</button>
                <button type="button" ${row.arrivalMissing ? "" : "disabled"} onclick="focusRiderOrders('${row.riderName}', 'arrival_proof')">도착 인증</button>
                <button type="button" ${row.completionReady ? "" : "disabled"} onclick="focusRiderOrders('${row.riderName}', 'delivery_finish')">완료 처리</button>
                <button type="button" ${row.done ? "" : "disabled"} onclick="focusRiderOrders('${row.riderName}', 'done')">완료</button>
              </div>
            </div>
          `;
        }).join("");
      }

      function renderRiderNicknameManager() {
        const visiblePartners = currentAdmin && currentAdmin.role === "delivery"
          ? deliveryPartners.filter((partner) => partner.name === currentAdmin.name)
          : deliveryPartners;
        return visiblePartners.map((partner) => {
          const nicknames = riderNicknamesForPartner(partner);
          return `
            <details class="admin-store-group" open>
              <summary>${partner.name} <span>${nicknames.length}명</span></summary>
              <div class="vendor-form size-stock-grid" style="margin-top: 9px;">
                ${nicknames.map((name, index) => `
                  <label>기사 ${index + 1}
                    <input type="text" value="${name}" onchange="updateRiderNickname('${partner.name}', ${index}, this.value)" />
                  </label>
                `).join("")}
              </div>
            </details>
          `;
        }).join("");
      }

      function shouldAutoOpenAdminDeliveryDashboard(orders = [], totalMode = currentAdmin && currentAdmin.role === "total") {
        if (!currentAdmin) return false;
        if (!totalMode) return true;
        const scopedOrders = ordersForCurrentAdmin(orders);
        const deliveryOrders = scopedOrders.filter((order) => !isOrderCancelled(order));
        const claimableCount = deliveryOrders.filter((order) => (order.progressStep || 0) >= 2 && (order.progressStep || 0) < 3 && !isDeliveryOrderClaimed(order)).length;
        const warningCount = deliveryWarningOrders(deliveryOrders).length;
        const settlementRows = deliverySettlementRows(ordersForSettlementPartnerFilter(deliveryOrders));
        const needsSettlementAction = settlementRows.some((row) => row.pendingCount || row.confirmedCount);
        const focusedDashboard = ["delivery_warning", "settlement_pending", "payment_pending"].includes(activeAdminTodoFocus);
        return claimableCount > 0 || warningCount > 0 || needsSettlementAction || settlementFlowCheckLogs.length > 0 || focusedDashboard;
      }

      function shouldOpenSettlementSummary(orders = []) {
        const deliveryOrders = orders.filter((order) => !isOrderCancelled(order));
        const settlementRows = deliverySettlementRows(ordersForSettlementPartnerFilter(deliveryOrders));
        const focusedSettlement = ["settlement_pending", "payment_pending"].includes(activeAdminTodoFocus);
        return settlementRows.some((row) => row.pendingCount || row.confirmedCount) || settlementFlowCheckLogs.length > 0 || focusedSettlement;
      }

      function storedDiagnosticStatusCount() {
        const countKeys = (storageKey) => {
          try {
            const store = JSON.parse(localStorage.getItem(storageKey) || "{}");
            if (!store || typeof store !== "object") return 0;
            return Object.keys(store).filter((key) => key.startsWith("FN-TEST-") || key.startsWith("FN-SET")).length;
          } catch (error) {
            return 0;
          }
        };
        return countKeys(ORDER_STATUS_STORAGE_KEY) + countKeys(SETTLEMENT_STATUS_STORAGE_KEY);
      }

      function adminDiagnosticState(orders = []) {
        const diagnosticOrders = orders.filter(isDiagnosticOrder).length;
        const diagnosticStatuses = storedDiagnosticStatusCount();
        const diagnosticLogs = settlementFlowCheckLogs.length;
        return {
          orders: diagnosticOrders,
          statuses: diagnosticStatuses,
          logs: diagnosticLogs,
          hasTestState: !!(diagnosticOrders || diagnosticStatuses || diagnosticLogs),
        };
      }

      function isDiagnosticPreviewEnabled() {
        const params = new URLSearchParams(window.location.search || "");
        return ["1", "true", "delivery"].includes(params.get("test") || "")
          || ["1", "true", "delivery"].includes(params.get("photo-proof-check") || "")
          || ["1", "true"].includes(params.get("diagnostic") || "");
      }

      function shouldIncludeDiagnosticAdminOrders() {
        return isDiagnosticPreviewEnabled() || storedDiagnosticStatusCount() > 0 || settlementFlowCheckLogs.length > 0 || orderHistory.some(isDiagnosticOrder);
      }

      function renderAdminModeBanner(orders = []) {
        const node = document.getElementById("adminModeBanner");
        if (!node) return;
        if (!currentAdmin || currentAdmin.role !== "total") {
          node.innerHTML = "";
          return;
        }
        const diagnostic = adminDiagnosticState(orders);
        const retentionLabel = testDataRetentionOption().label;
        node.innerHTML = `
          <div class="admin-mode-banner ${diagnostic.hasTestState ? "test" : "live"}">
            <div>
              <span>${diagnostic.hasTestState ? "TEST MODE" : "OPERATING MODE"}</span>
              <strong>${diagnostic.hasTestState ? "테스트 데이터가 남아 있습니다" : "운영 데이터 기준 화면입니다"}</strong>
              <p>${diagnostic.hasTestState ? "테스트 주문 " + diagnostic.orders + "건 · 테스트 상태 " + diagnostic.statuses + "건 · 점검 로그 " + diagnostic.logs + "건 · " + retentionLabel + " 초과 자동 정리" : "점검 로그와 테스트 주문이 없는 상태입니다."}</p>
            </div>
            ${diagnostic.hasTestState ? '<button type="button" onclick="clearAdminTestData()">정리</button>' : '<em>정상</em>'}
          </div>
        `;
      }

      function renderAdminReleaseReadiness(orders = []) {
        const node = document.getElementById("adminReleaseReadiness");
        if (!node) return;
        if (!currentAdmin || currentAdmin.role !== "total") {
          node.innerHTML = "";
          return;
        }
        const diagnostic = adminDiagnosticState(orders);
        const qaStore = readAdminQaChecklistStore();
        const qaProgress = adminQaChecklistProgress(qaStore);
        const testMeta = readTestToolMeta();
        const qaReady = qaProgress.done;
        const dataReady = !diagnostic.hasTestState;
        const checkReady = !!testMeta.lastCheckAt;
        const cleanupReady = !!testMeta.lastCleanupAt;
        const settlementExportCount = settlementExportOrders("all").length;
        const readyCount = [qaReady, dataReady, checkReady, cleanupReady].filter(Boolean).length;
        const allReady = readyCount === 4;
        const itemMarkup = [
          { label: "QA", detail: qaReady ? "완료 " + testToolTimeLabel(qaStore.completedAt || qaStore.updatedAt) : qaProgress.checked + "/" + qaProgress.total + "개", ready: qaReady },
          { label: "테스트 데이터", detail: dataReady ? "잔여 없음" : "주문 " + diagnostic.orders + "건 · 로그 " + diagnostic.logs + "건", ready: dataReady },
          { label: "최근 점검", detail: testToolTimeLabel(testMeta.lastCheckAt), ready: checkReady },
          { label: "최근 정리", detail: testToolTimeLabel(testMeta.lastCleanupAt), ready: cleanupReady },
        ].map((item) => `
          <div class="${item.ready ? "ready" : "pending"}">
            <span>${item.label}</span>
            <strong>${item.ready ? "OK" : "확인 필요"}</strong>
            <em>${item.detail}</em>
          </div>
        `).join("");
        node.innerHTML = `
          <div class="admin-release-readiness ${allReady ? "ready" : "pending"}">
            <div class="admin-release-readiness-head">
              <div>
                <span>배포 준비 상태</span>
                <strong>${allReady ? "배포 전 필수 점검 완료" : "배포 전 확인 항목이 남아 있습니다"}</strong>
              </div>
              <em>${readyCount}/4</em>
            </div>
            <div class="admin-release-readiness-grid">${itemMarkup}</div>
            <div class="admin-release-actions">
              <button type="button" onclick="openAdminQaChecklist()">QA 체크리스트</button>
              <button type="button" ${diagnostic.hasTestState ? "" : "disabled"} onclick="clearAdminTestData()">테스트 데이터 정리</button>
              <button type="button" onclick="openSettlementStatement()">정산서 미리보기</button>
              <button type="button" ${settlementExportCount ? "" : "disabled"} onclick="downloadSettlementCsv('all')">정산 CSV ${settlementExportCount}건</button>
            </div>
          </div>
        `;
      }

      function deliveryShortcutItems(orders = []) {
        const activeOrders = orders.filter((order) => !isOrderCancelled(order));
        return [
          {
            key: "claimable",
            label: "오픈콜 배정",
            detail: "배정 대기",
            sectionId: "adminClaimableDeliverySection",
            count: activeOrders.filter((order) => (order.progressStep || 0) >= 2 && (order.progressStep || 0) < 3 && !isDeliveryOrderClaimed(order)).length,
          },
          {
            key: "pickup_proof",
            label: "픽업 인증",
            detail: "픽업 사진 필요",
            sectionId: "adminPickupDeliverySection",
            count: activeOrders.filter((order) => (order.progressStep || 0) >= 2 && (order.progressStep || 0) < 3 && isDeliveryOrderClaimed(order) && !hasDeliveryProof(order, "pickup")).length,
          },
          {
            key: "delivery_start",
            label: "배송 시작",
            detail: "픽업 인증 완료",
            sectionId: "adminPickupDeliverySection",
            count: activeOrders.filter((order) => (order.progressStep || 0) >= 2 && (order.progressStep || 0) < 3 && isDeliveryOrderClaimed(order) && hasDeliveryProof(order, "pickup")).length,
          },
          {
            key: "arrival_proof",
            label: "도착 인증",
            detail: "배송중",
            sectionId: "adminActiveDeliverySection",
            count: activeOrders.filter((order) => (order.progressStep || 0) === 3 && isDeliveryOrderClaimed(order) && !hasDeliveryProof(order, "arrival")).length,
          },
          {
            key: "delivery_finish",
            label: "완료 처리",
            detail: "도착 인증 완료",
            sectionId: "adminActiveDeliverySection",
            count: activeOrders.filter((order) => (order.progressStep || 0) === 3 && isDeliveryOrderClaimed(order) && hasDeliveryProof(order, "arrival")).length,
          },
          {
            key: "done_today",
            label: "오늘 완료",
            detail: "마감 확인",
            sectionId: "adminDoneDeliverySection",
            count: activeOrders.filter((order) => (order.progressStep || 0) >= 4 && isTodayOrder(order)).length,
          },
        ];
      }

      function renderDeliveryWorkShortcuts(orders = []) {
        const node = document.getElementById("adminDeliveryWorkShortcuts");
        if (!node) return;
        if (!currentAdmin || currentAdmin.role !== "delivery") {
          node.innerHTML = "";
          return;
        }
        const items = deliveryShortcutItems(orders);
        const urgentCount = items.slice(0, 5).reduce((sum, item) => sum + item.count, 0);
        node.innerHTML = `
          <div class="delivery-work-shortcuts ${urgentCount ? "pending" : "ready"}">
            <div class="delivery-work-shortcuts-head">
              <div>
                <span>배송 작업 바로가기</span>
                <strong>${urgentCount ? "지금 처리할 배송 작업 " + urgentCount + "건" : "현재 긴급 배송 작업 없음"}</strong>
              </div>
              <em>${currentAdmin.name}</em>
            </div>
            <div class="delivery-work-shortcut-grid">
              ${items.map((item) => `
                <button type="button" ${item.count ? "" : "disabled"} onclick="focusDeliveryWorkShortcut('${item.key}')">
                  <span>${item.label}</span>
                  <strong>${item.count}건</strong>
                  <em>${item.detail}</em>
                </button>
              `).join("")}
            </div>
          </div>
        `;
      }

      function focusDeliveryWorkShortcut(key) {
        const item = deliveryShortcutItems(adminRenderedOrders).find((entry) => entry.key === key);
        if (!item) return;
        const dashboard = document.getElementById("adminDeliveryDashboardSection");
        const target = document.getElementById(item.sectionId);
        if (dashboard) dashboard.open = true;
        if (target) {
          target.open = true;
          if (target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "start" });
          highlightAdminTarget(target);
        }
        setSyncStatus(item.label + " " + item.count + "건 위치로 이동");
      }

      async function renderAdminOrders(ordersOverride) {
        const list = document.getElementById("adminOrderList");
        if (!list) return;
        let orders = ordersOverride || orderHistory;
        if (!ordersOverride && supabaseClient) {
          try {
            orders = await loadAdminOrders({ includeDiagnostic: shouldIncludeDiagnosticAdminOrders() });
          } catch (error) {
            setSyncStatus("운영 주문은 화면 기록 기준으로 표시됨 - DB 불러오기 실패");
          }
        }
        orders = ordersForCurrentAdmin(orders);
        adminRenderedOrders = orders;
        renderAdminModeBanner(orders);
        renderAdminReleaseReadiness(orders);
        renderDeliveryWorkShortcuts(orders);
        const deliveryScope = document.getElementById("adminDeliveryScope");
        if (deliveryScope) {
          deliveryScope.innerHTML = currentAdmin && currentAdmin.role === "delivery"
            ? '<span>담당 범위</span><strong>' + (currentAdmin.areas || []).join("/") + ' · ' + (currentAdmin.riders || []).join(", ") + '</strong>'
            : '<span>담당 범위</span><strong>전체 배송권역</strong>';
        }
        const deliveryOrders = orders.filter((order) => !isOrderCancelled(order));
        const settlementOrders = ordersForSettlementPartnerFilter(deliveryOrders);
        const deliveryFeeTotal = deliveryOrders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);
        document.getElementById("adminTotalOrders").textContent = orders.length + "건";
        document.getElementById("adminDeliveryOrders").textContent = deliveryOrders.length + "건";
        document.getElementById("adminDeliveryFees").textContent = formatKRW(deliveryFeeTotal);
        const warningItems = deliveryWarningOrders(deliveryOrders);
        const delayedWarningItems = warningItems.filter((item) => item.warning.cls === "refund");
        const warningCount = document.getElementById("adminDeliveryWarningCount");
        if (warningCount) warningCount.textContent = warningItems.length + "건" + (delayedWarningItems.length ? " · 지연 " + delayedWarningItems.length + "건" : "");
        const warningList = document.getElementById("adminDeliveryWarningList");
        if (warningList) warningList.innerHTML = renderDeliveryWarnings(warningItems);
        const warningSection = document.getElementById("adminDeliveryWarningSection");
        if (warningSection) warningSection.open = warningItems.length > 0;
        const settlementList = document.getElementById("adminDeliverySettlementList");
        renderSettlementPartnerFilters();
        renderSettlementPeriodFilters();
        renderSettlementExportActions();
        if (settlementList) settlementList.innerHTML = renderDeliverySettlement(settlementOrders);
        const paidSettlementList = document.getElementById("adminPaidSettlementList");
        if (paidSettlementList) paidSettlementList.innerHTML = renderPaidSettlements(settlementOrders);
        const heldSettlementList = document.getElementById("adminHeldSettlementList");
        if (heldSettlementList) heldSettlementList.innerHTML = renderHeldSettlements(settlementOrders);
        renderSettlementViewTabs(settlementOrders);
        renderSettlementFlowCheckLogs();
        const openSettlementSection = document.getElementById("adminOpenSettlementSection");
        if (openSettlementSection && currentAdmin && currentAdmin.role === "total" && shouldOpenSettlementSummary(orders)) openSettlementSection.open = true;
        const settlementRateList = document.getElementById("adminSettlementRateList");
        if (settlementRateList) settlementRateList.innerHTML = renderSettlementRateManager();
        const riderWorkBoard = document.getElementById("adminRiderWorkBoard");
        if (riderWorkBoard) riderWorkBoard.innerHTML = renderRiderWorkBoard(deliveryOrders);
        const riderNicknameList = document.getElementById("adminRiderNicknameList");
        if (riderNicknameList) riderNicknameList.innerHTML = renderRiderNicknameManager();
        const claimableDeliveryOrders = orders.filter((order) => !isOrderCancelled(order) && (order.progressStep || 0) >= 2 && (order.progressStep || 0) < 3 && !isDeliveryOrderClaimed(order));
        const claimableOrdersNode = document.getElementById("adminClaimableOrders");
        if (claimableOrdersNode) claimableOrdersNode.textContent = claimableDeliveryOrders.length + "건";
        const claimableDeliveryCount = document.getElementById("adminClaimableDeliveryCount");
        if (claimableDeliveryCount) claimableDeliveryCount.textContent = claimableDeliveryOrders.length + "건";
        const claimableDeliveryList = document.getElementById("adminClaimableDeliveryList");
        if (claimableDeliveryList) claimableDeliveryList.innerHTML = renderDeliveryClaimOrders(claimableDeliveryOrders);
        const deliveryDashboard = document.getElementById("adminDeliveryDashboardSection");
        if (deliveryDashboard) deliveryDashboard.open = shouldAutoOpenAdminDeliveryDashboard(orders, currentAdmin && currentAdmin.role === "total");
        const pickupDeliveryOrders = orders.filter((order) => !isOrderCancelled(order) && (order.progressStep || 0) >= 2 && (order.progressStep || 0) < 3 && isDeliveryOrderClaimed(order));
        document.getElementById("adminPickupOrders").textContent = pickupDeliveryOrders.length + "건";
        const pickupDeliveryCount = document.getElementById("adminPickupDeliveryCount");
        if (pickupDeliveryCount) pickupDeliveryCount.textContent = pickupDeliveryOrders.length + "건";
        const pickupDeliveryList = document.getElementById("adminPickupDeliveryList");
        if (pickupDeliveryList) {
          pickupDeliveryList.innerHTML = renderDeliveryRiderGroups(pickupDeliveryOrders, "현재 픽업 준비 주문이 없습니다", { label: "픽업 준비", badgeLabel: "배송가능", cls: "ready" }, "배송 시작", 3);
        }
        const activeDeliveryOrders = orders.filter((order) => !isOrderCancelled(order) && (order.progressStep || 0) === 3);
        document.getElementById("adminActiveOrders").textContent = activeDeliveryOrders.length + "건";
        const activeDeliveryCount = document.getElementById("adminActiveDeliveryCount");
        if (activeDeliveryCount) activeDeliveryCount.textContent = activeDeliveryOrders.length + "건";
        const activeDeliveryList = document.getElementById("adminActiveDeliveryList");
        if (activeDeliveryList) {
          activeDeliveryList.innerHTML = renderDeliveryRiderGroups(activeDeliveryOrders, "현재 배송 중인 주문이 없습니다", { label: "배송중", badgeLabel: "배송중", cls: "moving" }, "배송 완료", 4);
        }
        const doneDeliveryOrders = orders.filter((order) => !isOrderCancelled(order) && (order.progressStep || 0) >= 4 && isTodayOrder(order));
        const doneDeliveryCount = document.getElementById("adminDoneDeliveryCount");
        if (doneDeliveryCount) doneDeliveryCount.textContent = doneDeliveryOrders.length + "건";
        const doneDeliveryList = document.getElementById("adminDoneDeliveryList");
        if (doneDeliveryList) {
          doneDeliveryList.innerHTML = renderDeliveryRiderGroups(doneDeliveryOrders, "오늘 배송완료 주문이 없습니다", { label: "배송완료", badgeLabel: "완료", cls: "done" }, "", 0);
        }
        renderAdminHomeBoard(orders, document.getElementById("adminTitle")?.textContent === "총관리자");
        renderAdminSettlement(orders);
        renderAdminStatusFilters(orders);
        renderAdminTodoFocusBanners();
        const searchInput = document.getElementById("adminOrderSearch");
        if (searchInput && searchInput.value !== adminOrderSearchQuery) searchInput.value = adminOrderSearchQuery;
        const visibleOrders = filteredAdminOrders(orders);
        const orderRows = (visibleOrders.length ? visibleOrders : []).map((order) => {
          const step = order.progressStep || 0;
          const cancelled = isOrderCancelled(order);
          const readyForDelivery = !cancelled && step >= 2;
          const storeNames = order.items.map((item) => item.showroom).filter((store, index, stores) => stores.indexOf(store) === index).join(", ");
          const orderTotal = order.total || order.subtotal || 0;
          const actionStatus = cancelled ? "취소 완료" : readyForDelivery ? "배송 처리 가능" : "업체 픽업 준비 대기";
          const primaryStore = storeNames.split(", ")[0] || "업체 미확인";
          const badge = adminOrderBadge(order);
          return {
            store: primaryStore,
            cancelled,
            readyForDelivery,
            refundPending: refundStatusFromOrder(order) === "pending",
            completed: !cancelled && step >= 4,
            total: orderTotal,
            markup: `
            <div class="vendor-product-row admin-order-row">
              <div>
                <strong>${order.id} · ${orderDisplayLabel(order)} <span class="admin-status-badge ${badge.cls}">${badge.label}</span></strong>
                <span>${storeNames || "업체 미확인"} · ${formatKRW(orderTotal)}</span>
                <span>${order.address} · ${assignedRiderLabel(order)}</span>
                <span>${order.paymentMethod || "카카오페이"} · ${actionStatus}</span>
                ${cancelled ? '<span>취소 분류: ' + cancelReasonLabel(order) + '</span>' : ""}
              </div>
              <div class="mini-actions order-detail-action">
                <button type="button" onclick="openAdminOrderDetail('${order.id}')">상세보기</button>
              </div>
            </div>
            `,
          };
        });
        const grouped = orderRows.reduce((groups, row) => {
          groups[row.store] = groups[row.store] || [];
          groups[row.store].push(row);
          return groups;
        }, {});
        list.innerHTML = orderRows.length ? Object.entries(grouped).map(([store, rows], index) => {
          const readyCount = rows.filter((row) => row.readyForDelivery).length;
          const cancelledCount = rows.filter((row) => row.cancelled).length;
          const total = rows.reduce((sum, row) => sum + row.total, 0);
          const risk = adminStoreRiskBadge(store, rows);
          const metrics = adminStoreRiskMetrics(store, rows);
          const reportStatus = metrics.refundWaiting || metrics.pickupWaiting || metrics.cancelRate >= 30 || metrics.stoppedItems
            ? "확인 필요"
            : "현재 운영 상태 정상";
          return `
            <details class="admin-store-group" ${index === 0 ? "open" : ""}>
              <summary>${store} <span class="admin-status-badge admin-store-risk ${risk.cls}">${risk.label}</span> <span>${rows.length}건 · 배송가능 ${readyCount}건 · 취소 ${cancelledCount}건 · ${formatKRW(total)}</span></summary>
              <div class="admin-store-report">
                <div><span>리스크 요약</span><strong>${reportStatus}</strong></div>
                <div><span>픽업대기</span><strong>${metrics.pickupWaiting}건</strong></div>
                <div><span>환불대기</span><strong>${metrics.refundWaiting}건</strong></div>
                <div><span>취소율</span><strong>${metrics.cancelRate}%</strong></div>
                <div><span>품절/숨김</span><strong>${metrics.stoppedItems}개</strong></div>
                <div><span>정산 예정</span><strong>${formatKRW(metrics.payout)}</strong></div>
              </div>
              <div class="admin-store-orders">
                ${rows.map((row) => row.markup).join("")}
              </div>
            </details>
          `;
        }).join("") : '<div class="line-item"><span>' + (adminOrderSearchQuery ? "검색 결과가 없습니다" : "이 조건에 맞는 주문이 없습니다") + '</span><strong>' + (adminOrderSearchQuery ? "검색어 확인" : "필터 변경") + '</strong></div>';
        return orders;
      }

      function adminTodoItems(orders = []) {
        const activeOrders = orders.filter((order) => !isOrderCancelled(order));
        const deliveryOrders = activeOrders.filter((order) => (order.progressStep || 0) >= 2);
        const warningCount = deliveryWarningOrders(deliveryOrders).length;
        const pickupWaitingCount = activeOrders.filter((order) => (order.progressStep || 0) < 2).length;
        const refundPendingCount = orders.filter((order) => refundStatusFromOrder(order) === "pending").length;
        const settlementReady = activeOrders.map(applyStoredSettlementStatus).filter((order) =>
          (order.progressStep || 0) >= 4 &&
          hasDeliveryProof(order, "arrival") &&
          order.settlementStatus !== "confirmed" &&
          order.settlementStatus !== "paid" &&
          order.settlementStatus !== "held"
        ).length;
        const paymentReady = activeOrders.map(applyStoredSettlementStatus).filter((order) => order.settlementStatus === "confirmed").length;
        return [
          {
            key: "pickup_waiting",
            label: "픽업대기",
            count: pickupWaitingCount,
            detail: "업체 픽업 준비 전 주문",
            action: "주문 보기",
            cls: pickupWaitingCount ? "ready" : "done",
          },
          {
            key: "delivery_warning",
            label: "배송주의",
            count: warningCount,
            detail: "지연/인증 누락 주문",
            action: "주의 주문",
            cls: warningCount ? "refund" : "done",
          },
          {
            key: "settlement_pending",
            label: "정산확정",
            count: settlementReady,
            detail: "배송완료 후 확정대기",
            action: "정산 보기",
            cls: settlementReady ? "ready" : "done",
          },
          {
            key: "payment_pending",
            label: "지급대기",
            count: paymentReady,
            detail: "정산확정 후 지급 필요",
            action: "지급 보기",
            cls: paymentReady ? "moving" : "done",
          },
          {
            key: "refund_pending",
            label: "환불대기",
            count: refundPendingCount,
            detail: "취소 후 환불 확인",
            action: "환불 보기",
            cls: refundPendingCount ? "refund" : "done",
          },
        ];
      }

      function renderAdminTodoBoard(orders = []) {
        const items = adminTodoItems(orders);
        const total = items.reduce((sum, item) => sum + item.count, 0);
        return `
          <div class="admin-todo-board">
            <div class="admin-todo-head">
              <strong>오늘 처리할 운영 TODO</strong>
              <span>${total ? total + "건 확인 필요" : "긴급 처리 항목 없음"}</span>
            </div>
            <div class="admin-todo-grid">
              ${items.map((item) => `
                <button type="button" class="admin-todo-card ${item.cls}" data-admin-todo="${item.key}" aria-label="${item.label} ${item.count}건 ${item.count ? item.action : "완료"}" ${item.count ? "" : "disabled"}>
                  <span>${item.label}</span>
                  <strong>${item.count}건</strong>
                  <em>${item.detail}</em>
                  <small>${item.count ? item.action : "완료"}</small>
                </button>
              `).join("")}
            </div>
          </div>
        `;
      }

      function renderAdminHomeBoard(orders = [], totalMode = true) {
        const board = document.getElementById("adminHomeBoard");
        const body = document.getElementById("adminHomeBoardBody");
        if (!board || !body) return;
        if (!totalMode) {
          board.style.display = "none";
          body.innerHTML = "";
          return;
        }
        board.style.display = "";
        const activeOrders = orders.filter((order) => !isOrderCancelled(order));
        const paidOrders = activeOrders.filter((order) => order.paid || (order.progressStep || 0) >= 1);
        const deliveringOrders = activeOrders.filter((order) => (order.progressStep || 0) === 3);
        const refundPendingOrders = orders.filter((order) => refundStatusFromOrder(order) === "pending");
        const todaySales = activeOrders
          .filter((order) => (order.progressStep || 0) >= 4 && isTodayOrder(order))
          .reduce((sum, order) => sum + (order.total || order.subtotal || 0), 0);
        const stats = adminStoreStats(orders);
        const stoppedItems = products.filter((item) => productStatus(item) !== "selling").length;
        const pickupWaiting = activeOrders.filter((order) => (order.progressStep || 0) < 2).length;
        const highCancelStores = stats.filter((item) => item.orderCount >= 2 && item.cancelRate >= 30);
        const alerts = [];
        if (pickupWaiting) alerts.push({ text: "픽업 준비 전 주문 " + pickupWaiting + "건이 있어요. 업체 처리 상태를 확인해 주세요.", good: false });
        if (refundPendingOrders.length) alerts.push({ text: "환불 대기 주문 " + refundPendingOrders.length + "건이 있습니다.", good: false });
        if (stoppedItems) alerts.push({ text: "품절/숨김 상품 " + stoppedItems + "개가 고객에게 노출되지 않고 있어요.", good: false });
        if (todaySales > 0) alerts.push({ text: "오늘 배송완료 총매출은 " + formatKRW(todaySales) + "입니다.", good: true });
        if (highCancelStores.length) alerts.push({ text: "취소율 30% 이상 업체 " + highCancelStores.length + "곳을 확인해 주세요.", good: false });
        if (!alerts.length) alerts.push({ text: "현재 총관리자 알림이 없습니다. 앱 운영 상태가 안정적이에요.", good: true });
        const diagnostic = adminDiagnosticState(orders);
        const retentionLabel = testDataRetentionOption().label;
        const diagnosticNotice = diagnostic.hasTestState ? `
          <div class="admin-test-notice">
            <div>
              <span>운영 확인 전 정리 필요</span>
              <strong>테스트 데이터가 운영 TODO에 섞일 수 있습니다.</strong>
              <p>테스트 주문 ${diagnostic.orders}건 · 테스트 상태 ${diagnostic.statuses}건 · 점검 로그 ${diagnostic.logs}건 · ${retentionLabel} 초과 자동 정리</p>
            </div>
            <button type="button" onclick="clearAdminTestData()">테스트 데이터 정리</button>
          </div>
        ` : "";
        body.innerHTML = `
          ${diagnosticNotice}
          ${renderAdminTodoBoard(orders)}
          <div class="vendor-home-grid">
            <div class="vendor-home-tile"><span>오늘 총주문</span><strong>${orders.filter(isTodayOrder).length}건</strong></div>
            <div class="vendor-home-tile"><span>결제완료</span><strong>${paidOrders.length}건</strong></div>
            <div class="vendor-home-tile"><span>배송중</span><strong>${deliveringOrders.length}건</strong></div>
            <div class="vendor-home-tile"><span>환불대기</span><strong>${refundPendingOrders.length}건</strong></div>
            <div class="vendor-home-tile"><span>오늘 총매출</span><strong>${formatKRW(todaySales)}</strong></div>
            <div class="vendor-home-tile"><span>입점업체</span><strong>${stats.length}곳</strong></div>
          </div>
          <div class="vendor-alert-list">
            ${alerts.map((alert) => '<div class="vendor-alert-row ' + (alert.good ? 'good' : '') + '">' + alert.text + '</div>').join("")}
          </div>
          <div class="mini-actions order-detail-action">
            <button type="button" onclick="createDeliveryFlowTestOrder()">배송 테스트 주문 생성</button>
            <button type="button" onclick="runDeliveryFlowAutoCheck()">배송 플로우 자동 점검</button>
          </div>
        `;
        bindAdminTodoButtons(body);
      }

      function bindAdminTodoButtons(root = document) {
        root.querySelectorAll("[data-admin-todo]").forEach((button) => {
          button.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (button.disabled) return;
            focusAdminTodo(button.getAttribute("data-admin-todo"));
          };
        });
      }

      function setupAdminTodoHandlers() {
        if (setupAdminTodoHandlers.ready) return;
        setupAdminTodoHandlers.ready = true;
        document.addEventListener("click", (event) => {
          const button = findAdminTodoButtonFromEvent(event);
          if (!button || button.disabled) return;
          event.preventDefault();
          focusAdminTodo(button.getAttribute("data-admin-todo"));
        });
      }

      function findAdminTodoButtonFromEvent(event) {
        if (event.target && event.target.closest) {
          const directButton = event.target.closest("[data-admin-todo]");
          if (directButton) return directButton;
        }
        const buttons = Array.from(document.querySelectorAll("[data-admin-todo]"));
        return buttons.find((button) => {
          const rect = button.getBoundingClientRect();
          return (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
          );
        }) || null;
      }

      function adminStoreStats(orders) {
        const stores = {};
        orders.forEach((order) => {
          (order.items || []).forEach((item) => {
            const storeName = item.showroom || "저장된 주문";
            if (!stores[storeName]) {
              stores[storeName] = {
                name: storeName,
                orders: new Set(),
                completedOrders: new Set(),
                cancelledOrders: new Set(),
                grossSales: 0,
                activeSales: 0,
                cancelledSales: 0,
                refundPending: 0,
                refundCompleted: 0,
              };
            }
            const amount = itemSalePrice(item) * (item.quantity || 0);
            const stats = stores[storeName];
            stats.orders.add(order.id);
            if (isOrderCancelled(order)) {
              stats.cancelledOrders.add(order.id);
              stats.cancelledSales += amount;
              if (refundStatusFromOrder(order) === "pending") stats.refundPending += amount;
              if (refundStatusFromOrder(order) === "completed") stats.refundCompleted += amount;
            } else if ((order.progressStep || 0) >= 4) {
              stats.completedOrders.add(order.id);
              stats.grossSales += amount;
            } else {
              stats.activeSales += amount;
            }
          });
        });
        return Object.values(stores).map((stats) => {
          const orderCount = stats.orders.size;
          const cancelRate = orderCount ? Math.round(stats.cancelledOrders.size * 100 / orderCount) : 0;
          const platformFee = Math.round(stats.grossSales * 0.12);
          return {
            ...stats,
            orderCount,
            completedCount: stats.completedOrders.size,
            cancelledCount: stats.cancelledOrders.size,
            cancelRate,
            platformFee,
            payout: Math.max(0, stats.grossSales - platformFee),
          };
        }).sort((a, b) => b.grossSales - a.grossSales);
      }

      function renderAdminSettlement(orders = []) {
        const summary = document.getElementById("adminSettlementSummary");
        const list = document.getElementById("adminSettlementList");
        if (!summary || !list) return;
        const stats = adminStoreStats(orders);
        const grossSales = stats.reduce((sum, item) => sum + item.grossSales, 0);
        const payout = stats.reduce((sum, item) => sum + item.payout, 0);
        const platformFee = stats.reduce((sum, item) => sum + item.platformFee, 0);
        const activeSales = stats.reduce((sum, item) => sum + item.activeSales, 0);
        const cancelledSales = stats.reduce((sum, item) => sum + item.cancelledSales, 0);
        const refundPending = stats.reduce((sum, item) => sum + item.refundPending, 0);
        const refundCompleted = stats.reduce((sum, item) => sum + item.refundCompleted, 0);
        const cancelledCount = orders.filter(isOrderCancelled).length;
        const cancelRate = orders.length ? Math.round(cancelledCount * 100 / orders.length) : 0;
        summary.innerHTML = `
          <div class="line-item"><span>전체 완료 매출</span><strong>${formatKRW(grossSales)}</strong></div>
          <div class="line-item"><span>전체 정산 예정</span><strong>${formatKRW(payout)}</strong></div>
          <div class="line-item"><span>플랫폼 수수료 12%</span><strong>${formatKRW(platformFee)}</strong></div>
          <div class="line-item"><span>진행 중 주문 금액</span><strong>${formatKRW(activeSales)}</strong></div>
          <div class="line-item"><span>취소 금액 / 취소율</span><strong>${formatKRW(cancelledSales)} · ${cancelRate}%</strong></div>
          <div class="line-item"><span>환불 대기</span><strong>${formatKRW(refundPending)}</strong></div>
          <div class="line-item"><span>환불 완료</span><strong>${formatKRW(refundCompleted)}</strong></div>
        `;
        list.innerHTML = stats.length ? stats.map((item) => `
          <div class="vendor-product-row">
            <div>
              <strong>${item.name} · 취소율 ${item.cancelRate}%</strong>
              <span>완료 ${item.completedCount}건 · 취소 ${item.cancelledCount}건 · 진행 ${formatKRW(item.activeSales)}</span>
              <span>환불 대기 ${formatKRW(item.refundPending)} · 환불 완료 ${formatKRW(item.refundCompleted)}</span>
            </div>
            <div>
              <strong>${formatKRW(item.payout)}</strong>
              <span>정산 예정</span>
            </div>
          </div>
        `).join("") : '<div class="line-item"><span>정산할 주문이 없습니다</span><strong>주문 대기</strong></div>';
      }

      function adminFilterMatches(order, filter) {
        const step = order.progressStep || 0;
        const cancelled = isOrderCancelled(order);
        if (filter === "cancelled") return cancelled;
        if (filter === "refund_pending") return refundStatusFromOrder(order) === "pending";
        if (filter.indexOf("cancel_") === 0) return cancelled && (order.cancelReasonCode || "other") === filter.replace("cancel_", "");
        if (filter === "waiting") return !cancelled && step < 2;
        if (filter === "ready") return !cancelled && step >= 2 && step < 3;
        if (filter === "pickup_proof") return !cancelled && isDeliveryOrderClaimed(order) && step >= 2 && step < 3 && !hasDeliveryProof(order, "pickup");
        if (filter === "delivery_start") return !cancelled && isDeliveryOrderClaimed(order) && step >= 2 && step < 3 && hasDeliveryProof(order, "pickup");
        if (filter === "active") return !cancelled && step === 3;
        if (filter === "arrival_proof") return !cancelled && isDeliveryOrderClaimed(order) && step === 3 && !hasDeliveryProof(order, "arrival");
        if (filter === "delivery_finish") return !cancelled && isDeliveryOrderClaimed(order) && step === 3 && hasDeliveryProof(order, "arrival");
        if (filter === "done") return !cancelled && step >= 4;
        return true;
      }

      function adminOrderSearchMatches(order) {
        const query = adminOrderSearchQuery.trim().toLowerCase();
        if (!query) return true;
        const itemText = (order.items || []).map((item) => [item.showroom, item.name, item.size].join(" ")).join(" ");
        const text = [
          order.id,
          order.address,
          order.region,
          order.receiveType,
          order.riderRequest,
          order.paymentMethod,
          assignedRiderLabel(order),
          orderDisplayLabel(order),
          paymentLabelForOrder(order),
          cancelReasonLabel(order),
          order.cancelReason,
          itemText,
        ].filter(Boolean).join(" ").toLowerCase();
        return text.includes(query);
      }

      function filteredAdminOrders(orders) {
        return orders.filter((order) => adminFilterMatches(order, adminStatusFilter) && adminOrderSearchMatches(order));
      }

      function adminOrderBadge(order) {
        const step = order.progressStep || 0;
        if (refundStatusFromOrder(order) === "pending") return { label: "환불대기", cls: "refund" };
        if (isOrderCancelled(order)) return { label: "취소됨", cls: "cancelled" };
        if (step >= 4) return { label: "완료", cls: "done" };
        if (step === 3) return { label: "배송중", cls: "moving" };
        if (step >= 2) return { label: "배송가능", cls: "ready" };
        return { label: "픽업대기", cls: "waiting" };
      }

      function adminStoreRiskMetrics(store, rows) {
        const stoppedItems = products.filter((item) => item.showroom === store && productStatus(item) !== "selling").length;
        const pickupWaiting = rows.filter((row) => !row.cancelled && !row.readyForDelivery).length;
        const refundWaiting = rows.filter((row) => row.refundPending).length;
        const cancelledCount = rows.filter((row) => row.cancelled).length;
        const completedSales = rows.filter((row) => row.completed).reduce((sum, row) => sum + row.total, 0);
        const cancelRate = rows.length ? Math.round(cancelledCount * 100 / rows.length) : 0;
        const payout = Math.max(0, completedSales - Math.round(completedSales * 0.12));
        return { stoppedItems, pickupWaiting, refundWaiting, cancelledCount, cancelRate, payout };
      }

      function adminStoreRiskBadge(store, rows) {
        const metrics = adminStoreRiskMetrics(store, rows);
        if (metrics.refundWaiting) return { label: "환불 확인", cls: "refund" };
        if (metrics.pickupWaiting >= 2) return { label: "픽업 지연", cls: "ready" };
        if (metrics.cancelRate >= 30) return { label: "취소 주의", cls: "cancelled" };
        if (metrics.stoppedItems) return { label: "재고 이슈", cls: "ready" };
        return { label: "정상", cls: "done" };
      }

      function renderAdminStatusFilters(orders) {
        const node = document.getElementById("adminStatusFilters");
        if (!node) return;
        const filters = [
          { key: "all", label: "전체" },
          { key: "waiting", label: "픽업 대기" },
          { key: "ready", label: "배송 가능" },
          { key: "pickup_proof", label: "픽업 인증" },
          { key: "delivery_start", label: "배송 시작" },
          { key: "active", label: "배송 중" },
          { key: "arrival_proof", label: "도착 인증" },
          { key: "delivery_finish", label: "완료 처리" },
          { key: "done", label: "완료" },
          { key: "refund_pending", label: "환불대기" },
          { key: "cancelled", label: "취소" },
          ...cancelReasonOptions.map((item) => ({ key: "cancel_" + item.key, label: item.label })),
        ];
        node.innerHTML = filters.map((filter) => {
          const count = orders.filter((order) => adminFilterMatches(order, filter.key) && adminOrderSearchMatches(order)).length;
          return '<button class="chip ' + (adminStatusFilter === filter.key ? 'active-control' : '') + '" type="button" onclick="setAdminStatusFilter(\'' + filter.key + '\')">' + filter.label + ' ' + count + '</button>';
        }).join("");
      }

      function adminTodoFocusInfo(type) {
        const info = {
          pickup_waiting: {
            area: "orders",
            label: "픽업대기",
            title: "픽업대기 주문만 보는 중",
            detail: "업체가 아직 픽업 준비를 끝내지 않은 주문을 먼저 처리하세요.",
            action: "주문 상태를 확인하고 업체 픽업 준비를 독려",
          },
          refund_pending: {
            area: "orders",
            label: "환불대기",
            title: "환불대기 주문만 보는 중",
            detail: "취소 후 환불 완료 처리가 필요한 주문입니다.",
            action: "결제 취소 여부 확인 후 환불 완료 처리",
          },
          delivery_warning: {
            area: "warning",
            label: "배송주의",
            title: "배송 주의 주문으로 이동함",
            detail: "지연, 픽업 인증 누락, 도착 인증 누락 주문을 우선 확인하세요.",
            action: "배송사와 기사 상태 확인",
          },
          settlement_pending: {
            area: "settlement",
            label: "정산확정",
            title: "정산 확정대기 목록으로 이동함",
            detail: "배송완료와 도착 인증이 끝났지만 아직 정산 확정되지 않은 주문입니다.",
            action: "정산 내역 확인 후 확정 처리",
          },
          payment_pending: {
            area: "settlement",
            label: "지급대기",
            title: "지급대기 정산 목록으로 이동함",
            detail: "정산 확정 후 배송사/기사 지급 처리가 필요한 항목입니다.",
            action: "지급 대상 확인 후 지급 완료 처리",
          },
        };
        return info[type] || null;
      }

      function renderAdminTodoFocusBanner(targetArea) {
        const info = adminTodoFocusInfo(activeAdminTodoFocus);
        if (!info || info.area !== targetArea) return "";
        return `
          <div class="admin-focus-banner">
            <span>TODO · ${info.label}</span>
            <strong>${info.title}</strong>
            <p>${info.detail}</p>
            <small>${info.action}</small>
          </div>
        `;
      }

      function renderAdminTodoFocusBanners() {
        const orderNode = document.getElementById("adminOrderTodoFocus");
        const warningNode = document.getElementById("adminDeliveryWarningTodoFocus");
        const settlementNode = document.getElementById("adminSettlementTodoFocus");
        if (orderNode) orderNode.innerHTML = renderAdminTodoFocusBanner("orders");
        if (warningNode) warningNode.innerHTML = renderAdminTodoFocusBanner("warning");
        if (settlementNode) settlementNode.innerHTML = renderAdminTodoFocusBanner("settlement");
      }

      async function setAdminOrderSearch(value) {
        adminOrderSearchQuery = value || "";
        activeAdminTodoFocus = null;
        await renderAdminOrders();
      }

      async function setAdminStatusFilter(filter) {
        adminStatusFilter = filter;
        activeAdminTodoFocus = null;
        await renderAdminOrders();
      }

      function adminStatusFilterLabel(filter) {
        const labels = {
          all: "전체",
          waiting: "픽업 대기",
          ready: "배송 가능",
          pickup_proof: "픽업 인증 필요",
          delivery_start: "배송 시작 가능",
          active: "배송 중",
          arrival_proof: "도착 인증 필요",
          delivery_finish: "배송완료 가능",
          done: "완료",
          refund_pending: "환불대기",
          cancelled: "취소",
        };
        if (filter && filter.indexOf("cancel_") === 0) {
          const found = cancelReasonOptions.find((item) => item.key === filter.replace("cancel_", ""));
          return found ? found.label : "취소";
        }
        return labels[filter] || "전체";
      }

      async function focusRiderOrders(riderName, filter = "all") {
        activeAdminTodoFocus = null;
        adminOrderSearchQuery = riderName || "";
        adminStatusFilter = filter || "all";
        const searchInput = document.getElementById("adminOrderSearch");
        if (searchInput) searchInput.value = adminOrderSearchQuery;
        const orderControl = document.getElementById("adminOrderControlSection");
        if (orderControl) orderControl.style.display = "";
        await renderAdminOrders();
        if (orderControl && orderControl.scrollIntoView) orderControl.scrollIntoView({ behavior: "smooth", block: "start" });
        highlightAdminTarget(orderControl);
        setSyncStatus((riderName || "기사") + " · " + adminStatusFilterLabel(adminStatusFilter) + " 주문 필터 적용 완료");
      }

      function highlightAdminTarget(target) {
        if (!target) return;
        target.classList.remove("admin-focus-highlight");
        void target.offsetWidth;
        target.classList.add("admin-focus-highlight");
        window.setTimeout(() => target.classList.remove("admin-focus-highlight"), 2200);
      }

      async function focusAdminTodo(type) {
        activeAdminTodoFocus = type;
        const deliveryDashboard = document.getElementById("adminDeliveryDashboardSection");
        const settlementSection = document.getElementById("adminDeliverySettlementList");
        const warningSection = document.getElementById("adminDeliveryWarningSection");
        const orderControl = document.getElementById("adminOrderControlSection");
        adminOrderSearchQuery = "";
        const searchInput = document.getElementById("adminOrderSearch");
        if (searchInput) searchInput.value = "";
        if (type === "pickup_waiting") {
          adminStatusFilter = "waiting";
          if (orderControl) orderControl.style.display = "";
          await renderAdminOrders();
          if (orderControl && orderControl.scrollIntoView) orderControl.scrollIntoView({ behavior: "smooth", block: "start" });
          highlightAdminTarget(orderControl);
          setSyncStatus("TODO · 픽업대기 주문 필터 적용 완료");
          return;
        }
        if (type === "refund_pending") {
          adminStatusFilter = "refund_pending";
          if (orderControl) orderControl.style.display = "";
          await renderAdminOrders();
          if (orderControl && orderControl.scrollIntoView) orderControl.scrollIntoView({ behavior: "smooth", block: "start" });
          highlightAdminTarget(orderControl);
          setSyncStatus("TODO · 환불대기 주문 필터 적용 완료");
          return;
        }
        if (type === "delivery_warning") {
          if (deliveryDashboard) deliveryDashboard.open = true;
          if (warningSection) warningSection.open = true;
          await renderAdminOrders();
          const target = document.getElementById("adminDeliveryWarningSection");
          if (target && target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "start" });
          highlightAdminTarget(target);
          setSyncStatus("TODO · 배송 주의 주문으로 이동 완료");
          return;
        }
        if (type === "settlement_pending" || type === "payment_pending") {
          settlementPartnerFilter = "all";
          settlementPeriodFilter = "all";
          if (deliveryDashboard) deliveryDashboard.open = true;
          await renderAdminOrders();
          const target = document.getElementById("adminDeliverySettlementList");
          if (target && target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "start" });
          highlightAdminTarget(target);
          setSyncStatus(type === "payment_pending" ? "TODO · 지급대기 정산으로 이동 완료" : "TODO · 정산 확정대기 목록으로 이동 완료");
        }
      }

      async function findAdminOrder(orderId) {
        let order = orderHistory.find((item) => item.id === orderId);
        if (supabaseClient) {
          const orders = await loadAdminOrders({ includeDiagnostic: String(orderId || "").startsWith("FN-TEST-") || String(orderId || "").startsWith("FN-SET") }).catch(() => []);
          const dbOrder = orders.find((item) => item.id === orderId);
          if (dbOrder) order = dbOrder;
        }
        if (!order && lastOrder && lastOrder.id === orderId) order = lastOrder;
        return order;
      }

      async function openAdminOrderDetail(orderId) {
        if (!currentAdmin) {
          openAdminLogin();
          return;
        }
        const title = document.getElementById("adminOrderDetailTitle");
        const body = document.getElementById("adminOrderDetailBody");
        const order = await findAdminOrder(orderId);
        if (!body) return;
        if (!order) {
          body.innerHTML = '<div class="line-item"><span>주문을 찾을 수 없습니다</span><strong>확인 필요</strong></div>';
          document.getElementById("adminOrderDetailModal").classList.add("open");
          document.getElementById("adminOrderDetailModal").setAttribute("aria-hidden", "false");
          return;
        }
        if (!canCurrentAdminManageOrder(order)) {
          body.innerHTML = '<div class="line-item"><span>현재 계정에서 볼 수 없는 배송 주문입니다</span><strong>권한 없음</strong></div>';
          document.getElementById("adminOrderDetailModal").classList.add("open");
          document.getElementById("adminOrderDetailModal").setAttribute("aria-hidden", "false");
          return;
        }
        const step = order.progressStep || 0;
        const cancelled = isOrderCancelled(order);
        const readyForDelivery = !cancelled && step >= 2;
        const pickupAuthed = hasDeliveryProof(order, "pickup");
        const arrivalAuthed = hasDeliveryProof(order, "arrival");
        const deliveryActionReady = readyForDelivery && isDeliveryOrderClaimed(order) && canCurrentAdminManageOrder(order) && pickupAuthed;
        const deliveryCompleteReady = !cancelled && step >= 3 && isDeliveryOrderClaimed(order) && canCurrentAdminManageOrder(order) && arrivalAuthed;
        const proofActionReady = readyForDelivery && isDeliveryOrderClaimed(order) && canCurrentAdminManageOrder(order);
        const nextState = deliveryNextActionState(order);
        const pickupSummary = deliveryPickupSummary(order);
        const itemSummary = deliveryItemSummary(order);
        const itemCount = deliveryItemCount(order);
        const settlementSummary = settlementSummaryForOrder(order);
        const currentPartner = deliveryPartnerForOrder(order);
        const currentRiderSelectId = "detailCurrentRider-" + order.id;
        const dongtanDetailSelectId = "detailDongtanRider-" + order.id;
        const osanDetailSelectId = "detailOsanRider-" + order.id;
        const topClaimSelectId = "topClaimRider-" + order.id;
        const topDongtanSelectId = "topDongtanRider-" + order.id;
        const topOsanSelectId = "topOsanRider-" + order.id;
        const assignmentActions = currentAdmin.role === "total" ? `
            <div class="order-detail-block">
              <strong>지금배송 배정 운영</strong>
              <span>현재 배정: ${order.deliveryPartnerName || "오픈콜 대기"} · ${assignedRiderLabel(order)}</span>
              <span>총관리자는 배송사 사정에 따라 회수하거나 다른 센터로 변경할 수 있습니다.</span>
            </div>
            <div class="mini-actions">
              <select id="${dongtanDetailSelectId}">${riderOptionsForPartner("지금배송 동탄센터", order.riderName)}</select>
              <button type="button" ${!cancelled && readyForDelivery ? "" : "disabled"} onclick="adminAssignDeliveryFromDetail('${order.id}', '지금배송 동탄센터', selectedValue('${dongtanDetailSelectId}'))">동탄센터 배정</button>
              <select id="${osanDetailSelectId}">${riderOptionsForPartner("지금배송 오산센터", order.riderName)}</select>
              <button type="button" ${!cancelled && readyForDelivery ? "" : "disabled"} onclick="adminAssignDeliveryFromDetail('${order.id}', '지금배송 오산센터', selectedValue('${osanDetailSelectId}'))">오산센터 배정</button>
              ${currentPartner && order.deliveryPartnerName ? `<select id="${currentRiderSelectId}">${riderOptionsForPartner(currentPartner.name, order.riderName)}</select><button type="button" ${!cancelled ? "" : "disabled"} onclick="adminChangeRiderFromDetail('${order.id}', selectedValue('${currentRiderSelectId}'))">담당 기사 변경</button>` : ""}
              <button type="button" ${!cancelled && isDeliveryOrderClaimed(order) ? "" : "disabled"} onclick="adminReleaseDeliveryFromDetail('${order.id}')">다시 오픈콜</button>
              <button class="danger" type="button" ${!cancelled && isDeliveryOrderClaimed(order) ? "" : "disabled"} onclick="adminReleaseDeliveryFromDetail('${order.id}')">배정 회수</button>
            </div>
        ` : "";
        const primaryActionMarkup = (() => {
          if (cancelled) return '<div class="rider-primary-actions"><button type="button" disabled>취소된 주문</button></div>';
          if (!readyForDelivery) return '<div class="rider-primary-actions"><button type="button" disabled>업체 픽업 준비 대기</button></div>';
          if (!isDeliveryOrderClaimed(order)) {
            if (currentAdmin.role === "total") {
              return `
                <div class="rider-primary-actions">
                  <select id="${topDongtanSelectId}">${riderOptionsForPartner("지금배송 동탄센터")}</select>
                  <button type="button" onclick="adminAssignDeliveryFromDetail('${order.id}', '지금배송 동탄센터', selectedValue('${topDongtanSelectId}'))">동탄센터 배정</button>
                  <select id="${topOsanSelectId}">${riderOptionsForPartner("지금배송 오산센터")}</select>
                  <button type="button" onclick="adminAssignDeliveryFromDetail('${order.id}', '지금배송 오산센터', selectedValue('${topOsanSelectId}'))">오산센터 배정</button>
                </div>
              `;
            }
            if (currentAdmin.role === "delivery" && canCurrentDeliveryClaimOrder(order)) {
              return `
                <div class="rider-primary-actions">
                  <select id="${topClaimSelectId}">${riderOptionsForPartner(currentAdmin.name)}</select>
                  <button type="button" onclick="claimDeliveryOrderFromDetail('${order.id}', selectedValue('${topClaimSelectId}'))">내가 배정받기</button>
                </div>
              `;
            }
            return '<div class="rider-primary-actions"><button type="button" disabled>배송사 배정 필요</button></div>';
          }
          if (!pickupAuthed) {
            return '<div class="rider-primary-actions"><button type="button" ' + (proofActionReady ? "" : "disabled") + ' onclick="startDeliveryProofCapture(\'' + order.id + '\', \'pickup\')">사진 찍고 픽업 인증</button></div>';
          }
          if (step < 3) {
            return '<div class="rider-primary-actions"><button type="button" ' + (deliveryActionReady ? "" : "disabled") + ' onclick="adminAdvanceOrderFromDetail(\'' + order.id + '\', 3)">배송 시작 처리</button></div>';
          }
          if (!arrivalAuthed) {
            return '<div class="rider-primary-actions"><button type="button" ' + (proofActionReady ? "" : "disabled") + ' onclick="startDeliveryProofCapture(\'' + order.id + '\', \'arrival\')">사진 찍고 도착 인증</button></div>';
          }
          if (step < 4) {
            return '<div class="rider-primary-actions"><button type="button" ' + (deliveryCompleteReady ? "" : "disabled") + ' onclick="adminAdvanceOrderFromDetail(\'' + order.id + '\', 4)">배송완료 처리</button></div>';
          }
          return '<div class="rider-primary-actions"><button type="button" disabled>배송완료됨</button></div>';
        })();
        const groupedItems = (order.items || []).reduce((groups, item) => {
          const store = item.showroom || "업체 미확인";
          groups[store] = groups[store] || [];
          groups[store].push(item);
          return groups;
        }, {});
        if (title) title.textContent = order.id;
        body.innerHTML = `
          <div class="order-detail-grid">
            <div class="rider-task-panel">
              <div class="rider-task-head">
                <span class="admin-status-badge ${nextState.cls}">${nextState.label}</span>
                <strong>${order.id}</strong>
                <p>${nextState.detail}</p>
              </div>
              <div class="rider-task-grid">
                <div>
                  <span>픽업지</span>
                  <strong>${pickupSummary}</strong>
                </div>
                <div>
                  <span>도착지</span>
                  <strong>${order.address || "도착지 확인 필요"}</strong>
                </div>
                <div>
                  <span>상품</span>
                  <strong>${itemCount}개 · ${itemSummary}</strong>
                </div>
                <div>
                  <span>고객 요청</span>
                  <strong>${order.receiveType || "문앞 수령"} · ${order.riderRequest || "요청 없음"}</strong>
                </div>
                <div>
                  <span>담당</span>
                  <strong>${order.deliveryPartnerName || "오픈콜 대기"} · ${assignedRiderLabel(order)}</strong>
                </div>
                <div>
                  <span>인증</span>
                  <strong>픽업 ${pickupAuthed ? "완료" : "필요"} · 도착 ${arrivalAuthed ? "완료" : "필요"}</strong>
                </div>
                <div>
                  <span>정산 상태</span>
                  <strong>${settlementSummary.status} · 배송비 ${formatKRW(order.deliveryFee || 0)}</strong>
                </div>
                <div>
                  <span>기사 정산</span>
                  <strong>${settlementSummary.ready ? formatKRW(settlementSummary.payout) : "예정 " + formatKRW(settlementSummary.payout)} · ${settlementSummary.rate}%</strong>
                </div>
              </div>
              ${primaryActionMarkup}
            </div>
            <div class="order-detail-block">
              <strong>${orderDisplayLabel(order)} · ${formatKRW(order.total || order.subtotal || 0)}</strong>
              <span>운영 상태: ${cancelled ? "취소 완료" : readyForDelivery ? "배송 처리 가능" : "업체 픽업 준비 대기"}</span>
              <span>다음 작업: ${nextState.label} · ${nextState.detail}</span>
              <span>배송 담당: ${assignedRiderLabel(order)}</span>
            </div>
            <div class="order-detail-block">
              <strong>업체별 상품 구성</strong>
              ${Object.entries(groupedItems).map(([store, items]) => '<span>' + store + ' · ' + items.map((item) => item.name + ' ' + (item.size || 'One size') + ' x ' + (item.quantity || 0)).join(', ') + '</span>').join("")}
            </div>
            <div class="order-detail-block">
              <strong>수령 · 결제 정보</strong>
              <span>${order.address}</span>
              <span>${order.receiveType || "문앞 수령"} · 요청: ${order.riderRequest || "없음"}</span>
              <span>${order.paymentMethod || "카카오페이"} · ${paymentLabelForOrder(order)}</span>
            </div>
            <div class="order-detail-block">
              <strong>픽업 · 도착 인증</strong>
              <span>픽업 인증: ${deliveryProofLabel(order, "pickup")}</span>
              <span>도착 인증: ${deliveryProofLabel(order, "arrival")}</span>
              ${renderDeliveryProofPhoto(deliveryProofPhoto(order, "pickup"), "픽업 인증 사진")}
              ${renderDeliveryProofPhoto(deliveryProofPhoto(order, "arrival"), "도착 인증 사진")}
            </div>
            <div class="order-detail-block">
              <strong>정산 처리 이력</strong>
              <span>확정, 지급, 보류, 마감 기록을 시간순으로 확인합니다.</span>
              ${renderSettlementAuditTrail(order)}
            </div>
            <div class="mini-actions">
              <button type="button" ${proofActionReady && !pickupAuthed ? "" : "disabled"} onclick="startDeliveryProofCapture('${order.id}', 'pickup')">${pickupAuthed ? "픽업 인증됨" : "사진 픽업 인증"}</button>
              <button type="button" ${proofActionReady && step >= 3 && !arrivalAuthed ? "" : "disabled"} onclick="startDeliveryProofCapture('${order.id}', 'arrival')">${arrivalAuthed ? "도착 인증됨" : step < 3 ? "배송중 이후 가능" : "사진 도착 인증"}</button>
            </div>
            ${cancelled ? `
              <div class="order-detail-block">
                <strong>취소 · 환불</strong>
                <span>취소 분류: ${cancelReasonLabel(order)}</span>
                <span>취소 사유: ${order.cancelReason || "사유 미입력"}</span>
                <span>환불 상태: ${paymentLabelForOrder(order)}</span>
              </div>
            ` : ""}
            <div class="mini-actions">
              <button type="button" ${deliveryActionReady ? "" : "disabled"} onclick="adminAdvanceOrderFromDetail('${order.id}', 3)">${cancelled ? "취소됨" : !readyForDelivery ? "픽업 대기" : !isDeliveryOrderClaimed(order) ? "배정 대기" : !pickupAuthed ? "픽업 인증 필요" : step >= 3 ? "배송 중 처리됨" : "배송 중"}</button>
              <button type="button" ${deliveryCompleteReady ? "" : "disabled"} onclick="adminAdvanceOrderFromDetail('${order.id}', 4)">${cancelled ? "취소됨" : step < 3 ? "배송 대기" : !arrivalAuthed ? "도착 인증 필요" : step >= 4 ? "배송 완료됨" : "배송 완료"}</button>
              <button class="danger" type="button" ${currentAdmin.role === "total" && canCancelOrder(order) ? "" : "disabled"} onclick="cancelAdminOrderFromDetail('${order.id}')">${cancelled ? "취소됨" : currentAdmin.role === "total" ? "주문 취소" : "총관리자 전용"}</button>
              <button type="button" ${currentAdmin.role === "total" && canCompleteRefund(order) ? "" : "disabled"} onclick="completeRefundFromDetail('${order.id}')">${currentAdmin.role === "total" && canCompleteRefund(order) ? "환불 완료" : currentAdmin.role === "total" ? paymentLabelForOrder(order) : "총관리자 전용"}</button>
            </div>
            ${assignmentActions}
            <div class="order-detail-block">
              <strong>배송 운영 로그</strong>
              <span>배정, 회수, 배송 상태 변경 이력이 시간순으로 기록됩니다.</span>
            </div>
            <div class="admin-store-orders">
              ${renderDeliveryLogs(order)}
            </div>
          </div>
        `;
        document.getElementById("adminOrderDetailModal").classList.add("open");
        document.getElementById("adminOrderDetailModal").setAttribute("aria-hidden", "false");
      }

      function closeAdminOrderDetail() {
        document.getElementById("adminOrderDetailModal").classList.remove("open");
        document.getElementById("adminOrderDetailModal").setAttribute("aria-hidden", "true");
      }

      async function adminAdvanceOrderFromDetail(orderId, step) {
        await adminAdvanceOrder(orderId, step);
        await openAdminOrderDetail(orderId);
      }

      async function confirmDeliveryProof(orderId, type, options = {}) {
        if (!currentAdmin) {
          openAdminLogin();
          return;
        }
        const order = await findAdminOrder(orderId);
        if (!order) {
          setSyncStatus("인증할 주문을 찾을 수 없습니다");
          return;
        }
        if (!canCurrentAdminManageOrder(order)) {
          setSyncStatus("현재 계정에서 인증할 수 없는 주문입니다");
          return;
        }
        if (isOrderCancelled(order)) {
          setSyncStatus("취소된 주문은 인증할 수 없습니다");
          return;
        }
        if (!isDeliveryOrderClaimed(order)) {
          setSyncStatus("배송사가 배정된 주문만 인증할 수 있습니다");
          return;
        }
        if ((order.progressStep || 0) < 2) {
          setSyncStatus("픽업 준비 이후 주문만 인증할 수 있습니다");
          return;
        }
        if (type === "arrival" && (order.progressStep || 0) < 3) {
          setSyncStatus("배송중 처리 후 도착 인증이 가능합니다");
          return;
        }
        const field = type === "pickup" ? "pickupConfirmedAt" : "arrivalConfirmedAt";
        if (order[field]) {
          setSyncStatus((type === "pickup" ? "픽업" : "도착") + " 인증은 이미 완료되었습니다");
          return;
        }
        order[field] = new Date().toISOString();
        const photoField = type === "pickup" ? "pickupProofPhoto" : "arrivalProofPhoto";
        if (options.photo) order[photoField] = options.photo;
        addDeliveryLog(
          order,
          type === "pickup" ? "픽업 인증" : "도착 인증",
          (order.deliveryPartnerName || "지금배송") + " · " + assignedRiderLabel(order) + (options.photo ? " · 사진 포함 · " + deliveryProofPhotoStorageLabel(options.photo) : ""),
          { photo: options.photo || null }
        );
        await persistDeliveryAssignment(order, (type === "pickup" ? "픽업 인증 완료" : "도착 인증 완료") + " - " + order.id);
      }

      async function confirmDeliveryProofFromDetail(orderId, type) {
        await confirmDeliveryProof(orderId, type);
        await openAdminOrderDetail(orderId);
      }

      async function claimDeliveryOrder(orderId, riderName = "") {
        if (!currentAdmin || currentAdmin.role !== "delivery") {
          pendingAdminMode = "delivery";
          openAdminLogin();
          return;
        }
        const order = await findAdminOrder(orderId);
        if (!order) {
          setSyncStatus("배정받을 주문을 찾을 수 없습니다");
          return;
        }
        if (isOrderCancelled(order)) {
          setSyncStatus("취소된 주문은 배정받을 수 없습니다");
          return;
        }
        if ((order.progressStep || 0) < 2) {
          setSyncStatus("업체 픽업 준비가 완료된 주문만 배정받을 수 있습니다");
          return;
        }
        if (!isDeliveryOrderClaimed(order) && !canCurrentDeliveryClaimOrder(order)) {
          setSyncStatus("현재 배송사 권역의 주문만 배정받을 수 있습니다");
          await renderAdminOrders(orderHistory);
          return;
        }
        if (isDeliveryOrderClaimed(order) && order.deliveryPartnerName !== currentAdmin.name) {
          setSyncStatus(order.deliveryPartnerName + "에서 이미 배정받은 주문입니다");
          await renderAdminOrders(orderHistory);
          return;
        }
        order.deliveryPartnerName = currentAdmin.name;
        order.riderName = riderName || (currentAdmin.riders && currentAdmin.riders[0]) || "지금배송 라이더";
        addDeliveryLog(order, "오픈콜 배정", currentAdmin.name + "에서 " + order.riderName + " 기사로 직접 배정");
        await persistDeliveryAssignment(order, currentAdmin.name + " 배정 완료 - " + order.id);
      }

      async function claimDeliveryOrderFromDetail(orderId, riderName = "") {
        await claimDeliveryOrder(orderId, riderName);
        await openAdminOrderDetail(orderId);
      }

      function applyDeliveryAssignment(order, partnerName, riderName = "") {
        const partner = deliveryPartners.find((item) => item.name === partnerName);
        if (!partner) return false;
        order.deliveryPartnerName = partner.name;
        const nicknames = riderNicknamesForPartner(partner);
        order.riderName = riderName || nicknames[0] || "지금배송 라이더";
        return true;
      }

      async function persistDeliveryAssignment(order, message, options = {}) {
        lastOrder = order;
        saveOrderStatusOverride(order, options);
        saveOrderHistory(order);
        try {
          await syncOrderStatusToSupabase(order);
          const refreshedOrders = supabaseClient ? await loadAdminOrders({ includeDiagnostic: isDiagnosticOrder(order) }) : orderHistory;
          await renderAdminOrders(refreshedOrders);
          renderTracking();
          if (document.getElementById("ordersModal").classList.contains("open")) renderOrders();
          if (document.getElementById("myModal").classList.contains("open")) renderMyPage();
          setSyncStatus(message + " - Supabase 반영 완료");
        } catch (error) {
          await renderAdminOrders(orderHistory);
          renderTracking();
          if (document.getElementById("ordersModal").classList.contains("open")) renderOrders();
          if (document.getElementById("myModal").classList.contains("open")) renderMyPage();
          setSyncStatus(message + " - 화면 반영, DB 업데이트 권한 확인 필요");
        }
      }

      async function adminAssignDelivery(orderId, partnerName, riderName = "") {
        if (!currentAdmin || currentAdmin.role !== "total") {
          setSyncStatus("배정 변경은 총관리자 권한에서 처리할 수 있습니다");
          return;
        }
        const order = await findAdminOrder(orderId);
        if (!order) {
          setSyncStatus("배정 변경할 주문을 찾을 수 없습니다");
          return;
        }
        if (isOrderCancelled(order)) {
          setSyncStatus("취소된 주문은 배송사를 변경할 수 없습니다");
          return;
        }
        if ((order.progressStep || 0) < 2) {
          setSyncStatus("픽업 준비 이후 주문만 배송사를 배정할 수 있습니다");
          return;
        }
        if (!applyDeliveryAssignment(order, partnerName, riderName)) {
          setSyncStatus("배송 센터를 찾을 수 없습니다");
          return;
        }
        addDeliveryLog(order, "센터 배정 변경", partnerName + " · " + assignedRiderLabel(order) + " 기사로 총관리자 배정");
        await persistDeliveryAssignment(order, partnerName + " 배정 완료 - " + order.id);
      }

      async function adminReleaseDelivery(orderId) {
        if (!currentAdmin || currentAdmin.role !== "total") {
          setSyncStatus("배정 회수는 총관리자 권한에서 처리할 수 있습니다");
          return;
        }
        const order = await findAdminOrder(orderId);
        if (!order) {
          setSyncStatus("배정 회수할 주문을 찾을 수 없습니다");
          return;
        }
        if (isOrderCancelled(order)) {
          setSyncStatus("취소된 주문은 배정 회수할 수 없습니다");
          return;
        }
        if ((order.progressStep || 0) >= 4) {
          setSyncStatus("배송 완료 주문은 배정 회수할 수 없습니다");
          return;
        }
        order.deliveryPartnerName = "";
        order.riderName = "";
        order.pickupConfirmedAt = "";
        order.arrivalConfirmedAt = "";
        addDeliveryLog(order, "배정 회수", "총관리자가 배정을 회수하고 다시 오픈콜로 전환");
        if ((order.progressStep || 0) > 2) {
          order.progressStep = 2;
          order.statusCode = statusFromStep(2);
          order.statusLabel = labelFromStep(2);
        }
        await persistDeliveryAssignment(order, "배정 회수 및 오픈콜 전환 완료 - " + order.id, { allowStepBack: true });
      }

      async function adminChangeRider(orderId, riderName) {
        if (!currentAdmin || currentAdmin.role !== "total") {
          setSyncStatus("담당 기사 변경은 총관리자 권한에서 처리할 수 있습니다");
          return;
        }
        const order = await findAdminOrder(orderId);
        if (!order) {
          setSyncStatus("기사 변경할 주문을 찾을 수 없습니다");
          return;
        }
        if (!isDeliveryOrderClaimed(order)) {
          setSyncStatus("배송사가 배정된 주문만 담당 기사를 변경할 수 있습니다");
          return;
        }
        if (isOrderCancelled(order)) {
          setSyncStatus("취소된 주문은 담당 기사를 변경할 수 없습니다");
          return;
        }
        const nextRider = (riderName || "").trim();
        if (!nextRider || nextRider === order.riderName) {
          setSyncStatus("변경할 기사명이 동일합니다");
          return;
        }
        const previousRider = assignedRiderLabel(order);
        order.riderName = nextRider;
        addDeliveryLog(order, "담당 기사 변경", previousRider + " → " + nextRider);
        await persistDeliveryAssignment(order, "담당 기사 변경 완료 - " + order.id);
      }

      async function adminAssignDeliveryFromDetail(orderId, partnerName, riderName = "") {
        await adminAssignDelivery(orderId, partnerName, riderName);
        await openAdminOrderDetail(orderId);
      }

      async function adminReleaseDeliveryFromDetail(orderId) {
        await adminReleaseDelivery(orderId);
        await openAdminOrderDetail(orderId);
      }

      async function adminChangeRiderFromDetail(orderId, riderName) {
        await adminChangeRider(orderId, riderName);
        await openAdminOrderDetail(orderId);
      }

      async function cancelAdminOrderFromDetail(orderId) {
        await cancelOrder(orderId, "admin");
        await openAdminOrderDetail(orderId);
      }

      async function completeRefundFromDetail(orderId) {
        await completeRefund(orderId);
        await openAdminOrderDetail(orderId);
      }

      async function adminAdvanceOrder(orderId, step) {
        if (!currentAdmin) {
          openAdminLogin();
          return;
        }
        let order = orderHistory.find((item) => item.id === orderId);
        if (supabaseClient) {
          const orders = await loadAdminOrders({ includeDiagnostic: String(orderId || "").startsWith("FN-TEST-") || String(orderId || "").startsWith("FN-SET") }).catch(() => []);
          const dbOrder = orders.find((item) => item.id === orderId);
          if (dbOrder) {
            order = { ...dbOrder, progressStep: Math.max(order ? (order.progressStep || 0) : 0, dbOrder.progressStep || 0) };
          }
        }
        if (!order) {
          setSyncStatus("운영 주문을 찾을 수 없습니다");
          return;
        }
        if (!canCurrentAdminManageOrder(order)) {
          setSyncStatus("현재 배송사 계정에서는 처리할 수 없는 주문입니다");
          return;
        }
        if (currentAdmin.role === "delivery" && step >= 3 && !isDeliveryOrderClaimed(order)) {
          setSyncStatus("배송사 배정 후 배송 진행이 가능합니다");
          renderAdminOrders(orderHistory);
          return;
        }
        if (step >= 3 && !isDeliveryOrderClaimed(order)) {
          setSyncStatus("먼저 배송사가 주문을 배정받아야 배송을 시작할 수 있습니다");
          renderAdminOrders(orderHistory);
          return;
        }
        if (step >= 3 && !hasDeliveryProof(order, "pickup")) {
          setSyncStatus("픽업 인증 후 배송중 처리가 가능합니다");
          renderAdminOrders(orderHistory);
          return;
        }
        if (step >= 4 && !hasDeliveryProof(order, "arrival")) {
          setSyncStatus("도착 인증 후 배송완료 처리가 가능합니다");
          renderAdminOrders(orderHistory);
          return;
        }
        if (isOrderCancelled(order)) {
          setSyncStatus("취소된 주문은 배송 처리할 수 없습니다");
          renderAdminOrders(orderHistory);
          return;
        }
        if (step >= 3 && (order.progressStep || 0) < 2) {
          setSyncStatus("업체가 픽업 준비를 완료한 주문만 배송 처리할 수 있습니다");
          renderAdminOrders(orderHistory);
          return;
        }
        lastOrder = order;
        const previousStep = lastOrder.progressStep || 0;
        lastOrder.progressStep = Math.max(previousStep, step);
        lastOrder.statusCode = statusFromStep(lastOrder.progressStep);
        lastOrder.statusLabel = labelFromStep(lastOrder.progressStep);
        lastOrder.paymentLabel = paymentLabelForOrder(lastOrder);
        if (lastOrder.progressStep > previousStep) {
          addDeliveryLog(lastOrder, step >= 4 ? "배송 완료" : "배송중 처리", (lastOrder.deliveryPartnerName || "지금배송") + " · " + assignedRiderLabel(lastOrder));
        }
        saveOrderStatusOverride(lastOrder);
        saveOrderHistory(lastOrder);
        renderAdminOrders(orderHistory);
        renderTracking();
        if (document.getElementById("ordersModal").classList.contains("open")) renderOrders();
        if (document.getElementById("myModal").classList.contains("open")) renderMyPage();
        try {
          await syncOrderStatusToSupabase(lastOrder);
          setSyncStatus((step >= 4 ? "배송 완료" : "배송 중") + " - Supabase 주문 상태 업데이트 완료");
        } catch (error) {
          setSyncStatus((step >= 4 ? "배송 완료" : "배송 중") + " - 화면에 먼저 반영됨, DB 업데이트 권한 확인 필요");
        }
      }

      async function toggleStore(name) {
        if (currentVendor && name !== currentVendor.store) {
          setSyncStatus("로그인한 매장만 관리할 수 있습니다");
          return;
        }
        const store = storeByName(name);
        if (!store) return;
        store.pickup = !store.pickup;
        renderPartnerStores();
        renderProducts();
        try {
          await syncStoreToSupabase(store);
          setSyncStatus("매장 상태가 Supabase에 저장됨");
        } catch (error) {
          setSyncStatus("매장 상태는 화면에만 반영됨 - DB 저장 실패");
        }
      }

      async function updateStorePrep(name, value) {
        if (currentVendor && name !== currentVendor.store) {
          setSyncStatus("로그인한 매장만 관리할 수 있습니다");
          return;
        }
        const store = storeByName(name);
        if (!store) return;
        store.prep = Math.max(0, Number(value) || 0);
        renderPartnerStores();
        renderProducts();
        try {
          await syncStoreToSupabase(store);
          setSyncStatus("매장 준비시간이 Supabase에 저장됨");
        } catch (error) {
          setSyncStatus("준비시간은 화면에만 반영됨 - DB 저장 실패");
        }
      }

      async function updateStoreArea(name, value) {
        if (currentVendor && name !== currentVendor.store) {
          setSyncStatus("로그인한 매장만 관리할 수 있습니다");
          return;
        }
        const store = storeByName(name);
        if (!store) return;
        store.area = value.trim() || store.area;
        renderPartnerStores();
        try {
          await syncStoreToSupabase(store);
          setSyncStatus("매장 지역이 Supabase에 저장됨");
        } catch (error) {
          setSyncStatus("매장 지역은 화면에만 반영됨 - DB 저장 실패");
        }
      }

      async function syncStoreToSupabase(store) {
        if (!supabaseClient) return;
        const payload = {
          slug: store.slug || slugify(store.name),
          name: store.name,
          area: store.area,
          address: store.address || "",
          average_delivery_minutes: 40,
          prep_minutes: store.prep,
          pickup_enabled: store.pickup,
          is_open: store.open,
        };
        const result = await supabaseClient.from("showrooms").upsert(payload, { onConflict: "slug" }).select("id").single();
        if (result.error) throw result.error;
        store.dbId = result.data.id;
        store.slug = payload.slug;
        return store.dbId;
      }

      async function syncProductToSupabase(item) {
        if (!supabaseClient) return;
        const store = storeByName(item.showroom);
        const showroomId = store ? (store.dbId || await syncStoreToSupabase(store)) : null;
        const imageUrl = await uploadProductImage(item);
        const payload = {
          showroom_id: showroomId,
          slug: item.key,
          name: item.name,
          price: item.price,
          category: item.category || "상의",
          meta: item.note,
          discount_rate: normalizedDiscount(item.discountRate),
          material: item.material,
          fit: item.fit,
          size_label: item.size,
          description: item.note,
          match_score: item.match,
          stock_quantity: item.stock,
          delivery_minutes: item.minutes,
          visual_key: item.visual,
          image_url: imageUrl || item.image || null,
        };
        const result = await supabaseClient.from("products").upsert(payload, { onConflict: "slug" }).select("id").single();
        if (result.error) throw result.error;
        item.dbId = result.data.id;
      }

      function orderStockGroups(order) {
        return (order.items || []).reduce((groups, item) => {
          if (!item || !item.key) return groups;
          const size = item.size || "FREE";
          const groupKey = item.key + "|" + size;
          groups[groupKey] = groups[groupKey] || { key: item.key, name: item.name, size, quantity: 0 };
          groups[groupKey].quantity += item.quantity || 0;
          return groups;
        }, {});
      }

      function reserveOrderStock(order) {
        if (!order || order.stockReserved) return true;
        const groups = orderStockGroups(order);
        const shortages = Object.values(groups).filter((group) => {
          const product = products.find((item) => item.key === group.key);
          return !product || sizeStock(product, group.size) < group.quantity;
        });
        if (shortages.length) {
          setSyncStatus("재고가 부족합니다: " + shortages.map((item) => item.name + " " + item.size).join(", "));
          return false;
        }
        Object.values(groups).forEach((group) => {
          const product = products.find((item) => item.key === group.key);
          ensureSizeStock(product);
          product.sizeStock[group.size] = Math.max(0, sizeStock(product, group.size) - group.quantity);
          product.stock = totalSizeStock(product);
        });
        order.stockReserved = true;
        order.stockRestored = false;
        return true;
      }

      function restoreOrderStock(order) {
        if (!order || !order.stockReserved || order.stockRestored) return false;
        const groups = orderStockGroups(order);
        Object.values(groups).forEach((group) => {
          const product = products.find((item) => item.key === group.key);
          if (product) {
            ensureSizeStock(product);
            product.sizeStock[group.size] = sizeStock(product, group.size) + group.quantity;
            product.stock = totalSizeStock(product);
          }
        });
        order.stockRestored = true;
        return true;
      }

      async function syncOrderStockProducts(order) {
        if (!supabaseClient || !order) return;
        const synced = new Set();
        for (const group of Object.values(orderStockGroups(order))) {
          if (synced.has(group.key)) continue;
          synced.add(group.key);
          const product = products.find((item) => item.key === group.key);
          if (product) await syncProductToSupabase(product);
        }
      }

      async function deleteProductFromSupabase(item) {
        if (!supabaseClient || !item) return;
        if (item.dbId) {
          const result = await supabaseClient.from("products").delete().eq("id", item.dbId);
          if (result.error) throw result.error;
          return;
        }
        const result = await supabaseClient.from("products").delete().eq("slug", item.key);
        if (result.error) throw result.error;
      }

      async function syncLookToSupabase(look) {
        if (!supabaseClient || !look) return;
        const store = storeByName(look.store);
        const showroomId = store ? (store.dbId || await syncStoreToSupabase(store)) : null;
        const setResult = await supabaseClient.from("look_sets").upsert({
          showroom_id: showroomId,
          slug: look.key,
          title: look.title,
          description: look.note || "",
          discount_rate: normalizedDiscount(look.discountRate),
          is_active: true,
        }, { onConflict: "slug" }).select("id").single();
        if (setResult.error) throw setResult.error;
        look.dbId = setResult.data.id;
        const deleteResult = await supabaseClient.from("look_set_items").delete().eq("look_set_id", look.dbId);
        if (deleteResult.error) throw deleteResult.error;
        const rows = [];
        for (const [index, key] of look.keys.entries()) {
          const item = products.find((product) => product.key === key);
          if (!item) continue;
          rows.push({
            look_set_id: look.dbId,
            product_id: await ensureProductInSupabase(item),
            product_slug: item.key,
            display_order: index,
          });
        }
        if (rows.length) {
          const itemResult = await supabaseClient.from("look_set_items").insert(rows);
          if (itemResult.error) throw itemResult.error;
        }
      }

      async function deleteLookFromSupabase(look) {
        if (!supabaseClient || !look) return;
        const result = look.dbId
          ? await supabaseClient.from("look_sets").delete().eq("id", look.dbId)
          : await supabaseClient.from("look_sets").delete().eq("slug", look.key);
        if (result.error) throw result.error;
      }

      async function ensureProductInSupabase(item) {
        if (!supabaseClient) return null;
        if (item.dbId) return item.dbId;
        await syncProductToSupabase(item);
        return item.dbId || null;
      }

      async function syncOrderToSupabase(order) {
        if (!supabaseClient || !order || !order.items.length) return;
        const firstStore = storeByName(order.items[0].showroom);
        const showroomId = firstStore ? (firstStore.dbId || await syncStoreToSupabase(firstStore)) : null;
        const orderResult = await supabaseClient.from("orders").upsert({
          order_code: order.id,
          user_id: customerId(),
          showroom_id: showroomId,
          status: order.statusCode || "reserved",
          item_total: order.subtotal,
          delivery_fee: order.deliveryFee,
          total: order.total,
          eta_minutes: order.fastest,
          destination_label: order.region,
          request_note: encodeDeliveryRequest(order),
        }, { onConflict: "order_code" }).select("id").single();
        if (orderResult.error) throw orderResult.error;
        order.dbId = orderResult.data.id;

        const rows = [];
        for (const item of order.items) {
          rows.push({
            order_id: order.dbId,
            product_id: await ensureProductInSupabase(item),
            product_slug: item.key,
            product_name: item.name,
            size: item.size || "FREE",
            quantity: item.quantity,
            unit_price: itemSalePrice(item),
            selected_at: new Date().toISOString(),
          });
        }
        const itemResult = await supabaseClient.from("order_items").insert(rows);
        if (itemResult.error) throw itemResult.error;
      }

      async function syncOrderStatusToSupabase(order) {
        if (!supabaseClient || !order) return;
        let query = supabaseClient
          .from("orders")
          .update({ status: order.statusCode, request_note: encodeDeliveryRequest(order) })
          .select("id, status");
        query = order.dbId ? query.eq("id", order.dbId) : query.eq("order_code", order.id);
        const result = await query.single();
        if (result.error) throw result.error;
        order.dbId = result.data.id;
        order.statusCode = result.data.status;
      }

      async function syncReviewToSupabase(review) {
        if (!supabaseClient || !review) return;
        const product = products.find((item) => item.key === review.productKey);
        const store = storeByName(review.showroom);
        const payload = {
          order_code: review.orderId,
          user_id: review.customerId || customerId(),
          product_id: product ? (product.dbId || await ensureProductInSupabase(product)) : null,
          product_slug: review.productKey,
          product_name: review.productName,
          showroom_id: store ? (store.dbId || await syncStoreToSupabase(store)) : null,
          showroom_name: review.showroom,
          size: review.size || "FREE",
          rating: review.rating,
          comment: review.comment,
          customer_name: review.customerName || "고객",
          created_at: review.createdAt || new Date().toISOString(),
        };
        const result = await supabaseClient
          .from("product_reviews")
          .upsert(payload, { onConflict: "order_code,product_slug,size,user_id" })
          .select("id")
          .single();
        if (result.error) throw result.error;
        review.id = result.data.id;
      }

      async function syncWishlistToSupabase(key) {
        if (!canSyncWishlist() || !key) return;
        const item = products.find((product) => product.key === key);
        if (!item) return;
        const payload = {
          user_id: customerId(),
          product_id: item.dbId || await ensureProductInSupabase(item),
          product_slug: item.key,
          product_name: item.name,
          showroom_name: item.showroom,
          created_at: new Date().toISOString(),
        };
        const result = await supabaseClient
          .from("wishlists")
          .upsert(payload, { onConflict: "user_id,product_slug" })
          .select("id")
          .single();
        if (result.error) throw result.error;
      }

      async function deleteWishlistFromSupabase(key) {
        if (!canSyncWishlist() || !key) return;
        const result = await supabaseClient
          .from("wishlists")
          .delete()
          .eq("user_id", customerId())
          .eq("product_slug", key);
        if (result.error) throw result.error;
      }

      async function uploadProductImage(item) {
        if (!supabaseClient || !item.imageFile) return item.image || "";
        const extension = (item.imageFile.name.split(".").pop() || "jpg").toLowerCase();
        const path = item.key + "." + extension;
        const uploadResult = await supabaseClient.storage
          .from("product-images")
          .upload(path, item.imageFile, { cacheControl: "3600", upsert: true });
        if (uploadResult.error) throw uploadResult.error;
        const publicResult = supabaseClient.storage.from("product-images").getPublicUrl(path);
        item.image = publicResult.data.publicUrl;
        item.imageFile = null;
        return item.image;
      }

      function openVendor() {
        if (!currentVendor) {
          openVendorLogin();
          return;
        }
        renderVendorStores();
        renderVendorProducts();
        resetVendorLookForm();
        renderVendorLooks();
        renderVendorReviews();
        renderPartnerStores();
        renderVendorHomeBoard();
        renderVendorOrders();
        renderVendorRoleSummary();
        if (!document.querySelector(".vendor-size-stock")) renderVendorSizeStockInputs({ "Free": 2, "44-66": 1 });
        document.getElementById("vendorSession").innerHTML = currentVendor.manager + " 로그인 중 - " + currentVendor.store + '만 관리 가능 <button class="secondary" type="button" onclick="logoutVendor()" style="min-height:30px;margin-top:8px;">로그아웃</button>';
        document.getElementById("vendorModal").classList.add("open");
        document.getElementById("vendorModal").setAttribute("aria-hidden", "false");
      }

      function renderLoginStores() {
        document.getElementById("loginStore").innerHTML = vendorAccounts.map((account) =>
          '<option value="' + account.store + '">' + account.store + '</option>'
        ).join("");
      }

      function openVendorLogin() {
        renderLoginStores();
        document.getElementById("vendorLoginModal").classList.add("open");
        document.getElementById("vendorLoginModal").setAttribute("aria-hidden", "false");
      }

      function closeVendorLogin() {
        document.getElementById("vendorLoginModal").classList.remove("open");
        document.getElementById("vendorLoginModal").setAttribute("aria-hidden", "true");
      }

      function loginVendor(event) {
        event.preventDefault();
        const store = document.getElementById("loginStore").value;
        const pin = document.getElementById("loginPin").value.trim();
        const account = vendorAccounts.find((item) => item.store === store && item.pin === pin);
        if (!account) {
          document.getElementById("loginHint").textContent = "PIN이 맞지 않습니다. 매장별 데모 PIN을 확인해 주세요.";
          return;
        }
        currentVendor = account;
        saveCurrentVendor();
        closeVendorLogin();
        setSyncStatus(account.store + " 업체 로그인 완료");
        openVendor();
      }

      function logoutVendor() {
        currentVendor = null;
        saveCurrentVendor();
        closeVendorOrderDetail();
        closeVendorProductDetail();
        closeVendor();
        resetVendorForm();
        setSyncStatus("업체 로그아웃 완료");
      }

      function renderManagementHub() {
        const vendorState = document.getElementById("managementVendorState");
        const adminState = document.getElementById("managementAdminState");
        const ownerState = document.getElementById("managementOwnerState");
        const session = document.getElementById("managementSession");
        if (vendorState) vendorState.textContent = currentVendor ? currentVendor.store + " 로그인 중" : "업체 로그인 필요";
        if (adminState) adminState.textContent = currentAdmin && currentAdmin.role === "delivery" ? currentAdmin.name + " 로그인 중" : currentAdmin && currentAdmin.role === "total" ? "총관리자로 전체 배송 보기 가능" : "배송사 로그인 필요";
        if (ownerState) ownerState.textContent = currentAdmin && currentAdmin.role === "total" ? currentAdmin.name + " 로그인 중" : "총관리자 로그인 필요";
        if (session) {
          session.textContent = currentVendor || currentAdmin
            ? "현재 로그인된 권한으로 필요한 관리 메뉴를 열 수 있습니다."
            : "입점업체관리, 배송관리, 총관리자는 각각 권한 확인 후 이용합니다.";
        }
      }

      function openManagement() {
        renderManagementHub();
        document.getElementById("managementModal").classList.add("open");
        document.getElementById("managementModal").setAttribute("aria-hidden", "false");
      }

      function closeManagement() {
        document.getElementById("managementModal").classList.remove("open");
        document.getElementById("managementModal").setAttribute("aria-hidden", "true");
      }

      function openVendorFromManagement() {
        closeManagement();
        openVendor();
      }

      function openVendorSettlementFromManagement() {
        closeManagement();
        openVendor();
        setTimeout(() => {
          const target = document.getElementById("vendorSettlementSummary");
          if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 80);
      }

      function openAdminFromManagement() {
        closeManagement();
        openAdmin("delivery");
      }

      function openAdminSettlementFromManagement() {
        closeManagement();
        openAdmin("total");
        setTimeout(() => {
          const target = document.getElementById("adminSettlementSummary");
          if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 80);
      }

      function openTotalAdminFromManagement() {
        openAdminSettlementFromManagement();
      }

      function openCustomerLogin() {
        const note = document.getElementById("oauthNote");
        if (note) {
          note.textContent = "카카오는 연동 완료. 네이버는 Supabase Custom OAuth Provider와 네이버 개발자센터 Redirect URI 설정 후 연결합니다.";
        }
        document.getElementById("customerLoginModal").classList.add("open");
        document.getElementById("customerLoginModal").setAttribute("aria-hidden", "false");
      }

      function closeCustomerLogin() {
        document.getElementById("customerLoginModal").classList.remove("open");
        document.getElementById("customerLoginModal").setAttribute("aria-hidden", "true");
      }

      async function loginCustomer(event) {
        event.preventDefault();
        const name = document.getElementById("customerName").value.trim();
        const phone = document.getElementById("customerPhone").value.replace(/\D/g, "");
        currentCustomer = {
          name: name || "고객",
          phone: phone || "guest-preview",
          id: phone ? "customer-" + phone : "guest-preview",
          email: "",
        };
        orderHistory = [];
        lastOrder = null;
        saveCurrentCustomer();
        closeCustomerLogin();
        if (supabaseClient) {
          try {
            await loadSupabaseOrders();
            await loadSupabaseWishlist();
          } catch (error) {
            setSyncStatus("고객 주문 내역 불러오기 실패");
          }
        }
        setSyncStatus(currentCustomer.name + " 고객 로그인 완료");
        openMyPage();
      }

      async function loginWithOAuth(provider) {
        if (!setupClientIfNeeded()) {
          setSyncStatus("Supabase 설정이 없어 소셜 로그인을 시작할 수 없습니다");
          return;
        }
        if (window.location.protocol === "file:") {
          const localUrl = "http://127.0.0.1:4173/index.react.html";
          document.getElementById("oauthNote").textContent = "소셜 로그인 테스트는 " + localUrl + " 로 열어 진행해 주세요.";
          setSyncStatus("소셜 로그인은 localhost 또는 배포 URL에서 테스트해 주세요");
          return;
        }
        const options = {
          redirectTo: getOAuthRedirectUrl(),
        };
        const result = await supabaseClient.auth.signInWithOAuth({
          provider,
          options,
        });
        if (result.error) {
          const label = provider === "kakao" ? "카카오" : "네이버";
          const note = document.getElementById("oauthNote");
          if (note) {
            note.textContent = label + " 로그인 설정을 확인해 주세요. 네이버는 Supabase Custom OAuth Provider 설정 후 동작합니다.";
          }
          setSyncStatus(label + " 로그인 설정을 확인해 주세요");
        }
      }

      async function logoutCustomer() {
        if (supabaseClient) {
          await supabaseClient.auth.signOut().catch(() => null);
        }
        currentCustomer = { name: "게스트", phone: "guest-preview", id: "guest-preview" };
        orderHistory = [];
        lastOrder = null;
        localStorage.removeItem(CUSTOMER_STORAGE_KEY);
        setSyncStatus("고객 로그아웃 완료");
        if (document.getElementById("ordersModal").classList.contains("open")) renderOrders();
        renderMyPage();
      }

      function renderMyPage() {
        const orderCount = orderHistory.length;
        const totalSpend = orderHistory.reduce((sum, order) => sum + (order.total || 0), 0);
        const latestOrder = orderHistory[0];
        const wishedItems = wishlistItems();
        const viewedItems = recentViewItems();
        const wishlistMarkup = wishedItems.length ? wishedItems.map((item) => `
          <div class="vendor-product-row">
            <div>
              <strong>${item.name}</strong>
              <span>${item.showroom} · ${formatKRW(itemSalePrice(item))} · ${item.stock > 0 ? "재고 " + item.stock + "개" : "품절"}</span>
            </div>
            <div class="mini-actions">
              <button type="button" ${item.stock > 0 ? "" : "disabled"} onclick="addWishlistToCart('${item.key}', this, event)">담기</button>
              <button class="danger" type="button" onclick="toggleWishlist('${item.key}')">삭제</button>
            </div>
          </div>
        `).join("") : '<div class="line-item"><span>아직 저장한 상품이 없습니다</span><strong>찜 대기</strong></div>';
        const recentViewMarkup = viewedItems.length ? viewedItems.map((item) => `
          <div class="vendor-product-row">
            <div>
              <strong>${item.name}</strong>
              <span>${item.showroom} · ${formatKRW(itemSalePrice(item))} · ${eta(item)}분 도착</span>
            </div>
            <div class="mini-actions">
              <button type="button" onclick="openRecentDetail('${item.key}')">보기</button>
              <button type="button" ${item.stock > 0 ? "" : "disabled"} onclick="addWishlistToCart('${item.key}', this, event)">담기</button>
              <button class="wish-mini ${isWishlisted(item.key) ? "active-control" : ""}" type="button" onclick="toggleWishlist('${item.key}')">찜</button>
            </div>
          </div>
        `).join("") : '<div class="line-item"><span>상세화면을 열면 여기에 쌓입니다</span><strong>최근 본 상품 없음</strong></div>';
        document.getElementById("myContent").innerHTML = `
          <section class="profile-card">
            <div>
              <strong>${currentCustomer.name}</strong>
              <span>${customerContactLabel()}</span>
            </div>
            <span>${currentCustomer.provider ? providerLabel(currentCustomer.provider) + " 연동 계정" : "오산, 동탄 지금배송 고객 계정"}</span>
          </section>
          <section class="summary-card" style="margin-top: 12px;">
            <h3>이용 요약</h3>
            <div class="line-item"><span>최근 주문</span><strong>${orderCount}건</strong></div>
            <div class="line-item"><span>주문 금액</span><strong>${formatKRW(totalSpend)}</strong></div>
            <div class="line-item"><span>고객 ID</span><strong>${customerId().replace("auth-", "소셜-").slice(0, 18)}</strong></div>
          </section>
          <section class="summary-card" style="margin-top: 12px;">
            <h3>최근 배송</h3>
            <div class="line-item"><span>${latestOrder ? latestOrder.id : "주문 대기"}</span><strong>${latestOrder ? orderDisplayLabel(latestOrder) : "아직 없음"}</strong></div>
            <div class="line-item"><span>결제 상태</span><strong>${latestOrder ? paymentLabelForOrder(latestOrder) : "결제 대기"}</strong></div>
            <div class="line-item"><span>담당 기사</span><strong>${latestOrder ? assignedRiderLabel(latestOrder) : "배정 대기"}</strong></div>
          </section>
          <section class="summary-card" style="margin-top: 12px;">
            <h3>관심상품</h3>
            <div class="vendor-preview-list">${wishlistMarkup}</div>
          </section>
          <section class="summary-card" style="margin-top: 12px;">
            <h3>최근 본 상품</h3>
            <div class="vendor-preview-list">${recentViewMarkup}</div>
          </section>
          <section class="summary-card" style="margin-top: 12px;">
            <h3>내 쇼핑 관리</h3>
            <div class="vendor-preview-list">
              <div class="vendor-product-row">
                <div>
                  <strong>배송 추적</strong>
                  <span>현재 주문 위치, 진행 단계, 라이더 배정 확인</span>
                </div>
                <div class="mini-actions">
                  <button type="button" onclick="openTrackingFromMy()">열기</button>
                </div>
              </div>
              <div class="vendor-product-row">
                <div>
                  <strong>주문 내역</strong>
                  <span>최근 주문, 결제 상태, 주문별 추적 이동</span>
                </div>
                <div class="mini-actions">
                  <button type="button" onclick="openOrdersFromMy()">열기</button>
                </div>
              </div>
            </div>
          </section>
          <div class="detail-actions">
            <button class="secondary" type="button" onclick="openCustomerLogin()">고객 변경</button>
            <button class="primary" type="button" onclick="openTrackingFromMy()">배송 추적</button>
          </div>
          <button class="secondary" type="button" onclick="logoutCustomer()" style="width:100%;margin-top:8px;">로그아웃</button>
        `;
      }

      async function openMyPage() {
        if (supabaseClient) {
          try {
            await loadSupabaseOrders();
          } catch (error) {
            setSyncStatus("마이페이지 주문 내역 불러오기 실패");
          }
        }
        renderMyPage();
        document.getElementById("myModal").classList.add("open");
        document.getElementById("myModal").setAttribute("aria-hidden", "false");
      }

      function closeMyPage() {
        document.getElementById("myModal").classList.remove("open");
        document.getElementById("myModal").setAttribute("aria-hidden", "true");
      }

      function openTrackingFromMy() {
        closeMyPage();
        openTracking();
      }

      function openOrdersFromMy() {
        closeMyPage();
        openOrders();
      }

      function previewVendorImage() {
        const input = document.getElementById("vendorImage");
        const preview = document.getElementById("vendorImagePreview");
        const file = input.files && input.files[0];
        if (!file) {
          vendorImageData = "";
          vendorImageFile = null;
          preview.textContent = "이미지 미리보기";
          return;
        }
        vendorImageFile = file;
        const reader = new FileReader();
        reader.onload = () => {
          vendorImageData = reader.result;
          preview.innerHTML = '<img src="' + vendorImageData + '" alt="등록 이미지 미리보기" />';
        };
        reader.readAsDataURL(file);
      }

      function closeVendor() {
        closeVendorOrderDetail();
        closeVendorProductDetail();
        document.getElementById("vendorModal").classList.remove("open");
        document.getElementById("vendorModal").setAttribute("aria-hidden", "true");
      }

      async function submitVendorProduct(event) {
        event.preventDefault();
        if (!currentVendor) {
          openVendorLogin();
          return;
        }
        const store = document.getElementById("vendorStore").value;
        if (store !== currentVendor.store) {
          setSyncStatus("로그인한 매장에만 상품을 등록할 수 있습니다");
          return;
        }
        const existing = editingProductKey ? products.find((product) => product.key === editingProductKey) : null;
        if (!existing) vendorProductCount += 1;
        updateVendorStockTotal();
        const vendorSizeStock = readVendorSizeStock();
        const productData = {
          key: existing ? existing.key : "vendor-" + Date.now() + "-" + vendorProductCount,
          name: document.getElementById("vendorName").value.trim(),
          price: Number(document.getElementById("vendorPrice").value),
          discountRate: normalizedDiscount(document.getElementById("vendorDiscount").value),
          showroom: store,
          stock: Number(document.getElementById("vendorStock").value),
          minutes: Number(document.getElementById("vendorMinutes").value),
          match: Number(document.getElementById("vendorMatch").value),
          material: document.getElementById("vendorMaterial").value.trim(),
          category: document.getElementById("vendorCategory").value,
          visual: existing ? existing.visual : ["jacket", "shoes", "bag", "ring"][vendorProductCount % 4],
          image: vendorImageData || (existing ? existing.image : ""),
          imageFile: vendorImageFile,
          fit: existing ? existing.fit : "업체 등록 상품",
          size: document.getElementById("vendorSize").value.trim(),
          note: document.getElementById("vendorNote").value.trim(),
          vendorAdded: true,
          status: existing ? existing.status : "selling",
          dbId: existing ? existing.dbId : undefined,
        };
        productData.sizeStock = vendorSizeStock;
        productData.stock = totalSizeStock(productData);
        if (existing) {
          Object.assign(existing, productData);
        } else {
          products.unshift(productData);
        }
        selectedShowroom = store;
        document.getElementById("search").value = "";
        renderProducts();
        renderVendorStores();
        renderVendorProducts();
        renderVendorLookPicker();
        renderVendorLooks();
        renderVendorReviews();
        renderVendorRoleSummary();
        try {
          await syncProductToSupabase(existing || productData);
          renderProducts();
          renderVendorProducts();
          renderVendorLookPicker();
          renderVendorLooks();
          renderVendorReviews();
          renderVendorRoleSummary();
          setSyncStatus((existing ? "상품 수정이" : "상품과 이미지가") + " Supabase에 저장됨");
        } catch (error) {
          setSyncStatus((existing ? "상품 수정은" : "상품은") + " 화면에만 반영됨 - DB 저장 실패");
        }
        resetVendorForm();
      }

      function setRegion(key) {
        selectedRegion = key;
        document.getElementById("addressInput").value = currentRegion().address;
        renderAddressSuggestions("home");
        renderProducts();
      }

      function updateAddress() {
        const value = document.getElementById("addressInput").value.trim();
        document.getElementById("areaCopy").textContent = value ? value + " 기준으로 도착 시간을 다시 계산 중입니다." : currentRegion().copy;
        renderAddressSuggestions("home");
      }

      function addressSearchConfig(source) {
        if (source === "order") return { inputId: "orderAddress", listId: "orderAddressSuggestions" };
        return { inputId: "addressInput", listId: "addressSuggestions" };
      }

      function regionNameForKey(key) {
        const region = regions.find((item) => item.key === key);
        return region ? region.name : "";
      }

      function addressQueryMatches(item, query) {
        if (!query) return item.regionKey === selectedRegion;
        const haystack = [item.title, item.address, item.hint, regionNameForKey(item.regionKey)].join(" ").toLowerCase();
        return haystack.includes(query.toLowerCase());
      }

      function addressMatchesFor(source) {
        const config = addressSearchConfig(source);
        const input = document.getElementById(config.inputId);
        const query = input ? input.value.trim() : "";
        const direct = addressSuggestions.filter((item) => addressQueryMatches(item, query));
        const fallback = query ? addressSuggestions.filter((item) => item.regionKey === selectedRegion) : [];
        return (direct.length ? direct : fallback).slice(0, 5);
      }

      function renderAddressSuggestions(source = "home") {
        const config = addressSearchConfig(source);
        const list = document.getElementById(config.listId);
        if (!list) return;
        const matches = addressMatchesFor(source);
        addressSuggestionState[source] = matches;
        list.innerHTML = matches.map((item, index) => `
          <button class="address-suggestion" type="button" onclick="selectAddressSuggestion('${source}', ${index})">
            <strong>${item.title}</strong>
            <span>${item.address}</span>
            <small>${regionNameForKey(item.regionKey)} · ${item.hint}</small>
          </button>
        `).join("");
      }

      function updateOrderAddressSearch() {
        renderAddressSuggestions("order");
      }

      function selectAddressSuggestion(source, index) {
        const item = addressSuggestionState[source] && addressSuggestionState[source][index];
        if (!item) return;
        selectedRegion = item.regionKey;
        const config = addressSearchConfig(source);
        const input = document.getElementById(config.inputId);
        if (input) input.value = item.address;
        const homeInput = document.getElementById("addressInput");
        if (homeInput) homeInput.value = item.address;
        renderProducts();
        document.getElementById("areaCopy").textContent = item.title + " 기준으로 도착 시간을 다시 계산 중입니다.";
        renderAddressSuggestions(source);
        if (source === "order") renderAddressSuggestions("home");
      }

      function setupFilters() {
        const names = ["전체"].concat([...new Set(products.map((item) => item.showroom))]);
        document.getElementById("showroomFilters").innerHTML = names.map((name) =>
          '<button class="chip ' + (name === selectedShowroom ? 'active-control' : '') + '" type="button" onclick="setShowroom(\'' + name + '\')">' + name + '</button>'
        ).join("");
        const categories = ["전체"].concat([...new Set(products.map((item) => item.category || "상품"))]);
        document.getElementById("categoryFilters").innerHTML = categories.map((name) =>
          '<button class="chip ' + (name === selectedCategory ? 'active-control' : '') + '" type="button" onclick="setCategory(\'' + name + '\')">' + name + '</button>'
        ).join("");
        const sizeGroups = ["전체", "상의", "하의", "신발", "잡화"];
        document.getElementById("sizeFilters").innerHTML = sizeGroups.map((name) =>
          '<button class="chip ' + (name === selectedSizeFilter ? 'active-control' : '') + '" type="button" onclick="setSizeFilter(\'' + name + '\')">' + name + '</button>'
        ).join("");
        const priceRanges = [
          { key: "전체", label: "전체 가격" },
          { key: "under50000", label: "5만원 이하" },
          { key: "50000to100000", label: "5-10만원" },
          { key: "over100000", label: "10만원 이상" },
        ];
        document.getElementById("priceFilters").innerHTML = priceRanges.map((range) =>
          '<button class="chip ' + (range.key === selectedPriceRange ? 'active-control' : '') + '" type="button" onclick="setPriceRange(\'' + range.key + '\')">' + range.label + '</button>'
        ).join("");
      }

      function setShowroom(name) {
        selectedLookKeys = [];
        selectedShowroom = name;
        renderProducts();
      }

      function setCategory(name) {
        selectedLookKeys = [];
        selectedCategory = name;
        renderProducts();
      }

      function setSizeFilter(name) {
        selectedLookKeys = [];
        selectedSizeFilter = name;
        renderProducts();
      }

      function setPriceRange(name) {
        selectedLookKeys = [];
        selectedPriceRange = name;
        renderProducts();
      }

      function setSort(mode) {
        sortMode = mode;
        document.querySelectorAll(".sort").forEach((button) => {
          button.classList.toggle("active-control", button.dataset.sort === mode);
        });
        renderProducts();
      }

      function toggleFast() {
        onlyFast = !onlyFast;
        document.getElementById("fastToggle").textContent = onlyFast ? "전체 보기" : "45분 이내";
        renderProducts();
      }

      function resetControls() {
        selectedShowroom = "전체";
        selectedLookKeys = [];
        selectedCategory = "전체";
        selectedSizeFilter = "전체";
        selectedPriceRange = "전체";
        sortMode = "fastest";
        onlyFast = false;
        document.getElementById("search").value = "";
        document.getElementById("fastToggle").textContent = "45분 이내";
        setSort("fastest");
      }

      function sizeFilterMatches(item) {
        return matchesSizeFilter(item, selectedSizeFilter);
      }

      function priceRangeMatches(item) {
        return matchesPriceRange(item, selectedPriceRange);
      }

      function visibleProducts() {
        return filterVisibleProducts({
          products,
          query: document.getElementById("search").value,
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
        });
      }

      function personalizedRecommendations() {
        return buildPersonalizedRecommendations({
          products,
          wishlistItems,
          recentViewItems,
          storeIsVisible,
          eta,
          productRatingValue,
          currentRegionName: currentRegion().name,
        });
      }

      function renderRecommendations() {
        const list = document.getElementById("recommendList");
        const reason = document.getElementById("recommendReason");
        if (!list || !reason) return;
        const recommendation = personalizedRecommendations();
        reason.textContent = recommendation.reason;
        list.innerHTML = recommendationListMarkup(recommendation, { eta, isWishlisted });
      }

      function detailRecommendations(item) {
        return personalizedRecommendations().items
          .filter((candidate) => candidate.key !== item.key)
          .slice(0, 2);
      }

      function detailRecommendationMarkup(item) {
        const items = detailRecommendations(item);
        return detailRecommendationMarkupForItems(items, { eta, isWishlisted });
      }

      function visualMarkup(item, extraClass = "") {
        return visualMarkupForItem(item, extraClass);
      }

      function lookItems(look) {
        return getLookItems(look, products);
      }

      function lookSummary(look) {
        return summarizeLook({ look, products, storeIsVisible, eta });
      }

      function sizeOptions(item) {
        return sizeOptionsForItem(item);
      }

      function ensureSizeStock(item) {
        return ensureItemSizeStock(item);
      }

      function totalSizeStock(item) {
        return totalStockForItem(item);
      }

      function sizeStock(item, size) {
        return stockForSize(item, size);
      }

      function availableSizeOptions(item) {
        return availableSizesForItem(item);
      }

      function selectedLookSize(lookKey, item) {
        const select = document.getElementById("lookSize-" + lookKey + "-" + item.key);
        return select ? select.value : availableSizeOptions(item)[0] || sizeOptions(item)[0];
      }

      function selectDetailSize(size) {
        selectedDetailSize = size;
        document.querySelectorAll(".size-chip-list button").forEach((button) => {
          button.classList.toggle("active-control", button.dataset.size === size);
        });
      }

      function detailSelectedSize(item) {
        const options = availableSizeOptions(item);
        if (!selectedDetailSize || !options.includes(selectedDetailSize)) {
          selectedDetailSize = options[0] || sizeOptions(item)[0] || item.size || "FREE";
        }
        return selectedDetailSize;
      }

      function addCartItem(item, size, salePriceOverride, discountRateOverride) {
        if (!item) return false;
        ensureSizeStock(item);
        const selectedSize = size || availableSizeOptions(item)[0] || sizeOptions(item)[0] || item.size || "FREE";
        const currentQuantity = cart.filter((line) => line.key === item.key && line.size === selectedSize).reduce((sum, line) => sum + line.quantity, 0);
        if (currentQuantity >= sizeStock(item, selectedSize)) {
          setSyncStatus(item.name + " " + selectedSize + " 사이즈 재고가 부족합니다");
          return false;
        }
        const finalSalePrice = salePriceOverride != null ? salePriceOverride : itemSalePrice(item);
        const finalDiscountRate = discountRateOverride != null ? discountRateOverride : normalizedDiscount(item.discountRate);
        const existing = cart.find((line) => line.key === item.key && line.size === selectedSize);
        if (existing) existing.quantity += 1;
        else cart.push({ ...item, normalPrice: itemNormalPrice(item), salePrice: finalSalePrice, discountRate: finalDiscountRate, size: selectedSize, quantity: 1 });
        setSyncStatus(item.name + " 장바구니에 담김");
        return true;
      }

      function renderLooks() {
        const list = document.getElementById("lookList");
        if (!list) return;
        list.innerHTML = lookSets.map((look) => lookCardMarkup(look, lookSummary(look), { sizeOptions, sizeStock })).join("");
      }

      function openLooks() {
        renderLooks();
        document.getElementById("lookModal").classList.add("open");
        document.getElementById("lookModal").setAttribute("aria-hidden", "false");
      }

      function closeLooks() {
        document.getElementById("lookModal").classList.remove("open");
        document.getElementById("lookModal").setAttribute("aria-hidden", "true");
      }

      function addLookToCart(lookKey) {
        const look = lookSets.find((item) => item.key === lookKey);
        if (!look) return;
        const summary = lookSummary(look);
        const setRate = normalizedDiscount(look.discountRate);
        summary.items.forEach((item) => addCartItem(item, selectedLookSize(look.key, item), discountedPrice(itemSalePrice(item), setRate), setRate));
        const selectedSizes = summary.items.map((item) => item.name + " " + selectedLookSize(look.key, item)).join(", ");
        setSyncStatus(look.title + " 세트 담김 - " + selectedSizes);
        renderCart();
      }

      function filterLookItems(lookKey) {
        const look = lookSets.find((item) => item.key === lookKey);
        if (!look) return;
        closeLooks();
        selectedLookKeys = look.keys.slice();
        selectedShowroom = "전체";
        onlyFast = false;
        document.getElementById("fastToggle").textContent = "45분 이내";
        document.getElementById("search").value = "";
        setSyncStatus(look.title + " 구성 상품만 보여주는 중");
        renderProducts();
      }

      function renderProducts() {
        products.forEach(ensureSizeStock);
        renderRegions();
        setupFilters();
        renderRecommendations();
        const items = visibleProducts();
        const first = items[0] || products[0];
        const activeFilters = [
          selectedShowroom !== "전체" ? selectedShowroom : "",
          selectedCategory !== "전체" ? selectedCategory : "",
          selectedSizeFilter !== "전체" ? selectedSizeFilter : "",
          selectedPriceRange !== "전체" ? document.querySelector('#priceFilters .active-control')?.textContent || "" : "",
        ].filter(Boolean);
        document.getElementById("fastestShowroom").textContent = items.length ? first.showroom : "픽업 가능 매장 없음";
        document.getElementById("fastestMinutes").textContent = items.length ? eta(first) + "분" : "-";
        document.getElementById("fastestCopy").textContent = items.length ? currentRegion().name + " 도착 기준, " + first.name + " 재고 " + first.stock + "개 확인 중. 예상 도착 " + eta(first) + "분." : "입점 화면에서 매장 픽업 상태를 다시 켜면 상품이 노출됩니다.";
        document.getElementById("resultCount").textContent = (selectedLookKeys.length ? "룩 구성 " : activeFilters.length ? activeFilters.join(" · ") + " " : "") + items.length + "개 아이템";
        document.getElementById("productGrid").innerHTML = productGridMarkup(items, { eta, isWishlisted, ratingLabelForProduct, ratingLabelForStore });
      }

      function addToCart(key, button) {
        const item = products.find((product) => product.key === key);
        const added = addCartItem(item);
        if (!added) {
          renderCart();
          return;
        }
        button.classList.add("added");
        setTimeout(() => {
          button.classList.remove("added");
        }, 900);
        renderCart();
      }

      function addSet() {
        ["jacket", "ring"].forEach((key) => {
          const item = products.find((product) => product.key === key);
          addCartItem(item);
        });
        renderCart();
        checkout();
      }

      function addItemByKey(key) {
        const item = products.find((product) => product.key === key);
        const added = addCartItem(item);
        renderCart();
        return added;
      }

      function openDetail(key) {
        const item = products.find((product) => product.key === key);
        if (!item) return;
        rememberRecentView(key);
        const store = storeByName(item.showroom);
        const prepMinutes = store ? store.prep : 0;
        const sizes = sizeOptions(item);
        ensureSizeStock(item);
        const availableSizes = availableSizeOptions(item);
        const previousDetailKey = activeDetailKey;
        selectedDetailSize = availableSizes.includes(selectedDetailSize) && previousDetailKey === key ? selectedDetailSize : (availableSizes[0] || sizes[0] || item.size || "FREE");
        activeDetailKey = key;
        const stockAlert = item.stock <= 2 ? `<div class="stock-alert">재고 ${item.stock}개 남음. 지금 예약하면 픽업 우선 배정됩니다.</div>` : "";
        document.getElementById("detailName").textContent = item.name;
        document.getElementById("detailBody").innerHTML = `
          ${visualMarkup(item, "detail-visual")}
          <div class="badge"><i></i>${eta(item)}분 도착 가능</div>
          ${priceMarkup(itemNormalPrice(item), item.discountRate, itemSalePrice(item))}
          <small>${item.showroom}</small>
          <small>${ratingLabelForProduct(item)} · ${ratingLabelForStore(item.showroom)}</small>
          ${stockAlert}
          <div class="detail-meta">
            <div class="meta-box"><span>핏</span><strong>${item.fit}</strong></div>
            <div class="meta-box"><span>배송 가능</span><strong>${eta(item)}분</strong></div>
            <div class="meta-box"><span>재고</span><strong>${item.stock}개</strong></div>
          </div>
          <div class="summary-card">
            <h3>사이즈 선택</h3>
            <div class="size-chip-list">${sizes.map((size) => {
              const count = sizeStock(item, size);
              return `<button class="${size === selectedDetailSize ? "active-control" : ""}" data-size="${size}" type="button" ${count > 0 ? "" : "disabled"} onclick="selectDetailSize('${size}')">${size} · ${count > 0 ? count + "개" : "품절"}</button>`;
            }).join("")}</div>
          </div>
          <div class="summary-card" style="margin-top: 12px;">
            <h3>소재와 매칭</h3>
            <div class="line-item"><span>${item.material}</span><strong>${item.match}% 매칭</strong></div>
            <div class="line-item"><span>매장 픽업 준비</span><strong>${prepMinutes ? prepMinutes + "분" : "즉시 준비"}</strong></div>
            <div class="line-item"><span>교환/반품</span><strong>수령 후 24시간 내 상담</strong></div>
          </div>
          <p class="fit-note">${item.note}</p>
          ${detailRecommendationMarkup(item)}
          <div class="detail-actions three-actions">
            <button class="wish-button ${isWishlisted(item.key) ? "active-control" : ""}" type="button" onclick="toggleWishlist('${item.key}')">${isWishlisted(item.key) ? "♥" : "♡"}</button>
            <button class="secondary" type="button" onclick="addDetailToCart('${item.key}')">담기</button>
            <button class="primary" type="button" onclick="reserveFromDetail('${item.key}')">바로 예약</button>
          </div>
        `;
        document.getElementById("detailModal").classList.add("open");
        document.getElementById("detailModal").setAttribute("aria-hidden", "false");
      }

      function addDetailToCart(key) {
        const item = products.find((product) => product.key === key);
        if (!item) return;
        addCartItem(item, detailSelectedSize(item));
        renderCart();
        closeDetail();
      }

      function addWishlistToCart(key, button, event) {
        if (event) event.stopPropagation();
        const added = addItemByKey(key);
        if (added && button) {
          button.classList.add("added");
          setTimeout(() => {
            if (document.getElementById("myModal").classList.contains("open")) renderMyPage();
          }, 650);
          return;
        }
        if (document.getElementById("myModal").classList.contains("open")) renderMyPage();
      }

      function openRecentDetail(key) {
        closeMyPage();
        openDetail(key);
      }

      function reserveFromDetail(key) {
        const item = products.find((product) => product.key === key);
        if (!item) return;
        addCartItem(item, detailSelectedSize(item));
        renderCart();
        closeDetail();
        checkout();
      }

      function renderCart() {
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        const total = cart.reduce((sum, item) => sum + itemSalePrice(item) * item.quantity, 0);
        document.getElementById("cartCount").textContent = count + "개 선택됨";
        document.getElementById("cartTotal").textContent = formatKRW(total);
        document.getElementById("cartHint").textContent = count ? "눌러서 수량, 사이즈, 할인 확인" : "눌러서 장바구니 상세 확인";
        if (document.getElementById("cartModal").classList.contains("open")) renderCartDetail();
      }

      function cartTotals() {
        return calculateCartTotals(cart);
      }

      function renderCartDetail() {
        const body = document.getElementById("cartDetailBody");
        if (!body) return;
        if (!cart.length) {
          body.innerHTML = emptyCartDetailMarkup();
          return;
        }
        const totals = cartTotals();
        body.innerHTML = cartDetailMarkup(cart, totals);
      }

      function openCartDetail() {
        renderCartDetail();
        document.getElementById("cartModal").classList.add("open");
        document.getElementById("cartModal").setAttribute("aria-hidden", "false");
      }

      function closeCartDetail() {
        document.getElementById("cartModal").classList.remove("open");
        document.getElementById("cartModal").setAttribute("aria-hidden", "true");
      }

      function updateCartQuantity(index, delta) {
        const item = cart[index];
        if (!item) return;
        if (delta > 0) {
          const product = products.find((candidate) => candidate.key === item.key) || item;
          const currentQuantity = cart.filter((line) => line.key === item.key && line.size === item.size).reduce((sum, line) => sum + line.quantity, 0);
          if (currentQuantity >= sizeStock(product, item.size || "FREE")) {
            setSyncStatus(item.name + " " + (item.size || "FREE") + " 사이즈 재고가 부족합니다");
            return;
          }
        }
        item.quantity += delta;
        if (item.quantity <= 0) cart.splice(index, 1);
        renderCart();
      }

      function removeCartItem(index) {
        cart.splice(index, 1);
        renderCart();
      }

      function checkoutFromCart() {
        closeCartDetail();
        checkout();
      }

      function groupedPickups() {
        return groupCartPickups(cart, eta);
      }

      function renderOrderSummary() {
        const summary = document.getElementById("orderSummary");
        if (!cart.length) {
          summary.innerHTML = emptyOrderSummaryMarkup();
          return;
        }
        summary.innerHTML = orderSummaryMarkup({ cart, lastOrder, eta, paymentLabelForOrder, assignedRiderLabel });
      }

      function deliveryFormValues() {
        return {
          name: document.getElementById("orderCustomerName") ? document.getElementById("orderCustomerName").value.trim() : currentCustomer.name,
          phone: document.getElementById("orderCustomerPhone") ? document.getElementById("orderCustomerPhone").value.replace(/\D/g, "") : (currentCustomer.phone || ""),
          address: document.getElementById("orderAddress") ? document.getElementById("orderAddress").value.trim() : (document.getElementById("addressInput").value.trim() || currentRegion().address),
          receiveType: document.getElementById("receiveType") ? document.getElementById("receiveType").value : "문앞 수령",
          paymentMethod: document.getElementById("paymentMethod") ? document.getElementById("paymentMethod").value : "카카오페이",
          riderRequest: document.getElementById("riderRequest") ? document.getElementById("riderRequest").value.trim() : "",
        };
      }

      function renderDeliveryForm() {
        const wrap = document.getElementById("deliveryFormWrap");
        if (!wrap) return;
        const phone = currentCustomer.phone && currentCustomer.phone !== "guest-preview" ? currentCustomer.phone : "";
        wrap.innerHTML = deliveryFormMarkup({
          customerName: currentCustomer.name,
          phone,
          address: document.getElementById("addressInput").value.trim() || currentRegion().address,
        });
        renderAddressSuggestions("order");
      }

      function clearDeliveryForm() {
        const wrap = document.getElementById("deliveryFormWrap");
        if (wrap) wrap.innerHTML = "";
      }

      function createOrderSnapshot(deliveryInfo = deliveryFormValues()) {
        return createOrderSnapshotData({
          cart,
          currentRegion: currentRegion(),
          customerContactLabel,
          customerId,
          currentCustomer,
          deliveryInfo,
          eta,
        });
      }

      function saveOrderHistory(order) {
        if (!order) return;
        order.progressStep = Math.max(0, Math.min(order.progressStep || activeStep || 0, steps.length - 1));
        if (isOrderCancelled(order)) {
          order.statusCode = "cancelled";
          order.statusLabel = "취소됨";
        } else {
          order.statusCode = statusFromStep(order.progressStep);
          order.statusLabel = labelFromStep(order.progressStep);
        }
        if (!order.createdLabel) {
          order.createdAt = order.createdAt || new Date().toISOString();
          order.createdLabel = new Date(order.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
        }
        order.paymentLabel = paymentLabelForOrder(order);
        order.riderName = order.riderName || "";
        saveOrderStatusOverride(order);
        orderHistory = [order, ...orderHistory.filter((item) => item.id !== order.id)].slice(0, 10);
      }

      function renderOrders() {
        const list = document.getElementById("orderList");
        if (!orderHistory.length) {
          list.innerHTML = emptyOrdersMarkup();
          return;
        }
        list.innerHTML = orderListMarkup(orderHistory, {
          assignedRiderLabel,
          canCancelOrder: canCustomerCancelOrReturn,
          canReviewOrder,
          cancelReasonLabel,
          isOrderCancelled,
          orderDisplayLabel,
          orderReviewCount,
          paymentLabelForOrder,
          customerCancelActionLabel,
        });
      }

      async function openOrders() {
        if (supabaseClient) {
          try {
            await loadSupabaseOrders();
            setSyncStatus("주문 내역을 Supabase에서 불러옴");
          } catch (error) {
            setSyncStatus("주문 내역은 화면 기록만 표시됨 - DB 불러오기 실패");
          }
        }
        renderOrders();
        document.getElementById("ordersModal").classList.add("open");
        document.getElementById("ordersModal").setAttribute("aria-hidden", "false");
      }

      function closeOrders() {
        document.getElementById("ordersModal").classList.remove("open");
        document.getElementById("ordersModal").setAttribute("aria-hidden", "true");
      }

      function selectOrder(orderId) {
        const order = orderHistory.find((item) => item.id === orderId);
        if (!order) return;
        lastOrder = order;
        activeStep = lastOrder.progressStep || 0;
        closeOrders();
        openTracking();
      }

      function selectTrackingOrder(orderId) {
        const order = orderHistory.find((item) => item.id === orderId);
        if (!order) return;
        lastOrder = order;
        activeStep = lastOrder.progressStep || 0;
        renderTracking();
      }

      async function updateActiveOrderStep(step, message) {
        if (!lastOrder) return;
        if (isOrderCancelled(lastOrder)) {
          setSyncStatus("취소된 주문은 진행할 수 없습니다");
          renderTracking();
          return;
        }
        lastOrder.progressStep = Math.max(0, Math.min(step, steps.length - 1));
        lastOrder.statusCode = statusFromStep(lastOrder.progressStep);
        lastOrder.statusLabel = labelFromStep(lastOrder.progressStep);
        lastOrder.paymentLabel = paymentLabelForOrder(lastOrder);
        activeStep = lastOrder.progressStep;
        saveOrderStatusOverride(lastOrder);
        saveOrderHistory(lastOrder);
        try {
          await syncOrderStatusToSupabase(lastOrder);
          await loadSupabaseOrders().catch(() => null);
          lastOrder = orderHistory.find((order) => order.id === lastOrder.id) || lastOrder;
          activeStep = lastOrder.progressStep || activeStep;
          setSyncStatus(message + " - Supabase 주문 상태 업데이트 완료");
        } catch (error) {
          setSyncStatus(message + " - 화면 상태 우선 반영, DB 업데이트 권한 확인 필요");
        }
        renderTracking();
        if (document.getElementById("ordersModal").classList.contains("open")) renderOrders();
        if (document.getElementById("myModal").classList.contains("open")) renderMyPage();
        if (document.getElementById("vendorModal").classList.contains("open")) renderVendorOrders();
        if (document.getElementById("adminModal").classList.contains("open")) renderAdminOrders();
      }

      async function cancelOrder(orderId, source = "customer") {
        let order = orderHistory.find((item) => item.id === orderId);
        if (!order && lastOrder && lastOrder.id === orderId) order = lastOrder;
        if (!order && supabaseClient && source === "vendor") {
          const orders = await loadVendorOrders().catch(() => []);
          order = orders.find((item) => item.id === orderId);
        }
        if (!order && supabaseClient && source === "admin") {
          const orders = await loadAdminOrders().catch(() => []);
          order = orders.find((item) => item.id === orderId);
        }
        if (!order) {
          setSyncStatus("취소할 주문을 찾을 수 없습니다");
          return;
        }
        if (source === "vendor" && currentVendor && !order.items.some((item) => item.showroom === currentVendor.store)) {
          setSyncStatus("로그인한 매장의 주문만 취소할 수 있습니다");
          return;
        }
        if (source === "admin" && !currentAdmin) {
          openAdminLogin();
          return;
        }
        if (source === "admin" && !canCurrentAdminManageOrder(order)) {
          setSyncStatus("현재 계정에서 취소할 수 없는 주문입니다");
          return;
        }
        if (source === "admin" && currentAdmin.role !== "total") {
          setSyncStatus("주문 취소는 총관리자 권한에서 처리할 수 있습니다");
          return;
        }
        const customerReturnRequest = source === "customer" && canRequestReturnRefund(order);
        if (!canCancelOrder(order) && !customerReturnRequest) {
          setSyncStatus((order.progressStep || 0) >= 4 ? "반품/환불 가능 기간이 지났습니다" : "배송 중 이후에는 앱에서 바로 취소할 수 없습니다");
          return;
        }
        const defaultReasonCode = defaultCancelReasonCode(source);
        const defaultReasonLabel = cancelReasonOptions.find((item) => item.key === defaultReasonCode).label;
        const reasonChoice = window.prompt((customerReturnRequest ? "반품/환불 분류를 선택해 주세요" : "취소 분류를 선택해 주세요") + "\n1 고객 요청\n2 재고 부족\n3 배송 지연\n4 운영자 취소\n5 기타", defaultReasonLabel);
        if (reasonChoice === null) return;
        const reasonCode = normalizeCancelReasonCode(reasonChoice, defaultReasonCode);
        const defaultReason = customerReturnRequest ? "배송완료 후 14일 이내 반품/환불 요청" : source === "vendor" ? "업체 재고 부족" : source === "admin" ? "운영자 확인 취소" : "고객 요청";
        const reason = window.prompt(customerReturnRequest ? "반품/환불 사유를 입력해 주세요" : "취소 사유를 입력해 주세요", defaultReason);
        if (reason === null) return;
        order.cancelled = true;
        order.cancelReasonCode = reasonCode;
        order.cancelReason = reason.trim() || defaultReason;
        order.statusCode = "cancelled";
        order.statusLabel = "취소됨";
        order.refundStatus = refundStatusFromOrder(order);
        order.paymentLabel = paymentLabelForOrder(order);
        const stockRestoredNow = restoreOrderStock(order);
        lastOrder = order;
        activeStep = order.progressStep || 0;
        saveOrderStatusOverride(order);
        saveOrderHistory(order);
        renderProducts();
        renderCart();
        renderVendorProducts();
        renderVendorRoleSummary();
        renderOrders();
        renderTracking();
        if (document.getElementById("myModal").classList.contains("open")) renderMyPage();
        if (document.getElementById("vendorModal").classList.contains("open")) renderVendorOrders();
        if (document.getElementById("adminModal").classList.contains("open")) renderAdminOrders();
        try {
          if (stockRestoredNow) await syncOrderStockProducts(order);
          await syncOrderStatusToSupabase(order);
          setSyncStatus((stockRestoredNow ? "재고 복구 및 " : "") + "주문 취소가 Supabase에 저장됨 - " + order.id);
        } catch (error) {
          setSyncStatus("주문 취소와 재고 복구는 화면에 반영됨 - DB 업데이트 권한 확인 필요");
        }
      }

      async function reviewOrder(orderId) {
        const order = orderHistory.find((item) => item.id === orderId) || (lastOrder && lastOrder.id === orderId ? lastOrder : null);
        if (!canReviewOrder(order)) {
          setSyncStatus("배송 완료된 주문만 리뷰를 작성할 수 있습니다");
          return;
        }
        const target = order.items.find((item) => !reviews.some((review) => review.orderId === order.id && review.productKey === item.key && review.size === (item.size || "FREE"))) || order.items[0];
        if (!target) return;
        const ratingInput = window.prompt(target.name + " 별점을 입력해 주세요 (1-5)", "5");
        if (ratingInput === null) return;
        const rating = Math.max(1, Math.min(5, Math.round(Number(ratingInput) || 5)));
        const comment = window.prompt("리뷰 내용을 입력해 주세요", "바로 받아서 코디하기 좋았어요.");
        if (comment === null) return;
        const existingIndex = reviews.findIndex((review) => review.orderId === order.id && review.productKey === target.key && review.size === (target.size || "FREE"));
        const review = {
          id: "review-" + Date.now(),
          orderId: order.id,
          productKey: target.key,
          productName: target.name,
          showroom: target.showroom,
          size: target.size || "FREE",
          rating,
          comment: comment.trim() || "만족스러운 지금배송이었어요.",
          customerName: currentCustomer.name || order.customerName || "고객",
          customerId: customerId(),
          createdAt: new Date().toISOString(),
        };
        if (existingIndex >= 0) reviews.splice(existingIndex, 1, review);
        else reviews.unshift(review);
        saveReviewStore();
        renderProducts();
        renderVendorProducts();
        renderVendorReviews();
        renderVendorRoleSummary();
        renderOrders();
        renderTracking();
        if (document.getElementById("myModal").classList.contains("open")) renderMyPage();
        if (document.getElementById("vendorModal").classList.contains("open")) renderVendorOrders();
        try {
          await syncReviewToSupabase(review);
          saveReviewStore();
          setSyncStatus("리뷰가 Supabase에 저장됨 - " + target.name + " 별점 " + rating);
        } catch (error) {
          setSyncStatus("리뷰는 화면에 저장됨 - Supabase 리뷰 테이블 확인 필요");
        }
      }

      async function completeRefund(orderId) {
        if (!currentAdmin) {
          openAdminLogin();
          return;
        }
        let order = orderHistory.find((item) => item.id === orderId);
        if (!order && lastOrder && lastOrder.id === orderId) order = lastOrder;
        if (!order && supabaseClient) {
          const orders = await loadAdminOrders().catch(() => []);
          order = orders.find((item) => item.id === orderId);
        }
        if (!order) {
          setSyncStatus("환불 처리할 주문을 찾을 수 없습니다");
          return;
        }
        if (!canCurrentAdminManageOrder(order)) {
          setSyncStatus("현재 계정에서 환불 처리할 수 없는 주문입니다");
          return;
        }
        if (currentAdmin.role !== "total") {
          setSyncStatus("환불 처리는 총관리자 권한에서 처리할 수 있습니다");
          return;
        }
        if (!canCompleteRefund(order)) {
          setSyncStatus("환불 완료 처리할 결제 건이 없습니다");
          return;
        }
        order.refundStatus = "completed";
        order.paymentLabel = paymentLabelForOrder(order);
        lastOrder = order;
        saveOrderStatusOverride(order);
        saveOrderHistory(order);
        renderOrders();
        renderTracking();
        if (document.getElementById("myModal").classList.contains("open")) renderMyPage();
        if (document.getElementById("vendorModal").classList.contains("open")) renderVendorOrders();
        if (document.getElementById("adminModal").classList.contains("open")) renderAdminOrders();
        try {
          await syncOrderStatusToSupabase(order);
          setSyncStatus("환불 완료 상태가 Supabase에 저장됨 - " + order.id);
        } catch (error) {
          setSyncStatus("환불 완료는 화면에 반영됨 - DB 업데이트 권한 확인 필요");
        }
      }

      function openAdminLogin() {
        const hint = document.getElementById("adminLoginHint");
        const deliveryMode = pendingAdminMode !== "total";
        const title = document.getElementById("adminLoginTitle");
        const label = document.getElementById("adminPinLabel");
        const button = document.getElementById("adminLoginButton");
        const input = document.getElementById("adminPin");
        if (title) title.textContent = deliveryMode ? "배송사 로그인" : "총관리자 로그인";
        if (label) label.textContent = deliveryMode ? "배송사 PIN" : "총관리자 PIN";
        if (button) button.textContent = deliveryMode ? "배송관리 열기" : "총관리자 열기";
        if (input) input.value = deliveryMode ? "7701" : "0000";
        if (hint) hint.textContent = deliveryMode
          ? "데모 배송사 PIN: 지금배송 동탄센터 7701 / 지금배송 오산센터 7702"
          : "데모 총관리자 PIN은 0000입니다.";
        document.getElementById("adminLoginModal").classList.add("open");
        document.getElementById("adminLoginModal").setAttribute("aria-hidden", "false");
      }

      function closeAdminLogin() {
        document.getElementById("adminLoginModal").classList.remove("open");
        document.getElementById("adminLoginModal").setAttribute("aria-hidden", "true");
      }

      function loginAdmin(event) {
        event.preventDefault();
        const pin = document.getElementById("adminPin").value.trim();
        const nextMode = pendingAdminMode || "delivery";
        const deliveryMode = nextMode !== "total";
        if (!deliveryMode && pin !== adminAccount.pin) {
          document.getElementById("adminLoginHint").textContent = "총관리자 PIN이 맞지 않습니다. 다시 확인해 주세요.";
          return;
        }
        if (deliveryMode) {
          const partner = deliveryPartners.find((item) => item.pin === pin);
          if (!partner) {
            document.getElementById("adminLoginHint").textContent = "배송사 PIN이 맞지 않습니다. 다시 확인해 주세요.";
            return;
          }
          currentAdmin = { name: partner.name, role: "delivery", areas: partner.areas, riders: riderNicknamesForPartner(partner) };
        } else {
          currentAdmin = { name: adminAccount.name, role: "total" };
        }
        saveCurrentAdmin();
        closeAdminLogin();
        setSyncStatus((deliveryMode ? currentAdmin.name : "총관리자") + " 로그인 완료");
        pendingAdminMode = "delivery";
        openAdmin(nextMode);
      }

      function logoutAdmin() {
        currentAdmin = null;
        saveCurrentAdmin();
        closeAdmin();
        setSyncStatus("운영자 로그아웃 완료");
      }

      async function openAdmin(mode = "delivery") {
        if (!currentAdmin) {
          pendingAdminMode = mode;
          openAdminLogin();
          return;
        }
        if (mode === "total" && currentAdmin.role !== "total") {
          currentAdmin = null;
          saveCurrentAdmin();
          pendingAdminMode = mode;
          openAdminLogin();
          return;
        }
        activeAdminMode = mode;
        const title = document.getElementById("adminTitle");
        if (title) title.textContent = mode === "total" ? "총관리자" : currentAdmin.role === "delivery" ? "배송관리 · " + currentAdmin.name : "배송관리";
        if (mode === "total") {
          await clearAdminTestData({ expiredOnly: true, auto: true });
        }
        const adminOrders = await renderAdminOrders();
        const settlementSection = document.getElementById("adminSettlementSection");
        const orderControlSection = document.getElementById("adminOrderControlSection");
        const deliveryRole = document.getElementById("adminPermissionDelivery");
        const totalRole = document.getElementById("adminPermissionTotal");
        const totalMode = mode === "total";
        if (settlementSection) settlementSection.style.display = totalMode ? "" : "none";
        if (orderControlSection) orderControlSection.style.display = totalMode ? "" : "none";
        const deliveryDashboard = document.getElementById("adminDeliveryDashboardSection");
        if (deliveryDashboard) deliveryDashboard.open = shouldAutoOpenAdminDeliveryDashboard(adminOrders || orderHistory, totalMode);
        if (deliveryRole) deliveryRole.style.display = "";
        if (totalRole) totalRole.style.display = totalMode ? "" : "none";
        renderAdminHomeBoard(adminOrders || orderHistory, totalMode);
        const deliveryScope = currentAdmin.role === "delivery" ? " · 담당권역 " + (currentAdmin.areas || []).join("/") : "";
        document.getElementById("adminSession").innerHTML = currentAdmin.name + " 로그인 중 - " + (totalMode ? "앱 전체 권한 활성" : "배송 대시보드 전용" + deliveryScope) + ' <button class="secondary" type="button" onclick="logoutAdmin()" style="min-height:30px;margin-top:8px;">로그아웃</button>';
        document.getElementById("adminModal").classList.add("open");
        document.getElementById("adminModal").setAttribute("aria-hidden", "false");
      }

      function closeAdmin() {
        closeAdminOrderDetail();
        document.getElementById("adminModal").classList.remove("open");
        document.getElementById("adminModal").setAttribute("aria-hidden", "true");
      }

      async function payOrder() {
        if (!lastOrder || !lastOrder.items.length) {
          setSyncStatus("결제 처리할 주문이 없습니다");
          return;
        }
        if (isOrderCancelled(lastOrder)) {
          setSyncStatus("취소된 주문은 결제할 수 없습니다");
          return;
        }
        lastOrder.paid = true;
        lastOrder.paymentLabel = paymentLabelForOrder(lastOrder);
        saveOrderStatusOverride(lastOrder);
        saveOrderHistory(lastOrder);
        try {
          await syncOrderStatusToSupabase(lastOrder);
          await loadSupabaseOrders().catch(() => null);
          lastOrder = orderHistory.find((order) => order.id === lastOrder.id) || lastOrder;
          setSyncStatus("데모 결제 완료 - Supabase 결제 상태 반영");
        } catch (error) {
          setSyncStatus("데모 결제 완료 - 화면 상태 우선 반영");
        }
        renderOrderSummary();
        renderTracking();
        if (document.getElementById("ordersModal").classList.contains("open")) renderOrders();
        if (document.getElementById("myModal").classList.contains("open")) renderMyPage();
        if (document.getElementById("vendorModal").classList.contains("open")) renderVendorOrders();
      }

      function moveOrderStep(direction) {
        if (!lastOrder || !lastOrder.items.length) {
          setSyncStatus("진행할 주문이 없습니다");
          return;
        }
        const current = lastOrder.progressStep || 0;
        if (isOrderCancelled(lastOrder)) {
          setSyncStatus("취소된 주문은 진행할 수 없습니다");
          renderTracking();
          return;
        }
        if (direction > 0 && current >= steps.length - 1) {
          setSyncStatus("이미 배송 완료된 주문입니다");
          renderTracking();
          return;
        }
        if (direction > 0 && current === 0) {
          updateActiveOrderStep(1, "결제 완료 처리");
          return;
        }
        updateActiveOrderStep(current + direction, direction > 0 ? "배송 단계 진행" : "배송 단계 되돌림");
      }

      function renderTrackingActions() {
        const actions = document.getElementById("trackingActions");
        if (!actions) return;
        if (!lastOrder || !lastOrder.items.length) {
          actions.innerHTML = `<button class="primary" type="button" onclick="closeTracking()">새 상품 보기</button>`;
          return;
        }
        actions.innerHTML = `
          <button class="secondary" type="button" onclick="closeTracking(); openOrders()">주문 보기</button>
          <button class="secondary" type="button" ${canReviewOrder(lastOrder) ? "" : "disabled"} onclick="reviewOrder('${lastOrder.id}')">${canReviewOrder(lastOrder) ? "리뷰 작성" : "리뷰 대기"}</button>
          <button class="secondary" type="button" onclick="setSyncStatus('고객센터 연결 준비 중입니다')">고객센터 문의</button>
          <button class="secondary" type="button" ${canCustomerCancelOrReturn(lastOrder) ? "" : "disabled"} onclick="cancelOrder('${lastOrder.id}', 'customer')">${customerCancelActionLabel(lastOrder)}</button>
          <button class="primary" type="button" onclick="closeTracking()">새 상품 보기</button>
        `;
      }

      function renderTracking() {
        const summary = document.getElementById("trackingSummary");
        const title = document.getElementById("trackTitle");
        const pin = document.getElementById("riderPin");
        const orderList = document.getElementById("trackingOrderList");
        if (orderList) {
          orderList.innerHTML = orderHistory.length ? orderHistory.map((order) => `
            <button class="order-card" type="button" onclick="selectTrackingOrder('${order.id}')">
              <div class="order-card-head">
                <div>
                  <strong>${order.id}</strong>
                  <span>${order.createdLabel} - ${order.region}</span>
                </div>
                <span class="order-status">${order.id === (lastOrder && lastOrder.id) ? "추적 중" : orderDisplayLabel(order)}</span>
              </div>
              <div class="line-item"><span>${order.items[0].name}${order.items.length > 1 ? " 외 " + (order.items.length - 1) + "개" : ""}</span><strong>${orderDisplayLabel(order)}</strong></div>
            </button>
          `).join("") : "";
        }
        activeStep = lastOrder ? (lastOrder.progressStep || activeStep || 0) : activeStep;
        const progress = steps.length ? Math.min(86, 10 + activeStep * 19) : 10;
        pin.style.setProperty("--progress", progress + "%");
        if (!lastOrder || !lastOrder.items.length) {
          title.textContent = "아직 예약된 배송이 없습니다";
          summary.innerHTML = `
            <section class="summary-card">
              <h3>배송 예약이 필요해요</h3>
              <div class="line-item"><span>상품을 담고 예약하면</span><strong>실시간 추적 시작</strong></div>
            </section>
          `;
        } else {
          if (isOrderCancelled(lastOrder)) {
            lastOrder.statusLabel = "취소됨";
            lastOrder.paymentLabel = paymentLabelForOrder(lastOrder);
          } else {
            lastOrder.statusLabel = labelFromStep(activeStep);
            lastOrder.paymentLabel = paymentLabelForOrder(lastOrder);
          }
          title.textContent = isOrderCancelled(lastOrder) ? "주문이 취소되었습니다" : activeStep >= 4 ? "배송이 완료되었습니다" : lastOrder.region + "까지 " + Math.max(0, lastOrder.fastest - activeStep * 6) + "분 남았어요";
          summary.innerHTML = `
            <section class="summary-card">
              <h3>주문 ${lastOrder.id}</h3>
              <div class="line-item"><span>배송지</span><strong>${lastOrder.address}</strong></div>
              <div class="line-item"><span>수령 방식</span><strong>${lastOrder.receiveType || "문앞 수령"}</strong></div>
              <div class="line-item"><span>요청사항</span><strong>${lastOrder.riderRequest || "없음"}</strong></div>
              <div class="line-item"><span>상품</span><strong>${lastOrder.items.length}종</strong></div>
              <div class="line-item"><span>결제</span><strong>${lastOrder.paymentMethod || "카카오페이"} · ${paymentLabelForOrder(lastOrder)} · ${formatKRW(lastOrder.total)}</strong></div>
              <div class="line-item"><span>담당 기사</span><strong>${assignedRiderLabel(lastOrder)}</strong></div>
              <div class="line-item"><span>현재 상태</span><strong>${orderDisplayLabel(lastOrder)}</strong></div>
              ${(lastOrder.progressStep || 0) >= 4 && !isOrderCancelled(lastOrder) ? '<div class="line-item"><span>반품/환불 가능 기간</span><strong>' + returnRefundWindowLabel(lastOrder) + '</strong></div>' : ""}
              ${canReviewOrder(lastOrder) ? '<div class="line-item"><span>리뷰 작성</span><strong>' + orderReviewCount(lastOrder) + '/' + lastOrder.items.length + '개</strong></div>' : ""}
              ${isOrderCancelled(lastOrder) ? '<div class="line-item"><span>취소 분류</span><strong>' + cancelReasonLabel(lastOrder) + '</strong></div>' : ""}
              ${isOrderCancelled(lastOrder) ? '<div class="line-item"><span>취소 사유</span><strong>' + (lastOrder.cancelReason || "사유 미입력") + '</strong></div>' : ""}
            </section>
            ${renderCustomerArrivalProof(lastOrder)}
          `;
        }
        const current = activeStep;
        document.getElementById("trackingTimeline").innerHTML = isOrderCancelled(lastOrder) ? `
          <div class="step done">
            <span class="dot"></span>
            <span>주문 취소</span>
            <span>완료</span>
          </div>
        ` : steps.map((step, index) => `
          <div class="step ${index <= current ? "done" : ""}">
            <span class="dot"></span>
            <span>${step}</span>
            <span>${index <= current ? "완료" : "대기"}</span>
          </div>
        `).join("");
        renderTrackingActions();
      }

      async function openTracking() {
        if (supabaseClient) {
          try {
            await loadSupabaseOrders();
          } catch (error) {
            setSyncStatus("추적 주문은 화면 기록 기준으로 표시됨 - DB 불러오기 실패");
          }
        }
        if (!lastOrder && orderHistory.length) {
          lastOrder = orderHistory[0];
          activeStep = lastOrder.progressStep || 0;
        }
        renderTracking();
        document.getElementById("trackingModal").classList.add("open");
        document.getElementById("trackingModal").setAttribute("aria-hidden", "false");
      }

      function closeTracking() {
        document.getElementById("trackingModal").classList.remove("open");
        document.getElementById("trackingModal").setAttribute("aria-hidden", "true");
      }

      async function checkout() {
        if (!cart.length) {
          document.getElementById("receiptCopy").textContent = "배송 예약 전에 아이템을 먼저 담아주세요.";
        } else {
          lastOrder = null;
          renderDeliveryForm();
          document.getElementById("receiptCopy").textContent = "배송 정보를 확인한 뒤 주문을 확정해 주세요.";
        }
        renderOrderSummary();
        activeStep = 0;
        renderTimeline();
        document.getElementById("orderModal").classList.add("open");
        document.getElementById("orderModal").setAttribute("aria-hidden", "false");
        clearInterval(trackingTimer);
      }

      async function confirmCheckout(event) {
        event.preventDefault();
        const deliveryInfo = deliveryFormValues();
        if (!deliveryInfo.name || !deliveryInfo.phone || !deliveryInfo.address) {
          setSyncStatus("고객명, 휴대폰, 배송 주소를 확인해 주세요");
          return;
        }
        currentCustomer = {
          ...currentCustomer,
          name: deliveryInfo.name,
          phone: deliveryInfo.phone,
          id: currentCustomer.id === "guest-preview" ? "customer-" + deliveryInfo.phone : currentCustomer.id,
        };
        saveCurrentCustomer();
        lastOrder = createOrderSnapshot(deliveryInfo);
        if (!reserveOrderStock(lastOrder)) {
          return;
        }
        document.getElementById("addressInput").value = deliveryInfo.address;
        const fastest = Math.min(...cart.map((item) => eta(item)));
        document.getElementById("receiptCopy").textContent = "배송비 포함. 총 " + formatKRW(lastOrder.total) + ". 예상 도착 시간은 " + fastest + "분입니다.";
        clearDeliveryForm();
        let savedToSupabase = false;
        try {
          await syncOrderToSupabase(lastOrder);
          await syncOrderStockProducts(lastOrder);
          savedToSupabase = true;
          setSyncStatus("주문이 Supabase에 저장됨 - " + lastOrder.id);
        } catch (error) {
          setSyncStatus("주문은 화면에만 예약됨 - 재고/DB 저장 실패: 로그인/권한 설정 확인 필요");
        }
        saveOrderHistory(lastOrder);
        if (savedToSupabase) {
          await loadSupabaseOrders().catch(() => null);
        }
        renderProducts();
        renderCart();
        renderVendorProducts();
        renderVendorRoleSummary();
        renderOrderSummary();
        renderTimeline();
        if (document.getElementById("ordersModal").classList.contains("open")) renderOrders();
        if (document.getElementById("myModal").classList.contains("open")) renderMyPage();
      }

      async function runOrderPersistenceCheck() {
        if (!setupClientIfNeeded()) {
          return { ok: false, stage: "config", message: "Supabase 설정이 없습니다." };
        }
        const product = products.find((item) => item.stock > 0) || products[0];
        if (!product) return { ok: false, stage: "cart", message: "테스트할 상품이 없습니다." };
        cart = [];
        addCartItem(product, availableSizeOptions(product)[0] || sizeOptions(product)[0] || "FREE");
        const deliveryInfo = {
          name: "FitNow 테스트",
          phone: "01000000000",
          address: document.getElementById("addressInput").value.trim() || currentRegion().address,
          receiveType: "문앞 수령",
          paymentMethod: "카카오페이",
          riderRequest: "자동 저장 점검",
        };
        const testOrder = createOrderSnapshot(deliveryInfo);
        testOrder.id = "FN-TEST-" + Date.now();
        if (!reserveOrderStock(testOrder)) {
          return { ok: false, stage: "stock", message: "재고 예약 실패" };
        }
        try {
          await syncOrderToSupabase(testOrder);
          await syncOrderStockProducts(testOrder);
          const orderRead = await supabaseClient
            .from("orders")
            .select("id, order_code, total, order_items(*)")
            .eq("order_code", testOrder.id)
            .single();
          if (orderRead.error) throw orderRead.error;
          const itemCount = (orderRead.data.order_items || []).length;
          saveOrderHistory(testOrder);
          renderProducts();
          renderCart();
          return { ok: itemCount === testOrder.items.length, stage: "saved", orderCode: testOrder.id, itemCount, total: orderRead.data.total };
        } catch (error) {
          restoreOrderStock(testOrder);
          renderProducts();
          renderCart();
          return { ok: false, stage: "save", message: error.message || String(error) };
        }
      }

      function renderTimeline() {
        const current = lastOrder ? (lastOrder.progressStep || 0) : activeStep;
        document.getElementById("timeline").innerHTML = timelineMarkup(steps, current);
      }

      function closeModal() {
        document.getElementById("orderModal").classList.remove("open");
        document.getElementById("orderModal").setAttribute("aria-hidden", "true");
      }

      function closeDetail() {
        document.getElementById("detailModal").classList.remove("open");
        document.getElementById("detailModal").setAttribute("aria-hidden", "true");
      }

      wishlist = readWishlistStore();
      recentViews = readRecentViewStore();
      reviews = readReviewStore();
      restoreSavedCustomer();
      restoreSavedVendor();
      restoreSavedAdmin();
      setupAdminTodoHandlers();
      setupAdminSettlementViewHandlers();
      renderProducts();
      renderCart();
      initSupabase().then(() => {
        renderProducts();
        renderCart();
      });

Object.assign(window, {
  checkSupabaseSetup,
  openManagement,
  closeManagement,
  openAdmin,
  openAdminFromManagement,
  openTotalAdminFromManagement,
  openAdminSettlementFromManagement,
  closeAdmin,
  closeSettlementConfirm,
  focusDeliveryWorkShortcut,
  focusAdminTodo,
  highlightAdminTarget,
  startDeliveryProofCapture,
  openAdminOrderDetail,
  openSettlementFlowCheckReport,
  openLatestSettlementFlowCheckReport,
  copySettlementFlowCheckReport,
  downloadSettlementFlowCheckReportCsv,
  openAdminQaChecklist,
  setAdminQaChecklistItem,
  clearAdminQaChecklist,
  copyAdminQaChecklistReport,
  downloadAdminQaChecklistCsv,
  closeAdminOrderDetail,
  openSettlementDetail,
  confirmSettlementOrder,
  confirmSettlementBatch,
  paySettlementBatch,
  holdSettlementBatch,
  releaseSettlementHold,
  runSettlementConfirmAction,
  runSettlementFlowAutoCheck,
  clearSettlementFlowCheckLogs,
  clearAdminTestData,
  clearExpiredDeliveryProofPhotos,
  setTestDataRetention,
  downloadSettlementCsv,
  openSettlementStatement,
  closeSettlementPeriod,
});

// Expose standalone handlers for inline HTML attributes after Vite module bundling.
exposeHandlers({
  addCartItem,
  addDeliveryLog,
  addDetailToCart,
  addItemByKey,
  addLookToCart,
  addSet,
  addToCart,
  addWishlistToCart,
  adminAdvanceOrder,
  adminAdvanceOrderFromDetail,
  adminAssignDelivery,
  adminAssignDeliveryFromDetail,
  adminChangeRider,
  adminChangeRiderFromDetail,
  adminFilterMatches,
  adminOrderBadge,
  adminOrderSearchMatches,
  adminReleaseDelivery,
  adminReleaseDeliveryFromDetail,
  adminStoreRiskBadge,
  adminStoreRiskMetrics,
  adminStoreStats,
  applyAuthSession,
  applyDeliveryAssignment,
  applyExcelDemoSettlementState,
  applyStoredOrderStatus,
  applyStoredSettlementStatus,
  assignedRiderLabel,
  availableSizeOptions,
  averageRating,
  canCancelOrder,
  cancelAdminOrderFromDetail,
  cancelOrder,
  cancelReasonLabel,
  cancelVendorOrderFromDetail,
  canCompleteRefund,
  canCurrentAdminManageOrder,
  canReviewOrder,
  canSyncWishlist,
  canUseSupabase,
  cartTotals,
  checkout,
  checkoutFromCart,
  checkSupabaseSetup,
  claimDeliveryOrder,
  claimDeliveryOrderFromDetail,
  clearDeliveryForm,
  clearExpiredDeliveryProofPhotos,
  closeAdmin,
  closeAdminLogin,
  closeAdminOrderDetail,
  closeCartDetail,
  closeCustomerLogin,
  closeDetail,
  closeLooks,
  closeManagement,
  closeModal,
  closeMyPage,
  closeOrders,
  closeSettlementConfirm,
  closeSettlementPeriod,
  closeTracking,
  closeVendor,
  closeVendorLogin,
  closeVendorOrderDetail,
  closeVendorProductDetail,
  completeRefund,
  completeRefundFromDetail,
  confirmCheckout,
  confirmDeliveryProof,
  confirmDeliveryProofFromDetail,
  startDeliveryProofCapture,
  confirmSettlementOrder,
  confirmSettlementBatch,
  createOrderSnapshot,
  createDeliveryFlowTestOrder,
  createSettlementDemoOrders,
  createSettlementExcelDemoOrders,
  csvCell,
  currentRegion,
  customerContactLabel,
  customerId,
  decodeDeliveryRequest,
  defaultCancelReasonCode,
  defaultPartnerRate,
  deleteLookFromSupabase,
  deleteProductFromSupabase,
  deleteVendorLook,
  deleteVendorProduct,
  deleteVendorProductFromDetail,
  deleteWishlistFromSupabase,
  deliveryAreaLabel,
  deliveryFormValues,
  deliveryLogActor,
  deliveryPartnerForOrder,
  deliveryProofLabel,
  deliverySettlementRows,
  deliveryWarningForOrder,
  deliveryWarningOrders,
  detailRecommendationMarkup,
  detailRecommendations,
  detailSelectedSize,
  discountedPrice,
  downloadSettlementCsv,
  editVendorLook,
  editVendorProduct,
  editVendorProductFromDetail,
  encodeDeliveryRequest,
  ensureProductInSupabase,
  ensureSizeStock,
  eta,
  filteredAdminOrders,
  filterLookItems,
  focusAdminTodo,
  focusDeliveryWorkShortcut,
  findAdminOrder,
  findVendorOrder,
  focusRiderOrders,
  focusVendorSection,
  formatKRW,
  getAuthReturnParams,
  getOAuthRedirectUrl,
  groupedPickups,
  hasDeliveryProof,
  highlightAdminTarget,
  heldSettlementBatchOrders,
  heldSettlementRows,
  holdSettlementBatch,
  initSupabase,
  isDeliveryOrderClaimed,
  isOrderCancelled,
  isTodayOrder,
  isWishlisted,
  itemNormalPrice,
  itemSalePrice,
  labelFromStep,
  latestDeliveryLogTime,
  loadAdminOrders,
  loadSupabaseData,
  loadSupabaseLookSets,
  loadSupabaseOrders,
  loadSupabaseReviews,
  loadSupabaseWishlist,
  loadVendorOrders,
  loginAdmin,
  loginCustomer,
  loginVendor,
  loginWithOAuth,
  logoutAdmin,
  logoutCustomer,
  logoutVendor,
  lookItems,
  lookSetRowToItem,
  lookSummary,
  matchesSettlementPeriod,
  mergeOrderLists,
  mergeReviews,
  mergeWishlistKeys,
  minutesSince,
  moveOrderStep,
  normalizeCancelReasonCode,
  normalizedDiscount,
  openAdmin,
  openAdminFromManagement,
  openAdminLogin,
  openAdminOrderDetail,
  openAdminSettlementFromManagement,
  openCartDetail,
  openCustomerLogin,
  openDetail,
  openLooks,
  openManagement,
  openMyPage,
  openOrders,
  openOrdersFromMy,
  openRecentDetail,
  openSettlementDetail,
  openSettlementFlowCheckReport,
  openLatestSettlementFlowCheckReport,
  copySettlementFlowCheckReport,
  downloadSettlementFlowCheckReportCsv,
  openAdminQaChecklist,
  setAdminQaChecklistItem,
  clearAdminQaChecklist,
  copyAdminQaChecklistReport,
  downloadAdminQaChecklistCsv,
  openSettlementStatement,
  openTotalAdminFromManagement,
  openTracking,
  openTrackingFromMy,
  openVendor,
  openVendorFromManagement,
  openVendorLogin,
  openVendorOrderDetail,
  openVendorProductDetail,
  openVendorSettlementFromManagement,
  orderDisplayLabel,
  orderReviewCount,
  orderRowToHistory,
  ordersForCurrentAdmin,
  ordersForSettlementPartnerFilter,
  orderStatusLabel,
  orderStockGroups,
  paidSettlementRows,
  paymentLabelForOrder,
  paymentLabelFromStep,
  payOrder,
  paySettlementBatch,
  persistDeliveryAssignment,
  persistSettlementBatch,
  personalizedRecommendations,
  previewVendorImage,
  priceMarkup,
  priceRangeMatches,
  productRatingValue,
  productReviewCount,
  productReviews,
  productStatus,
  productStatusClass,
  productStatusLabel,
  productToItem,
  providerLabel,
  ratingLabelForProduct,
  ratingLabelForStore,
  readOrderStatusStore,
  readRecentViewStore,
  readReviewStore,
  readRiderNicknameStore,
  readSettlementRateStore,
  readSettlementStatusStore,
  readVendorSizeStock,
  readWishlistStore,
  recentViewItems,
  refundLabelForOrder,
  refundStatusFromOrder,
  releaseSettlementHold,
  runSettlementConfirmAction,
  runSettlementFlowAutoCheck,
  clearSettlementFlowCheckLogs,
  clearAdminTestData,
  setTestDataRetention,
  rememberRecentView,
  removeCartItem,
  renderAdminHomeBoard,
  renderAdminOrders,
  renderAdminSettlement,
  renderAdminStatusFilters,
  renderAdminTodoBoard,
  renderCart,
  renderCartDetail,
  renderAddressSuggestions,
  renderDeliveryClaimOrders,
  renderDeliveryForm,
  renderDeliveryLogs,
  renderDeliveryRiderGroups,
  renderDeliveryWorkShortcuts,
  renderDeliverySettlement,
  renderDeliveryWarnings,
  renderHeldSettlements,
  renderLoginStores,
  renderLooks,
  renderManagementHub,
  renderMyPage,
  renderOrders,
  renderOrderSummary,
  renderPaidSettlements,
  renderPartnerStores,
  renderProducts,
  renderRecommendations,
  renderRegions,
  renderRiderNicknameManager,
  renderRiderWorkBoard,
  renderSettlementAuditTrail,
  renderSettlementExportActions,
  renderSettlementFlowCheckLogs,
  renderSettlementPartnerFilters,
  renderSettlementPeriodFilters,
  renderSettlementRateManager,
  renderTimeline,
  renderTracking,
  renderTrackingActions,
  renderVendorHomeBoard,
  renderVendorLookPicker,
  renderVendorLooks,
  renderVendorOrderFilters,
  renderVendorOrders,
  renderVendorProducts,
  renderVendorReviews,
  renderVendorRoleSummary,
  renderVendorSettlement,
  renderVendorSizeStockInputs,
  renderVendorStores,
  reserveFromDetail,
  reserveOrderStock,
  runDeliveryFlowAutoCheck,
  runOrderPersistenceCheck,
  resetControls,
  resetVendorForm,
  resetVendorLookForm,
  restoreOrderStock,
  restoreSavedAdmin,
  restoreSavedCustomer,
  restoreSavedVendor,
  reviewOrder,
  reviewRowToItem,
  riderForRegion,
  riderKey,
  riderLoadBadge,
  riderNicknamesForPartner,
  riderOptionsForPartner,
  riderSettlementRate,
  riderWorkBadge,
  riderWorkRows,
  saveCurrentAdmin,
  saveCurrentCustomer,
  saveCurrentVendor,
  saveOrderHistory,
  saveOrderStatusOverride,
  saveRecentViewStore,
  saveReviewStore,
  saveRiderNicknameStore,
  saveSettlementRateStore,
  saveSettlementStatus,
  saveWishlistStore,
  selectAddressSuggestion,
  selectDetailSize,
  selectedLookSize,
  selectedValue,
  selectOrder,
  selectTrackingOrder,
  setAdminOrderSearch,
  setAdminSettlementView,
  setAdminStatusFilter,
  setCategory,
  setPriceRange,
  setRegion,
  setSettlementPartnerFilter,
  setSettlementPeriodFilter,
  setShowroom,
  setSizeFilter,
  setSort,
  setSyncStatus,
  settlementBatchOrders,
  settlementAuditEvents,
  settlementClosableOrders,
  settlementDateForOrder,
  settlementDemoOrder,
  settlementDetailOrders,
  settlementExportModeLabel,
  settlementExportOrders,
  settlementPartnerLabel,
  settlementPayout,
  settlementPeriodLabel,
  settlementPeriodStart,
  settlementStatementRows,
  settlementStatusLabel,
  settlementSummaryForOrder,
  settlementTimeLabel,
  setupClientIfNeeded,
  bindAdminTodoButtons,
  setupFilters,
  setVendorOrderFilter,
  setVendorProductStatus,
  showroomToStore,
  sizeFilterMatches,
  sizeOptions,
  sizeStock,
  slugify,
  statusFromStep,
  stepFromStatus,
  storeByName,
  storeIsVisible,
  storeReviews,
  submitVendorLook,
  submitVendorProduct,
  syncAuthSession,
  syncLocalWishlistToSupabase,
  syncLookToSupabase,
  syncOrderStatusToSupabase,
  syncOrderStockProducts,
  syncOrderToSupabase,
  syncProductToSupabase,
  syncReviewToSupabase,
  syncStoreToSupabase,
  syncWishlistToSupabase,
  toggleFast,
  toggleStore,
  toggleWishlist,
  totalSizeStock,
  updateActiveOrderStep,
  updateAddress,
  updateCartQuantity,
  updateOrderAddressSearch,
  updatePartnerSettlementRate,
  updateRiderNickname,
  updateRiderSettlementRate,
  updateStoreArea,
  updateStorePrep,
  updateVendorStockTotal,
  uploadProductImage,
  vendorAdvanceOrder,
  vendorAdvanceOrderFromDetail,
  vendorOrderFilterMatches,
  vendorOrderItems,
  vendorOrderTotal,
  vendorSizeOptionsFromInput,
  vendorStores,
  visibleDeliveryLogs,
  visibleProducts,
  visualMarkup,
  wishlistItems,
});
