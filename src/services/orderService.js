import { supabaseRequest } from "../lib/supabaseClient.js";

export async function saveOrder(orderDraft) {
  const orderPayload = {
    order_code: orderDraft.id,
    user_id: orderDraft.userId === "guest-fitnow-user" ? null : orderDraft.userId,
    status: orderDraft.status,
    item_total: orderDraft.itemTotal,
    delivery_fee: orderDraft.deliveryFee,
    total: orderDraft.total,
    eta_minutes: orderDraft.etaMinutes,
    destination_label: orderDraft.destinationLabel,
    request_note: orderDraft.requestNote,
  };

  const createdOrders = await supabaseRequest("orders", {
    method: "POST",
    body: JSON.stringify(orderPayload),
  });

  if (!createdOrders) return { order: orderDraft, orderItems: orderDraft.orderItems };

  const order = createdOrders[0];
  const orderItems = await supabaseRequest("order_items", {
    method: "POST",
    body: JSON.stringify(
      orderDraft.orderItems.map((item) => ({
        order_id: order.id,
        product_slug: item.productSlug,
        product_name: item.productName,
        size: item.size,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        selected_at: item.selectedAt,
      })),
    ),
  });

  return { order, orderItems };
}

export async function fetchOrders(user) {
  const userFilter = user?.isGuest || !user?.id ? "" : `&user_id=eq.${user.id}`;
  const rows = await supabaseRequest(`orders?select=*,order_items(*)&order=created_at.desc${userFilter}`);
  if (!rows) return [];
  return rows.map(mapOrderFromRow);
}

function mapOrderFromRow(row) {
  return {
    id: row.order_code,
    userId: row.user_id,
    items: row.order_items ?? [],
    orderItems: row.order_items ?? [],
    etaMinutes: row.eta_minutes,
    showroom: row.showroom_name ?? "어반클로젯 성수",
    status: row.status,
    statusIndex: statusToIndex(row.status),
    itemTotal: row.item_total,
    deliveryFee: row.delivery_fee,
    total: row.total,
    destinationLabel: row.destination_label,
    requestNote: row.request_note,
    createdAt: row.created_at,
  };
}

function statusToIndex(status) {
  const statuses = ["reserved", "stock_checked", "pickup", "arriving", "delivered"];
  const index = statuses.indexOf(status);
  return index === -1 ? 2 : Math.min(index, 3);
}
