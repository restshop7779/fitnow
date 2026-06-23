import { SETTLEMENT_STATUS_STORAGE_KEY } from "./config.js";

export function readSettlementStatusStore() {
  try {
    return JSON.parse(localStorage.getItem(SETTLEMENT_STATUS_STORAGE_KEY) || "{}");
  } catch (error) {
    localStorage.removeItem(SETTLEMENT_STATUS_STORAGE_KEY);
    return {};
  }
}

export function saveSettlementStatus(order) {
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

export function applyStoredSettlementStatus(order) {
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

export function settlementDateForOrder(order, mode = "open") {
  if (mode === "paid") return order.settlementPaidAt || order.arrivalConfirmedAt || order.createdAt;
  if (mode === "held") return order.settlementHeldAt || order.arrivalConfirmedAt || order.createdAt;
  return order.arrivalConfirmedAt || order.settlementConfirmedAt || order.createdAt;
}

export function settlementStatusLabel(order) {
  if (order.settlementClosedAt) return "마감완료";
  if (order.settlementStatus === "paid") return "지급완료";
  if (order.settlementStatus === "held") return "보류";
  if (order.settlementStatus === "confirmed") return "지급대기";
  return "확정대기";
}
