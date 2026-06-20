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
import * as THREE from "three";
import realFitModelImage from "../assets/fitnow-real-fit-model.png";

      const SETTLEMENT_FLOW_CHECK_LOG_KEY = "fitnow_settlement_flow_check_logs";
      const TEST_DATA_RETENTION_KEY = "fitnow_test_data_retention";
      const TEST_TOOL_META_KEY = "fitnow_test_tool_meta";
      const ADMIN_QA_CHECKLIST_KEY = "fitnow_admin_qa_checklist";
      const FIT_PROFILE_STORAGE_KEY = "fitnow_fit_profile";
      const AVATAR_LOOK_RECOMMEND_STORAGE_KEY = "fitnow_avatar_look_recommendations";
      const AVATAR_LOOK_SAVED_STORAGE_KEY = "fitnow_avatar_look_saved";
      const AVATAR_LOOK_SHARE_PARAM = "avatarLook";
      const DELIVERY_PROOF_RETENTION_DAYS = 30;
      const DELIVERY_PROOF_RETENTION_MS = DELIVERY_PROOF_RETENTION_DAYS * 24 * 60 * 60 * 1000;
      const RETURN_REFUND_WINDOW_DAYS = 14;
      const RETURN_REFUND_WINDOW_MS = RETURN_REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;
      const RETURN_REFUND_PROCESS_HOURS = 24;
      const RETURN_REFUND_PROCESS_MS = RETURN_REFUND_PROCESS_HOURS * 60 * 60 * 1000;
      const TEST_DATA_RETENTION_OPTIONS = {
        "1h": { label: "1시간", ms: 60 * 60 * 1000 },
        "24h": { label: "24시간", ms: 24 * 60 * 60 * 1000 },
        "7d": { label: "7일", ms: 7 * 24 * 60 * 60 * 1000 },
      };

      function isAdminAccessEnabled() {
        const params = new URLSearchParams(window.location.search || "");
        return ["1", "true", "yes"].includes(params.get("admin") || "")
          || ["1", "true", "yes"].includes(params.get("manage") || "")
          || ["1", "true", "yes"].includes(params.get("operator") || "")
          || ["1", "true"].includes(params.get("diagnostic") || "")
          || ["1", "true", "delivery"].includes(params.get("test") || "")
          || ["1", "true", "delivery"].includes(params.get("photo-proof-check") || "");
      }

      function applyAdminAccessVisibility() {
        document.body.classList.toggle("admin-access-enabled", isAdminAccessEnabled());
      }

      function requireAdminAccess() {
        if (isAdminAccessEnabled()) return true;
        setSyncStatus("관리 기능은 관리자 전용 주소에서만 열 수 있습니다.");
        return false;
      }

      let selectedShowroom = "전체";
      let selectedLookKeys = [];
      let selectedCategory = "전체";
      let selectedSizeFilter = "전체";
      let selectedPriceRange = "전체";
      let selectedRegion = "dongtan2";
      let addressSuggestionState = { home: [], order: [] };
      let sortMode = "rating";
      let onlyFast = false;
      let activeFeedTab = "popular";
      let filterPanelOpen = false;
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
      let activeFitPreviewKey = "";
      let activeFitViewMode = "real";
      let activeAvatarLookSnapshot = null;
      let lastFitRoomAvatarSnapshot = null;
      let avatarTryOnState = { status: "idle", photoDataUrl: "", photoName: "" };
      let fit3dRuntime = null;
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
        const node = document.getElementById("syncStatus");
        if (node) node.textContent = message;
      }

      function goHome() {
        document.querySelectorAll(".modal.open").forEach((modal) => {
          modal.classList.remove("open");
          modal.setAttribute("aria-hidden", "true");
        });
        document.querySelectorAll(".bottom-tabs button").forEach((button) => {
          button.classList.toggle("active", button.textContent.trim() === "홈");
        });
        const frame = document.querySelector(".phone-frame");
        if (frame) frame.scrollTo({ top: 0, behavior: "smooth" });
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
        if (order.refundStatus === "requested") return "반품/환불 요청";
        if (order.refundStatus === "approved") return "환불 승인";
        if (order.refundStatus === "rejected") return "환불 거절";
        if (order.refundStatus === "completed") return "환불 완료";
        if (order.refundStatus === "not_required") return "현장결제 취소";
        if (order.refundStatus === "pending") return "환불 대기";
        if (order.paymentMethod === "현장결제" || !order.paid) return "현장결제 취소";
        return "환불 대기";
      }

      function customerRefundStatusLabel(order) {
        if (!isOrderCancelled(order) || (order && order.cancelReasonCode) !== "return_refund") return "";
        const status = refundStatusFromOrder(order);
        if (status === "requested") return "요청 접수";
        if (status === "approved") return "승인됨";
        if (status === "rejected") return "거절됨";
        if (status === "completed") return "환불 완료";
        if (status === "not_required") return "현장결제 취소";
        return "처리 중";
      }

      function customerRefundStatusDetail(order) {
        if (!isOrderCancelled(order) || (order && order.cancelReasonCode) !== "return_refund") return "";
        const status = refundStatusFromOrder(order);
        if (status === "requested") return "입점업체 또는 관리자가 요청 내용을 확인하고 있습니다.";
        if (status === "approved") return "요청이 승인되었습니다. 환불 완료 처리를 기다리고 있습니다.";
        if (status === "rejected") return "요청이 거절되었습니다. 자세한 내용은 고객센터로 문의해 주세요.";
        if (status === "completed") return "환불 처리가 완료되었습니다.";
        if (status === "not_required") return "현장결제 주문으로 별도 카드 환불이 필요하지 않습니다.";
        return "환불 상태를 확인하고 있습니다.";
      }

      function customerRefundMemoLabel(order) {
        if (!isOrderCancelled(order) || (order && order.cancelReasonCode) !== "return_refund" || !order.refundMemo) return "";
        return order.refundMemo;
      }

      function customerRefundStatusClass(order) {
        const status = refundStatusFromOrder(order);
        if (status === "completed") return "done";
        if (status === "approved") return "approved";
        if (status === "rejected") return "rejected";
        if (status === "requested") return "requested";
        if (status === "not_required") return "done";
        return "pending";
      }

      function customerRefundStatusCard(order, compact = false) {
        const label = customerRefundStatusLabel(order);
        if (!label) return "";
        const detail = customerRefundStatusDetail(order);
        const memo = customerRefundMemoLabel(order);
        const process = isOpenRefundStatus(order) ? returnRefundProcessInfo(order).label : "처리 완료";
        return `
          <div class="customer-refund-card ${customerRefundStatusClass(order)} ${compact ? "compact" : ""}">
            <div>
              <span>반품/환불</span>
              <strong>${label}</strong>
            </div>
            <p>${detail}</p>
            <small>${process}${memo ? " · " + memo : ""}</small>
          </div>
        `;
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
        const status = refundStatusFromOrder(order);
        return isOrderCancelled(order) && (status === "pending" || status === "approved");
      }

      function canReviewReturnRefund(order) {
        return isOrderCancelled(order) && order.cancelReasonCode === "return_refund" && refundStatusFromOrder(order) === "requested";
      }

      function isOpenRefundStatus(order) {
        return ["pending", "requested", "approved"].includes(refundStatusFromOrder(order));
      }

      function returnRefundRequestedAt(order) {
        if (!order || order.cancelReasonCode !== "return_refund") return "";
        return order.refundRequestedAt || order.refundHandledAt || order.updatedAt || order.createdAt || "";
      }

      function returnRefundProcessInfo(order, now = Date.now()) {
        const requestedAt = returnRefundRequestedAt(order);
        const time = new Date(requestedAt || "").getTime();
        if (!Number.isFinite(time)) return { label: "처리기한 미확인", cls: "ready", overdue: false, hoursLeft: null };
        const deadline = time + RETURN_REFUND_PROCESS_MS;
        const hoursLeft = Math.ceil((deadline - now) / (60 * 60 * 1000));
        if (hoursLeft <= 0) return { label: "처리 지연", cls: "refund", overdue: true, hoursLeft };
        if (hoursLeft <= 6) return { label: "마감 " + hoursLeft + "시간 전", cls: "refund", overdue: false, hoursLeft };
        return { label: "처리기한 " + hoursLeft + "시간", cls: "ready", overdue: false, hoursLeft };
      }

      function canVendorManageRefund(order) {
        return !!(currentVendor && order && (order.items || []).some((item) => item.showroom === currentVendor.store));
      }

      const cancelReasonOptions = [
        { key: "customer", label: "고객 요청" },
        { key: "return_refund", label: "반품/환불 요청" },
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
        if (["return_refund", "return", "refund", "반품", "환불", "반품/환불", "반품환불", "반품/환불 요청", "반품환불요청"].includes(text)) return "return_refund";
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
          refundRequestedAt: order.refundRequestedAt || "",
          refundMemo: order.refundMemo || "",
          refundHandledBy: order.refundHandledBy || "",
          refundHandledAt: order.refundHandledAt || "",
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
          order.refundRequestedAt = stored.refundRequestedAt || order.refundRequestedAt || "";
          order.refundMemo = stored.refundMemo || order.refundMemo || "";
          order.refundHandledBy = stored.refundHandledBy || order.refundHandledBy || "";
          order.refundHandledAt = stored.refundHandledAt || order.refundHandledAt || "";
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
        if (!isAdminAccessEnabled()) return;
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
        if (!isAdminAccessEnabled()) return;
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
          const storageText = failedStorage.length ? "이미지 저장소 실패: " + failedStorage.map((item) => {
            const missingBucket = /bucket not found/i.test(item.error || "");
            if (missingBucket) return item.name + " 버킷 없음 - docs/supabase-schema.sql 전체 실행 또는 Storage에서 Public 버킷 생성 필요";
            return item.name + " " + item.error;
          }).join(", ") : "";
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

      function productMetaData(meta) {
        if (!meta) return {};
        if (typeof meta === "object") return meta;
        try {
          const parsed = JSON.parse(meta);
          return parsed && typeof parsed === "object" ? parsed : { note: String(meta) };
        } catch (error) {
          return { note: String(meta) };
        }
      }

      function productToItem(row) {
        const meta = productMetaData(row.meta);
        const fitMeasurements = meta.fitMeasurements || {};
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
          garmentLength: Number(fitMeasurements.garmentLength) || 0,
          shoulderWidth: Number(fitMeasurements.shoulderWidth) || 0,
          chestWidth: Number(fitMeasurements.chestWidth) || 0,
          waistWidth: Number(fitMeasurements.waistWidth) || 0,
          modelHeight: Number(fitMeasurements.modelHeight) || 0,
          modelWeight: Number(fitMeasurements.modelWeight) || 0,
          note: row.description || meta.note || "입점업체가 등록한 상품입니다.",
          vendorAdded: true,
        };
      }

      function avatarTestProduct() {
        return {
          key: "white-regular-overfit-tee",
          name: "화이트 레귤러핏 오버핏 반팔티",
          price: 39000,
          discountRate: 10,
          showroom: "어반클로젯 동탄",
          stock: 12,
          minutes: 28,
          match: 91,
          material: "코튼 100%",
          visual: "tshirt",
          category: "상의",
          fit: "레귤러 기반 오버핏 반팔",
          size: "M / L / XL",
          garmentLength: 72,
          shoulderWidth: 54,
          chestWidth: 58,
          waistWidth: 56,
          modelHeight: 176,
          modelWeight: 68,
          note: "화이트 컬러의 기본 반팔티입니다. 레귤러 핏보다 여유 있고 과하지 않은 오버핏이라 데님, 쇼츠, 조거 팬츠에 바로 매칭하기 좋습니다.",
        };
      }

      function ensureAvatarTestProduct() {
        const existing = products.find((item) => item.key === "white-regular-overfit-tee");
        if (existing) {
          Object.assign(existing, avatarTestProduct(), { dbId: existing.dbId, showroomId: existing.showroomId });
          return existing;
        }
        const insertIndex = Math.max(0, Math.min(1, products.length));
        products.splice(insertIndex, 0, avatarTestProduct());
        return products[insertIndex];
      }

      function fit3dTestProductImage(label, color) {
        const svg = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 920">
            <defs>
              <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stop-color="#f8f3e9"/>
                <stop offset="1" stop-color="#ded6c8"/>
              </linearGradient>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#171717" flood-opacity=".18"/>
              </filter>
            </defs>
            <rect width="720" height="920" fill="url(#bg)"/>
            <rect x="92" y="88" width="536" height="744" rx="32" fill="#fffaf0" opacity=".72"/>
            <g filter="url(#shadow)">
              <path d="M220 238c42-42 238-42 280 0l58 62-72 68-34-30v312H268V338l-34 30-72-68 58-62z" fill="${color}"/>
              <path d="M266 238c18 44 170 44 188 0" fill="none" stroke="#171717" stroke-opacity=".18" stroke-width="16" stroke-linecap="round"/>
              <path d="M284 414h152M284 472h152M284 530h128" stroke="#171717" stroke-opacity=".12" stroke-width="12" stroke-linecap="round"/>
            </g>
            <text x="360" y="760" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="800" fill="#171717">${label}</text>
            <text x="360" y="806" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#68635d">FitNow QA product image</text>
          </svg>
        `;
        return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
      }

      function fit3dTypeTestProducts() {
        const showroom = "어반클로젯 동탄";
        const palette = ["#f4f0e8", "#cfe4f7", "#2f3b46", "#9f8f7d", "#222a33", "#ccb08a"];
        return [
          { key: "fit3d-test-tshirt", name: "3D 테스트 화이트 반팔티", category: "상의", visual: "tshirt", fit: "레귤러 반팔", colorNote: "기본 티셔츠" },
          { key: "fit3d-test-shirt", name: "3D 테스트 셔츠 블라우스", category: "상의", visual: "shirt", fit: "셔츠/블라우스", colorNote: "단추 라인" },
          { key: "fit3d-test-hoodie", name: "3D 테스트 후드 맨투맨", category: "상의", visual: "hoodie", fit: "후드 오버핏", colorNote: "후드 스트링" },
          { key: "fit3d-test-jacket", name: "3D 테스트 자켓 아우터", category: "상의", visual: "jacket", fit: "자켓/아우터", colorNote: "라펠 레이어" },
          { key: "fit3d-test-wide-pants", name: "3D 테스트 와이드 팬츠", category: "하의", visual: "wide-pants", fit: "와이드 조거 팬츠", colorNote: "넓은 하의" },
          { key: "fit3d-test-bag", name: "3D 테스트 크로스백", category: "잡화", visual: "bag", fit: "가방/잡화", colorNote: "크로스백" },
        ].map((item, index) => ({
          ...item,
          price: 39000 + index * 5000,
          discountRate: 10,
          showroom,
          stock: 8,
          minutes: 28 + index,
          match: 88,
          material: index === 4 ? "코튼 트윌" : "코튼 혼방",
          size: index === 4 ? "M / L / XL" : "Free / M / L",
          garmentLength: index === 4 ? 98 : 70,
          shoulderWidth: index === 4 ? 0 : 52,
          chestWidth: index === 4 ? 0 : 58,
          waistWidth: index === 4 ? 40 : 56,
          modelHeight: 176,
          modelWeight: 68,
          image: fit3dTestProductImage(item.colorNote, palette[index] || "#d8d0c4"),
          note: item.colorNote + " 3D 가상착용 QA용 테스트 상품입니다.",
          vendorAdded: true,
          status: "selling",
          sizeStock: index === 4 ? { M: 3, L: 3, XL: 2 } : { Free: 2, M: 3, L: 3 },
        }));
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
          refundRequestedAt: order.refundRequestedAt || "",
          refundMemo: order.refundMemo || "",
          refundHandledBy: order.refundHandledBy || "",
          refundHandledAt: order.refundHandledAt || "",
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
              refundRequestedAt: parsed.refundRequestedAt || "",
              refundMemo: parsed.refundMemo || "",
              refundHandledBy: parsed.refundHandledBy || "",
              refundHandledAt: parsed.refundHandledAt || "",
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
          return { address: value || fallbackRegion || "", receiveType: "문앞 수령", paymentMethod: "", riderRequest: "", cancelReasonCode: "", cancelReason: "", refundStatus: "", refundRequestedAt: "", refundMemo: "", refundHandledBy: "", refundHandledAt: "", stockReserved: false, stockRestored: false, deliveryPartnerName: "", riderName: "", pickupConfirmedAt: "", arrivalConfirmedAt: "", pickupProofPhoto: null, arrivalProofPhoto: null, settlementStatus: "", settlementConfirmedAt: "", settlementConfirmedBy: "", settlementPaidAt: "", settlementHoldReason: "", settlementHeldAt: "", settlementReleasedAt: "", settlementClosedAt: "", settlementClosedBy: "", settlementCloseLabel: "", deliveryLogs: [] };
        }
        return { address: value || fallbackRegion || "", receiveType: "문앞 수령", paymentMethod: "", riderRequest: "", cancelReasonCode: "", cancelReason: "", refundStatus: "", refundRequestedAt: "", refundMemo: "", refundHandledBy: "", refundHandledAt: "", stockReserved: false, stockRestored: false, deliveryPartnerName: "", riderName: "", pickupConfirmedAt: "", arrivalConfirmedAt: "", pickupProofPhoto: null, arrivalProofPhoto: null, settlementStatus: "", settlementConfirmedAt: "", settlementConfirmedBy: "", settlementPaidAt: "", settlementHoldReason: "", settlementHeldAt: "", settlementReleasedAt: "", settlementClosedAt: "", settlementClosedBy: "", settlementCloseLabel: "", deliveryLogs: [] };
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
          ensureAvatarTestProduct();
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
          (orderResult.data || []).map(orderRowToHistory).filter((order) => !isDiagnosticOrder(order) || isReturnRefundTestOrder(order)),
          orderHistory.filter((order) => !isDiagnosticOrder(order) || isReturnRefundTestOrder(order)),
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
          .filter((order) => !isDiagnosticOrder(order) || isReturnRefundTestOrder(order))
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
          refundRequestedAt: deliveryRequest.refundRequestedAt || "",
          refundMemo: deliveryRequest.refundMemo || "",
          refundHandledBy: deliveryRequest.refundHandledBy || "",
          refundHandledAt: deliveryRequest.refundHandledAt || "",
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

      function isReturnRefundTestOrder(order) {
        const id = String(order && order.id || "");
        return id.startsWith("FN-TEST-RETURN-");
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
        const returnRefundRequests = vendorOrders.filter(isVendorReturnRefundRequest);
        const approvedRefunds = vendorOrders.filter(isVendorRefundApproved);
        const overdueReturnRefunds = vendorOrders.filter((order) => order.cancelReasonCode === "return_refund" && isOpenRefundStatus(order) && returnRefundProcessInfo(order).overdue);
        const lowStock = vendorItems.filter((item) => productStatus(item) === "selling" && totalSizeStock(item) <= 2).length;
        const stoppedItems = vendorItems.filter((item) => productStatus(item) !== "selling").length;
        const todaySales = vendorOrders
          .filter((order) => !isOrderCancelled(order) && (order.progressStep || 0) >= 4 && isTodayOrder(order))
          .reduce((sum, order) => sum + vendorOrderTotal(order), 0);
        const recentReviews = storeReviews(currentVendor.store).filter((review) => isTodayOrder(review)).length;
        const alerts = [];
        if (activeOrders.length) alerts.push({ text: "새 주문 " + activeOrders.length + "건이 재고 확인 또는 픽업 준비를 기다리고 있어요.", good: false });
        if (returnRefundRequests.length) alerts.push({ text: "반품/환불 요청 " + returnRefundRequests.length + "건이 승인 또는 거절 처리를 기다리고 있어요.", good: false });
        if (approvedRefunds.length) alerts.push({ text: "승인된 환불 " + approvedRefunds.length + "건은 환불 완료 처리가 필요해요.", good: false });
        if (overdueReturnRefunds.length) alerts.push({ text: "처리 기한이 지난 반품/환불 " + overdueReturnRefunds.length + "건이 있어요.", good: false });
        if (lowStock) alerts.push({ text: "재고 2개 이하 상품 " + lowStock + "개가 있어요. 상품 관리에서 재고를 확인해 주세요.", good: false });
        if (stoppedItems) alerts.push({ text: "품절/숨김 상품 " + stoppedItems + "개는 고객에게 노출되지 않고 있어요.", good: false });
        if (todaySales > 0) alerts.push({ text: "오늘 배송완료 매출은 " + formatKRW(todaySales) + "입니다.", good: true });
        if (recentReviews) alerts.push({ text: "오늘 새 리뷰 " + recentReviews + "개가 등록됐어요.", good: true });
        if (!alerts.length) alerts.push({ text: "현재 급하게 처리할 알림이 없습니다. 운영 상태가 깔끔해요.", good: true });
        board.innerHTML = `
          <div class="vendor-home-grid">
            <div class="vendor-home-tile"><span>처리할 주문</span><strong>${activeOrders.length}건</strong></div>
            <div class="vendor-home-tile"><span>반품요청</span><strong>${returnRefundRequests.length}건</strong></div>
            <div class="vendor-home-tile"><span>환불승인</span><strong>${approvedRefunds.length}건</strong></div>
            <div class="vendor-home-tile"><span>처리지연</span><strong>${overdueReturnRefunds.length}건</strong></div>
            <div class="vendor-home-tile"><span>재고 부족</span><strong>${lowStock}개</strong></div>
            <div class="vendor-home-tile"><span>품절/숨김</span><strong>${stoppedItems}개</strong></div>
            <div class="vendor-home-tile"><span>오늘 매출</span><strong>${formatKRW(todaySales)}</strong></div>
          </div>
          <div class="vendor-alert-list">
            ${alerts.map((alert) => '<div class="vendor-alert-row ' + (alert.good ? 'good' : '') + '">' + alert.text + '</div>').join("")}
          </div>
          <div class="vendor-home-actions">
            <button type="button" ${returnRefundRequests.length ? "" : "disabled"} onclick="setVendorOrderFilter('return_refund_requested')">반품요청 보기</button>
            <button type="button" ${approvedRefunds.length ? "" : "disabled"} onclick="setVendorOrderFilter('refund_approved')">환불승인 보기</button>
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

      function isVendorReturnRefundRequest(order) {
        return !!(vendorOrderItems(order).length && isOrderCancelled(order) && order.cancelReasonCode === "return_refund" && refundStatusFromOrder(order) === "requested");
      }

      function isVendorRefundApproved(order) {
        return !!(vendorOrderItems(order).length && isOrderCancelled(order) && order.cancelReasonCode === "return_refund" && refundStatusFromOrder(order) === "approved");
      }

      function vendorOrderFilterMatches(order, filter) {
        const step = order.progressStep || 0;
        const cancelled = isOrderCancelled(order);
        if (filter === "return_refund_requested") return isVendorReturnRefundRequest(order);
        if (filter === "refund_approved") return isVendorRefundApproved(order);
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
          { key: "return_refund_requested", label: "반품요청" },
          { key: "refund_approved", label: "환불승인" },
          { key: "completed", label: "완료" },
          { key: "cancelled", label: "취소·환불" },
          { key: "all", label: "전체" },
        ];
        node.innerHTML = filters.map((filter) => {
          const count = orders.filter((order) => vendorOrderFilterMatches(order, filter.key)).length;
          return '<button class="vendor-order-filter ' + (vendorOrderFilter === filter.key ? 'active-control' : '') + '" type="button" onclick="setVendorOrderFilter(\'' + filter.key + '\')"><span>' + filter.label + '</span><strong>' + count + '</strong></button>';
        }).join("");
      }

      async function setVendorOrderFilter(filter) {
        vendorOrderFilter = filter;
        await renderVendorOrders();
        focusVendorSection("vendorOrderSection");
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
        const refundPending = cancelledOrders.filter((order) => isOpenRefundStatus(order)).reduce((sum, order) => sum + vendorOrderTotal(order), 0);
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
        const emptyLabel = vendorOrderFilter === "return_refund_requested" ? "반품/환불 요청 주문이 없습니다" : vendorOrderFilter === "refund_approved" ? "환불 승인 주문이 없습니다" : vendorOrderFilter === "cancelled" ? "취소·환불 주문이 없습니다" : vendorOrderFilter === "completed" ? "완료된 주문이 없습니다" : vendorOrderFilter === "all" ? "아직 이 매장 주문이 없습니다" : "처리할 주문이 없습니다";
        const emptyStatus = vendorOrderFilter === "active" || vendorOrderFilter === "return_refund_requested" || vendorOrderFilter === "refund_approved" ? "현재 깔끔함" : "주문 대기";
        list.innerHTML = visibleOrders.length ? visibleOrders.map((order) => {
          const vendorItems = order.items.filter((item) => item.showroom === currentVendor.store);
          const vendorTotal = vendorItems.reduce((sum, item) => sum + itemSalePrice(item) * item.quantity, 0);
          const cancelled = isOrderCancelled(order);
          const paidAndActive = order.paid && !cancelled;
          const returnRefundActive = order.cancelReasonCode === "return_refund";
          const quickOrderActions = !returnRefundActive && !cancelled ? `
            <button type="button" ${paidAndActive ? "" : "disabled"} onclick="vendorAdvanceOrder('${order.id}', 1)">${!order.paid ? "결제 대기" : (order.progressStep || 0) >= 1 ? "재고 확인됨" : "재고 확인"}</button>
            <button type="button" ${paidAndActive ? "" : "disabled"} onclick="vendorAdvanceOrder('${order.id}', 2)">${!order.paid ? "결제 대기" : (order.progressStep || 0) >= 2 ? "픽업 준비됨" : "픽업 준비"}</button>
          ` : "";
          const quickRefundActions = returnRefundActive ? `
            <button class="refund-approve" type="button" ${canVendorManageRefund(order) && canReviewReturnRefund(order) ? "" : "disabled"} onclick="approveVendorReturnRefundFromDetail('${order.id}')">승인</button>
            <button class="refund-reject" type="button" ${canVendorManageRefund(order) && canReviewReturnRefund(order) ? "" : "disabled"} onclick="rejectVendorReturnRefundFromDetail('${order.id}')">거절</button>
            <button class="refund-complete" type="button" ${canVendorManageRefund(order) && canCompleteRefund(order) ? "" : "disabled"} onclick="completeVendorRefundFromDetail('${order.id}')">${canCompleteRefund(order) ? "환불 완료" : paymentLabelForOrder(order)}</button>
          ` : "";
          return `
            <div class="vendor-product-row vendor-order-row">
              <div>
                <strong>${order.id} · ${orderDisplayLabel(order)}</strong>
                <span>${vendorItems.length}개 상품 · ${vendorItems.map((item) => item.name).join(", ")}</span>
                <span>${formatKRW(vendorTotal)} · ${paymentLabelForOrder(order)}</span>
                ${order.cancelReasonCode === "return_refund" ? '<span>반품/환불: ' + customerRefundStatusLabel(order) + '</span>' : ""}
                ${order.cancelReasonCode === "return_refund" && isOpenRefundStatus(order) ? '<span>처리 기한: ' + returnRefundProcessInfo(order).label + '</span>' : ""}
              </div>
              <div class="vendor-order-action-panel">
                <button class="vendor-order-detail-button" type="button" onclick="openVendorOrderDetail('${order.id}')">상세 확인</button>
                ${quickOrderActions ? '<div class="vendor-order-quick-actions">' + quickOrderActions + '</div>' : ""}
                ${quickRefundActions ? '<div class="refund-action-buttons vendor-order-refund-actions">' + quickRefundActions + '</div>' : ""}
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
        const returnRefundActive = order.cancelReasonCode === "return_refund";
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
                ${order.cancelReasonCode === "return_refund" ? '<span>반품/환불 기준: 배송완료 후 ' + RETURN_REFUND_WINDOW_DAYS + '일 이내 요청</span>' : ""}
                <span>환불 상태: ${paymentLabelForOrder(order)}</span>
                ${order.cancelReasonCode === "return_refund" && isOpenRefundStatus(order) ? '<span>처리 기한: ' + returnRefundProcessInfo(order).label + '</span>' : ""}
                ${order.refundHandledBy ? '<span>처리자: ' + order.refundHandledBy + '</span>' : ""}
                ${order.refundMemo ? '<span>처리 메모: ' + order.refundMemo + '</span>' : ""}
              </div>
            ` : ""}
            <div class="vendor-detail-actions">
              <div class="vendor-detail-action-group">
                <strong>주문 처리</strong>
                ${cancelled ? '<span>취소된 주문이라 재고 확인, 픽업 준비, 주문 취소 처리는 닫혔습니다.</span>' : `
                  <div class="mini-actions vendor-detail-action-buttons">
                    <button type="button" ${paidAndActive ? "" : "disabled"} onclick="vendorAdvanceOrderFromDetail('${order.id}', 1)">${!order.paid ? "결제 대기" : (order.progressStep || 0) >= 1 ? "재고 확인됨" : "재고 확인"}</button>
                    <button type="button" ${paidAndActive ? "" : "disabled"} onclick="vendorAdvanceOrderFromDetail('${order.id}', 2)">${!order.paid ? "결제 대기" : (order.progressStep || 0) >= 2 ? "픽업 준비됨" : "픽업 준비"}</button>
                    <button class="danger" type="button" ${canCancelOrder(order) ? "" : "disabled"} onclick="cancelVendorOrderFromDetail('${order.id}')">주문 취소</button>
                  </div>
                `}
              </div>
              ${returnRefundActive ? `
                <div class="vendor-detail-action-group refund-action-group">
                  <strong>반품/환불 처리</strong>
                  <span>${customerRefundStatusLabel(order) || paymentLabelForOrder(order)} · ${isOpenRefundStatus(order) ? returnRefundProcessInfo(order).label : "처리 완료"}</span>
                  <div class="refund-action-buttons">
                    <button class="refund-approve" type="button" ${canVendorManageRefund(order) && canReviewReturnRefund(order) ? "" : "disabled"} onclick="approveVendorReturnRefundFromDetail('${order.id}')">승인</button>
                    <button class="refund-reject" type="button" ${canVendorManageRefund(order) && canReviewReturnRefund(order) ? "" : "disabled"} onclick="rejectVendorReturnRefundFromDetail('${order.id}')">거절</button>
                    <button class="refund-complete" type="button" ${canVendorManageRefund(order) && canCompleteRefund(order) ? "" : "disabled"} onclick="completeVendorRefundFromDetail('${order.id}')">${canVendorManageRefund(order) && canCompleteRefund(order) ? "환불 완료" : paymentLabelForOrder(order)}</button>
                  </div>
                </div>
              ` : ""}
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

      async function completeVendorRefundFromDetail(orderId) {
        await completeRefund(orderId, "vendor");
        await openVendorOrderDetail(orderId);
      }

      async function approveVendorReturnRefundFromDetail(orderId) {
        await reviewReturnRefund(orderId, "approved", "vendor");
        await openVendorOrderDetail(orderId);
      }

      async function rejectVendorReturnRefundFromDetail(orderId) {
        await reviewReturnRefund(orderId, "rejected", "vendor");
        await openVendorOrderDetail(orderId);
      }

      function resetVendorForm() {
        editingProductKey = "";
        document.getElementById("vendorSubmitButton").textContent = "상품 등록";
        document.getElementById("vendorName").value = "신규 등록 상품 " + (vendorProductCount + 1);
        document.getElementById("vendorCategory").value = "상의";
        const visualSelect = document.getElementById("vendorVisual");
        if (visualSelect) visualSelect.value = "tshirt";
        document.getElementById("vendorPrice").value = 69000;
        document.getElementById("vendorDiscount").value = 10;
        document.getElementById("vendorStock").value = 3;
        document.getElementById("vendorMinutes").value = 36;
        document.getElementById("vendorMatch").value = 86;
        document.getElementById("vendorMaterial").value = "코튼 니트";
        document.getElementById("vendorSize").value = "Free / 44-66";
        document.getElementById("vendorNote").value = "동탄, 오산 퇴근길에 바로 받기 좋은 레이어드 아이템이에요.";
        writeVendorFitMeasurements();
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

      function vendorMeasurementValue(id) {
        return Math.max(0, Number(document.getElementById(id)?.value) || 0);
      }

      function readVendorFitMeasurements() {
        return {
          garmentLength: vendorMeasurementValue("vendorGarmentLength"),
          shoulderWidth: vendorMeasurementValue("vendorShoulderWidth"),
          chestWidth: vendorMeasurementValue("vendorChestWidth"),
          waistWidth: vendorMeasurementValue("vendorWaistWidth"),
          modelHeight: vendorMeasurementValue("vendorModelHeight"),
          modelWeight: vendorMeasurementValue("vendorModelWeight"),
        };
      }

      function writeVendorFitMeasurements(item = {}) {
        const defaults = {
          garmentLength: item.garmentLength || 54,
          shoulderWidth: item.shoulderWidth || 42,
          chestWidth: item.chestWidth || 48,
          waistWidth: item.waistWidth || 44,
          modelHeight: item.modelHeight || 168,
          modelWeight: item.modelWeight || 55,
        };
        Object.entries(defaults).forEach(([key, value]) => {
          const id = {
            garmentLength: "vendorGarmentLength",
            shoulderWidth: "vendorShoulderWidth",
            chestWidth: "vendorChestWidth",
            waistWidth: "vendorWaistWidth",
            modelHeight: "vendorModelHeight",
            modelWeight: "vendorModelWeight",
          }[key];
          const input = document.getElementById(id);
          if (input) input.value = value;
        });
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
        const visualSelect = document.getElementById("vendorVisual");
        if (visualSelect) visualSelect.value = item.visual || defaultVisualForCategory(item.category || "상의");
        document.getElementById("vendorPrice").value = item.price;
        document.getElementById("vendorDiscount").value = normalizedDiscount(item.discountRate);
        document.getElementById("vendorStock").value = item.stock;
        document.getElementById("vendorMinutes").value = item.minutes;
        document.getElementById("vendorMatch").value = item.match;
        document.getElementById("vendorMaterial").value = item.material;
        document.getElementById("vendorSize").value = item.size;
        writeVendorFitMeasurements(item);
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
            <div class="order-detail-block">
              <strong>가상착용 데이터</strong>
              <span>3D 의상 타입 ${fitVisualTypeLabel(item.visual)}</span>
              <span>${garmentSpecSummary(item)}</span>
              <span>모델 기준 ${modelSpecSummary(item)}</span>
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

      function isTodayTestToolTime(value) {
        if (!value) return false;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return false;
        const today = new Date();
        return date.getFullYear() === today.getFullYear()
          && date.getMonth() === today.getMonth()
          && date.getDate() === today.getDate();
      }

      function testToolFreshnessLabel(value) {
        return isTodayTestToolTime(value) ? testToolTimeLabel(value) : testToolTimeLabel(value) + " · 오늘 실행 필요";
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
            id: "final-scenario",
            title: "최종 운영 시나리오",
            items: [
              { id: "delivery-order", label: "배송 테스트 주문 생성" },
              { id: "delivery-proof", label: "픽업/도착 인증 흐름 확인" },
              { id: "return-refund-visible", label: "반품/환불 표시 점검 4/4 통과" },
              { id: "vendor-refund-action", label: "입점업체 승인/거절 버튼 확인" },
              { id: "admin-refund-action", label: "총관리자 환불 완료 버튼 확인" },
              { id: "cleanup-zero", label: "정리 상태 점검 0건 확인" },
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

      function adminQaChecklistLabelByKey(key) {
        for (const section of adminQaChecklistSections()) {
          for (const item of section.items) {
            if (adminQaChecklistItemKey(section.id, item.id) === key) {
              return section.title + " - " + item.label;
            }
          }
        }
        return key;
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
        keys.forEach((key) => {
          const input = document.querySelector('[data-admin-qa-key="' + key + '"]');
          if (input) input.checked = !!store.checked[key];
          document.querySelectorAll('[data-admin-qa-item-key="' + key + '"]').forEach((button) => {
            const checked = !!store.checked[key];
            button.classList.toggle("done", checked);
            const badge = button.querySelector("em");
            if (checked && !badge) {
              button.insertAdjacentHTML("beforeend", "<em>완료</em>");
            } else if (!checked && badge) {
              badge.remove();
            }
          });
        });
      }

      function markFinalQaScenarioItem(itemId, options = {}) {
        markAdminQaChecklistItems({
          [adminQaChecklistItemKey("final-scenario", itemId)]: true,
        }, options);
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

      function startNewAdminQaChecklist() {
        const store = readAdminQaChecklistStore();
        const progress = adminQaChecklistProgress(store);
        if (progress.done && !window.confirm("완료된 QA 체크리스트를 초기화하고 새 점검을 시작할까요? 기존 완료 기록은 리포트로 먼저 보관하는 것을 권장합니다.")) {
          setSyncStatus("새 QA 점검 시작을 취소했습니다");
          return;
        }
        clearAdminQaChecklist();
        setSyncStatus("새 QA 점검을 시작했습니다");
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

      function adminQaChecklistRemainingRows(store = readAdminQaChecklistStore()) {
        return adminQaChecklistReportRows(store).filter((row) => row.status !== "완료");
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

      function showCopyFallbackText(text, label = "리포트") {
        const avatarLookModal = document.getElementById("avatarLookModal");
        const body = avatarLookModal && avatarLookModal.classList.contains("open")
          ? document.getElementById("avatarLookBody")
          : document.getElementById("adminOrderDetailBody");
        if (!body) return false;
        const existing = body.querySelector("[data-copy-fallback-text]");
        if (existing) existing.remove();
        body.insertAdjacentHTML("beforeend", `
          <div class="admin-copy-fallback" data-copy-fallback-text>
            <strong>${qaScenarioStatusEscape(label)} 직접 복사</strong>
            <p>브라우저 클립보드 권한이 제한되어 아래 텍스트를 표시했습니다.</p>
            <textarea readonly>${qaScenarioStatusEscape(text)}</textarea>
          </div>
        `);
        const textarea = body.querySelector("[data-copy-fallback-text] textarea");
        if (textarea) {
          textarea.focus();
          textarea.select();
        }
        return true;
      }

      async function copyTextWithFallback(text, successMessage, errorMessage, fallbackLabel = "리포트") {
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
          setSyncStatus(successMessage);
        } catch (error) {
          try {
            if (!fallbackCopy()) throw error;
            setSyncStatus(successMessage);
          } catch (fallbackError) {
            if (showCopyFallbackText(text, fallbackLabel)) {
              setSyncStatus("복사 권한 제한 - " + fallbackLabel + " 텍스트를 화면에 표시했습니다");
            } else {
              setSyncStatus(errorMessage);
            }
          }
        }
      }

      async function copyAdminQaChecklistReport() {
        await copyTextWithFallback(
          adminQaChecklistReportText(),
          "QA 체크리스트 리포트를 복사했습니다",
          "QA 체크리스트 리포트 복사에 실패했습니다",
          "QA 체크리스트 리포트"
        );
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

      function shortSupabaseError(error) {
        const message = error && (error.message || error.details || error.hint || String(error));
        return String(message || "알 수 없는 오류").replace(/\s+/g, " ").slice(0, 90);
      }

      async function deleteSupabaseDiagnosticOrders(orderCodes = [], dbIds = []) {
        if (!supabaseClient) return 0;
        const uniqueCodes = Array.from(new Set(orderCodes.filter(Boolean).map(String)));
        const uniqueDbIds = new Set(dbIds.filter(Boolean));
        if (uniqueCodes.length) {
          const lookup = await supabaseClient.from("orders").select("id, order_code").in("order_code", uniqueCodes);
          if (lookup.error) throw new Error("orders 조회 실패: " + shortSupabaseError(lookup.error));
          (lookup.data || []).forEach((row) => {
            if (row.id) uniqueDbIds.add(row.id);
          });
        }
        const dbIdList = Array.from(uniqueDbIds);
        if (dbIdList.length) {
          const itemDeleteResult = await supabaseClient.from("order_items").delete().in("order_id", dbIdList);
          if (itemDeleteResult.error) throw new Error("order_items 삭제 실패: " + shortSupabaseError(itemDeleteResult.error));
        }
        if (uniqueCodes.length) {
          const deleteResult = await supabaseClient.from("orders").delete().in("order_code", uniqueCodes);
          if (deleteResult.error) throw new Error("orders 삭제 실패: " + shortSupabaseError(deleteResult.error));
        }
        return uniqueCodes.length;
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
        let supabaseRemovedOrderCount = 0;
        let supabaseCleanupFailed = false;
        let supabaseCleanupError = "";
        const testIds = new Set(orderHistory.filter(shouldRemoveOrder).map((order) => order.id));
        const testDbIds = new Set();
        if (supabaseClient) {
          const dbOrders = await loadAdminOrders({ includeDiagnostic: true }).catch(() => []);
          dbOrders.filter(shouldRemoveOrder).forEach((order) => {
            testIds.add(order.id);
            if (order.dbId) testDbIds.add(order.dbId);
          });
        }
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
        if (supabaseClient && testIds.size) {
          try {
            supabaseRemovedOrderCount = await deleteSupabaseDiagnosticOrders(Array.from(testIds), Array.from(testDbIds));
          } catch (error) {
            supabaseCleanupFailed = true;
            supabaseCleanupError = shortSupabaseError(error);
          }
        }
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
        if (options.auto && !removedOrderTotal && !removedStatusCount && !removedLogTotal && !supabaseRemovedOrderCount) return;
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
        setSyncStatus((expiredOnly ? "만료 테스트 데이터 자동 정리 완료 - " : "테스트 데이터 정리 완료 - ") + "화면 주문 " + removedOrderTotal + "건, DB 주문 " + supabaseRemovedOrderCount + "건, 상태 " + removedStatusCount + "건, 로그 " + removedLogTotal + "건 삭제" + (supabaseCleanupFailed ? " · Supabase 삭제 확인 필요: " + supabaseCleanupError : ""));
      }

      function setAdminCleanupCheckStatus(message) {
        setSyncStatus(message);
        document.querySelectorAll("[data-admin-cleanup-status]").forEach((node) => {
          node.textContent = message;
        });
      }

      async function checkAdminTestDataCleanupState() {
        setAdminCleanupCheckStatus("테스트 데이터 정리 상태 점검 중...");
        if (!currentAdmin || currentAdmin.role !== "total") {
          setAdminCleanupCheckStatus("테스트 데이터 정리 상태 점검은 총관리자만 가능합니다");
          return;
        }
        const localDiagnostic = adminDiagnosticState(orderHistory);
        let dbDiagnosticOrders = 0;
        let dbError = "";
        if (setupClientIfNeeded()) {
          try {
            const dbOrders = await loadAdminOrders({ includeDiagnostic: true });
            dbDiagnosticOrders = dbOrders.filter(isDiagnosticOrder).length;
          } catch (error) {
            dbError = shortSupabaseError(error);
          }
        }
        const clean = !localDiagnostic.hasTestState && dbDiagnosticOrders === 0 && !dbError;
        if (clean) markFinalQaScenarioItem("cleanup-zero", { render: false });
        setAdminCleanupCheckStatus(
          "테스트 데이터 정리 상태 " + (clean ? "정상" : "확인 필요") +
          " - 화면 주문 " + localDiagnostic.orders + "건" +
          " · DB 주문 " + dbDiagnosticOrders + "건" +
          " · 상태 " + localDiagnostic.statuses + "건" +
          " · 로그 " + localDiagnostic.logs + "건" +
          (dbError ? " · DB 확인 실패: " + dbError : "")
        );
      }

      async function checkSupabaseCleanupPermission() {
        setAdminCleanupCheckStatus("DB 삭제권한 점검 중...");
        if (!currentAdmin || currentAdmin.role !== "total") {
          setAdminCleanupCheckStatus("DB 삭제권한 점검은 총관리자만 가능합니다");
          return;
        }
        if (!setupClientIfNeeded()) {
          setAdminCleanupCheckStatus("Supabase 연결 후 DB 삭제권한을 점검할 수 있습니다");
          return;
        }
        const product = products.find((item) => item.stock > 0) || products[0];
        if (!product) {
          setAdminCleanupCheckStatus("DB 삭제권한 점검에 사용할 상품이 없습니다");
          return;
        }
        const createdAt = new Date().toISOString();
        const subtotal = itemSalePrice(product);
        const order = {
          id: "FN-TEST-CLEANUP-" + Date.now(),
          region: "DB 삭제권한 점검",
          address: "Supabase 삭제 정책 확인용",
          receiveType: "테스트",
          paymentMethod: "카카오페이",
          riderRequest: "삭제 권한 점검 후 즉시 제거",
          items: [{ ...product, quantity: 1, size: availableSizeOptions(product)[0] || product.size || "FREE" }],
          subtotal,
          deliveryFee: 0,
          total: subtotal,
          fastest: product.minutes || 36,
          customerId: "cleanup-permission-test",
          customerName: "DB 점검 고객",
          customerContact: "01000000000",
          progressStep: 0,
          statusCode: "cancelled",
          statusLabel: "취소됨",
          paid: true,
          paymentLabel: "카카오페이 결제 완료",
          cancelled: true,
          cancelReasonCode: "admin_test",
          cancelReason: "Supabase 삭제 권한 점검",
          deliveryPartnerName: "",
          riderName: "",
          pickupConfirmedAt: "",
          arrivalConfirmedAt: "",
          pickupProofPhoto: null,
          arrivalProofPhoto: null,
          createdAt,
          createdLabel: new Date(createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
          deliveryLogs: [],
        };
        try {
          await syncOrderToSupabase(order);
        } catch (error) {
          setAdminCleanupCheckStatus("DB 삭제권한 점검 실패 - 테스트 주문 저장 권한 확인 필요: " + shortSupabaseError(error));
          return;
        }
        try {
          await deleteSupabaseDiagnosticOrders([order.id], [order.dbId]);
          setAdminCleanupCheckStatus("DB 삭제권한 정상 - 테스트 주문 저장 후 orders/order_items 삭제 확인 완료");
        } catch (error) {
          setAdminCleanupCheckStatus("DB 삭제권한 확인 필요 - " + shortSupabaseError(error) + " · Supabase SQL 재실행 후 다시 점검");
        }
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

      function openAdminQaChecklist(focusSectionId = "") {
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
        const scenarioButton = (index, action, label, itemId = "", variant = "primary") => {
          const itemKey = itemId ? adminQaChecklistItemKey("final-scenario", itemId) : "";
          const done = itemKey ? !!store.checked[itemKey] : false;
          return '<button class="admin-tool-action ' + variant + (done ? ' done' : '') + '" type="button" data-admin-qa-action="' + action + '"' + (itemKey ? ' data-admin-qa-item-key="' + itemKey + '"' : '') + ' onclick="runQaScenarioAction(\'' + action + '\')"><span>' + index + '. ' + label + '</span>' + (done ? '<em>완료</em>' : '') + '</button>';
        };
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
            ${progress.done ? `
              <div class="admin-qa-lock-notice">
                <strong>완료된 QA 체크리스트</strong>
                <span>현재 점검 결과는 완료 상태로 보관됩니다. 새 배포 점검을 시작할 때만 초기화하세요.</span>
              </div>
            ` : ""}
            ${sections.map((section, sectionIndex) => `
              <div class="admin-qa-section ${section.id === focusSectionId ? "focused" : ""}" data-admin-qa-section="${section.id}">
                <div class="settlement-audit-step">${sectionIndex + 1}</div>
                <div>
                  <strong>${section.title}</strong>
                  ${section.id === "final-scenario" ? `
                    <div class="admin-qa-scenario-guide">
                      <strong>권장 실행 순서</strong>
                      <ol>
                        <li><b>1~2</b><span>배송 주문 생성 후 배송 플로우 자동 점검</span></li>
                        <li><b>3~4</b><span>반품/환불 테스트 주문 생성 후 화면 표시 점검</span></li>
                        <li><b>5</b><span>정산 플로우 점검으로 주문/로그 상태 확인</span></li>
                        <li><b>6~7</b><span>테스트 데이터 정리 후 0건 상태 확인</span></li>
                        <li><b>8~9</b><span>필요할 때 엑셀 샘플과 DB 삭제권한 별도 점검</span></li>
                      </ol>
                    </div>
                    <div class="admin-qa-scenario-actions">
                      ${scenarioButton(1, "deliveryOrder", "배송 테스트 주문 생성", "delivery-order")}
                      ${scenarioButton(2, "deliveryFlow", "배송 플로우 자동 점검", "delivery-proof")}
                      ${scenarioButton(3, "returnOrders", "반품/환불 테스트 4건 생성")}
                      ${scenarioButton(4, "returnVisibility", "반품/환불 표시 점검", "return-refund-visible")}
                      ${scenarioButton(5, "settlementFlow", "정산 플로우 점검")}
                      ${scenarioButton(6, "cleanup", "테스트 데이터 정리", "", "danger")}
                      ${scenarioButton(7, "cleanupState", "정리 상태 점검", "cleanup-zero", "primary")}
                      ${scenarioButton(8, "excelDemo", "엑셀 테스트 6건 생성", "", "")}
                      ${scenarioButton(9, "dbCleanup", "DB 삭제권한 점검", "", "")}
                    </div>
                    <div class="admin-utility-status" data-qa-scenario-action-status aria-live="polite">QA 시나리오 버튼 실행 결과가 여기에 표시됩니다.</div>
                    <div class="admin-utility-status" data-return-refund-visibility-status aria-live="polite">반품/환불 표시 점검 결과가 여기에 표시됩니다.</div>
                    <div class="admin-utility-status" data-admin-cleanup-status aria-live="polite">정리/DB 권한 점검 결과가 여기에 표시됩니다.</div>
                  ` : ""}
                  <div class="admin-qa-items">
                    ${section.items.map((item) => {
                      const key = adminQaChecklistItemKey(section.id, item.id);
                      return `
                      <label>
                        <input type="checkbox" data-admin-qa-key="${key}" ${store.checked[key] ? "checked" : ""} onchange="setAdminQaChecklistItem('${key}', this.checked)" />
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
              ${progress.done
                ? '<button type="button" onclick="startNewAdminQaChecklist()">새 점검 시작</button>'
                : '<button type="button" onclick="clearAdminQaChecklist()">체크 초기화</button>'}
              <button type="button" onclick="closeAdminOrderDetail()">닫기</button>
            </div>
          </div>
        `;
        document.getElementById("adminOrderDetailModal").classList.add("open");
        document.getElementById("adminOrderDetailModal").setAttribute("aria-hidden", "false");
        if (focusSectionId) {
          window.setTimeout(() => {
            const target = document.querySelector('[data-admin-qa-section="' + focusSectionId + '"]');
            if (target && target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "center" });
            highlightAdminTarget(target);
          }, 80);
        }
      }

      function openAdminFinalQaScenario() {
        openAdminQaChecklist("final-scenario");
        setSyncStatus("최종 QA 시나리오 섹션으로 이동했습니다");
      }

      function adminPreReleaseQuickActions(qaStore, diagnostic, testMeta) {
        const checked = qaStore.checked || {};
        const actions = [];
        const addAction = (action, label, detail, variant = "primary") => {
          if (!actions.some((item) => item.action === action)) {
            actions.push({ action, label, detail, variant });
          }
        };
        const hasDeliveryOrder = !!checked[adminQaChecklistItemKey("final-scenario", "delivery-order")];
        const hasDeliveryProof = !!checked[adminQaChecklistItemKey("final-scenario", "delivery-proof")];
        const hasReturnVisible = !!checked[adminQaChecklistItemKey("final-scenario", "return-refund-visible")];
        const hasCleanupZero = !!checked[adminQaChecklistItemKey("final-scenario", "cleanup-zero")];
        const hasReturnOrdersToday = testMeta.lastCheckType === "return_refund" && isTodayTestToolTime(testMeta.lastCheckAt);
        const settlementReady = ["test-order-created", "paid", "paid-tab", "logs-updated"].every((itemId) =>
          !!checked[adminQaChecklistItemKey("settlement-flow", itemId)]
        );
        if (!hasDeliveryOrder) addAction("deliveryOrder", "배송 테스트 주문 생성", "배송 QA 시작용 주문을 만듭니다");
        if (!hasDeliveryProof) addAction("deliveryFlow", "배송 플로우 자동 점검", "배정, 픽업, 도착 인증까지 자동 확인합니다");
        if (!hasReturnVisible) {
          if (!hasReturnOrdersToday) addAction("returnOrders", "반품/환불 테스트 4건 생성", "표시 점검용 고객/업체 주문을 준비합니다", "neutral");
          addAction("returnVisibility", "반품/환불 표시 점검", "고객, 업체, 관리자 화면 노출을 확인합니다");
        }
        if (!settlementReady) addAction("settlementFlow", "정산 플로우 점검", "정산 주문, 지급 상태, 로그를 확인합니다");
        if (diagnostic.hasTestState) addAction("cleanup", "테스트 데이터 정리", "진단 주문과 테스트 로그를 정리합니다", "warning");
        if (!hasCleanupZero || !isTodayTestToolTime(testMeta.lastCleanupAt)) addAction("cleanupState", "정리 상태 점검", "남은 테스트 데이터 0건 여부를 확인합니다");
        if (!isTodayTestToolTime(testMeta.lastCheckAt)) addAction("dbCleanup", "DB 삭제권한 점검", "정리 버튼 실행 권한을 확인합니다", "neutral");
        return actions.slice(0, 6);
      }

      function adminPreReleaseManualActions(qaStore) {
        const checked = qaStore.checked || {};
        const actions = [];
        if (!checked[adminQaChecklistItemKey("final-scenario", "vendor-refund-action")]) {
          actions.push({
            itemId: "vendor-refund-action",
            label: "입점업체 승인/거절 버튼 확인",
            detail: "입점업체 주문 상세의 반품/환불 승인·거절 버튼을 확인합니다.",
            actionLabel: "입점업체 화면 열기",
          });
        }
        if (!checked[adminQaChecklistItemKey("final-scenario", "admin-refund-action")]) {
          actions.push({
            itemId: "admin-refund-action",
            label: "총관리자 환불 완료 버튼 확인",
            detail: "총관리자 반품환불 주문 상세의 환불 완료 버튼을 확인합니다.",
            actionLabel: "총관리자 주문 필터",
          });
        }
        return actions;
      }

      function adminPreReleaseReportData() {
        const orders = adminRenderedOrders.length ? adminRenderedOrders : orderHistory;
        const diagnostic = adminDiagnosticState(orders);
        const qaStore = readAdminQaChecklistStore();
        const qaProgress = adminQaChecklistProgress(qaStore);
        const remainingRows = adminQaChecklistRemainingRows(qaStore);
        const testMeta = readTestToolMeta();
        const checkReady = isTodayTestToolTime(testMeta.lastCheckAt);
        const cleanupReady = isTodayTestToolTime(testMeta.lastCleanupAt);
        const checks = [
          { label: "QA 체크리스트", detail: qaProgress.checked + "/" + qaProgress.total + "개", ready: qaProgress.done },
          { label: "테스트 데이터", detail: diagnostic.hasTestState ? "주문 " + diagnostic.orders + "건 · 로그 " + diagnostic.logs + "건" : "잔여 없음", ready: !diagnostic.hasTestState },
          { label: "오늘 점검", detail: testToolFreshnessLabel(testMeta.lastCheckAt), ready: checkReady },
          { label: "오늘 정리", detail: testToolFreshnessLabel(testMeta.lastCleanupAt), ready: cleanupReady },
        ];
        const quickActions = adminPreReleaseQuickActions(qaStore, diagnostic, testMeta);
        const manualActions = adminPreReleaseManualActions(qaStore);
        const readyCount = checks.filter((item) => item.ready).length;
        const allReady = readyCount === checks.length;
        if (allReady && !testMeta.lastPreReleaseReadyAt) {
          testMeta.lastPreReleaseReadyAt = new Date().toISOString();
          saveTestToolMeta({ lastPreReleaseReadyAt: testMeta.lastPreReleaseReadyAt });
        }
        return {
          diagnostic,
          qaStore,
          qaProgress,
          remainingRows,
          testMeta,
          checks,
          quickActions,
          manualActions,
          readyCount,
          allReady,
        };
      }

      function adminPreReleaseReportText() {
        const report = adminPreReleaseReportData();
        return [
          "FitNow 운영 전 최종 점검 리포트",
          "결과: " + (report.allReady ? "배포 가능" : "확인 필요"),
          "준비 상태: " + report.readyCount + "/" + report.checks.length,
          "작성 시각: " + testToolTimeLabel(new Date().toISOString()),
          "최종 완료 시각: " + testToolTimeLabel(report.testMeta.lastPreReleaseReadyAt),
          "리포트 다운로드: " + testToolTimeLabel(report.testMeta.lastPreReleaseReportDownloadedAt),
          "",
          "준비 항목",
          ...report.checks.map((item) => "- " + item.label + ": " + (item.ready ? "OK" : "확인 필요") + " (" + item.detail + ")"),
          "",
          "남은 QA 항목",
          ...(report.remainingRows.length
            ? report.remainingRows.map((row) => "- " + row.sectionOrder + "-" + row.itemOrder + ". " + row.section + " / " + row.item)
            : ["- 없음"]),
          "",
          "추천 바로 실행",
          ...(report.quickActions.length
            ? report.quickActions.map((item) => "- " + item.label + ": " + item.detail)
            : ["- 없음"]),
          "",
          "수동 확인",
          ...(report.manualActions.length
            ? report.manualActions.map((item) => "- " + item.label + ": " + item.detail)
            : ["- 없음"]),
        ].join("\n");
      }

      async function copyAdminPreReleaseReport() {
        await copyTextWithFallback(
          adminPreReleaseReportText(),
          "운영 전 최종 점검 리포트를 복사했습니다",
          "운영 전 최종 점검 리포트 복사에 실패했습니다",
          "운영 전 최종 점검 리포트"
        );
      }

      async function clearAdminTestDataFromPreRelease() {
        await clearAdminTestData();
        if (document.getElementById("adminOrderDetailModal").classList.contains("open")) {
          openAdminPreReleaseCheck();
        }
      }

      function downloadAdminPreReleaseReport() {
        const text = adminPreReleaseReportText();
        if (!text) return;
        const blob = new Blob(["\ufeff" + text], { type: "text/plain;charset=utf-8;" });
        const link = document.createElement("a");
        const today = new Date().toISOString().slice(0, 10);
        const status = adminPreReleaseReportData().allReady ? "배포가능" : "확인필요";
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = "fitnow-운영전-최종점검-" + status + "-" + today + ".txt";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        saveTestToolMeta({ lastPreReleaseReportDownloadedAt: new Date().toISOString() });
        if (document.getElementById("adminOrderDetailModal").classList.contains("open")) {
          openAdminPreReleaseCheck();
        }
        setSyncStatus("운영 전 최종 점검 리포트 다운로드 완료 - " + status);
      }

      function openAdminPreReleaseCheck() {
        if (!currentAdmin || currentAdmin.role !== "total") {
          setSyncStatus("최종 배포 전 점검은 총관리자만 가능합니다");
          return;
        }
        const title = document.getElementById("adminOrderDetailTitle");
        const body = document.getElementById("adminOrderDetailBody");
        const report = adminPreReleaseReportData();
        if (title) title.textContent = "최종 배포 전 점검";
        body.innerHTML = `
          <div class="admin-pre-release-check ${report.allReady ? "ready" : "pending"}">
            <div class="admin-pre-release-hero">
              <div>
                <span>${report.allReady ? "배포 가능" : "확인 필요"}</span>
                <strong>${report.allReady ? "운영 전 필수 점검이 완료되었습니다" : "운영 전 확인할 항목이 남아 있습니다"}</strong>
                <p>QA 체크, 테스트 데이터 정리, 최근 점검/정리 기록을 기준으로 판단합니다.</p>
              </div>
              <em>${report.readyCount}/${report.checks.length}</em>
            </div>
            <div class="admin-pre-release-grid">
              ${report.checks.map((item) => `
                <div class="${item.ready ? "ready" : "pending"}">
                  <span>${item.label}</span>
                  <strong>${item.ready ? "OK" : "확인 필요"}</strong>
                  <em>${item.detail}</em>
                </div>
              `).join("")}
            </div>
            <div class="admin-pre-release-records">
              <div>
                <span>최종 완료 시각</span>
                <strong>${testToolTimeLabel(report.testMeta.lastPreReleaseReadyAt)}</strong>
              </div>
              <div>
                <span>리포트 다운로드</span>
                <strong>${testToolTimeLabel(report.testMeta.lastPreReleaseReportDownloadedAt)}</strong>
              </div>
            </div>
            <div class="admin-pre-release-section">
              <strong>남은 QA 항목</strong>
              ${report.remainingRows.length ? `
                <ul>
                  ${report.remainingRows.slice(0, 8).map((row) => '<li>' + row.sectionOrder + '-' + row.itemOrder + '. ' + qaScenarioStatusEscape(row.section) + ' / ' + qaScenarioStatusEscape(row.item) + '</li>').join("")}
                </ul>
                ${report.remainingRows.length > 8 ? '<p>외 ' + (report.remainingRows.length - 8) + '개 항목은 QA 체크리스트에서 확인하세요.</p>' : ""}
              ` : '<p>미완료 QA 항목이 없습니다.</p>'}
            </div>
            <div class="admin-pre-release-section">
              <strong>바로 실행</strong>
              ${report.quickActions.length ? `
                <div class="admin-pre-release-quick-actions">
                  ${report.quickActions.map((item) => `
                    <button class="${item.variant}" type="button" onclick="runPreReleaseQaAction('${item.action}')">
                      <span>${qaScenarioStatusEscape(item.label)}</span>
                      <em>${qaScenarioStatusEscape(item.detail)}</em>
                    </button>
                  `).join("")}
                </div>
              ` : '<p>현재 바로 실행할 추천 점검이 없습니다.</p>'}
            </div>
            <div class="admin-pre-release-section">
              <strong>수동 확인</strong>
              ${report.manualActions.length ? `
                <div class="admin-pre-release-manual-actions">
                  ${report.manualActions.map((item) => `
                    <div>
                      <span>${qaScenarioStatusEscape(item.label)}</span>
                      <em>${qaScenarioStatusEscape(item.detail)}</em>
                      <div>
                        <button class="neutral" type="button" onclick="openPreReleaseManualQa('${item.itemId}')">${qaScenarioStatusEscape(item.actionLabel)}</button>
                        <button class="success" type="button" onclick="completePreReleaseManualQa('${item.itemId}')">확인 완료</button>
                      </div>
                    </div>
                  `).join("")}
                </div>
              ` : '<p>수동 확인 항목이 없습니다.</p>'}
            </div>
            <div class="admin-pre-release-action-groups">
              <div>
                <strong>점검 실행</strong>
                <div class="admin-release-actions">
                  <button class="neutral" type="button" onclick="openAdminQaChecklist()">QA 체크리스트</button>
                  <button class="primary" type="button" onclick="openAdminFinalQaScenario()">QA 시나리오</button>
                  <button class="success" type="button" ${report.diagnostic.hasTestState ? "" : "disabled"} onclick="clearAdminTestDataFromPreRelease()">테스트 데이터 정리</button>
                </div>
              </div>
              <div>
                <strong>리포트 보관</strong>
                <div class="admin-release-actions">
                  <button class="warning" type="button" onclick="copyAdminPreReleaseReport()">점검 리포트 복사</button>
                  <button class="primary" type="button" onclick="downloadAdminPreReleaseReport()">점검 리포트 다운로드</button>
                </div>
              </div>
            </div>
          </div>
        `;
        document.getElementById("adminOrderDetailModal").classList.add("open");
        document.getElementById("adminOrderDetailModal").setAttribute("aria-hidden", "false");
        setSyncStatus(report.allReady ? "최종 배포 전 점검 완료 상태입니다" : "최종 배포 전 확인 항목이 남아 있습니다");
      }

      function qaScenarioStatusEscape(value) {
        return String(value || "").replace(/[&<>"']/g, (match) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[match]);
      }

      function qaScenarioActionManualItems(action) {
        if (action === "returnOrders") {
          return ["고객/입점업체/관리자 화면에서 생성된 4건 노출 확인"];
        }
        if (action === "settlementFlow") {
          return ["정산 플로우 체크리스트 항목은 자동 체크됨", "최종 QA 시나리오 버튼 완료 표시는 수동 확인"];
        }
        if (action === "cleanup") {
          return ["정리 후 7번 정리 상태 점검을 실행해 0건 확인"];
        }
        if (action === "excelDemo") {
          return ["엑셀 다운로드 파일 열림/금액/상태값 수동 확인"];
        }
        if (action === "dbCleanup") {
          return ["권한 점검 결과 메시지가 성공인지 확인"];
        }
        return [];
      }

      function setQaScenarioActionStatus(message, details = {}) {
        setSyncStatus(message);
        const checkedItems = details.checkedItems || [];
        const manualItems = details.manualItems || [];
        const html = `
          <strong>${qaScenarioStatusEscape(message)}</strong>
          ${checkedItems.length ? '<ul class="qa-scenario-status-list success">' + checkedItems.map((item) => '<li>자동 체크: ' + qaScenarioStatusEscape(item) + '</li>').join("") + '</ul>' : ""}
          ${manualItems.length ? '<ul class="qa-scenario-status-list">' + manualItems.map((item) => '<li>확인 필요: ' + qaScenarioStatusEscape(item) + '</li>').join("") + '</ul>' : ""}
          ${details.note ? '<span>' + qaScenarioStatusEscape(details.note) + '</span>' : ""}
        `;
        document.querySelectorAll("[data-qa-scenario-action-status]").forEach((node) => {
          node.innerHTML = html;
        });
      }

      function markQaScenarioActionSuccess(action) {
        const updates = {};
        if (action === "deliveryOrder") {
          updates[adminQaChecklistItemKey("final-scenario", "delivery-order")] = true;
        } else if (action === "deliveryFlow") {
          updates[adminQaChecklistItemKey("final-scenario", "delivery-order")] = true;
          updates[adminQaChecklistItemKey("final-scenario", "delivery-proof")] = true;
        } else if (action === "settlementFlow") {
          ["test-order-created", "paid", "paid-tab", "logs-updated"].forEach((itemId) => {
            updates[adminQaChecklistItemKey("settlement-flow", itemId)] = true;
          });
        } else if (action === "returnVisibility") {
          updates[adminQaChecklistItemKey("final-scenario", "return-refund-visible")] = true;
        }
        markAdminQaChecklistItems(updates);
        return Object.keys(updates);
      }

      async function runQaScenarioAction(action) {
        const labels = {
          deliveryOrder: "배송 테스트 주문 생성",
          deliveryFlow: "배송 플로우 자동 점검",
          settlementFlow: "정산 플로우 점검",
          returnOrders: "반품/환불 테스트 4건 생성",
          returnVisibility: "반품/환불 표시 점검",
          excelDemo: "엑셀 테스트 6건 생성",
          cleanup: "테스트 데이터 정리",
          cleanupState: "정리 상태 점검",
          dbCleanup: "DB 삭제권한 점검",
        };
        const label = labels[action] || "QA 작업";
        const beforeStore = readAdminQaChecklistStore();
        setQaScenarioActionStatus(label + " 실행 중...");
        try {
          if (action === "deliveryOrder") await createDeliveryFlowTestOrder();
          else if (action === "deliveryFlow") await runDeliveryFlowAutoCheck();
          else if (action === "settlementFlow") await runSettlementFlowAutoCheck();
          else if (action === "returnOrders") await createReturnRefundTestOrders();
          else if (action === "returnVisibility") await runReturnRefundVisibilityCheck();
          else if (action === "excelDemo") await createSettlementExcelDemoOrders();
          else if (action === "cleanup") await clearAdminTestData();
          else if (action === "cleanupState") await checkAdminTestDataCleanupState();
          else if (action === "dbCleanup") await checkSupabaseCleanupPermission();
          else throw new Error("알 수 없는 QA 작업입니다");
          const forcedKeys = markQaScenarioActionSuccess(action);
          const afterStore = readAdminQaChecklistStore();
          const changedKeys = Object.keys(afterStore.checked || {}).filter((key) => (
            afterStore.checked[key] && (!beforeStore.checked || !beforeStore.checked[key])
          ));
          const checkedKeys = Array.from(new Set([...forcedKeys, ...changedKeys])).filter((key) => !!afterStore.checked[key]);
          const latestStatus = document.getElementById("syncStatus")?.textContent || "";
          setQaScenarioActionStatus(label + " 실행 완료" + (latestStatus ? " - " + latestStatus : ""), {
            checkedItems: checkedKeys.map(adminQaChecklistLabelByKey),
            manualItems: qaScenarioActionManualItems(action),
            note: checkedKeys.length ? "" : "이번 실행에서 새로 자동 체크된 항목은 없습니다.",
          });
        } catch (error) {
          setQaScenarioActionStatus(label + " 실행 오류 - " + shortSupabaseError(error));
        }
      }

      async function runPreReleaseQaAction(action) {
        await runQaScenarioAction(action);
        if (document.getElementById("adminOrderDetailModal").classList.contains("open")) {
          openAdminPreReleaseCheck();
        }
      }

      async function openPreReleaseManualQa(itemId) {
        if (itemId === "vendor-refund-action") {
          closeAdminOrderDetail();
          openVendor();
          if (currentVendor) {
            await setVendorOrderFilter("return_refund_requested");
            setSyncStatus("입점업체 반품요청 화면으로 이동했습니다. 주문 상세에서 승인/거절 버튼을 확인하세요");
          } else {
            setSyncStatus("입점업체 로그인 후 반품요청 주문 상세에서 승인/거절 버튼을 확인하세요");
          }
          return;
        }
        if (itemId === "admin-refund-action") {
          closeAdminOrderDetail();
          await focusAdminTodo("return_refund");
          setSyncStatus("총관리자 반품/환불 주문 필터로 이동했습니다. 주문 상세에서 환불 완료 버튼을 확인하세요");
          return;
        }
        setSyncStatus("확인할 수동 QA 항목을 찾지 못했습니다");
      }

      function completePreReleaseManualQa(itemId) {
        if (!["vendor-refund-action", "admin-refund-action"].includes(itemId)) {
          setSyncStatus("확인할 수동 QA 항목을 찾지 못했습니다");
          return;
        }
        markFinalQaScenarioItem(itemId);
        if (document.getElementById("adminOrderDetailModal").classList.contains("open")) {
          openAdminPreReleaseCheck();
        }
        setSyncStatus(adminQaChecklistLabelByKey(adminQaChecklistItemKey("final-scenario", itemId)) + " 확인 완료");
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
          <div class="admin-qa-scenario">
            <span>최종 QA 순서</span>
            <strong>배송 테스트 주문 생성 → 반품/환불 표시 점검 → 테스트 데이터 정리 → 정리 상태 점검</strong>
            <p>마지막 결과가 반품/환불 4/4 통과, 정리 상태 0건이면 운영 전 핵심 흐름 확인이 끝난 상태입니다.</p>
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
          <button class="admin-tool-action" type="button" onclick="openAdminQaChecklist()">QA 체크리스트</button>
          <button class="admin-tool-action primary" type="button" onclick="openAdminFinalQaScenario()">QA 시나리오</button>
          <div class="admin-utility-status" data-return-refund-visibility-status aria-live="polite">반품/환불 표시 점검 결과가 여기에 표시됩니다.</div>
          <div class="admin-utility-status" data-admin-cleanup-status aria-live="polite">테스트 데이터 정리 상태가 여기에 표시됩니다.</div>
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
        markFinalQaScenarioItem("delivery-order", { render: false });
        renderOrders();
        renderTracking();
        return order;
      }

      function buildReturnRefundTestOrders() {
        const now = Date.now();
        const testProducts = products.filter((item) => item.stock > 0).slice(0, 4);
        const fallback = products[0];
        const specs = [
          { key: "REQUEST", label: "요청됨", status: "requested", requestHoursAgo: 2, memo: "" },
          { key: "APPROVED", label: "승인됨", status: "approved", requestHoursAgo: 5, memo: "상품 상태 확인 후 환불 승인" },
          { key: "OVERDUE", label: "처리지연", status: "requested", requestHoursAgo: 30, memo: "" },
          { key: "DONE", label: "환불완료", status: "completed", requestHoursAgo: 8, memo: "테스트 환불 완료 처리" },
        ];
        return specs.map((spec, index) => {
          const product = testProducts[index] || fallback;
          const createdAt = new Date(now - (spec.requestHoursAgo + 30) * 60 * 60 * 1000).toISOString();
          const completedAt = new Date(now - (spec.requestHoursAgo + 24) * 60 * 60 * 1000).toISOString();
          const requestedAt = new Date(now - spec.requestHoursAgo * 60 * 60 * 1000).toISOString();
          const subtotal = itemSalePrice(product);
          const deliveryFee = 3500;
          const order = {
            id: "FN-TEST-RETURN-" + spec.key + "-" + now,
            region: "동탄2 신도시",
            address: "반품/환불 테스트 주소 " + (index + 1),
            receiveType: "문앞 수령",
            paymentMethod: "카카오페이",
            riderRequest: "반품/환불 " + spec.label + " 테스트 주문",
            items: [{ ...product, quantity: 1, size: availableSizeOptions(product)[0] || product.size || "FREE" }],
            subtotal,
            deliveryFee,
            total: subtotal + deliveryFee,
            fastest: product.minutes || 36,
            customerId: customerId(),
            customerName: currentCustomer && currentCustomer.name ? currentCustomer.name : "반품환불 테스트 고객",
            customerContact: currentCustomer && currentCustomer.phone ? currentCustomer.phone : "01000000000",
            progressStep: 4,
            statusCode: "cancelled",
            statusLabel: "취소됨",
            cancelled: true,
            paid: true,
            paymentLabel: "카카오페이 결제 완료",
            cancelReasonCode: "return_refund",
            cancelReason: "배송완료 후 14일 이내 반품/환불 테스트 요청",
            refundStatus: spec.status,
            refundRequestedAt: requestedAt,
            refundMemo: spec.memo,
            refundHandledBy: spec.status === "requested" ? "" : "총관리자",
            refundHandledAt: spec.status === "requested" ? "" : new Date(now - Math.max(1, spec.requestHoursAgo - 1) * 60 * 60 * 1000).toISOString(),
            deliveryPartnerName: "지금배송 동탄센터",
            riderName: "테스트 기사",
            pickupConfirmedAt: new Date(now - (spec.requestHoursAgo + 25) * 60 * 60 * 1000).toISOString(),
            arrivalConfirmedAt: completedAt,
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
            deliveryLogs: [
              { id: "log-return-" + spec.key + "-request-" + now, action: "반품/환불 요청", detail: spec.label + " 테스트 데이터", actor: "고객", partnerName: "지금배송 동탄센터", riderName: "테스트 기사", createdAt: requestedAt },
              { id: "log-return-" + spec.key + "-done-" + now, action: "배송 완료", detail: "반품/환불 테스트용 배송 완료", actor: "지금배송 동탄센터", partnerName: "지금배송 동탄센터", riderName: "테스트 기사", createdAt: completedAt },
            ],
          };
          order.paymentLabel = paymentLabelForOrder(order);
          return order;
        });
      }

      async function createReturnRefundTestOrders() {
        if (!currentAdmin || currentAdmin.role !== "total") {
          setSyncStatus("반품/환불 테스트 주문 생성은 총관리자만 가능합니다");
          return;
        }
        if (!products.length) {
          setSyncStatus("반품/환불 테스트에 사용할 상품이 없습니다");
          return;
        }
        const demoOrders = buildReturnRefundTestOrders();
        demoOrders.forEach((order) => {
          saveOrderStatusOverride(order, { allowStepBack: true });
          saveOrderHistory(order);
        });
        lastOrder = demoOrders[0];
        try {
          if (supabaseClient) {
            for (const order of demoOrders) await syncOrderToSupabase(order);
            const refreshedOrders = await loadAdminOrders({ includeDiagnostic: true });
            await renderAdminOrders(refreshedOrders);
            setSyncStatus("반품/환불 테스트 4건 생성 완료 - Supabase 반영");
          } else {
            await renderAdminOrders(orderHistory);
            setSyncStatus("반품/환불 테스트 4건 생성 완료 - 화면 기록");
          }
        } catch (error) {
          await renderAdminOrders(orderHistory);
          setSyncStatus("반품/환불 테스트 4건 생성 완료 - 화면 반영, DB 저장 확인 필요");
        }
        renderOrders();
        renderTracking();
        saveTestToolMeta({ lastCheckAt: new Date().toISOString(), lastCheckType: "return_refund" });
      }

      function setReturnRefundVisibilityStatus(message) {
        setSyncStatus(message);
        document.querySelectorAll("[data-return-refund-visibility-status]").forEach((node) => {
          node.textContent = message;
        });
      }

      async function runReturnRefundVisibilityCheck() {
        setReturnRefundVisibilityStatus("반품/환불 표시 점검 중...");
        if (!currentAdmin || currentAdmin.role !== "total") {
          setReturnRefundVisibilityStatus("반품/환불 표시 점검은 총관리자만 가능합니다");
          return;
        }
        if (!products.length) {
          setReturnRefundVisibilityStatus("반품/환불 표시 점검에 사용할 상품이 없습니다");
          return;
        }
        const demoOrders = buildReturnRefundTestOrders();
        const testIds = demoOrders.map((order) => order.id);
        demoOrders.forEach((order) => {
          saveOrderStatusOverride(order, { allowStepBack: true });
          saveOrderHistory(order);
        });
        lastOrder = demoOrders[0];
        let sourceOrders = orderHistory;
        let customerRows = demoOrders;
        let dbSaved = false;
        let dbError = "";
        if (setupClientIfNeeded()) {
          try {
            for (const order of demoOrders) await syncOrderToSupabase(order);
            sourceOrders = await loadAdminOrders({ includeDiagnostic: true });
            const customerResult = await supabaseClient
              .from("orders")
              .select("*, order_items(*)")
              .eq("user_id", demoOrders[0].customerId)
              .in("order_code", testIds);
            if (customerResult.error) throw customerResult.error;
            customerRows = (customerResult.data || []).map(orderRowToHistory);
            dbSaved = true;
          } catch (error) {
            dbError = shortSupabaseError(error);
            sourceOrders = orderHistory;
          }
        }
        const adminVisible = sourceOrders.filter((order) => testIds.includes(order.id) && isReturnRefundTestOrder(order));
        const customerVisible = customerRows.filter((order) => testIds.includes(order.id) && (!isDiagnosticOrder(order) || isReturnRefundTestOrder(order)));
        const vendorVisible = adminVisible.filter((order) =>
          vendorAccounts.some((account) => (order.items || []).some((item) => item.showroom === account.store))
        );
        await renderAdminOrders(sourceOrders);
        renderOrders();
        renderTracking();
        renderSettlementExportActions();
        saveTestToolMeta({ lastCheckAt: new Date().toISOString(), lastCheckType: "return_refund_visibility" });
        const ok = adminVisible.length === testIds.length && customerVisible.length === testIds.length && vendorVisible.length === testIds.length;
        if (ok) markFinalQaScenarioItem("return-refund-visible", { render: false });
        setReturnRefundVisibilityStatus(
          "반품/환불 표시 점검 " + (ok ? "통과" : "확인 필요") +
          " - 관리자 " + adminVisible.length + "/" + testIds.length +
          " · 고객 " + customerVisible.length + "/" + testIds.length +
          " · 업체 " + vendorVisible.length + "/" + testIds.length +
          (dbSaved ? " · Supabase 반영" : " · 화면 기준" + (dbError ? " · DB 확인 필요: " + dbError : ""))
        );
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
          markAdminQaChecklistItems({
            [adminQaChecklistItemKey("final-scenario", "delivery-order")]: true,
            [adminQaChecklistItemKey("final-scenario", "delivery-proof")]: true,
          }, { render: false });
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
        const checkReady = isTodayTestToolTime(testMeta.lastCheckAt);
        const cleanupReady = isTodayTestToolTime(testMeta.lastCleanupAt);
        const settlementExportCount = settlementExportOrders("all").length;
        const readyCount = [qaReady, dataReady, checkReady, cleanupReady].filter(Boolean).length;
        const allReady = readyCount === 4;
        const itemMarkup = [
          { label: "QA", detail: qaReady ? "완료 " + testToolTimeLabel(qaStore.completedAt || qaStore.updatedAt) : qaProgress.checked + "/" + qaProgress.total + "개", ready: qaReady },
          { label: "테스트 데이터", detail: dataReady ? "잔여 없음" : "주문 " + diagnostic.orders + "건 · 로그 " + diagnostic.logs + "건", ready: dataReady },
          { label: "오늘 점검", detail: testToolFreshnessLabel(testMeta.lastCheckAt), ready: checkReady },
          { label: "오늘 정리", detail: testToolFreshnessLabel(testMeta.lastCleanupAt), ready: cleanupReady },
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
              <button class="primary" type="button" onclick="openAdminPreReleaseCheck()">최종 점검 모드</button>
              <button class="neutral" type="button" onclick="openAdminQaChecklist()">QA 체크리스트</button>
              <button class="success" type="button" ${diagnostic.hasTestState ? "" : "disabled"} onclick="clearAdminTestData()">테스트 데이터 정리</button>
              <button class="warning" type="button" onclick="openSettlementStatement()">정산서 미리보기</button>
              <button class="primary" type="button" ${settlementExportCount ? "" : "disabled"} onclick="downloadSettlementCsv('all')">정산 CSV ${settlementExportCount}건</button>
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
            refundPending: isOpenRefundStatus(order),
            refundOverdue: order.cancelReasonCode === "return_refund" && isOpenRefundStatus(order) && returnRefundProcessInfo(order).overdue,
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
                ${order.cancelReasonCode === "return_refund" && isOpenRefundStatus(order) ? '<span>처리 기한: ' + returnRefundProcessInfo(order).label + '</span>' : ""}
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
                <div><span>처리지연</span><strong>${metrics.refundOverdue}건</strong></div>
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
        const refundPendingCount = orders.filter((order) => isOpenRefundStatus(order)).length;
        const returnRefundCount = orders.filter((order) => isOpenRefundStatus(order) && order.cancelReasonCode === "return_refund").length;
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
            key: "return_refund",
            label: "반품환불",
            count: returnRefundCount,
            detail: "고객 반품/환불 요청",
            action: "요청 보기",
            cls: returnRefundCount ? "refund" : "done",
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
        const refundPendingOrders = orders.filter((order) => isOpenRefundStatus(order));
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
          <div class="admin-tool-actions">
            <button class="admin-tool-action primary" type="button" onclick="openAdminFinalQaScenario()">QA 시나리오</button>
            <button class="admin-tool-action" type="button" data-admin-cleanup-check="true">DB 삭제권한 점검</button>
          </div>
          <div class="admin-utility-status" data-return-refund-visibility-status aria-live="polite">반품/환불 표시 점검 결과가 여기에 표시됩니다.</div>
          <div class="admin-utility-status" data-admin-cleanup-status aria-live="polite">DB 삭제권한 점검 결과가 여기에 표시됩니다.</div>
        `;
        bindAdminTodoButtons(body);
        bindAdminUtilityButtons(body);
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

      function bindAdminUtilityButtons(root = document) {
        root.querySelectorAll("[data-fit3d-test-products]").forEach((button) => {
          button.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (button.disabled) return;
            createFit3dTypeTestProducts();
          };
        });
        root.querySelectorAll("[data-admin-cleanup-check]").forEach((button) => {
          button.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (button.disabled) return;
            checkSupabaseCleanupPermission().catch((error) => {
              setAdminCleanupCheckStatus("DB 삭제권한 점검 오류 - " + shortSupabaseError(error));
            });
          };
        });
      }

      function createFit3dTypeTestProducts() {
        if (!currentAdmin || currentAdmin.role !== "total") {
          setSyncStatus("3D 타입 테스트 상품 생성은 총관리자만 가능합니다");
          return;
        }
        const testItems = fit3dTypeTestProducts();
        testItems.forEach((item) => {
          const existing = products.find((product) => product.key === item.key);
          if (existing) {
            Object.assign(existing, item, { dbId: existing.dbId, showroomId: existing.showroomId, image: existing.image || item.image || "" });
          } else {
            products.unshift(item);
          }
          if (!wishlist.includes(item.key)) wishlist.push(item.key);
        });
        activeFitPreviewKey = testItems[0].key;
        selectedShowroom = "전체";
        saveWishlistStore();
        renderProducts();
        renderCart();
        renderVendorProducts();
        renderVendorLookPicker();
        renderVendorLooks();
        setSyncStatus("3D 타입 테스트 상품 " + testItems.length + "개 생성 - 마이아바타에서 바로 확인 가능");
        if (document.getElementById("fitRoomModal")?.classList.contains("open")) renderFitRoom();
      }

      function setupAdminUtilityHandlers() {
        if (setupAdminUtilityHandlers.ready) return;
        setupAdminUtilityHandlers.ready = true;
        document.addEventListener("click", (event) => {
          const button = findAdminCleanupCheckButtonFromEvent(event);
          if (!button || button.disabled) return;
          event.preventDefault();
          checkSupabaseCleanupPermission().catch((error) => {
            setAdminCleanupCheckStatus("DB 삭제권한 점검 오류 - " + shortSupabaseError(error));
          });
        });
      }

      function findAdminCleanupCheckButtonFromEvent(event) {
        if (event.target && event.target.closest) {
          const directButton = event.target.closest("[data-admin-cleanup-check]");
          if (directButton) return directButton;
        }
        const buttons = Array.from(document.querySelectorAll("[data-admin-cleanup-check]"));
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
              if (isOpenRefundStatus(order)) stats.refundPending += amount;
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
        if (filter === "return_refund") return isOpenRefundStatus(order) && order.cancelReasonCode === "return_refund";
        if (filter === "refund_pending") return isOpenRefundStatus(order);
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
        if (refundStatusFromOrder(order) === "requested" && order.cancelReasonCode === "return_refund") return { label: "요청됨", cls: "refund" };
        if (refundStatusFromOrder(order) === "approved" && order.cancelReasonCode === "return_refund") return { label: "승인됨", cls: "refund" };
        if (isOpenRefundStatus(order) && order.cancelReasonCode === "return_refund") return { label: "반품환불", cls: "refund" };
        if (isOpenRefundStatus(order)) return { label: "환불대기", cls: "refund" };
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
        const refundOverdue = rows.filter((row) => row.refundOverdue).length;
        const cancelledCount = rows.filter((row) => row.cancelled).length;
        const completedSales = rows.filter((row) => row.completed).reduce((sum, row) => sum + row.total, 0);
        const cancelRate = rows.length ? Math.round(cancelledCount * 100 / rows.length) : 0;
        const payout = Math.max(0, completedSales - Math.round(completedSales * 0.12));
        return { stoppedItems, pickupWaiting, refundWaiting, refundOverdue, cancelledCount, cancelRate, payout };
      }

      function adminStoreRiskBadge(store, rows) {
        const metrics = adminStoreRiskMetrics(store, rows);
        if (metrics.refundOverdue) return { label: "처리 지연", cls: "refund" };
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
          { key: "return_refund", label: "반품환불" },
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
          return_refund: {
            area: "orders",
            label: "반품환불",
            title: "반품/환불 요청 주문만 보는 중",
            detail: "배송완료 후 14일 이내 고객이 요청한 반품/환불 건입니다.",
            action: "상품 상태와 결제 취소 여부 확인 후 환불 완료 처리",
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
          return_refund: "반품환불",
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
        if (type === "return_refund") {
          adminStatusFilter = "return_refund";
          if (orderControl) orderControl.style.display = "";
          await renderAdminOrders();
          if (orderControl && orderControl.scrollIntoView) orderControl.scrollIntoView({ behavior: "smooth", block: "start" });
          highlightAdminTarget(orderControl);
          setSyncStatus("TODO · 반품/환불 요청 주문 필터 적용 완료");
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
                ${order.cancelReasonCode === "return_refund" && isOpenRefundStatus(order) ? '<span>처리 기한: ' + returnRefundProcessInfo(order).label + '</span>' : ""}
                ${order.refundHandledBy ? '<span>처리자: ' + order.refundHandledBy + '</span>' : ""}
                ${order.refundMemo ? '<span>처리 메모: ' + order.refundMemo + '</span>' : ""}
              </div>
            ` : ""}
            <div class="vendor-detail-actions admin-detail-actions">
              <div class="vendor-detail-action-group">
                <strong>배송 처리</strong>
                ${cancelled ? '<span>취소된 주문이라 배송 중, 배송 완료, 주문 취소 처리는 닫혔습니다.</span>' : `
                  <div class="mini-actions vendor-detail-action-buttons">
                    <button type="button" ${deliveryActionReady ? "" : "disabled"} onclick="adminAdvanceOrderFromDetail('${order.id}', 3)">${!readyForDelivery ? "픽업 대기" : !isDeliveryOrderClaimed(order) ? "배정 대기" : !pickupAuthed ? "픽업 인증 필요" : step >= 3 ? "배송 중 처리됨" : "배송 중"}</button>
                    <button type="button" ${deliveryCompleteReady ? "" : "disabled"} onclick="adminAdvanceOrderFromDetail('${order.id}', 4)">${step < 3 ? "배송 대기" : !arrivalAuthed ? "도착 인증 필요" : step >= 4 ? "배송 완료됨" : "배송 완료"}</button>
                    <button class="danger" type="button" ${currentAdmin.role === "total" && canCancelOrder(order) ? "" : "disabled"} onclick="cancelAdminOrderFromDetail('${order.id}')">${currentAdmin.role === "total" ? "주문 취소" : "총관리자 전용"}</button>
                  </div>
                `}
              </div>
              ${order.cancelReasonCode === "return_refund" ? `
                <div class="vendor-detail-action-group refund-action-group">
                  <strong>반품/환불 처리</strong>
                  <span>${customerRefundStatusLabel(order) || paymentLabelForOrder(order)} · ${isOpenRefundStatus(order) ? returnRefundProcessInfo(order).label : "처리 완료"}</span>
                  <div class="refund-action-buttons">
                    <button class="refund-approve" type="button" ${currentAdmin.role === "total" && canReviewReturnRefund(order) ? "" : "disabled"} onclick="approveReturnRefundFromDetail('${order.id}')">승인</button>
                    <button class="refund-reject" type="button" ${currentAdmin.role === "total" && canReviewReturnRefund(order) ? "" : "disabled"} onclick="rejectReturnRefundFromDetail('${order.id}')">거절</button>
                    <button class="refund-complete" type="button" ${currentAdmin.role === "total" && canCompleteRefund(order) ? "" : "disabled"} onclick="completeRefundFromDetail('${order.id}')">${currentAdmin.role === "total" && canCompleteRefund(order) ? "환불 완료" : currentAdmin.role === "total" ? paymentLabelForOrder(order) : "총관리자 전용"}</button>
                  </div>
                </div>
              ` : ""}
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
        if (hasDeliveryProof(order, "pickup") && hasDeliveryProof(order, "arrival")) {
          markFinalQaScenarioItem("delivery-proof");
        }
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

      async function approveReturnRefundFromDetail(orderId) {
        await reviewReturnRefund(orderId, "approved");
        await openAdminOrderDetail(orderId);
      }

      async function rejectReturnRefundFromDetail(orderId) {
        await reviewReturnRefund(orderId, "rejected");
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
          meta: JSON.stringify({
            note: item.note,
            fitMeasurements: {
              garmentLength: Number(item.garmentLength) || 0,
              shoulderWidth: Number(item.shoulderWidth) || 0,
              chestWidth: Number(item.chestWidth) || 0,
              waistWidth: Number(item.waistWidth) || 0,
              modelHeight: Number(item.modelHeight) || 0,
              modelWeight: Number(item.modelWeight) || 0,
            },
          }),
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
          user_id: order.customerId || customerId(),
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
        if (!requireAdminAccess()) return;
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
        if (!requireAdminAccess()) return;
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
          document.getElementById("loginHint").textContent = "PIN이 맞지 않습니다. 발급된 매장 PIN을 다시 확인해 주세요.";
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
        if (!requireAdminAccess()) return;
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
        const guestCustomer = customerId() === "guest-preview";
        const loginPromptMarkup = guestCustomer ? `
          <section class="summary-card" style="margin-top: 12px;">
            <h3>고객 로그인</h3>
            <div class="line-item"><span>카카오 연동 계정 또는 휴대폰 로그인으로</span><strong>주문 추적 연결</strong></div>
            <button class="primary" type="button" onclick="openCustomerLogin()" style="width:100%;margin-top:8px;">고객 로그인</button>
          </section>
        ` : "";
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
          ${loginPromptMarkup}
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
            ${latestOrder ? customerRefundStatusCard(latestOrder, true) : ""}
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
            <button class="secondary" type="button" onclick="openCustomerLogin()">${guestCustomer ? "고객 로그인" : "고객 변경"}</button>
            <button class="primary" type="button" onclick="openTrackingFromMy()">배송 추적</button>
          </div>
          <button class="secondary" type="button" onclick="logoutCustomer()" style="width:100%;margin-top:8px;">${guestCustomer ? "게스트 상태 초기화" : "로그아웃"}</button>
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
          visual: document.getElementById("vendorVisual")?.value || (existing ? existing.visual : defaultVisualForCategory(document.getElementById("vendorCategory").value)),
          image: vendorImageData || (existing ? existing.image : ""),
          imageFile: vendorImageFile,
          fit: existing ? existing.fit : "업체 등록 상품",
          size: document.getElementById("vendorSize").value.trim(),
          note: document.getElementById("vendorNote").value.trim(),
          ...readVendorFitMeasurements(),
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

      function priceRangeLabel(key) {
        const labels = {
          "전체": "전체 가격",
          under50000: "5만원 이하",
          "50000to100000": "5-10만원",
          over100000: "10만원 이상",
        };
        return labels[key] || key;
      }

      function sortModeLabel(mode) {
        const labels = {
          fastest: "빠른 도착",
          match: "매칭률",
          stock: "재고순",
          rating: "평점순",
          review: "리뷰 많은순",
        };
        return labels[mode] || mode;
      }

      function searchValue() {
        const input = document.getElementById("search");
        return input ? input.value.trim() : "";
      }

      function searchSuggestionTerms() {
        const base = [
          "화이트 반팔",
          "오늘도착",
          "무료배송",
          "5만원 이하",
          "오버핏",
          "가방",
        ];
        const recent = recentViewItems().map((item) => item.category || item.name).filter(Boolean);
        const categories = [...new Set(products.map((item) => item.category).filter(Boolean))];
        return [...new Set(base.concat(recent, categories))].slice(0, 8);
      }

      function renderSearchSuggestions() {
        const node = document.getElementById("searchSuggestions");
        if (!node) return;
        const query = searchValue();
        node.innerHTML = searchSuggestionTerms().map((term) =>
          '<button class="' + (query === term ? 'active-control' : '') + '" type="button" onclick="setSearchQuery(\'' + term + '\')">' + term + '</button>'
        ).join("");
      }

      function activeFilterLabels() {
        const labels = [];
        const query = searchValue();
        if (query) labels.push("검색 " + query);
        if (selectedShowroom !== "전체") labels.push(selectedShowroom);
        if (selectedCategory !== "전체") labels.push(selectedCategory);
        if (selectedSizeFilter !== "전체") labels.push(selectedSizeFilter);
        if (selectedPriceRange !== "전체") labels.push(priceRangeLabel(selectedPriceRange));
        if (onlyFast) labels.push("45분 이내");
        if (sortMode !== currentFeedTabConfig().sort) labels.push(sortModeLabel(sortMode));
        return labels;
      }

      function renderFilterPanelState() {
        const panel = document.getElementById("filterPanel");
        const toggle = document.getElementById("filterToggle");
        const summary = document.getElementById("activeFilterSummary");
        if (panel) panel.classList.toggle("collapsed", !filterPanelOpen);
        if (toggle) toggle.textContent = filterPanelOpen ? "필터 접기" : "필터 열기";
        if (summary) {
          const labels = activeFilterLabels();
          summary.innerHTML = labels.length
            ? labels.map((label) => '<span>' + label + '</span>').join("")
            : '<span>추천순 기본값</span>';
        }
      }

      function toggleFilterPanel() {
        filterPanelOpen = !filterPanelOpen;
        renderFilterPanelState();
      }

      function setSearchQuery(query) {
        const input = document.getElementById("search");
        if (input) input.value = query || "";
        selectedLookKeys = [];
        renderProducts();
      }

      function setShowroom(name) {
        selectedLookKeys = [];
        selectedShowroom = name;
        filterPanelOpen = false;
        renderProducts();
      }

      function setCategory(name) {
        selectedLookKeys = [];
        selectedCategory = name;
        filterPanelOpen = false;
        renderProducts();
      }

      function setSizeFilter(name) {
        selectedLookKeys = [];
        selectedSizeFilter = name;
        filterPanelOpen = false;
        renderProducts();
      }

      function setPriceRange(name) {
        selectedLookKeys = [];
        selectedPriceRange = name;
        filterPanelOpen = false;
        renderProducts();
      }

      const feedTabConfig = {
        popular: {
          title: "지금 인기 있는 상품",
          subtitle: "찜, 평점, 빠른 도착 기준으로 먼저 보여드려요.",
          label: "인기",
          sort: "rating",
        },
        new: {
          title: "오늘 올라온 신상",
          subtitle: "입점업체가 최근 등록한 상품과 기본 신상을 모았어요.",
          label: "신상",
          sort: "stock",
        },
        free: {
          title: "하나만 사도 무료배송",
          subtitle: "FitNow 베타 기간에는 노출 상품을 무료배송 기준으로 보여드려요.",
          label: "무료배송",
          sort: "fastest",
        },
        sale: {
          title: "할인 중인 상품",
          subtitle: "현재 할인율이 적용된 상품을 높은 할인순으로 정리했어요.",
          label: "세일",
          sort: "fastest",
        },
        fast: {
          title: "빠른도착 상품",
          subtitle: "현재 위치 기준 45분 이내 도착 가능한 상품만 모았어요.",
          label: "빠른도착",
          sort: "fastest",
        },
      };

      function currentFeedTabConfig() {
        return feedTabConfig[activeFeedTab] || feedTabConfig.popular;
      }

      function isNewFeedItem(item, index) {
        return !!item.vendorAdded || index < 3 || eta(item) <= 36;
      }

      function feedTabMatches(item, index) {
        if (activeFeedTab === "new") return isNewFeedItem(item, index);
        if (activeFeedTab === "sale") return normalizedDiscount(item.discountRate) > 0;
        if (activeFeedTab === "fast") return eta(item) <= 45;
        return true;
      }

      function sortFeedItems(items) {
        const ranked = items.slice();
        if (activeFeedTab === "popular") {
          return ranked.sort((a, b) =>
            productRatingValue(b) - productRatingValue(a)
            || productReviewCount(b) - productReviewCount(a)
            || b.match - a.match
            || eta(a) - eta(b)
          );
        }
        if (activeFeedTab === "new") {
          return ranked.sort((a, b) =>
            Number(!!b.vendorAdded) - Number(!!a.vendorAdded)
            || b.stock - a.stock
            || eta(a) - eta(b)
          );
        }
        if (activeFeedTab === "free") {
          return ranked.sort((a, b) => itemSalePrice(a) - itemSalePrice(b) || eta(a) - eta(b));
        }
        if (activeFeedTab === "sale") {
          return ranked.sort((a, b) =>
            normalizedDiscount(b.discountRate) - normalizedDiscount(a.discountRate)
            || itemSalePrice(a) - itemSalePrice(b)
          );
        }
        if (activeFeedTab === "fast") {
          return ranked.sort((a, b) => eta(a) - eta(b) || b.match - a.match);
        }
        return ranked;
      }

      function renderFeedState() {
        const config = currentFeedTabConfig();
        const feedTitle = document.getElementById("feedTitle");
        const feedSubtitle = document.getElementById("feedSubtitle");
        if (feedTitle) feedTitle.textContent = config.title;
        if (feedSubtitle) feedSubtitle.textContent = config.subtitle;
        document.querySelectorAll("[data-feed-tab]").forEach((button) => {
          button.classList.toggle("active-control", button.dataset.feedTab === activeFeedTab);
        });
        document.querySelectorAll(".sort").forEach((button) => {
          button.classList.toggle("active-control", button.dataset.sort === sortMode);
        });
        const fastToggle = document.getElementById("fastToggle");
        if (fastToggle) fastToggle.textContent = onlyFast ? "전체 보기" : "45분 이내";
      }

      function setFeedTab(tab) {
        activeFeedTab = feedTabConfig[tab] ? tab : "popular";
        selectedLookKeys = [];
        onlyFast = activeFeedTab === "fast";
        sortMode = currentFeedTabConfig().sort;
        filterPanelOpen = false;
        renderProducts();
      }

      function setSort(mode) {
        sortMode = mode;
        if (activeFeedTab === "fast" && mode !== "fastest") onlyFast = false;
        renderProducts();
      }

      function toggleFast() {
        onlyFast = !onlyFast;
        activeFeedTab = onlyFast ? "fast" : "popular";
        sortMode = currentFeedTabConfig().sort;
        renderProducts();
      }

      function resetControls() {
        selectedShowroom = "전체";
        selectedLookKeys = [];
        selectedCategory = "전체";
        selectedSizeFilter = "전체";
        selectedPriceRange = "전체";
        sortMode = "rating";
        onlyFast = false;
        activeFeedTab = "popular";
        filterPanelOpen = false;
        document.getElementById("search").value = "";
        setSort("rating");
      }

      function sizeFilterMatches(item) {
        return matchesSizeFilter(item, selectedSizeFilter);
      }

      function priceRangeMatches(item) {
        return matchesPriceRange(item, selectedPriceRange);
      }

      function visibleProducts() {
        const items = filterVisibleProducts({
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
        return sortFeedItems(items.filter((item, index) => feedTabMatches(item, index)));
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
        renderSearchSuggestions();
        renderFeedState();
        renderFilterPanelState();
        renderRecommendations();
        const items = visibleProducts();
        const first = items[0] || products[0];
        const feedLabel = currentFeedTabConfig().label;
        const activeFilters = [
          feedLabel && feedLabel !== "인기" ? feedLabel : "",
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
        const arrivalMinutes = eta(item);
        const discountRate = normalizedDiscount(item.discountRate);
        const salePrice = itemSalePrice(item);
        const normalPrice = itemNormalPrice(item);
        const deliveryLabel = arrivalMinutes <= 45 ? "오늘도착" : "예약배송";
        const stockStatusLabel = item.stock <= 2 ? "품절임박 " + item.stock + "개" : "재고 " + item.stock + "개";
        const stockAlert = item.stock <= 2 ? `<div class="stock-alert">품절임박 ${item.stock}개 남음. 지금 예약하면 픽업 우선 배정됩니다.</div>` : "";
        const detailBadges = [
          "무료배송",
          deliveryLabel,
          discountRate ? discountRate + "% 세일" : "",
          item.stock <= 2 ? "품절임박" : "",
        ].filter(Boolean);
        document.getElementById("detailName").textContent = item.name;
        document.getElementById("detailBody").innerHTML = `
          <div class="detail-hero">
            ${visualMarkup(item, "detail-visual")}
            <div class="detail-badge-row">${detailBadges.map((label) => `<span>${label}</span>`).join("")}</div>
          </div>
          <div class="detail-purchase-panel">
            <div class="detail-arrival-summary">
              <div>
                <span>예상 도착</span>
                <strong>${arrivalMinutes}분</strong>
              </div>
              <div>
                <span>배송비</span>
                <strong>무료</strong>
              </div>
              <div>
                <span>재고</span>
                <strong>${stockStatusLabel}</strong>
              </div>
            </div>
            ${priceMarkup(normalPrice, discountRate, salePrice)}
            <div class="detail-store-line">
              <strong>${item.showroom}</strong>
              <span>${ratingLabelForProduct(item)} · ${ratingLabelForStore(item.showroom)}</span>
            </div>
          </div>
          ${stockAlert}
          <div class="detail-meta">
            <div class="meta-box"><span>핏</span><strong>${item.fit}</strong></div>
            <div class="meta-box"><span>배송</span><strong>${deliveryLabel}</strong></div>
            <div class="meta-box"><span>추천률</span><strong>${item.match}%</strong></div>
          </div>
          <div class="summary-card">
            <h3>상품 실측 정보</h3>
            <div class="line-item"><span>상품 실측</span><strong>${garmentSpecSummary(item)}</strong></div>
            <div class="line-item"><span>모델 기준</span><strong>${modelSpecSummary(item)}</strong></div>
          </div>
          <div class="summary-card">
            <h3>사이즈 선택</h3>
            <div class="size-chip-list">${sizes.map((size) => {
              const count = sizeStock(item, size);
              return `<button class="${size === selectedDetailSize ? "active-control" : ""}" data-size="${size}" type="button" ${count > 0 ? "" : "disabled"} onclick="selectDetailSize('${size}')">${size} · ${count > 0 ? count + "개" : "품절"}</button>`;
            }).join("")}</div>
          </div>
          <div class="summary-card" style="margin-top: 12px;">
            <h3>배송/구매 안내</h3>
            <div class="line-item"><span>${item.material}</span><strong>${item.match}% 매칭</strong></div>
            <div class="line-item"><span>매장 픽업 준비</span><strong>${prepMinutes ? prepMinutes + "분" : "즉시 준비"}</strong></div>
            <div class="line-item"><span>배송비</span><strong>무료배송</strong></div>
            <div class="line-item"><span>반품/환불</span><strong>배송완료 후 14일 이내 요청</strong></div>
          </div>
          <p class="fit-note">${item.note}</p>
          ${detailRecommendationMarkup(item)}
          <div class="detail-actions three-actions">
            <button class="wish-button ${isWishlisted(item.key) ? "active-control" : ""}" type="button" onclick="toggleWishlist('${item.key}')">${isWishlisted(item.key) ? "♥" : "♡"}</button>
            <button class="primary" type="button" onclick="reserveFromDetail('${item.key}')">바로 예약</button>
          </div>
          <div class="detail-actions" style="margin-top: 8px;">
            <button class="secondary" type="button" onclick="addDetailToCart('${item.key}')">장바구니 담기</button>
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

      function cartFastestEta() {
        return cart.length ? Math.min(...cart.map((item) => eta(item))) : 0;
      }

      function cartStoreCount() {
        return new Set(cart.map((item) => item.showroom).filter(Boolean)).size;
      }

      function renderCart() {
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totals = cartTotals();
        const checkoutButton = document.getElementById("cartCheckoutButton");
        const etaNode = document.getElementById("cartEta");
        document.getElementById("cartCount").textContent = count ? count + "개 담김" : "장바구니 비어 있음";
        document.getElementById("cartTotal").textContent = formatKRW(totals.total);
        document.getElementById("cartHint").textContent = count
          ? cartStoreCount() + "개 매장 · 무료배송 · 눌러서 수량 확인"
          : "상품을 담으면 무료배송 예약이 열립니다";
        if (etaNode) etaNode.textContent = count ? "최단 " + cartFastestEta() + "분" : "무료배송";
        if (checkoutButton) {
          checkoutButton.disabled = !count;
          checkoutButton.textContent = count ? "바로 예약" : "예약";
        }
        if (document.getElementById("cartModal").classList.contains("open")) renderCartDetail();
      }

      function cartTotals() {
        return calculateCartTotals(cart);
      }

      function readFitProfile() {
        try {
          const parsed = JSON.parse(localStorage.getItem(FIT_PROFILE_STORAGE_KEY) || "{}");
          const sampleKeys = fitBodySamples().map((sample) => sample.key);
          return {
            height: Math.min(205, Math.max(130, Number(parsed.height) || 168)),
            weight: Math.min(140, Math.max(35, Number(parsed.weight) || 58)),
            topSize: parsed.topSize || "M",
            bottomSize: parsed.bottomSize || "M",
            bodyType: sampleKeys.includes(parsed.bodyType) ? parsed.bodyType : "regular",
          };
        } catch (error) {
          localStorage.removeItem(FIT_PROFILE_STORAGE_KEY);
          return { height: 168, weight: 58, topSize: "M", bottomSize: "M", bodyType: "regular" };
        }
      }

      function writeFitProfile(profile) {
        localStorage.setItem(FIT_PROFILE_STORAGE_KEY, JSON.stringify(profile));
      }

      function fitSizeOptions(kind) {
        return kind === "bottom" ? ["XS", "S", "M", "L", "XL", "XXL", "28", "30", "32", "34", "36"] : ["XS", "S", "M", "L", "XL", "XXL", "FREE"];
      }

      function fitSizeSelectOptions(kind, selected) {
        return fitSizeOptions(kind).map((size) => '<option value="' + size + '" ' + (size === selected ? "selected" : "") + '>' + size + '</option>').join("");
      }

      function fitVisualTypeOptions() {
        return [
          { key: "tshirt", label: "반팔 티셔츠", category: "상의" },
          { key: "shirt", label: "셔츠/블라우스", category: "상의" },
          { key: "hoodie", label: "후드/맨투맨", category: "상의" },
          { key: "jacket", label: "자켓/아우터", category: "상의" },
          { key: "wide-pants", label: "와이드/조거 팬츠", category: "하의" },
          { key: "shorts", label: "쇼츠/반바지", category: "하의" },
          { key: "shoes", label: "신발", category: "신발" },
          { key: "bag", label: "가방/잡화", category: "잡화" },
        ];
      }

      function fitVisualTypeLabel(value) {
        const option = fitVisualTypeOptions().find((item) => item.key === value);
        return option ? option.label : "자동 추정";
      }

      function fitVisualTypeSelectOptions(selected = "tshirt") {
        return fitVisualTypeOptions().map((option) => '<option value="' + option.key + '" ' + (option.key === selected ? "selected" : "") + '>' + option.label + '</option>').join("");
      }

      function defaultVisualForCategory(category = "상의") {
        const map = { "상의": "tshirt", "하의": "wide-pants", "신발": "shoes", "잡화": "bag", "아우터": "jacket" };
        return map[category] || "tshirt";
      }

      function syncVendorVisualWithCategory() {
        const category = document.getElementById("vendorCategory")?.value || "상의";
        const select = document.getElementById("vendorVisual");
        if (!select) return;
        const currentOption = fitVisualTypeOptions().find((item) => item.key === select.value);
        if (!currentOption || currentOption.category !== category) {
          select.value = defaultVisualForCategory(category);
        }
      }

      function fitBodySamples() {
        return [
          { key: "slim", label: "슬림형", desc: "어깨·허리 얇은 체형", shoulder: -5, chest: -5, waist: -7, hip: -4, thigh: -3, leg: 2 },
          { key: "regular", label: "표준형", desc: "평균 균형 체형", shoulder: 0, chest: 0, waist: 0, hip: 0, thigh: 0, leg: 0 },
          { key: "athletic", label: "운동형", desc: "어깨 넓고 상체 발달", shoulder: 8, chest: 5, waist: -2, hip: 1, thigh: 2, leg: 1 },
          { key: "straight", label: "일자형", desc: "상하체 폭이 비슷함", shoulder: 2, chest: 2, waist: 6, hip: 2, thigh: 1, leg: 0 },
          { key: "pear", label: "하체형", desc: "골반·하체 볼륨형", shoulder: -2, chest: -1, waist: 3, hip: 8, thigh: 7, leg: 4 },
          { key: "plus", label: "볼륨형", desc: "전체적으로 여유 있는 체형", shoulder: 6, chest: 8, waist: 12, hip: 9, thigh: 7, leg: 2 },
        ];
      }

      function fitBodySample(profile) {
        return fitBodySamples().find((sample) => sample.key === profile.bodyType) || fitBodySamples()[1];
      }

      function fitSizeAdjustment(size) {
        const map = { XS: -7, S: -4, M: 0, L: 4, XL: 8, XXL: 12, FREE: 2, 28: -3, 30: 0, 32: 4, 34: 8, 36: 12 };
        return map[size] || 0;
      }

      function fitBodySampleMarkup(profile) {
        return fitBodySamples().map((sample) => `
          <button class="fit-body-sample ${sample.key === profile.bodyType ? "active-control" : ""}" type="button" data-body-type="${sample.key}" onclick="selectFitBodySample('${sample.key}')">
            <strong>${sample.label}</strong>
            <span>${sample.desc}</span>
          </button>
        `).join("");
      }

      function fitPreviewItems() {
        return wishlistItems().filter((item) => storeIsVisible(item)).slice(0, 30);
      }

      function fitProfileMetrics(profile) {
        const bmi = profile.weight / Math.pow(profile.height / 100, 2);
        const sample = fitBodySample(profile);
        const topAdjust = fitSizeAdjustment(profile.topSize);
        const bottomAdjust = fitSizeAdjustment(profile.bottomSize);
        const standardHeight = 172.5;
        const standardBmi = 23.2;
        const heightDelta = profile.height - standardHeight;
        const bmiDelta = bmi - standardBmi;
        const shoulder = Math.min(122, Math.max(78, 92 + heightDelta * 0.1 + bmiDelta * 1.05 + sample.shoulder + topAdjust * 0.32));
        const chest = Math.min(126, Math.max(78, 94 + heightDelta * 0.12 + bmiDelta * 1.8 + sample.chest + topAdjust * 0.42));
        const waist = Math.min(122, Math.max(68, 82 + heightDelta * 0.04 + bmiDelta * 2.35 + sample.waist + topAdjust * 0.12 + bottomAdjust * 0.32));
        const hip = Math.min(124, Math.max(76, 94 + heightDelta * 0.07 + bmiDelta * 1.55 + sample.hip + bottomAdjust * 0.5));
        const thigh = Math.min(74, Math.max(48, 56 + heightDelta * 0.04 + bmiDelta * 0.95 + sample.thigh + bottomAdjust * 0.34));
        const leg = Math.min(126, Math.max(82, 92 + heightDelta * 0.36 + sample.leg + bottomAdjust * 0.35));
        const shoulderRatio = shoulder / 92;
        const chestRatio = chest / 94;
        const waistRatio = waist / 82;
        const hipRatio = hip / 94;
        const thighRatio = thigh / 56;
        const legRatio = leg / 92;
        const bmiLabel = bmi < 18.5 ? "슬림" : bmi < 23 ? "레귤러" : bmi < 27 ? "릴랙스" : "오버핏 추천";
        const label = sample.label + " · " + bmiLabel;
        return { bmi, shoulder, chest, waist, hip, thigh, leg, shoulderRatio, chestRatio, waistRatio, hipRatio, thighRatio, legRatio, label, sample };
      }

      function fitClamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
      }

      function fitAvatarStyle(profile, metrics) {
        const heightDelta = profile.height - 168;
        const torso = fitClamp(130 + (profile.height - 172.5) * 0.42 + (metrics.chestRatio - 1) * 10, 120, 150);
        const legHeight = fitClamp(112 + (profile.height - 172.5) * 0.66 + (metrics.legRatio - 1) * 18, 98, 146);
        const armHeight = fitClamp(110 + (profile.height - 172.5) * 0.45 + (metrics.shoulderRatio - 1) * 6, 100, 132);
        const head = fitClamp(55 + (profile.height - 172.5) * 0.04, 52, 58);
        const totalHeight = head + torso + legHeight + 10;
        return [
          "--avatar-height:" + Math.round(fitClamp(190 + heightDelta * 1.38, 176, 246)) + "px",
          "--avatar-shoulder:" + Math.round(metrics.shoulder) + "px",
          "--avatar-chest:" + Math.round(metrics.chest) + "px",
          "--avatar-waist:" + Math.round(metrics.waist) + "px",
          "--avatar-hip:" + Math.round(metrics.hip) + "px",
          "--avatar-thigh:" + Math.round(metrics.thigh) + "px",
          "--avatar-leg:" + Math.round(metrics.leg) + "px",
          "--avatar-torso-height:" + Math.round(torso) + "px",
          "--avatar-leg-height:" + Math.round(legHeight) + "px",
          "--avatar-arm-height:" + Math.round(armHeight) + "px",
          "--avatar-head-height:" + Math.round(head) + "px",
          "--avatar-total-height:" + Math.round(totalHeight) + "px",
        ].join(";");
      }

      function garmentSpecs(item = {}) {
        return {
          length: Number(item.garmentLength) || 0,
          shoulder: Number(item.shoulderWidth) || 0,
          chest: Number(item.chestWidth) || 0,
          waist: Number(item.waistWidth) || 0,
          modelHeight: Number(item.modelHeight) || 0,
          modelWeight: Number(item.modelWeight) || 0,
        };
      }

      function garmentSpecSummary(item = {}) {
        const specs = garmentSpecs(item);
        const parts = [];
        if (specs.length) parts.push("총기장 " + specs.length + "cm");
        if (specs.shoulder) parts.push("어깨 " + specs.shoulder + "cm");
        if (specs.chest) parts.push("가슴 " + specs.chest + "cm");
        if (specs.waist) parts.push("허리 " + specs.waist + "cm");
        return parts.join(" · ") || "실측 미입력";
      }

      function modelSpecSummary(item = {}) {
        const specs = garmentSpecs(item);
        if (!specs.modelHeight && !specs.modelWeight) return "모델 정보 미입력";
        return [specs.modelHeight ? specs.modelHeight + "cm" : "", specs.modelWeight ? specs.modelWeight + "kg" : ""].filter(Boolean).join(" · ");
      }

      function fitMatchForItem(item, profile) {
        const metrics = fitProfileMetrics(profile);
        const specs = garmentSpecs(item);
        const itemFit = (item.fit || "").toLowerCase();
        let score = item.match || 82;
        if (metrics.bmi < 19 && /slim|크롭|슬림/i.test(itemFit + item.name)) score += 5;
        if (metrics.bmi >= 23 && /relaxed|오버|와이드|루즈|릴랙스/i.test(itemFit + item.name)) score += 6;
        if (specs.shoulder) score -= Math.min(8, Math.abs(metrics.shoulder / 2 - specs.shoulder) * 0.35);
        if (specs.chest) score -= Math.min(8, Math.max(0, metrics.chest / 2 - specs.chest) * 0.45);
        if (specs.length) {
          const idealLength = item.category === "하의" ? metrics.leg * 0.92 : profile.height * 0.32;
          score -= Math.min(6, Math.abs(idealLength - specs.length) * 0.18);
        }
        if (specs.modelHeight) score -= Math.min(4, Math.abs(profile.height - specs.modelHeight) * 0.05);
        if (item.category === "신발") score = Math.min(94, score - 3);
        if (item.category === "잡화") score = Math.min(96, score + 2);
        return Math.min(98, Math.max(62, Math.round(score)));
      }

      function cartLookItems() {
        const seen = new Set();
        return cart.map((line) => products.find((product) => product.key === line.key) || line)
          .filter((item) => {
            if (!item || seen.has(item.key)) return false;
            seen.add(item.key);
            return true;
          });
      }

      function activeAvatarItems(primaryItem) {
        const cartItems = cartLookItems();
        return cartItems.length ? cartItems : (primaryItem ? [primaryItem] : []);
      }

      function avatarLookStores(items = []) {
        return [...new Set(items.map((item) => item.showroom).filter(Boolean))];
      }

      function fitLayerStyle(item = {}, index = 0, profile = readFitProfile(), metrics = fitProfileMetrics(profile)) {
        const category = item.category || "상의";
        const visual = item.visual || "";
        const chestScale = fitClamp(metrics.chestRatio, .88, 1.22);
        const waistScale = fitClamp(metrics.waistRatio, .86, 1.28);
        const hipScale = fitClamp(metrics.hipRatio, .88, 1.26);
        const legScale = fitClamp(metrics.legRatio, .88, 1.24);
        const topWidth = Math.round(100 + (chestScale - 1) * 34);
        const waistWidth = Math.round(96 + (waistScale - 1) * 28);
        const hipWidth = Math.round(98 + (hipScale - 1) * 30);
        const topLength = visual === "hoodie" || visual === "jacket" ? 109 : visual === "shirt" ? 103 : 98;
        const bottomHeight = Math.round(104 * legScale);
        const lower = category === "하의" ? Math.round(-98 - (legScale - 1) * 18) : 12;
        return [
          "--fit-layer-index:" + index,
          "--fit-top-width:" + topWidth + "%",
          "--fit-waist-width:" + waistWidth + "%",
          "--fit-hip-width:" + hipWidth + "%",
          "--fit-top-length:" + topLength + "%",
          "--fit-bottom-height:" + bottomHeight + "px",
          "--fit-bottom-offset:" + lower + "px",
        ].join(";");
      }

      function fitPreviewLayers(items = [], profile = readFitProfile(), metrics = fitProfileMetrics(profile)) {
        if (!items.length) return '<div class="fit-garment empty-fit">상품 선택</div>';
        return items.map((item, index) => {
          const category = qaScenarioStatusEscape(item.category || "상의");
          const name = qaScenarioStatusEscape(item.name || category);
          const photoClass = item.image ? " has-photo" : "";
          const visualClass = item.visual ? " fit-visual-" + qaScenarioStatusEscape(item.visual) : "";
          const image = item.image ? '<img src="' + item.image + '" alt="' + name + '" />' : '<span>' + category + '</span>';
          return '<div class="fit-garment fit-layer-' + index + ' fit-' + category + visualClass + photoClass + '" style="' + fitLayerStyle(item, index, profile, metrics) + '" title="' + name + '">' + image + '</div>';
        }).join("");
      }

      function realFitPreviewStyle(profile, metrics) {
        const heightScale = Math.min(1.04, Math.max(.965, 1 + (profile.height - 172.5) * .0012));
        const widthBlend = (metrics.shoulderRatio + metrics.chestRatio + metrics.waistRatio + metrics.hipRatio) / 4;
        const widthScale = Math.min(1.045, Math.max(.96, 1 + (widthBlend - 1) * .14));
        const y = Math.min(8, Math.max(-8, (172.5 - profile.height) * .12));
        const overlayScale = Math.min(1.12, Math.max(.92, .98 + (widthBlend - 1) * .18 + (profile.height - 172.5) * .001));
        const overlayY = Math.min(18, Math.max(-18, (172.5 - profile.height) * .22));
        return [
          "--real-fit-height:" + heightScale.toFixed(3),
          "--real-fit-width:" + widthScale.toFixed(3),
          "--real-fit-y:" + Math.round(y) + "px",
          "--real-garment-scale:" + overlayScale.toFixed(3),
          "--real-overlay-y:" + Math.round(overlayY) + "px",
        ].join(";");
      }

      function disposeFit3dPreview() {
        if (!fit3dRuntime) return;
        if (fit3dRuntime.frame) window.cancelAnimationFrame(fit3dRuntime.frame);
        if (fit3dRuntime.resumeTimer) window.clearTimeout(fit3dRuntime.resumeTimer);
        if (fit3dRuntime.resizeObserver) fit3dRuntime.resizeObserver.disconnect();
        if (fit3dRuntime.canvas) {
          fit3dRuntime.canvas.removeEventListener("pointerdown", fit3dRuntime.onPointerDown);
          fit3dRuntime.canvas.removeEventListener("pointermove", fit3dRuntime.onPointerMove);
          fit3dRuntime.canvas.removeEventListener("pointerup", fit3dRuntime.onPointerUp);
          fit3dRuntime.canvas.removeEventListener("pointercancel", fit3dRuntime.onPointerUp);
        }
        if (fit3dRuntime.scene) {
          fit3dRuntime.scene.traverse((node) => {
            if (!node.geometry && !node.material) return;
            if (node.geometry) node.geometry.dispose();
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.filter(Boolean).forEach((material) => material.dispose());
          });
        }
        if (fit3dRuntime.renderer) fit3dRuntime.renderer.dispose();
        fit3dRuntime = null;
      }

      function fit3dMaterial(color, roughness = .72, metalness = .04) {
        return new THREE.MeshStandardMaterial({ color, roughness, metalness });
      }

      function fit3dFabricMaterial(color, roughness = .86) {
        return new THREE.MeshStandardMaterial({
          color,
          roughness,
          metalness: .01,
          emissive: new THREE.Color(color).multiplyScalar(.035),
        });
      }

      function fit3dCapsule(radius, length, material) {
        const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 12, 24), material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
      }

      function fit3dRoundedBox(width, height, depth, radius, smoothness, material) {
        const shape = new THREE.Shape();
        const x = -width / 2;
        const y = -height / 2;
        shape.moveTo(x + radius, y);
        shape.lineTo(x + width - radius, y);
        shape.quadraticCurveTo(x + width, y, x + width, y + radius);
        shape.lineTo(x + width, y + height - radius);
        shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        shape.lineTo(x + radius, y + height);
        shape.quadraticCurveTo(x, y + height, x, y + height - radius);
        shape.lineTo(x, y + radius);
        shape.quadraticCurveTo(x, y, x + radius, y);
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth,
          bevelEnabled: true,
          bevelSegments: smoothness,
          bevelSize: radius * .42,
          bevelThickness: radius * .42,
          curveSegments: smoothness,
        });
        geometry.center();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
      }

      function fit3dGarmentColor(item = {}) {
        if (item.visual === "tshirt" || /화이트|white/i.test(item.name || "")) return 0xf7f3ea;
        if (/후드|hood/i.test(item.name || item.fit || "")) return 0xd8dde5;
        if (/셔츠|shirt/i.test(item.name || item.fit || "")) return 0xf4f0e7;
        if (/자켓|재킷|jacket|아우터|outer/i.test(item.name || item.fit || item.visual || "")) return 0x273142;
        if (item.category === "하의") return 0x22252c;
        if (item.category === "잡화") return 0xc4a873;
        if (item.category === "신발") return 0x111111;
        return 0x2f5bff;
      }

      function fit3dGarmentType(item = {}) {
        const text = [item.name, item.fit, item.visual, item.category].filter(Boolean).join(" ").toLowerCase();
        if (/후드|hood/.test(text)) return "hoodie";
        if (/자켓|재킷|jacket|아우터|outer|coat/.test(text)) return "jacket";
        if (/셔츠|shirt|블라우스|blouse/.test(text)) return "shirt";
        if (/맨투맨|sweat|니트|knit/.test(text)) return "sweatshirt";
        if (/쇼츠|반바지|short/.test(text)) return "shorts";
        if (/와이드|wide|조거|jogger/.test(text)) return "wide-pants";
        if (item.visual === "tshirt") return "tshirt";
        return item.category === "하의" ? "pants" : "tshirt";
      }

      function fit3dTopItem(items = []) {
        if (items.length && items.every((item) => item.category === "하의" || item.category === "신발" || item.category === "잡화")) {
          return {
            category: "상의",
            visual: "tshirt",
            name: "기본 피팅 이너",
            color: "#f7f2e8"
          };
        }
        return items.find((item) => ["상의", "아우터", "원피스"].includes(item.category)) || items.find((item) => item.category !== "하의" && item.category !== "신발" && item.category !== "잡화") || {
          category: "상의",
          visual: "tshirt",
          name: "기본 피팅 이너",
          color: "#f7f2e8"
        };
      }

      function fit3dBottomItem(items = []) {
        return items.find((item) => item.category === "하의") || {};
      }

      function fit3dAccessoryItems(items = []) {
        return items.filter((item) => item.category === "잡화").slice(0, 2);
      }

      function fit3dSilhouette(type) {
        const map = {
          tshirt: { shoulder: 1.02, chest: 1, waist: 1, length: 1, depth: 1, sleeveRadius: 1, sleeveLength: 1, sleeveDrop: 0 },
          shirt: { shoulder: 1.08, chest: 1.03, waist: .96, length: 1.03, depth: .98, sleeveRadius: .82, sleeveLength: 1.16, sleeveDrop: -.08 },
          hoodie: { shoulder: 1.16, chest: 1.13, waist: 1.09, length: 1.08, depth: 1.16, sleeveRadius: 1.08, sleeveLength: 1.22, sleeveDrop: -.1 },
          sweatshirt: { shoulder: 1.12, chest: 1.1, waist: 1.07, length: 1.06, depth: 1.12, sleeveRadius: 1.04, sleeveLength: 1.18, sleeveDrop: -.08 },
          jacket: { shoulder: 1.2, chest: 1.18, waist: 1.02, length: 1.12, depth: 1.2, sleeveRadius: 1.12, sleeveLength: 1.2, sleeveDrop: -.06 },
        };
        return map[type] || map.tshirt;
      }

      function fit3dAddTopDetails(group, type, scales, materials) {
        const { shoulderScale, chestScale, waistScale, hipScale } = scales;
        const { shirt, shirtShadow, seamMaterial } = materials;
        if (type === "shirt" || type === "jacket") {
          const placket = new THREE.Mesh(new THREE.BoxGeometry(type === "jacket" ? .026 : .018, type === "jacket" ? .98 : .9, .018), seamMaterial);
          placket.position.set(0, 1.55, .24 * chestScale);
          group.add(placket);
          [1.92, 1.72, 1.52, 1.32].forEach((y) => {
            const button = new THREE.Mesh(new THREE.SphereGeometry(type === "jacket" ? .021 : .017, 16, 10), seamMaterial);
            button.position.set(0, y, .254 * chestScale);
            group.add(button);
          });
          [["left", -1], ["right", 1]].forEach(([, side]) => {
            const pocket = fit3dRoundedBox(.16, .11, .018, .018, 5, fit3dFabricMaterial(type === "jacket" ? 0x344054 : 0xefe7da, .88));
            pocket.position.set(side * .2 * chestScale, 1.42, .266 * chestScale);
            pocket.rotation.z = side * .025;
            group.add(pocket);
          });
        }
        if (type === "jacket") {
          const jacket = fit3dRoundedBox(1.08 * shoulderScale, 1.18, .58 * chestScale, .13, 10, fit3dFabricMaterial(0x293241, .88));
          jacket.position.y = 1.51;
          jacket.position.z = .015;
          group.add(jacket);
          const opening = new THREE.Mesh(new THREE.BoxGeometry(.24, 1.06, .034), fit3dFabricMaterial(0xf7f2e8, .92));
          opening.position.set(0, 1.49, .39 * chestScale);
          group.add(opening);
          const split = new THREE.Mesh(new THREE.BoxGeometry(.034, .34, .038), fit3dFabricMaterial(0xf7f2e8, .92));
          split.position.set(0, .97, .41 * chestScale);
          group.add(split);
          [["left", -1], ["right", 1]].forEach(([, side]) => {
            const lapel = fit3dRoundedBox(.22, .64, .04, .025, 6, fit3dFabricMaterial(0x354052, .88));
            lapel.position.set(side * .155, 1.76, .43 * chestScale);
            lapel.rotation.z = side * .22;
            group.add(lapel);
            const lowerPanel = fit3dRoundedBox(.18, .36, .034, .025, 6, fit3dFabricMaterial(0x232c3a, .9));
            lowerPanel.position.set(side * .21, 1.05, .415 * chestScale);
            lowerPanel.rotation.z = side * -.06;
            group.add(lowerPanel);
          });
        }
        if (type === "hoodie") {
          const hood = new THREE.Mesh(new THREE.TorusGeometry(.29, .058, 16, 56), shirt);
          hood.position.set(0, 2.15, -.09);
          hood.rotation.x = Math.PI / 2.5;
          hood.scale.set(1.18, .8, 1.08);
          hood.castShadow = true;
          hood.receiveShadow = true;
          group.add(hood);
          const pouch = fit3dRoundedBox(.42 * waistScale, .2, .035, .03, 8, fit3dFabricMaterial(0xcfd5de, .9));
          pouch.position.set(0, 1.12, .285 * chestScale);
          group.add(pouch);
          [["left", -1], ["right", 1]].forEach(([, side]) => {
            const string = new THREE.Mesh(new THREE.CylinderGeometry(.007, .007, .36, 8), seamMaterial);
            string.position.set(side * .055, 1.88, .255 * chestScale);
            string.rotation.z = side * .04;
            group.add(string);
          });
        }
        if (type === "sweatshirt" || type === "hoodie") {
          const rib = new THREE.Mesh(new THREE.TorusGeometry(.4 * Math.max(waistScale, hipScale), .018, 8, 56), shirtShadow);
          rib.position.y = .79;
          rib.scale.z = .56;
          rib.rotation.x = Math.PI / 2;
          group.add(rib);
        }
      }

      function fit3dAddFaceDetails(group, materials) {
        const { skin, hair, faceLine } = materials;
        const nose = new THREE.Mesh(new THREE.ConeGeometry(.026, .085, 18), skin);
        nose.position.set(0, 2.58, .19);
        nose.rotation.x = Math.PI / 2;
        group.add(nose);
        [["left", -1], ["right", 1]].forEach(([, side]) => {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(.015, 12, 8), faceLine);
          eye.position.set(side * .062, 2.575, .177);
          eye.scale.set(1.25, .58, .45);
          group.add(eye);
          const brow = new THREE.Mesh(new THREE.BoxGeometry(.052, .006, .006), faceLine);
          brow.position.set(side * .064, 2.625, .181);
          brow.rotation.z = side * .08;
          group.add(brow);
          const ear = new THREE.Mesh(new THREE.SphereGeometry(.042, 16, 10), skin);
          ear.position.set(side * .205, 2.57, -.01);
          ear.scale.set(.42, .9, .28);
          group.add(ear);
          const fringe = fit3dCapsule(.014, .18, hair);
          fringe.position.set(side * .062, 2.76, .145);
          fringe.rotation.z = side * .28;
          fringe.rotation.x = .12;
          group.add(fringe);
        });
        const mouth = new THREE.Mesh(new THREE.BoxGeometry(.074, .007, .006), faceLine);
        mouth.position.set(0, 2.465, .178);
        mouth.scale.x = .9;
        group.add(mouth);
        const chinShade = new THREE.Mesh(new THREE.BoxGeometry(.09, .006, .006), fit3dMaterial(0xc99f83, .9, 0));
        chinShade.position.set(0, 2.43, .165);
        group.add(chinShade);
      }

      function fit3dAddAccessories(group, items = [], scales = {}) {
        const bag = fit3dAccessoryItems(items)[0];
        if (!bag) return;
        const strap = new THREE.Mesh(new THREE.TorusGeometry(.66, .012, 8, 72), fit3dMaterial(0x2a251f, .72, .02));
        strap.position.set(.03, 1.55, .31);
        strap.scale.set(.55, 1.08, .2);
        strap.rotation.z = -.62;
        group.add(strap);
        const body = fit3dRoundedBox(.39, .29, .15, .055, 10, fit3dFabricMaterial(fit3dGarmentColor(bag), .78));
        body.position.set(.4 * (scales.shoulderScale || 1), 1.15, .41);
        body.rotation.z = -.08;
        group.add(body);
        const flap = fit3dRoundedBox(.33, .07, .018, .02, 6, fit3dFabricMaterial(0x8f744f, .82));
        flap.position.set(.4 * (scales.shoulderScale || 1), 1.24, .498);
        flap.rotation.z = -.08;
        group.add(flap);
        const buckle = new THREE.Mesh(new THREE.TorusGeometry(.032, .006, 8, 18), fit3dMaterial(0xd7b56d, .5, .35));
        buckle.position.set(.23 * (scales.shoulderScale || 1), 1.35, .505);
        buckle.rotation.z = -.08;
        group.add(buckle);
      }

      function fit3dBuildAvatar(profile, metrics, items = []) {
        const group = new THREE.Group();
        const heightScale = Math.min(1.12, Math.max(.92, 1 + (profile.height - 172.5) * .0035));
        const shoulderScale = Math.min(1.28, Math.max(.82, metrics.shoulderRatio));
        const chestScale = Math.min(1.24, Math.max(.84, metrics.chestRatio));
        const waistScale = Math.min(1.28, Math.max(.82, metrics.waistRatio));
        const hipScale = Math.min(1.28, Math.max(.84, metrics.hipRatio));
        const legScale = Math.min(1.32, Math.max(.9, metrics.legRatio * (1 + (profile.height - 172.5) * .0018)));
        group.scale.set(1, heightScale, 1);
        group.position.y = -.18;

        const topItem = fit3dTopItem(items);
        const bottomItem = fit3dBottomItem(items);
        const topType = fit3dGarmentType(topItem);
        const bottomType = fit3dGarmentType(bottomItem);
        const isOuter = topType === "jacket";
        const isLongSleeve = ["hoodie", "jacket", "shirt", "sweatshirt"].includes(topType);
        const isWidePants = bottomType === "wide-pants" || /와이드|wide|조거|jogger/i.test(bottomItem.name || bottomItem.fit || "");
        const isShorts = bottomType === "shorts";
        const silhouette = fit3dSilhouette(topType);

        const skin = fit3dMaterial(0xd8b296, .84, .01);
        const hair = fit3dMaterial(0x171717, .88, .01);
        const faceLine = fit3dMaterial(0x2a2420, .82, 0);
        const shirt = fit3dFabricMaterial(fit3dGarmentColor(topItem), .9);
        const shirtShadow = fit3dFabricMaterial(0xded9cc, .92);
        const pants = fit3dFabricMaterial(fit3dGarmentColor(bottomItem.category ? bottomItem : { category: "하의" }), .82);
        const shoe = fit3dMaterial(0x111111, .7, .05);

        const head = new THREE.Mesh(new THREE.SphereGeometry(.245, 40, 28), skin);
        head.position.y = 2.58;
        head.scale.set(.78, 1.12, .72);
        group.add(head);

        const faceVeil = new THREE.Mesh(new THREE.SphereGeometry(.247, 32, 20), fit3dMaterial(0xd6b79f, .94, 0));
        faceVeil.position.set(0, 2.56, .026);
        faceVeil.scale.set(.76, 1.02, .14);
        group.add(faceVeil);

        const hairCap = new THREE.Mesh(new THREE.SphereGeometry(.258, 40, 18, 0, Math.PI * 2, 0, Math.PI * .54), hair);
        hairCap.position.set(0, 2.73, -.018);
        hairCap.scale.set(.84, .54, .78);
        group.add(hairCap);
        fit3dAddFaceDetails(group, { skin, hair, faceLine });

        const neck = new THREE.Mesh(new THREE.CylinderGeometry(.095, .12, .23, 28), skin);
        neck.position.y = 2.25;
        group.add(neck);

        const torso = fit3dRoundedBox(.84 * shoulderScale * silhouette.shoulder, 1.08 * silhouette.length, .44 * chestScale * silhouette.depth, .15, 12, shirt);
        torso.position.y = 1.58 - (silhouette.length - 1) * .08;
        torso.rotation.x = .015;
        group.add(torso);
        [["left", -1], ["right", 1]].forEach(([, side]) => {
          const frontDrape = new THREE.Mesh(new THREE.BoxGeometry(.01, .82, .008), fit3dMaterial(0xe7dfcf, .92, 0));
          frontDrape.position.set(side * .22 * waistScale, 1.55, .232 * chestScale);
          frontDrape.rotation.z = side * .035;
          group.add(frontDrape);
        });

        const shirtDrape = new THREE.Mesh(new THREE.CylinderGeometry(.43 * waistScale * silhouette.waist, .51 * hipScale * (topType === "shirt" ? .95 : silhouette.waist), .34 * silhouette.depth, 48), shirt);
        shirtDrape.position.y = .97 - (silhouette.length - 1) * .08;
        shirtDrape.scale.z = .62 * silhouette.depth;
        shirtDrape.castShadow = true;
        shirtDrape.receiveShadow = true;
        group.add(shirtDrape);

        const hem = new THREE.Mesh(new THREE.TorusGeometry(.42 * Math.max(waistScale, hipScale) * silhouette.waist, topType === "hoodie" ? .018 : .01, 8, 56), shirtShadow);
        hem.position.y = .78 - (silhouette.length - 1) * .12;
        hem.scale.z = .58;
        hem.rotation.x = Math.PI / 2;
        group.add(hem);

        const seamMaterial = fit3dMaterial(0xcfc8b8, .86, .01);
        const collar = new THREE.Mesh(new THREE.TorusGeometry(.17, .012, 8, 48), seamMaterial);
        collar.position.y = 2.12;
        collar.scale.set(1.25, .48, .72);
        collar.rotation.x = Math.PI / 2;
        group.add(collar);

        fit3dAddTopDetails(group, topType, { shoulderScale, chestScale, waistScale, hipScale }, { shirt, shirtShadow, seamMaterial });

        const armLength = .86 * heightScale;
        [["left", -1], ["right", 1]].forEach(([, side]) => {
          const sleeve = fit3dCapsule((isLongSleeve ? .105 : .125) * silhouette.sleeveRadius, (isLongSleeve ? .82 : .36) * silhouette.sleeveLength, shirt);
          sleeve.position.set(side * (.51 * shoulderScale * silhouette.shoulder), (isLongSleeve ? 1.58 : 1.87) + silhouette.sleeveDrop, .005);
          sleeve.rotation.z = side * (topType === "jacket" ? .12 : .18);
          sleeve.scale.set(1, 1, topType === "jacket" ? 1.02 : .92);
          group.add(sleeve);

          const arm = fit3dCapsule(.082, isLongSleeve ? armLength * .34 : armLength * .88, skin);
          arm.position.set(side * (.62 * shoulderScale * silhouette.shoulder), isLongSleeve ? .94 + silhouette.sleeveDrop : 1.34, .02);
          arm.rotation.z = side * .08;
          arm.scale.set(.86, 1, .82);
          group.add(arm);
          const hand = new THREE.Mesh(new THREE.SphereGeometry(.075, 18, 12), skin);
          hand.position.set(side * (.65 * shoulderScale * silhouette.shoulder), isLongSleeve ? .74 + silhouette.sleeveDrop : .9, .045);
          hand.scale.set(.72, 1.08, .56);
          group.add(hand);
          const wristShadow = new THREE.Mesh(new THREE.TorusGeometry(.068, .006, 8, 24), fit3dMaterial(0xc99f83, .9, 0));
          wristShadow.position.set(side * (.64 * shoulderScale * silhouette.shoulder), isLongSleeve ? .82 + silhouette.sleeveDrop : .99, .043);
          wristShadow.scale.z = .42;
          wristShadow.rotation.x = Math.PI / 2;
          group.add(wristShadow);
        });

        [["left", -1], ["right", 1]].forEach(([, side]) => {
          const legWidth = (isWidePants ? .37 : .24) * Math.max(.92, hipScale);
          const legHeight = (isShorts ? .52 : 1.22) * legScale;
          const leg = fit3dRoundedBox(legWidth, legHeight, isWidePants ? .38 : .28, isWidePants ? .075 : .06, 8, pants);
          const legOffset = (isWidePants ? .26 : .19) * hipScale;
          const legCenterY = isShorts ? .49 : .18 - (legScale - 1) * .08;
          const footY = legCenterY - legHeight / 2 - .075;
          leg.position.set(side * legOffset, legCenterY, 0);
          leg.rotation.z = side * (isWidePants ? -.018 : .012);
          group.add(leg);
          const crease = new THREE.Mesh(new THREE.BoxGeometry(isWidePants ? .016 : .012, (isShorts ? .32 : 1.02) * legScale, .012), fit3dMaterial(0x41444b, .88, 0));
          crease.position.set(side * legOffset, isShorts ? .5 : legCenterY + .02, (isWidePants ? .205 : .148));
          group.add(crease);
          const shoeMesh = fit3dRoundedBox(.32, .1, .42, .035, 8, shoe);
          shoeMesh.position.set(side * legOffset, footY, .055);
          shoeMesh.castShadow = true;
          shoeMesh.receiveShadow = true;
          group.add(shoeMesh);
        });

        const shoulderLine = fit3dRoundedBox(1.02 * shoulderScale, .1, .28, .055, 8, shirt);
        shoulderLine.position.y = 2.08;
        shoulderLine.castShadow = true;
        shoulderLine.receiveShadow = true;
        group.add(shoulderLine);
        const collarShadow = new THREE.Mesh(new THREE.BoxGeometry(.42 * shoulderScale, .012, .01), fit3dMaterial(0xcfc8b8, .9, 0));
        collarShadow.position.set(0, 2.01, .238 * chestScale);
        group.add(collarShadow);

        const centerSeam = new THREE.Mesh(new THREE.BoxGeometry(.012, .84, .012), seamMaterial);
        centerSeam.position.set(0, 1.55, .235 * chestScale);
        group.add(centerSeam);

        fit3dAddAccessories(group, items, { shoulderScale });

        return group;
      }

      function initializeFit3dPreview(profile, metrics, items = []) {
        const canvas = document.getElementById("fit3dCanvas");
        const stage = document.getElementById("fit3dStage");
        if (!canvas || !stage || stage.classList.contains("is-hidden")) return;
        disposeFit3dPreview();
        stage.classList.remove("using-fallback", "webgl-error");

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf3efe7);
        const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
        camera.position.set(0, 1.16, 6.45);
        camera.lookAt(0, 1.04, 0);

        let renderer;
        try {
          renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
        } catch (error) {
          renderFit3dFallback(profile, metrics);
          setSyncStatus("이 기기에서는 WebGL 3D 대신 호환 360도 보기를 표시합니다");
          return;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const hemi = new THREE.HemisphereLight(0xffffff, 0x6b6255, 2.8);
        scene.add(hemi);
        const key = new THREE.DirectionalLight(0xffffff, 2.6);
        key.position.set(3, 5, 4);
        key.castShadow = true;
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xf2dcc2, 1.2);
        fill.position.set(-4, 2, 3);
        scene.add(fill);

        const floor = new THREE.Mesh(
          new THREE.CircleGeometry(1.75, 72),
          new THREE.MeshStandardMaterial({ color: 0xded8cc, roughness: .8 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -.58;
        floor.receiveShadow = true;
        scene.add(floor);

        const avatar = fit3dBuildAvatar(profile, metrics, items);
        avatar.rotation.y = fit3dQuickAngle("front");
        scene.add(avatar);

        const runtime = {
          canvas,
          scene,
          camera,
          renderer,
          avatar,
          frame: 0,
          dragging: false,
          lastX: 0,
          velocity: 0,
          resizeObserver: null,
          onPointerDown: null,
          onPointerMove: null,
          onPointerUp: null,
          resumeTimer: null,
        };

        const resize = () => {
          const rect = stage.getBoundingClientRect();
          const width = Math.max(1, Math.round(rect.width));
          const height = Math.max(1, Math.round(rect.height));
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };

        runtime.onPointerDown = (event) => {
          runtime.dragging = true;
          runtime.lastX = event.clientX;
          runtime.velocity = 0;
          canvas.setPointerCapture(event.pointerId);
        };
        runtime.onPointerMove = (event) => {
          if (!runtime.dragging) return;
          const delta = event.clientX - runtime.lastX;
          runtime.lastX = event.clientX;
          avatar.rotation.y += delta * .012;
        };
        runtime.onPointerUp = (event) => {
          runtime.dragging = false;
          runtime.velocity = .0035;
          try { canvas.releasePointerCapture(event.pointerId); } catch (error) {}
        };

        canvas.addEventListener("pointerdown", runtime.onPointerDown);
        canvas.addEventListener("pointermove", runtime.onPointerMove);
        canvas.addEventListener("pointerup", runtime.onPointerUp);
        canvas.addEventListener("pointercancel", runtime.onPointerUp);
        runtime.resizeObserver = new ResizeObserver(resize);
        runtime.resizeObserver.observe(stage);
        resize();

        const animate = () => {
          if (!runtime.dragging) avatar.rotation.y += runtime.velocity;
          renderer.render(scene, camera);
          runtime.frame = window.requestAnimationFrame(animate);
        };
        fit3dRuntime = runtime;
        runtime.resumeTimer = window.setTimeout(() => {
          if (fit3dRuntime === runtime && !runtime.dragging) runtime.velocity = .0035;
        }, 1800);
        animate();
      }

      function renderFit3dFallback(profile, metrics) {
        const stage = document.getElementById("fit3dStage");
        if (!stage) return;
        stage.classList.add("using-fallback", "webgl-error");
        stage.style.setProperty("--fallback-height", Math.min(1.16, Math.max(.9, profile.height / 172.5)).toFixed(3));
        stage.style.setProperty("--fallback-shoulder", Math.round(112 * Math.min(1.22, Math.max(.86, metrics.shoulderRatio))) + "px");
        stage.style.setProperty("--fallback-waist", Math.round(82 * Math.min(1.22, Math.max(.86, metrics.waistRatio))) + "px");
        stage.style.setProperty("--fallback-leg", Math.round(86 * Math.min(1.22, Math.max(.92, metrics.legRatio))) + "px");
      }

      function fit3dQuickAngle(view) {
        const map = {
          front: 0,
          side: Math.PI / 2,
          back: Math.PI,
        };
        return map[view] ?? 0;
      }

      function setFit3dQuickView(view) {
        const angle = fit3dQuickAngle(view);
        document.querySelectorAll("[data-fit-quick-view]").forEach((button) => {
          button.classList.toggle("active-control", button.dataset.fitQuickView === view);
        });
        const stage = document.getElementById("fit3dStage");
        if (stage) stage.style.setProperty("--fallback-quick-angle", angle + "rad");
        if (!fit3dRuntime || !fit3dRuntime.avatar) return;
        fit3dRuntime.avatar.rotation.y = angle;
        fit3dRuntime.velocity = 0;
        window.clearTimeout(fit3dRuntime.resumeTimer);
        fit3dRuntime.resumeTimer = window.setTimeout(() => {
          if (fit3dRuntime && fit3dRuntime.avatar) fit3dRuntime.velocity = .0035;
        }, 2600);
      }

      function setFitViewMode(mode) {
        activeFitViewMode = mode === "3d" ? "3d" : "real";
        document.querySelectorAll("[data-fit-view]").forEach((button) => {
          button.classList.toggle("active-control", button.dataset.fitView === activeFitViewMode);
        });
        const realStage = document.getElementById("realFitStage");
        const threeStage = document.getElementById("fit3dStage");
        if (realStage) realStage.classList.toggle("is-hidden", activeFitViewMode !== "real");
        if (threeStage) threeStage.classList.toggle("is-hidden", activeFitViewMode !== "3d");
        if (activeFitViewMode === "3d") {
          const profile = readFitProfile();
          const item = products.find((product) => product.key === activeFitPreviewKey) || fitPreviewItems()[0];
          initializeFit3dPreview(profile, fitProfileMetrics(profile), activeAvatarItems(item));
        } else {
          disposeFit3dPreview();
        }
      }

      function fitRatioPercent(ratio) {
        return Math.min(100, Math.max(8, Math.round(ratio * 50)));
      }

      function fitMetricRows(metrics) {
        return [
          { label: "어깨", value: metrics.shoulder, ratio: metrics.shoulderRatio },
          { label: "가슴", value: metrics.chest, ratio: metrics.chestRatio },
          { label: "허리", value: metrics.waist, ratio: metrics.waistRatio },
          { label: "골반", value: metrics.hip, ratio: metrics.hipRatio },
          { label: "허벅지", value: metrics.thigh, ratio: metrics.thighRatio },
          { label: "다리", value: metrics.leg, ratio: metrics.legRatio },
        ];
      }

      function fitEaseLabel(delta, type = "width") {
        if (delta === null) return "실측 대기";
        if (type === "length") {
          if (delta >= 12) return "긴 기장";
          if (delta >= 6) return "여유 기장";
          if (delta <= -8) return "짧은 기장";
          return "적정 기장";
        }
        if (delta >= 12) return "오버핏";
        if (delta >= 6) return "여유핏";
        if (delta <= -2) return "타이트";
        return "정핏";
      }

      function fitGarmentDeltas(item, profile, metrics) {
        const specs = garmentSpecs(item);
        const idealTopLength = profile.height * 0.32;
        return [
          { label: "어깨 여유", delta: specs.shoulder ? specs.shoulder - metrics.shoulder / 2 : null, unit: "cm" },
          { label: "가슴 여유", delta: specs.chest ? specs.chest - metrics.chest / 2 : null, unit: "cm" },
          { label: "허리 여유", delta: specs.waist ? specs.waist - metrics.waist / 2 : null, unit: "cm" },
          { label: "기장 차이", delta: specs.length ? specs.length - idealTopLength : null, unit: "cm", type: "length" },
        ];
      }

      function fitAnalysisMarkup(profile, metrics, item, match) {
        const metricRows = fitMetricRows(metrics).map((row) => `
          <div class="fit-metric-row">
            <span>${row.label}</span>
            <i><b style="width:${fitRatioPercent(row.ratio)}%"></b></i>
            <strong>${Math.round(row.value)}cm</strong>
          </div>
        `).join("");
        const deltas = fitGarmentDeltas(item, profile, metrics).map((row) => {
          const hasDelta = row.delta !== null;
          const deltaText = hasDelta ? (row.delta > 0 ? "+" : "") + row.delta.toFixed(1) + row.unit : "-";
          return `
            <div class="fit-ease-chip">
              <span>${row.label}</span>
              <strong>${deltaText}</strong>
              <em>${fitEaseLabel(hasDelta ? row.delta : null, row.type)}</em>
            </div>
          `;
        }).join("");
        return `
          <section class="fit-analysis-panel">
            <div class="fit-analysis-head">
              <div>
                <p>체형 분석</p>
                <strong>${metrics.label} · BMI ${metrics.bmi.toFixed(1)}</strong>
              </div>
              <span>${match}%</span>
            </div>
            <div class="fit-metric-list">${metricRows}</div>
            <div class="fit-ease-grid">${deltas}</div>
          </section>
        `;
      }

      function avatarTryOnPanelMarkup(item, match) {
        const photoName = qaScenarioStatusEscape(avatarTryOnState.photoName || "선택한 사진");
        const itemName = qaScenarioStatusEscape(item?.name || "입어볼 상품");
        const thumb = avatarTryOnState.photoDataUrl
          ? '<img class="avatar-tryon-thumb" src="' + avatarTryOnState.photoDataUrl + '" alt="내 사진 미리보기" />'
          : '<div class="avatar-tryon-empty">사진</div>';
        const statusCopy = {
          idle: "전신 사진 1장을 올리면 내 사진 기준 피팅 생성 단계로 이어집니다.",
          ready: photoName + " 준비됨",
          generating: "AI 피팅 이미지 생성 준비 중",
          complete: itemName + " 피팅 미리보기 준비됨",
        }[avatarTryOnState.status] || "사진을 올려 주세요";
        const actionMarkup = avatarTryOnState.status === "generating"
          ? '<div class="avatar-tryon-progress"><i></i><span>상품 사진과 체형 정보를 맞추는 중</span></div>'
          : avatarTryOnState.photoDataUrl
            ? '<div class="avatar-tryon-actions"><button class="secondary" type="button" onclick="startAvatarTryOnGeneration()">AI 입어보기 생성</button><button class="secondary" type="button" onclick="clearAvatarTryOnPhoto()">사진 제거</button></div>'
            : '<label class="avatar-tryon-upload">내 사진 선택<input type="file" accept="image/*" onchange="handleAvatarTryOnPhotoUpload(event)" /></label>';
        const resultMarkup = avatarTryOnState.status === "complete"
          ? '<div class="avatar-tryon-result"><span>생성 결과</span><strong>' + match + '% 핏 매칭 · 실제 AI 합성 API 연결 전 데모</strong></div>'
          : "";
        return `
          <section class="avatar-tryon-panel">
            <div class="avatar-tryon-head">
              <div>
                <p>내 사진으로 입어보기</p>
                <strong>${statusCopy}</strong>
              </div>
              ${thumb}
            </div>
            ${actionMarkup}
            ${resultMarkup}
            <p class="avatar-tryon-privacy">현재 단계에서는 사진을 서버에 저장하거나 외부 AI로 전송하지 않습니다. 실제 AI 생성 연결 전에는 별도 동의와 삭제 정책을 먼저 붙입니다.</p>
          </section>
        `;
      }

      function handleAvatarTryOnPhotoUpload(event) {
        const file = event?.target?.files?.[0];
        if (!file) return;
        if (!file.type || !file.type.startsWith("image/")) {
          setSyncStatus("이미지 파일만 업로드할 수 있습니다");
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          avatarTryOnState = {
            status: "ready",
            photoDataUrl: String(reader.result || ""),
            photoName: file.name || "내 사진",
          };
          setSyncStatus("내 사진 미리보기 준비 완료 - 저장/전송 없음");
          renderFitRoom();
        };
        reader.onerror = () => setSyncStatus("사진을 불러오지 못했습니다");
        reader.readAsDataURL(file);
      }

      function startAvatarTryOnGeneration() {
        if (!avatarTryOnState.photoDataUrl) {
          setSyncStatus("먼저 전신 사진 1장을 선택해 주세요");
          return;
        }
        avatarTryOnState = { ...avatarTryOnState, status: "generating" };
        setSyncStatus("AI 입어보기 생성 준비 중 - 데모 흐름");
        renderFitRoom();
        window.setTimeout(() => {
          if (avatarTryOnState.status !== "generating") return;
          avatarTryOnState = { ...avatarTryOnState, status: "complete" };
          setSyncStatus("내 사진 입어보기 데모 결과 준비 완료");
          renderFitRoom();
        }, 1400);
      }

      function clearAvatarTryOnPhoto() {
        avatarTryOnState = { status: "idle", photoDataUrl: "", photoName: "" };
        setSyncStatus("내 사진 미리보기를 제거했습니다");
        renderFitRoom();
      }

      function avatarLookListMarkup(items = []) {
        if (!items.length) return '<div class="line-item"><span>착용 아이템</span><strong>장바구니에 상품을 담아보세요</strong></div>';
        return items.map((item) => `
          <div class="line-item">
            <span>${qaScenarioStatusEscape(item.name)}</span>
            <strong>${qaScenarioStatusEscape(item.showroom)}</strong>
          </div>
        `).join("");
      }

      function encodeAvatarLookPayload(payload) {
        try {
          const json = JSON.stringify(payload);
          return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
        } catch (error) {
          return "";
        }
      }

      function decodeAvatarLookPayload(value) {
        if (!value) return null;
        try {
          const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
          const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
          return JSON.parse(decodeURIComponent(escape(atob(padded))));
        } catch (error) {
          return null;
        }
      }

      function sharedAvatarLookFromUrl() {
        return decodeAvatarLookPayload(new URLSearchParams(window.location.search).get(AVATAR_LOOK_SHARE_PARAM));
      }

      function avatarLookSnapshot(fallbackItem) {
        const profile = readFitProfile();
        const items = activeAvatarItems(fallbackItem).slice(0, 4);
        return avatarLookSnapshotFromItems(items, profile);
      }

      function avatarLookSnapshotFromItems(items = [], profile = readFitProfile()) {
        return {
          version: 1,
          name: currentCustomer.name || "게스트",
          profile,
          itemKeys: items.slice(0, 4).map((item) => item.key).filter(Boolean),
          createdAt: new Date().toISOString(),
        };
      }

      function avatarLookRecommendKey(snapshot = currentAvatarLookSnapshot()) {
        const profile = snapshot?.profile || {};
        const stable = {
          itemKeys: Array.isArray(snapshot?.itemKeys) ? snapshot.itemKeys.slice(0, 4) : [],
          height: Number(profile.height) || 0,
          weight: Number(profile.weight) || 0,
          topSize: profile.topSize || "",
          bottomSize: profile.bottomSize || "",
          bodyType: profile.bodyType || "",
        };
        const source = JSON.stringify(stable);
        let hash = 0;
        for (let index = 0; index < source.length; index += 1) {
          hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0;
        }
        return "look-" + Math.abs(hash).toString(36);
      }

      function readAvatarLookRecommendationStore() {
        try {
          const parsed = JSON.parse(localStorage.getItem(AVATAR_LOOK_RECOMMEND_STORAGE_KEY) || "{}");
          return parsed && typeof parsed === "object" ? parsed : {};
        } catch (error) {
          localStorage.removeItem(AVATAR_LOOK_RECOMMEND_STORAGE_KEY);
          return {};
        }
      }

      function saveAvatarLookRecommendationStore(store) {
        localStorage.setItem(AVATAR_LOOK_RECOMMEND_STORAGE_KEY, JSON.stringify(store || {}));
      }

      function avatarLookRecommendationState(snapshot = currentAvatarLookSnapshot()) {
        const key = avatarLookRecommendKey(snapshot);
        const store = readAvatarLookRecommendationStore();
        const entry = store[key] || {};
        return {
          key,
          count: Math.max(0, Number(entry.count) || 0),
          recommended: !!entry.recommended,
        };
      }

      function readAvatarLookSavedStore() {
        try {
          const parsed = JSON.parse(localStorage.getItem(AVATAR_LOOK_SAVED_STORAGE_KEY) || "[]");
          return Array.isArray(parsed) ? parsed
            .filter((entry) => entry && entry.key && entry.snapshot)
            .map((entry) => ({
              ...entry,
              title: entry.title || entry.snapshot.title || entry.snapshot.displayName || "",
              visibility: entry.visibility === "private" ? "private" : "public",
              featured: !!entry.featured,
            })) : [];
        } catch (error) {
          localStorage.removeItem(AVATAR_LOOK_SAVED_STORAGE_KEY);
          return [];
        }
      }

      function saveAvatarLookSavedStore(list) {
        localStorage.setItem(AVATAR_LOOK_SAVED_STORAGE_KEY, JSON.stringify((Array.isArray(list) ? list : []).slice(0, 40)));
      }

      function avatarLookSavedState(snapshot = currentAvatarLookSnapshot()) {
        const key = avatarLookRecommendKey(snapshot);
        const entry = readAvatarLookSavedStore().find((item) => item.key === key);
        return {
          key,
          saved: !!entry,
          savedAt: entry?.savedAt || "",
          title: entry?.title || "",
          visibility: entry?.visibility || "public",
          featured: !!entry?.featured,
        };
      }

      function avatarLookSavedEntryByKey(key) {
        return readAvatarLookSavedStore().find((entry) => entry.key === key) || null;
      }

      function avatarLookSavedTitle(snapshot, items = []) {
        const saved = avatarLookSavedState(snapshot);
        return saved.title || snapshot?.title || (items[0] && items[0].name) || "마이아바타룩";
      }

      function avatarLookFeedSnapshots() {
        const profile = readFitProfile();
        const wishedItems = fitPreviewItems().slice(0, 6);
        const fallbackItems = products.filter(storeIsVisible).slice(0, 6);
        const sourceItems = wishedItems.length ? wishedItems : fallbackItems;
        const groups = [];
        if (sourceItems.length) groups.push(sourceItems.slice(0, Math.min(3, sourceItems.length)));
        const top = sourceItems.find((item) => item.category === "상의");
        const bottom = sourceItems.find((item) => item.category === "하의");
        const accessory = sourceItems.find((item) => item.category === "잡화");
        if (top) groups.push([top, accessory].filter(Boolean));
        if (top && bottom) groups.push([top, bottom, accessory].filter(Boolean));
        sourceItems.slice(0, 4).forEach((item) => groups.push([item]));
        const seen = new Set();
        const savedSnapshots = readAvatarLookSavedStore()
          .map((entry) => ({ ...entry.snapshot, savedAt: entry.savedAt || entry.snapshot.savedAt || entry.snapshot.createdAt, source: "saved" }))
          .filter((snapshot) => Array.isArray(snapshot.itemKeys) && snapshot.itemKeys.length);
        const generatedSnapshots = groups
          .filter((items) => items.length)
          .map((items, index) => ({
            ...avatarLookSnapshotFromItems(items, profile),
            name: index === 0 ? (currentCustomer.name || "게스트") : "핏나우 추천",
            source: "auto",
          }));
        return savedSnapshots.concat(generatedSnapshots)
          .filter((snapshot) => {
            const key = avatarLookRecommendKey(snapshot);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .slice(0, 8);
      }

      function avatarLookFeedMarkup(mode = "latest") {
        const snapshots = avatarLookFeedSnapshots().filter((snapshot) => mode !== "saved" || avatarLookSavedState(snapshot).saved);
        const ranked = snapshots.map((snapshot) => ({ snapshot, recommendation: avatarLookRecommendationState(snapshot) }));
        ranked.sort((a, b) => {
          if (mode === "recommended") return b.recommendation.count - a.recommendation.count || new Date(b.snapshot.createdAt) - new Date(a.snapshot.createdAt);
          return new Date(b.snapshot.savedAt || b.snapshot.createdAt) - new Date(a.snapshot.savedAt || a.snapshot.createdAt) || b.recommendation.count - a.recommendation.count;
        });
        const cards = ranked.length ? ranked.map(({ snapshot, recommendation }) => {
          const fallbackItem = products.find((product) => product.key === activeFitPreviewKey) || fitPreviewItems()[0];
          const items = avatarLookItemsFromSnapshot(snapshot, fallbackItem);
          const title = qaScenarioStatusEscape(avatarLookSavedTitle(snapshot, items));
          const stores = avatarLookStores(items).join(" · ") || "-";
          const key = avatarLookRecommendKey(snapshot);
          const encoded = encodeAvatarLookPayload(snapshot);
          const savedState = avatarLookSavedState(snapshot);
          const badgeText = savedState.saved
            ? `${savedState.featured ? "대표 룩" : "저장됨"} · ${savedState.visibility === "private" ? "비공개" : "공개"} · 추천 ${recommendation.count}`
            : `추천 · 추천 ${recommendation.count}`;
          const controls = savedState.saved ? `
            <div class="avatar-feed-actions">
              <button type="button" onclick="openAvatarLookDetail('${encoded}')">보기</button>
              <button type="button" onclick="renameAvatarLook('${key}')">이름 변경</button>
              <button type="button" onclick="toggleAvatarLookFeatured('${key}')">${savedState.featured ? "대표 해제" : "대표 설정"}</button>
              <button type="button" onclick="toggleAvatarLookVisibility('${key}')">${savedState.visibility === "public" ? "비공개" : "공개"}</button>
              <button class="danger" type="button" onclick="deleteSavedAvatarLook('${key}')">삭제</button>
            </div>
          ` : `
            <div class="avatar-feed-actions">
              <button type="button" onclick="openAvatarLookDetail('${encoded}')">보기</button>
            </div>
          `;
          return `
            <article class="avatar-feed-card ${savedState.featured ? "featured" : ""}">
              <span>${badgeText}</span>
              <strong>${title}</strong>
              <em>${qaScenarioStatusEscape(stores)} · ${items.length}개 아이템</em>
              <small>${key}</small>
              ${controls}
            </article>
          `;
        }).join("") : `<div class="avatar-feed-empty">${mode === "saved" ? "저장한 룩이 없습니다. 상세에서 저장을 눌러보세요." : "찜한 상품을 추가하면 마이아바타룩 피드가 만들어집니다."}</div>`;
        return `
          <section class="avatar-feed-panel">
            <div class="avatar-feed-head">
              <div>
                <p class="eyebrow">AVATAR LOOK FEED</p>
                <h3>마이아바타룩 피드</h3>
              </div>
              <button class="secondary" type="button" onclick="openAvatarLookDetail()">내 룩 보기</button>
            </div>
            <div class="avatar-feed-tabs">
              <button class="${mode === "latest" ? "active-control" : ""}" type="button" onclick="renderAvatarLookFeed('latest')">최신순</button>
              <button class="${mode === "recommended" ? "active-control" : ""}" type="button" onclick="renderAvatarLookFeed('recommended')">추천순</button>
              <button class="${mode === "saved" ? "active-control" : ""}" type="button" onclick="renderAvatarLookFeed('saved')">저장한 룩</button>
            </div>
            <div class="avatar-feed-list">${cards}</div>
          </section>
        `;
      }

      function renderAvatarLookFeed(mode = "latest") {
        activeAvatarLookSnapshot = null;
        const body = document.getElementById("avatarLookBody");
        if (body) body.innerHTML = avatarLookFeedMarkup(mode);
      }

      function toggleAvatarLookRecommendation() {
        const snapshot = currentAvatarLookSnapshot();
        const state = avatarLookRecommendationState(snapshot);
        const store = readAvatarLookRecommendationStore();
        const nextRecommended = !state.recommended;
        const nextCount = Math.max(0, state.count + (nextRecommended ? 1 : -1));
        store[state.key] = {
          count: nextCount,
          recommended: nextRecommended,
          updatedAt: new Date().toISOString(),
        };
        saveAvatarLookRecommendationStore(store);
        setSyncStatus(nextRecommended ? "마이아바타룩을 추천했습니다" : "마이아바타룩 추천을 취소했습니다");
        if (document.getElementById("avatarLookModal")?.classList.contains("open")) {
          document.getElementById("avatarLookBody").innerHTML = avatarLookCardMarkup(snapshot);
        }
      }

      function toggleAvatarLookSave() {
        const snapshot = currentAvatarLookSnapshot();
        const state = avatarLookSavedState(snapshot);
        const list = readAvatarLookSavedStore();
        let nextSaved = false;
        if (state.saved) {
          saveAvatarLookSavedStore(list.filter((entry) => entry.key !== state.key));
        } else {
          nextSaved = true;
          const savedAt = new Date().toISOString();
          const nextSnapshot = {
            ...snapshot,
            name: snapshot?.name || currentCustomer.name || "게스트",
            title: snapshot?.title || "",
            createdAt: snapshot?.createdAt || savedAt,
            savedAt,
          };
          saveAvatarLookSavedStore([{ key: state.key, savedAt, snapshot: nextSnapshot, title: nextSnapshot.title || "", visibility: "public", featured: !list.some((entry) => entry.featured) }].concat(list.filter((entry) => entry.key !== state.key)));
          activeAvatarLookSnapshot = nextSnapshot;
        }
        setSyncStatus(nextSaved ? "마이아바타룩을 저장했습니다" : "마이아바타룩 저장을 해제했습니다");
        if (document.getElementById("avatarLookModal")?.classList.contains("open")) {
          document.getElementById("avatarLookBody").innerHTML = avatarLookCardMarkup(activeAvatarLookSnapshot || snapshot);
        }
      }

      function updateSavedAvatarLook(key, updater) {
        const list = readAvatarLookSavedStore();
        const index = list.findIndex((entry) => entry.key === key);
        if (index < 0) return null;
        const next = updater({ ...list[index], snapshot: { ...list[index].snapshot } }, list);
        if (!next) return null;
        list[index] = next;
        saveAvatarLookSavedStore(list);
        return next;
      }

      function renameAvatarLook(key) {
        const entry = avatarLookSavedEntryByKey(key);
        if (!entry) {
          setSyncStatus("저장한 마이아바타룩을 찾을 수 없습니다");
          return;
        }
        const currentTitle = entry.title || entry.snapshot.title || "";
        const title = window.prompt("저장한 룩 이름을 입력해 주세요", currentTitle || "오늘의 마이아바타룩");
        if (title === null) return;
        const cleanTitle = title.trim().slice(0, 24);
        if (!cleanTitle) {
          setSyncStatus("룩 이름을 입력해 주세요");
          return;
        }
        updateSavedAvatarLook(key, (saved) => ({
          ...saved,
          title: cleanTitle,
          snapshot: { ...saved.snapshot, title: cleanTitle },
          updatedAt: new Date().toISOString(),
        }));
        setSyncStatus("마이아바타룩 이름을 변경했습니다");
        renderAvatarLookFeed("saved");
      }

      function toggleAvatarLookFeatured(key) {
        const list = readAvatarLookSavedStore();
        const current = list.find((entry) => entry.key === key);
        if (!current) {
          setSyncStatus("저장한 마이아바타룩을 찾을 수 없습니다");
          return;
        }
        const nextFeatured = !current.featured;
        saveAvatarLookSavedStore(list.map((entry) => ({
          ...entry,
          featured: entry.key === key ? nextFeatured : false,
          updatedAt: entry.key === key ? new Date().toISOString() : entry.updatedAt,
        })));
        setSyncStatus(nextFeatured ? "대표 마이아바타룩으로 설정했습니다" : "대표 마이아바타룩을 해제했습니다");
        renderAvatarLookFeed("saved");
      }

      function toggleAvatarLookVisibility(key) {
        const next = updateSavedAvatarLook(key, (saved) => {
          const visibility = saved.visibility === "private" ? "public" : "private";
          return {
            ...saved,
            visibility,
            snapshot: { ...saved.snapshot, visibility },
            updatedAt: new Date().toISOString(),
          };
        });
        if (!next) {
          setSyncStatus("저장한 마이아바타룩을 찾을 수 없습니다");
          return;
        }
        setSyncStatus(next.visibility === "public" ? "마이아바타룩을 공개로 전환했습니다" : "마이아바타룩을 비공개로 전환했습니다");
        renderAvatarLookFeed("saved");
      }

      function deleteSavedAvatarLook(key) {
        const list = readAvatarLookSavedStore();
        const nextList = list.filter((entry) => entry.key !== key);
        if (nextList.length === list.length) {
          setSyncStatus("삭제할 마이아바타룩을 찾을 수 없습니다");
          return;
        }
        saveAvatarLookSavedStore(nextList);
        activeAvatarLookSnapshot = null;
        setSyncStatus("저장한 마이아바타룩을 삭제했습니다");
        renderAvatarLookFeed("saved");
      }

      function openAvatarLookDetail(encodedSnapshot = "") {
        const snapshot = encodedSnapshot ? decodeAvatarLookPayload(encodedSnapshot) : currentAvatarLookSnapshot();
        activeAvatarLookSnapshot = snapshot;
        document.getElementById("avatarLookBody").innerHTML = avatarLookCardMarkup(snapshot);
      }

      function currentAvatarLookSnapshot() {
        if (activeAvatarLookSnapshot) return activeAvatarLookSnapshot;
        const fallbackItem = products.find((product) => product.key === activeFitPreviewKey) || fitPreviewItems()[0];
        return avatarLookSnapshot(fallbackItem);
      }

      function avatarLookItemsFromSnapshot(snapshot, fallbackItem) {
        const keys = Array.isArray(snapshot?.itemKeys) ? snapshot.itemKeys : [];
        const items = keys
          .map((key) => products.find((product) => product.key === key))
          .filter(Boolean);
        return items.length ? items : activeAvatarItems(fallbackItem);
      }

      function avatarLookShareUrl(snapshot = avatarLookSnapshot()) {
        const url = new URL(window.location.href);
        url.search = "";
        url.searchParams.set(AVATAR_LOOK_SHARE_PARAM, encodeAvatarLookPayload(snapshot));
        return url.toString();
      }

      function avatarLookShareText(snapshot = avatarLookSnapshot()) {
        const fallbackItem = products.find((product) => product.key === activeFitPreviewKey) || fitPreviewItems()[0];
        const items = avatarLookItemsFromSnapshot(snapshot, fallbackItem);
        const stores = avatarLookStores(items);
        const total = items.reduce((sum, item) => sum + itemSalePrice(item), 0);
        return [
          "FITNOW 마이아바타룩",
          (snapshot.name || "게스트") + "의 지금배송 룩",
          "착용 아이템: " + (items.map((item) => item.name).join(", ") || "선택 없음"),
          "입점업체: " + (stores.join(", ") || "-"),
          "예상 금액: " + formatKRW(total),
          avatarLookShareUrl(snapshot),
        ].join("\n");
      }

      async function copyAvatarLookShareLink() {
        const snapshot = currentAvatarLookSnapshot();
        await copyTextWithFallback(
          avatarLookShareUrl(snapshot),
          "마이아바타룩 공유 링크 복사 완료",
          "마이아바타룩 링크 복사 실패 - 브라우저 권한을 확인하세요",
          "마이아바타룩 공유 링크"
        );
      }

      async function copyAvatarLookShareText() {
        const snapshot = currentAvatarLookSnapshot();
        await copyTextWithFallback(
          avatarLookShareText(snapshot),
          "마이아바타룩 공유 문구 복사 완료",
          "마이아바타룩 공유 문구 복사 실패 - 브라우저 권한을 확인하세요",
          "마이아바타룩 공유 문구"
        );
      }

      function wrapCanvasText(context, text, x, y, maxWidth, lineHeight, maxLines = 4) {
        const words = String(text || "").split(/\s+/);
        const lines = [];
        let line = "";
        words.forEach((word) => {
          const next = line ? line + " " + word : word;
          if (context.measureText(next).width > maxWidth && line) {
            lines.push(line);
            line = word;
          } else {
            line = next;
          }
        });
        if (line) lines.push(line);
        lines.slice(0, maxLines).forEach((row, index) => context.fillText(row, x, y + index * lineHeight));
        return y + Math.min(lines.length, maxLines) * lineHeight;
      }

      function downloadAvatarLookImage() {
        const fallbackItem = products.find((product) => product.key === activeFitPreviewKey) || fitPreviewItems()[0];
        const snapshot = currentAvatarLookSnapshot();
        const profile = snapshot.profile || readFitProfile();
        const metrics = fitProfileMetrics(profile);
        const items = avatarLookItemsFromSnapshot(snapshot, fallbackItem);
        const stores = avatarLookStores(items);
        const total = items.reduce((sum, item) => sum + itemSalePrice(item), 0);
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1350;
        const context = canvas.getContext("2d");
        const drawRoundRect = (x, y, width, height, radius) => {
          context.beginPath();
          context.moveTo(x + radius, y);
          context.lineTo(x + width - radius, y);
          context.quadraticCurveTo(x + width, y, x + width, y + radius);
          context.lineTo(x + width, y + height - radius);
          context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
          context.lineTo(x + radius, y + height);
          context.quadraticCurveTo(x, y + height, x, y + height - radius);
          context.lineTo(x, y + radius);
          context.quadraticCurveTo(x, y, x + radius, y);
          context.closePath();
        };
        const bg = context.createLinearGradient(0, 0, canvas.width, canvas.height);
        bg.addColorStop(0, "#111111");
        bg.addColorStop(.52, "#2a261f");
        bg.addColorStop(1, "#0d0d0d");
        context.fillStyle = bg;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "rgba(216,243,106,.16)";
        context.beginPath();
        context.arc(230, 220, 210, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#f7f0df";
        drawRoundRect(60, 60, 960, 1230, 42);
        context.fill();
        context.fillStyle = "#171717";
        context.font = "900 42px sans-serif";
        context.fillText("FITNOW AVATAR LOOK", 100, 145);
        context.font = "900 72px sans-serif";
        wrapCanvasText(context, (snapshot.name || "게스트") + "의 지금배송 룩", 100, 245, 660, 82, 2);
        context.font = "800 34px sans-serif";
        context.fillStyle = "#5f5a50";
        context.fillText(metrics.label + " 체형 · " + items.length + "개 아이템 · " + formatKRW(total), 100, 410);
        const stageGradient = context.createLinearGradient(100, 470, 460, 990);
        stageGradient.addColorStop(0, "#ffffff");
        stageGradient.addColorStop(1, "#e8e1d4");
        context.fillStyle = stageGradient;
        drawRoundRect(100, 470, 360, 520, 34);
        context.fill();
        context.fillStyle = "rgba(23,23,23,.12)";
        context.beginPath();
        context.ellipse(280, 956, 130, 26, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#191614";
        context.beginPath();
        context.ellipse(280, 545, 58, 64, 0, 0, Math.PI * 2);
        context.fill();
        const skinGradient = context.createLinearGradient(0, 520, 0, 850);
        skinGradient.addColorStop(0, "#e4ba92");
        skinGradient.addColorStop(1, "#c98f68");
        context.fillStyle = skinGradient;
        context.beginPath();
        context.ellipse(280, 575, 48, 56, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#171717";
        context.beginPath();
        context.arc(262, 572, 4, 0, Math.PI * 2);
        context.arc(298, 572, 4, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = skinGradient;
        drawRoundRect(178, 650, 34, 214, 17);
        context.fill();
        drawRoundRect(348, 650, 34, 214, 17);
        context.fill();
        drawRoundRect(206, 646, 148, 218, 44);
        context.fill();
        context.fillStyle = "#252525";
        drawRoundRect(214, 830, 54, 118, 18);
        context.fill();
        drawRoundRect(292, 830, 54, 118, 18);
        context.fill();
        const colors = ["#2b63ff", "#c4a873", "#d9477f", "#171717"];
        items.slice(0, 4).forEach((item, index) => {
          const garmentGradient = context.createLinearGradient(170, 650 + index * 38, 380, 760 + index * 38);
          const isTshirt = item.visual === "tshirt";
          garmentGradient.addColorStop(0, isTshirt ? "#ffffff" : colors[index % colors.length]);
          garmentGradient.addColorStop(1, isTshirt ? "#e9e6dc" : "#14171d");
          context.fillStyle = garmentGradient;
          context.globalAlpha = 0.9;
          const y = 670 + index * 42;
          if (isTshirt) {
            context.beginPath();
            context.moveTo(180, y - 16);
            context.lineTo(236, y - 16);
            context.lineTo(248, y + 8);
            context.lineTo(312, y + 8);
            context.lineTo(324, y - 16);
            context.lineTo(380, y - 16);
            context.lineTo(414, y + 28);
            context.lineTo(386, y + 58);
            context.lineTo(356, y + 42);
            context.lineTo(348, y + 98);
            context.lineTo(212, y + 98);
            context.lineTo(204, y + 42);
            context.lineTo(174, y + 58);
            context.lineTo(146, y + 28);
            context.closePath();
            context.fill();
            context.strokeStyle = "rgba(23,23,23,.12)";
            context.lineWidth = 3;
            context.stroke();
          } else {
            drawRoundRect(176 + index * 15, y, 208 - index * 16, 58, 22);
            context.fill();
          }
          context.strokeStyle = "rgba(255,255,255,.28)";
          context.lineWidth = 2;
          context.beginPath();
          context.moveTo(280, y + 6);
          context.lineTo(280, y + 52);
          context.stroke();
          context.globalAlpha = 1;
        });
        context.fillStyle = "#171717";
        context.font = "900 42px sans-serif";
        context.fillText("착용 아이템", 520, 510);
        context.font = "800 34px sans-serif";
        let y = 580;
        items.slice(0, 5).forEach((item) => {
          context.fillStyle = "#171717";
          y = wrapCanvasText(context, item.name, 520, y, 430, 42, 2) + 4;
          context.fillStyle = "#6d675d";
          context.font = "800 28px sans-serif";
          context.fillText(item.showroom || "입점업체", 520, y);
          y += 58;
          context.font = "800 34px sans-serif";
        });
        context.fillStyle = "#171717";
        context.font = "900 34px sans-serif";
        context.fillText("노출 입점업체", 100, 1060);
        context.font = "800 32px sans-serif";
        context.fillStyle = "#5f5a50";
        wrapCanvasText(context, stores.join(" · ") || "-", 100, 1110, 860, 40, 3);
        context.fillStyle = "#171717";
        context.font = "900 28px sans-serif";
        context.fillText("fitnow · 지금배송 룩 공유", 100, 1230);
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = "fitnow-avatar-look-" + new Date().toISOString().slice(0, 10) + ".png";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setSyncStatus("마이아바타룩 이미지 저장 완료");
      }

      function renderFitRoom() {
        const body = document.getElementById("fitRoomBody");
        if (!body) return;
        const profile = readFitProfile();
        const items = fitPreviewItems();
        if (!activeFitPreviewKey || !items.some((item) => item.key === activeFitPreviewKey)) {
          activeFitPreviewKey = (items[0] && items[0].key) || "";
        }
        const item = products.find((product) => product.key === activeFitPreviewKey) || items[0];
        const avatarItems = activeAvatarItems(item);
        lastFitRoomAvatarSnapshot = avatarLookSnapshotFromItems(avatarItems, profile);
        const mainItem = avatarItems[0] || item;
        const metrics = fitProfileMetrics(profile);
        const match = avatarItems.length
          ? Math.round(avatarItems.reduce((sum, candidate) => sum + fitMatchForItem(candidate, profile), 0) / avatarItems.length)
          : (item ? fitMatchForItem(item, profile) : 0);
        const avatarStyle = fitAvatarStyle(profile, metrics);
        const avatarBodyClass = "fit-body-" + profile.bodyType;
        const realFitStyle = realFitPreviewStyle(profile, metrics);
        body.innerHTML = `
          <div class="fit-view-tabs">
            <button class="${activeFitViewMode === "real" ? "active-control" : ""}" type="button" data-fit-view="real" onclick="setFitViewMode('real')">실사 보기</button>
            <button class="${activeFitViewMode === "3d" ? "active-control" : ""}" type="button" data-fit-view="3d" onclick="setFitViewMode('3d')">3D 보기</button>
          </div>
          <section class="fit-room-layout">
            <div class="real-fit-stage ${avatarBodyClass} ${activeFitViewMode === "real" ? "" : "is-hidden"}" id="realFitStage" style="${realFitStyle}">
              <img class="real-fit-model" src="${realFitModelImage}" alt="실제 모델 착장 미리보기" />
              <div class="real-fit-badge">
                <strong>${metrics.label}</strong>
                <span>상의 ${profile.topSize} · 하의 ${profile.bottomSize}</span>
              </div>
              <div class="fit-avatar fit-avatar-fallback ${avatarBodyClass}" style="${avatarStyle}" aria-hidden="true">
                <div class="fit-head"></div>
                <div class="fit-arms"></div>
                <div class="fit-torso">${fitPreviewLayers(avatarItems, profile, metrics)}</div>
                <div class="fit-legs"></div>
              </div>
            </div>
            <div class="fit-3d-stage ${avatarBodyClass} ${activeFitViewMode === "3d" ? "" : "is-hidden"}" id="fit3dStage">
              <canvas id="fit3dCanvas" aria-label="360도 3D 체형 착용 미리보기"></canvas>
              <div class="fit-3d-fallback" aria-hidden="true">
                <div class="fit-3d-fallback-avatar">
                  <i class="fallback-head"></i>
                  <i class="fallback-body"></i>
                  <i class="fallback-arm left"></i>
                  <i class="fallback-arm right"></i>
                  <i class="fallback-leg left"></i>
                  <i class="fallback-leg right"></i>
                </div>
              </div>
              <div class="fit-3d-view-controls" aria-label="3D 빠른보기">
                <button class="active-control" type="button" data-fit-quick-view="front" onclick="setFit3dQuickView('front')">앞</button>
                <button type="button" data-fit-quick-view="side" onclick="setFit3dQuickView('side')">옆</button>
                <button type="button" data-fit-quick-view="back" onclick="setFit3dQuickView('back')">뒤</button>
              </div>
              <div class="fit-3d-hud">
                <strong>${metrics.label}</strong>
                <span>드래그해서 360도 회전</span>
              </div>
            </div>
            <div class="fit-room-controls">
              <div class="fit-profile-grid">
                <label>키
                  <input id="fitHeight" type="number" inputmode="numeric" min="130" max="205" value="${profile.height}" />
                </label>
                <label>몸무게
                  <input id="fitWeight" type="number" inputmode="numeric" min="35" max="140" value="${profile.weight}" />
                </label>
                <label>평소 상의
                  <select id="fitTopSize">${fitSizeSelectOptions("top", profile.topSize)}</select>
                </label>
                <label>평소 하의
                  <select id="fitBottomSize">${fitSizeSelectOptions("bottom", profile.bottomSize)}</select>
                </label>
              </div>
              <section class="fit-body-sample-panel">
                <p>한국인 체형 샘플</p>
                <div class="fit-body-sample-grid">${fitBodySampleMarkup(profile)}</div>
              </section>
              <label class="fit-select-label">입어볼 상품
                <select id="fitPreviewItem" ${items.length ? "" : "disabled"} onchange="selectFitPreviewItem(this.value)">
                  ${items.map((candidate) => '<option value="' + candidate.key + '" ' + (candidate.key === (item && item.key) ? "selected" : "") + '>' + candidate.name + ' · ' + candidate.showroom + '</option>').join("")}
                  ${items.length ? "" : '<option value="">찜한 상품이 없습니다</option>'}
                </select>
              </label>
              ${items.length ? "" : '<p class="fit-empty-hint">상품 카드의 하트(♡)를 눌러 찜하면 여기에서 입어볼 수 있습니다.</p>'}
              ${fitAnalysisMarkup(profile, metrics, mainItem, match)}
              ${avatarTryOnPanelMarkup(mainItem, match)}
              <button class="primary" type="button" onclick="saveFitProfile()">내 체형 저장</button>
            </div>
          </section>
          <section class="summary-card fit-result-card">
            <h3>${cart.length ? "장바구니 피팅 미리보기" : (mainItem ? mainItem.name : "상품 선택 대기")}</h3>
            <div class="line-item"><span>체형 타입</span><strong>${metrics.label}</strong></div>
            <div class="line-item"><span>평소 사이즈</span><strong>상의 ${profile.topSize} · 하의 ${profile.bottomSize}</strong></div>
            <div class="line-item"><span>표준체형 보정</span><strong>어깨 ${Math.round(metrics.shoulder)} · 가슴 ${Math.round(metrics.chest)} · 허리 ${Math.round(metrics.waist)} · 골반 ${Math.round(metrics.hip)}</strong></div>
            <div class="line-item"><span>가상 핏 매칭</span><strong>${match}%</strong></div>
            <div class="line-item"><span>이용 정책</span><strong>무료 베타 · 횟수 제한 없음</strong></div>
            <div class="line-item"><span>착용 상품</span><strong>${avatarItems.length}개</strong></div>
            <div class="line-item"><span>노출 입점업체</span><strong>${avatarLookStores(avatarItems).join(" · ") || "-"}</strong></div>
            <div class="line-item"><span>예상 느낌</span><strong>${mainItem ? mainItem.fit || "기본 핏" : "-"}</strong></div>
            <div class="line-item"><span>상품 실측</span><strong>${mainItem ? garmentSpecSummary(mainItem) : "-"}</strong></div>
            <div class="line-item"><span>모델 기준</span><strong>${mainItem ? modelSpecSummary(mainItem) : "-"}</strong></div>
            ${avatarLookListMarkup(avatarItems)}
            <p class="fit-note">현재는 대표 실사 모델과 체형 비율 기반의 피팅 미리보기입니다. 내 사진 기반 AI 생성은 업로드 동의, 삭제 정책, 생성 API 연결 후 실제 결과 이미지로 전환합니다.</p>
          </section>
          <div class="detail-actions" style="margin-top: 12px;">
            <button class="secondary" type="button" ${item ? "" : "disabled"} onclick="addFitPreviewToCart()">이 상품 담기</button>
            <button class="primary" type="button" ${item ? "" : "disabled"} onclick="reserveFitPreviewItem()">이 상품 예약</button>
          </div>
          <div class="detail-actions" style="margin-top: 8px;">
            <button class="secondary" type="button" onclick="openMyAvatarLook()">마이아바타룩 보기</button>
          </div>
        `;
        if (activeFitViewMode === "3d") {
          window.requestAnimationFrame(() => initializeFit3dPreview(profile, metrics, avatarItems));
        } else {
          disposeFit3dPreview();
        }
      }

      function openFitRoom(key = "") {
        if (key) activeFitPreviewKey = key;
        const detailModal = document.getElementById("detailModal");
        if (detailModal && detailModal.classList.contains("open")) closeDetail();
        renderFitRoom();
        document.getElementById("fitRoomModal").classList.add("open");
        document.getElementById("fitRoomModal").setAttribute("aria-hidden", "false");
      }

      function openMyAvatar() {
        const avatarLookModal = document.getElementById("avatarLookModal");
        if (avatarLookModal && avatarLookModal.classList.contains("open")) closeMyAvatarLook();
        const cartItems = cartLookItems();
        if (cartItems.length) activeFitPreviewKey = cartItems[0].key;
        openFitRoom(activeFitPreviewKey);
      }

      function closeFitRoom() {
        disposeFit3dPreview();
        document.getElementById("fitRoomModal").classList.remove("open");
        document.getElementById("fitRoomModal").setAttribute("aria-hidden", "true");
      }

      function saveFitProfile() {
        const profile = {
          height: Number(document.getElementById("fitHeight")?.value) || 168,
          weight: Number(document.getElementById("fitWeight")?.value) || 58,
          topSize: document.getElementById("fitTopSize")?.value || "M",
          bottomSize: document.getElementById("fitBottomSize")?.value || "M",
          bodyType: document.querySelector(".fit-body-sample.active-control")?.dataset.bodyType || readFitProfile().bodyType || "regular",
        };
        writeFitProfile(profile);
        renderFitRoom();
      }

      function selectFitBodySample(bodyType) {
        const current = readFitProfile();
        const profile = {
          ...current,
          height: Number(document.getElementById("fitHeight")?.value) || current.height,
          weight: Number(document.getElementById("fitWeight")?.value) || current.weight,
          topSize: document.getElementById("fitTopSize")?.value || current.topSize,
          bottomSize: document.getElementById("fitBottomSize")?.value || current.bottomSize,
          bodyType,
        };
        writeFitProfile(profile);
        renderFitRoom();
      }

      function selectFitPreviewItem(key) {
        activeFitPreviewKey = key;
        renderFitRoom();
      }

      function addFitPreviewToCart() {
        if (!activeFitPreviewKey) return;
        addItemByKey(activeFitPreviewKey);
        renderCart();
      }

      function reserveFitPreviewItem() {
        if (!activeFitPreviewKey) return;
        addItemByKey(activeFitPreviewKey);
        closeFitRoom();
        checkout();
      }

      function checkoutAvatarLook() {
        closeMyAvatarLook();
        checkout();
      }

      function avatarLookCardMarkup(snapshot = null) {
        const profile = snapshot?.profile || readFitProfile();
        const fallbackItem = products.find((product) => product.key === activeFitPreviewKey) || fitPreviewItems()[0];
        const items = avatarLookItemsFromSnapshot(snapshot, fallbackItem);
        const metrics = fitProfileMetrics(profile);
        const stores = avatarLookStores(items);
        const total = items.reduce((sum, item) => sum + itemSalePrice(item), 0);
        const ownerName = qaScenarioStatusEscape(snapshot?.name || currentCustomer.name || "나");
        const recommendation = avatarLookRecommendationState(snapshot || currentAvatarLookSnapshot());
        const savedState = avatarLookSavedState(snapshot || currentAvatarLookSnapshot());
        const avatarStyle = fitAvatarStyle(profile, metrics);
        const avatarBodyClass = "fit-body-" + (profile.bodyType || "regular");
        return `
          <section class="avatar-look-card">
            <div class="avatar-look-stage">
              <div class="fit-avatar ${avatarBodyClass}" style="${avatarStyle}">
                <div class="fit-head"></div>
                <div class="fit-arms"></div>
                <div class="fit-torso">${fitPreviewLayers(items, profile, metrics)}</div>
                <div class="fit-legs"></div>
              </div>
            </div>
            <div class="avatar-look-info">
              <p class="eyebrow">FITNOW AVATAR LOOK</p>
              <h3>${ownerName}의 지금배송 룩</h3>
              <span>${metrics.label} 체형 · ${items.length}개 아이템 · ${formatKRW(total)}</span>
              <div class="avatar-look-actions">
                <button class="avatar-recommend-button ${recommendation.recommended ? "active" : ""}" type="button" onclick="toggleAvatarLookRecommendation()" aria-pressed="${recommendation.recommended ? "true" : "false"}">
                  <span>${recommendation.recommended ? "추천됨" : "추천"}</span>
                  <strong>${recommendation.count}</strong>
                </button>
                <button class="avatar-save-button ${savedState.saved ? "active" : ""}" type="button" onclick="toggleAvatarLookSave()" aria-pressed="${savedState.saved ? "true" : "false"}">
                  <span>${savedState.saved ? "저장됨" : "저장"}</span>
                </button>
              </div>
            </div>
          </section>
          <section class="summary-card fit-result-card">
            <h3>착용 아이템과 입점업체</h3>
            ${avatarLookListMarkup(items)}
            <div class="line-item"><span>노출 입점업체</span><strong>${qaScenarioStatusEscape(stores.join(" · ") || "-")}</strong></div>
            <p class="fit-note">공유 링크와 이미지에는 착용 아이템, 입점업체, 구매 진입 정보가 함께 노출됩니다. 마이아바타룩은 현재 무료 베타로 운영하며 이용 횟수를 제한하지 않습니다.</p>
          </section>
          <div class="avatar-share-actions" style="margin-top: 12px;">
            <button class="secondary" type="button" ${items.length ? "" : "disabled"} onclick="copyAvatarLookShareLink()">링크 복사</button>
            <button class="secondary" type="button" ${items.length ? "" : "disabled"} onclick="copyAvatarLookShareText()">문구 복사</button>
            <button class="secondary" type="button" ${items.length ? "" : "disabled"} onclick="downloadAvatarLookImage()">이미지 저장</button>
          </div>
          <div class="detail-actions" style="margin-top: 12px;">
            <button class="secondary" type="button" onclick="renderAvatarLookFeed()">피드로 돌아가기</button>
            <button class="primary" type="button" ${items.length ? "" : "disabled"} onclick="checkoutAvatarLook()">이 룩 구매</button>
          </div>
        `;
      }

      function openMyAvatarLook(snapshot = null) {
        const fitRoomModal = document.getElementById("fitRoomModal");
        const fitRoomWasOpen = fitRoomModal && fitRoomModal.classList.contains("open");
        if (fitRoomModal && fitRoomModal.classList.contains("open")) closeFitRoom();
        const fallbackItem = products.find((product) => product.key === activeFitPreviewKey) || fitPreviewItems()[0];
        activeAvatarLookSnapshot = snapshot || (fitRoomWasOpen ? lastFitRoomAvatarSnapshot : null) || null;
        document.getElementById("avatarLookBody").innerHTML = activeAvatarLookSnapshot ? avatarLookCardMarkup(activeAvatarLookSnapshot) : avatarLookFeedMarkup();
        document.getElementById("avatarLookModal").classList.add("open");
        document.getElementById("avatarLookModal").setAttribute("aria-hidden", "false");
      }

      function closeMyAvatarLook() {
        document.getElementById("avatarLookModal").classList.remove("open");
        document.getElementById("avatarLookModal").setAttribute("aria-hidden", "true");
        activeAvatarLookSnapshot = null;
      }

      function parseAvatarInlineArgs(source = "") {
        const text = String(source || "").trim();
        if (!text) return [];
        const matches = text.match(/'[^']*'|"[^"]*"|[^,]+/g) || [];
        return matches.map((part) => {
          const value = part.trim();
          if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
            return value.slice(1, -1);
          }
          if (value === "true") return true;
          if (value === "false") return false;
          if (value === "null") return null;
          return value;
        });
      }

      function setupAvatarInlineHandlers() {
        if (setupAvatarInlineHandlers.ready) return;
        setupAvatarInlineHandlers.ready = true;
        const handlers = {
          createFit3dTypeTestProducts,
          openMyAvatar,
          openMyAvatarLook,
          renderAvatarLookFeed,
          openAvatarLookDetail,
          toggleAvatarLookRecommendation,
          toggleAvatarLookSave,
          renameAvatarLook,
          toggleAvatarLookFeatured,
          toggleAvatarLookVisibility,
          deleteSavedAvatarLook,
        };
        document.addEventListener("click", (event) => {
          const target = event.target?.closest?.("[onclick]");
          if (!target || target.disabled) return;
          const raw = target.getAttribute("onclick") || "";
          const match = raw.match(/^([A-Za-z_$][\w$]*)\((.*)\)$/);
          if (!match || typeof handlers[match[1]] !== "function") return;
          if (typeof window[match[1]] === "function") return;
          event.preventDefault();
          event.stopPropagation();
          handlers[match[1]](...parseAvatarInlineArgs(match[2]));
        });
      }

      function openSharedAvatarLookFromUrl() {
        const snapshot = sharedAvatarLookFromUrl();
        if (!snapshot || !Array.isArray(snapshot.itemKeys) || !snapshot.itemKeys.length) return;
        if (!document.getElementById("avatarLookModal")) return;
        openMyAvatarLook(snapshot);
        setSyncStatus("공유받은 마이아바타룩을 열었습니다");
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
        if (!cart.length) {
          setSyncStatus("배송 예약 전에 상품을 먼저 담아주세요");
          return;
        }
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
          customerRefundStatusLabel,
          customerRefundStatusDetail,
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
        const defaultReasonCode = customerReturnRequest ? "return_refund" : defaultCancelReasonCode(source);
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
        order.refundStatus = customerReturnRequest ? "requested" : refundStatusFromOrder(order);
        if (customerReturnRequest && !order.refundRequestedAt) order.refundRequestedAt = new Date().toISOString();
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

      async function completeRefund(orderId, source = "admin") {
        if (source === "vendor" && !currentVendor) {
          openVendorLogin();
          return;
        }
        if (source !== "vendor" && !currentAdmin) {
          openAdminLogin();
          return;
        }
        let order = orderHistory.find((item) => item.id === orderId);
        if (!order && lastOrder && lastOrder.id === orderId) order = lastOrder;
        if (!order && supabaseClient && source === "vendor") {
          const orders = await loadVendorOrders().catch(() => []);
          order = orders.find((item) => item.id === orderId);
        }
        if (!order && supabaseClient) {
          const orders = await loadAdminOrders().catch(() => []);
          order = orders.find((item) => item.id === orderId);
        }
        if (!order) {
          setSyncStatus("환불 처리할 주문을 찾을 수 없습니다");
          return;
        }
        if (source === "vendor" && !canVendorManageRefund(order)) {
          setSyncStatus("입점업체는 자기 매장 주문만 환불 처리할 수 있습니다");
          return;
        }
        if (source !== "vendor" && !canCurrentAdminManageOrder(order)) {
          setSyncStatus("현재 계정에서 환불 처리할 수 없는 주문입니다");
          return;
        }
        if (source !== "vendor" && currentAdmin.role !== "total") {
          setSyncStatus("환불 처리는 총관리자 권한에서 처리할 수 있습니다");
          return;
        }
        if (!canCompleteRefund(order)) {
          setSyncStatus(refundStatusFromOrder(order) === "requested" ? "반품/환불 승인 후 환불 완료 처리할 수 있습니다" : "환불 완료 처리할 결제 건이 없습니다");
          return;
        }
        const defaultMemo = order.refundMemo || (source === "vendor" ? "입점업체 환불 완료 처리" : "관리자 환불 완료 처리");
        const memo = window.prompt("환불 완료 메모를 입력해 주세요", defaultMemo);
        if (memo === null) return;
        order.refundStatus = "completed";
        order.refundMemo = memo.trim() || defaultMemo;
        order.refundHandledBy = source === "vendor" ? currentVendor.store : currentAdmin.name || "총관리자";
        order.refundHandledAt = new Date().toISOString();
        order.paymentLabel = paymentLabelForOrder(order);
        lastOrder = order;
        saveOrderStatusOverride(order);
        saveOrderHistory(order);
        renderOrders();
        renderTracking();
        if (document.getElementById("myModal").classList.contains("open")) renderMyPage();
        if (document.getElementById("vendorModal").classList.contains("open")) renderVendorOrders();
        if (document.getElementById("adminModal").classList.contains("open")) renderAdminOrders();
        if (source !== "vendor") markFinalQaScenarioItem("admin-refund-action", { render: false });
        try {
          await syncOrderStatusToSupabase(order);
          setSyncStatus((source === "vendor" ? "입점업체 환불 완료 상태" : "환불 완료 상태") + "가 Supabase에 저장됨 - " + order.id);
        } catch (error) {
          setSyncStatus("환불 완료는 화면에 반영됨 - DB 업데이트 권한 확인 필요");
        }
      }

      async function reviewReturnRefund(orderId, decision, source = "admin") {
        if (source === "vendor" && !currentVendor) {
          openVendorLogin();
          return;
        }
        if (source !== "vendor" && !currentAdmin) {
          openAdminLogin();
          return;
        }
        let order = orderHistory.find((item) => item.id === orderId);
        if (!order && lastOrder && lastOrder.id === orderId) order = lastOrder;
        if (!order && supabaseClient && source === "vendor") {
          const orders = await loadVendorOrders().catch(() => []);
          order = orders.find((item) => item.id === orderId);
        }
        if (!order && supabaseClient) {
          const orders = await loadAdminOrders().catch(() => []);
          order = orders.find((item) => item.id === orderId);
        }
        if (!order) {
          setSyncStatus("반품/환불 요청 주문을 찾을 수 없습니다");
          return;
        }
        if (source === "vendor" && !canVendorManageRefund(order)) {
          setSyncStatus("입점업체는 자기 매장 주문만 반품/환불 처리할 수 있습니다");
          return;
        }
        if (source !== "vendor" && !canCurrentAdminManageOrder(order)) {
          setSyncStatus("현재 계정에서 반품/환불 처리할 수 없는 주문입니다");
          return;
        }
        if (source !== "vendor" && currentAdmin.role !== "total") {
          setSyncStatus("반품/환불 처리는 총관리자 권한에서 처리할 수 있습니다");
          return;
        }
        if (!canReviewReturnRefund(order)) {
          setSyncStatus("승인 또는 거절할 반품/환불 요청이 없습니다");
          return;
        }
        const approving = decision === "approved";
        const defaultMemo = approving ? "상품 상태 확인 후 환불 승인" : "반품/환불 거절";
        const memo = window.prompt((approving ? "승인" : "거절") + " 메모를 입력해 주세요", defaultMemo);
        if (memo === null) return;
        order.refundStatus = approving ? "approved" : "rejected";
        order.refundMemo = memo.trim() || defaultMemo;
        order.refundHandledBy = source === "vendor" ? currentVendor.store : currentAdmin.name || "총관리자";
        order.refundHandledAt = new Date().toISOString();
        order.paymentLabel = paymentLabelForOrder(order);
        lastOrder = order;
        saveOrderStatusOverride(order);
        saveOrderHistory(order);
        renderOrders();
        renderTracking();
        if (document.getElementById("myModal").classList.contains("open")) renderMyPage();
        if (document.getElementById("vendorModal").classList.contains("open")) renderVendorOrders();
        if (document.getElementById("adminModal").classList.contains("open")) renderAdminOrders();
        if (source === "vendor") markFinalQaScenarioItem("vendor-refund-action", { render: false });
        else markFinalQaScenarioItem("admin-refund-action", { render: false });
        try {
          await syncOrderStatusToSupabase(order);
          setSyncStatus("반품/환불 " + (approving ? "승인" : "거절") + " 상태가 Supabase에 저장됨 - " + order.id);
        } catch (error) {
          setSyncStatus("반품/환불 " + (approving ? "승인" : "거절") + "은 화면에 반영됨 - DB 업데이트 권한 확인 필요");
        }
      }

      function openAdminLogin() {
        if (!requireAdminAccess()) return;
        const hint = document.getElementById("adminLoginHint");
        const deliveryMode = pendingAdminMode !== "total";
        const title = document.getElementById("adminLoginTitle");
        const label = document.getElementById("adminPinLabel");
        const button = document.getElementById("adminLoginButton");
        const input = document.getElementById("adminPin");
        if (title) title.textContent = deliveryMode ? "배송사 로그인" : "총관리자 로그인";
        if (label) label.textContent = deliveryMode ? "배송사 PIN" : "총관리자 PIN";
        if (button) button.textContent = deliveryMode ? "배송관리 열기" : "총관리자 열기";
        if (input) input.value = "";
        if (hint) hint.textContent = deliveryMode
          ? "배송사에 발급된 운영 PIN을 입력해 주세요."
          : "총관리자에게 발급된 운영 PIN을 입력해 주세요.";
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
        if (!requireAdminAccess()) return;
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
          setSyncStatus("결제 완료 - Supabase 결제 상태 반영");
        } catch (error) {
          setSyncStatus("결제 완료 - 화면 상태 우선 반영");
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
              ${customerRefundStatusCard(order, true)}
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
              ${customerRefundStatusCard(lastOrder)}
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
      applyAdminAccessVisibility();
      restoreSavedCustomer();
      restoreSavedVendor();
      restoreSavedAdmin();
      setupAdminTodoHandlers();
      setupAdminUtilityHandlers();
      setupAdminSettlementViewHandlers();
      setupAvatarInlineHandlers();
      ensureAvatarTestProduct();
      renderProducts();
      renderCart();
      openSharedAvatarLookFromUrl();
      initSupabase().then(() => {
        renderProducts();
        renderCart();
      });

Object.assign(window, {
  checkAdminTestDataCleanupState,
  checkSupabaseSetup,
  checkSupabaseCleanupPermission,
  clearAdminTestDataFromPreRelease,
  createFit3dTypeTestProducts,
  syncVendorVisualWithCategory,
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
  openAdminFinalQaScenario,
  openAdminPreReleaseCheck,
  openPreReleaseManualQa,
  completePreReleaseManualQa,
  setAdminQaChecklistItem,
  clearAdminQaChecklist,
  startNewAdminQaChecklist,
  copyAdminQaChecklistReport,
  copyAdminPreReleaseReport,
  copyAvatarLookShareLink,
  copyAvatarLookShareText,
  downloadAdminQaChecklistCsv,
  downloadAvatarLookImage,
  downloadAdminPreReleaseReport,
  runPreReleaseQaAction,
  approveReturnRefundFromDetail,
  rejectReturnRefundFromDetail,
  closeAdminOrderDetail,
  openSettlementDetail,
  confirmSettlementOrder,
  confirmSettlementBatch,
  paySettlementBatch,
  holdSettlementBatch,
  releaseSettlementHold,
  runQaScenarioAction,
  runSettlementConfirmAction,
  runSettlementFlowAutoCheck,
  runReturnRefundVisibilityCheck,
  clearSettlementFlowCheckLogs,
  clearAdminTestData,
  clearExpiredDeliveryProofPhotos,
  clearAvatarTryOnPhoto,
  setFeedTab,
  setSearchQuery,
  toggleFilterPanel,
  toggleAvatarLookRecommendation,
  toggleAvatarLookSave,
  renameAvatarLook,
  toggleAvatarLookFeatured,
  toggleAvatarLookVisibility,
  deleteSavedAvatarLook,
  renderAvatarLookFeed,
  openAvatarLookDetail,
  setTestDataRetention,
  selectFitBodySample,
  startAvatarTryOnGeneration,
  handleAvatarTryOnPhotoUpload,
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
  addFitPreviewToCart,
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
  approveReturnRefundFromDetail,
  approveVendorReturnRefundFromDetail,
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
  checkoutAvatarLook,
  checkoutFromCart,
  checkAdminTestDataCleanupState,
  checkSupabaseSetup,
  checkSupabaseCleanupPermission,
  createFit3dTypeTestProducts,
  copyAvatarLookShareLink,
  copyAvatarLookShareText,
  clearAdminTestDataFromPreRelease,
  claimDeliveryOrder,
  claimDeliveryOrderFromDetail,
  clearAvatarTryOnPhoto,
  clearDeliveryForm,
  clearExpiredDeliveryProofPhotos,
  closeAdmin,
  closeAdminLogin,
  closeAdminOrderDetail,
  closeCartDetail,
  closeCustomerLogin,
  closeDetail,
  closeFitRoom,
  closeLooks,
  closeManagement,
  closeModal,
  closeMyAvatarLook,
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
  completeVendorRefundFromDetail,
  confirmCheckout,
  confirmDeliveryProof,
  confirmDeliveryProofFromDetail,
  startDeliveryProofCapture,
  confirmSettlementOrder,
  confirmSettlementBatch,
  createOrderSnapshot,
  createDeliveryFlowTestOrder,
  createReturnRefundTestOrders,
  createSettlementDemoOrders,
  createSettlementExcelDemoOrders,
  csvCell,
  currentRegion,
  customerContactLabel,
  customerId,
  customerRefundMemoLabel,
  customerRefundStatusDetail,
  customerRefundStatusLabel,
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
  downloadAvatarLookImage,
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
  goHome,
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
  openFitRoom,
  openLooks,
  openManagement,
  openMyAvatar,
  openMyAvatarLook,
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
  openAdminFinalQaScenario,
  openAdminPreReleaseCheck,
  openPreReleaseManualQa,
  completePreReleaseManualQa,
  setAdminQaChecklistItem,
  clearAdminQaChecklist,
  startNewAdminQaChecklist,
  copyAdminQaChecklistReport,
  copyAdminPreReleaseReport,
  downloadAdminQaChecklistCsv,
  downloadAdminPreReleaseReport,
  runPreReleaseQaAction,
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
  rejectReturnRefundFromDetail,
  rejectVendorReturnRefundFromDetail,
  releaseSettlementHold,
  runQaScenarioAction,
  runSettlementConfirmAction,
  runSettlementFlowAutoCheck,
  runReturnRefundVisibilityCheck,
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
  reserveFitPreviewItem,
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
  saveFitProfile,
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
  selectFitBodySample,
  selectFitPreviewItem,
  selectedLookSize,
  selectedValue,
  selectOrder,
  selectTrackingOrder,
  setAdminOrderSearch,
  setAdminSettlementView,
  setAdminStatusFilter,
  setCategory,
  setFeedTab,
  setFit3dQuickView,
  setPriceRange,
  setRegion,
  setFitViewMode,
  setSettlementPartnerFilter,
  setSettlementPeriodFilter,
  setShowroom,
  setSizeFilter,
  setSort,
  setSyncStatus,
  setSearchQuery,
  startAvatarTryOnGeneration,
  toggleFilterPanel,
  toggleAvatarLookRecommendation,
  toggleAvatarLookSave,
  renameAvatarLook,
  toggleAvatarLookFeatured,
  toggleAvatarLookVisibility,
  deleteSavedAvatarLook,
  renderAvatarLookFeed,
  openAvatarLookDetail,
  handleAvatarTryOnPhotoUpload,
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
  syncVendorVisualWithCategory,
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
