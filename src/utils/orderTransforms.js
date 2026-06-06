export function createOrderDraft({ lineItems, total, user, showroom = "어반클로젯 성수", deliveryDetails = {} }) {
  return {
    id: `FN-${Date.now().toString().slice(-6)}`,
    userId: user?.id,
    items: lineItems,
    orderItems: toOrderItems(lineItems),
    etaMinutes: 32,
    showroom,
    status: "pickup",
    statusIndex: 2,
    itemTotal: total,
    deliveryFee: 3500,
    total: total + 3500,
    destinationLabel: deliveryDetails.destinationLabel ?? "성수동 2가",
    requestNote: deliveryDetails.requestNote ?? "",
    createdAt: new Date().toISOString(),
  };
}

export function toOrderItems(lineItems) {
  return lineItems.map((item) => ({
    productSlug: item.product.key,
    productName: item.product.name,
    size: item.size,
    quantity: item.quantity,
    unitPrice: item.product.price,
    selectedAt: item.selectedAt,
  }));
}
