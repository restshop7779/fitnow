import {
  deliveryPartners,
  RIDER_NICKNAME_STORAGE_KEY,
  SETTLEMENT_RATE_STORAGE_KEY,
} from "./config.js";
import { hasDeliveryProof } from "./deliveryProof.js";
import { isOrderCancelled } from "./refunds.js";
import { applyStoredSettlementStatus } from "./settlementStatus.js";

export function riderForRegion(regionLabel) {
  if ((regionLabel || "").includes("오산")) return "오산 지금배송 라이더 02";
  if ((regionLabel || "").includes("동탄")) return "동탄 지금배송 라이더 01";
  return "핏나우 지금배송 라이더";
}

export function orderAreaText(order) {
  return [order.region, order.address].filter(Boolean).join(" ");
}

export function deliveryPartnerServesOrder(partner, order) {
  if (!partner || !order) return false;
  const areaText = orderAreaText(order);
  const keywords = [...(partner.areas || []), ...(partner.addressKeywords || [])]
    .map((keyword) => String(keyword || "").trim())
    .filter(Boolean);
  return keywords.some((keyword) => areaText.includes(keyword));
}

export function deliveryPartnerForOrder(order) {
  if (order.deliveryPartnerName) {
    return deliveryPartners.find((partner) => partner.name === order.deliveryPartnerName) || null;
  }
  const rider = order.riderName || riderForRegion(order.region);
  return deliveryPartners.find((partner) =>
    partner.riders.includes(rider) || deliveryPartnerServesOrder(partner, order)
  ) || deliveryPartners[0];
}

export function assignedRiderLabel(order) {
  return order.riderName || (order.deliveryPartnerName ? "담당 기사 확인 중" : "배정 대기");
}

export function readRiderNicknameStore() {
  try {
    return JSON.parse(localStorage.getItem(RIDER_NICKNAME_STORAGE_KEY) || "{}");
  } catch (error) {
    localStorage.removeItem(RIDER_NICKNAME_STORAGE_KEY);
    return {};
  }
}

export function saveRiderNicknameStore(store) {
  localStorage.setItem(RIDER_NICKNAME_STORAGE_KEY, JSON.stringify(store || {}));
}

export function riderKey(partnerName, index) {
  return partnerName + "::" + index;
}

export function riderNicknamesForPartner(partner) {
  const saved = readRiderNicknameStore();
  return partner.riders.map((name, index) => saved[riderKey(partner.name, index)] || name);
}

export function riderOptionsForPartner(partnerName, selected = "") {
  const partner = deliveryPartners.find((item) => item.name === partnerName);
  if (!partner) return "";
  return riderNicknamesForPartner(partner).map((name) =>
    '<option value="' + name + '"' + (name === selected ? " selected" : "") + '>' + name + '</option>'
  ).join("");
}

export function readSettlementRateStore() {
  try {
    return JSON.parse(localStorage.getItem(SETTLEMENT_RATE_STORAGE_KEY) || "{}");
  } catch (error) {
    localStorage.removeItem(SETTLEMENT_RATE_STORAGE_KEY);
    return {};
  }
}

export function saveSettlementRateStore(store) {
  localStorage.setItem(SETTLEMENT_RATE_STORAGE_KEY, JSON.stringify(store || {}));
}

export function defaultPartnerRate(partnerName) {
  const store = readSettlementRateStore();
  return Number(store["partner::" + partnerName] || 90);
}

export function riderSettlementRate(partnerName, riderName) {
  const store = readSettlementRateStore();
  const riderRate = store["rider::" + partnerName + "::" + riderName];
  return Number(riderRate || defaultPartnerRate(partnerName));
}

export function settlementPayout(deliveryFee, partnerName, riderName) {
  return Math.round((deliveryFee || 0) * riderSettlementRate(partnerName, riderName) / 100);
}

export function renameRiderNickname(partner, index, value) {
  if (!partner) return null;
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
  return { previousName, nickname };
}

export function riderWorkRows(orders, visiblePartners = deliveryPartners) {
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

export function riderWorkBadge(row) {
  if (row.pickupMissing + row.arrivalMissing >= 2 || row.active >= 3) return { label: "바쁨", cls: "refund" };
  if (row.pickupMissing || row.arrivalMissing || row.active >= 1 || row.assigned >= 2) return { label: "주의", cls: "ready" };
  return { label: "여유", cls: "done" };
}

export function deliveryShortcutItems(orders = [], options = {}) {
  const isDeliveryOrderClaimed = options.isDeliveryOrderClaimed || ((order) => !!(order && order.deliveryPartnerName));
  const isTodayOrder = options.isTodayOrder || (() => false);
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
