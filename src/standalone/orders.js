import { itemSalePrice } from "./format.js";

export function createOrderSnapshotData({
  cart,
  currentRegion,
  customerContactLabel,
  customerId,
  currentCustomer,
  deliveryInfo,
  eta,
}) {
  const subtotal = cart.reduce((sum, item) => sum + itemSalePrice(item) * item.quantity, 0);
  const deliveryFee = subtotal >= 120000 ? 0 : 3500;
  const fastest = cart.length ? Math.min(...cart.map((item) => eta(item))) : 0;
  const paymentMethod = deliveryInfo.paymentMethod || "카카오페이";
  return {
    id: "FN-" + String(Date.now()).slice(-6),
    region: currentRegion.label,
    address: deliveryInfo.address || currentRegion.address,
    receiveType: deliveryInfo.receiveType || "문앞 수령",
    paymentMethod,
    riderRequest: deliveryInfo.riderRequest || "",
    items: cart.map((item) => ({ ...item })),
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    fastest,
    customerId: customerId(),
    customerName: deliveryInfo.name || currentCustomer.name,
    customerContact: deliveryInfo.phone || customerContactLabel(),
    progressStep: 0,
    statusCode: "reserved",
    paid: paymentMethod !== "현장결제",
    paymentLabel: paymentMethod !== "현장결제" ? paymentMethod + " 결제 완료" : "현장결제 대기",
    deliveryPartnerName: "",
    riderName: "",
  };
}
