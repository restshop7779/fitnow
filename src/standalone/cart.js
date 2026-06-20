import {
  itemNormalPrice,
  itemSalePrice,
} from "./format.js";

export function calculateCartTotals(cart) {
  const normalSubtotal = cart.reduce((sum, item) => sum + itemNormalPrice(item) * item.quantity, 0);
  const saleSubtotal = cart.reduce((sum, item) => sum + itemSalePrice(item) * item.quantity, 0);
  const discountAmount = Math.max(0, normalSubtotal - saleSubtotal);
  const deliveryFee = 0;
  return { normalSubtotal, saleSubtotal, discountAmount, deliveryFee, total: saleSubtotal + deliveryFee };
}

export function groupCartPickups(cart, eta) {
  return cart.reduce((groups, item) => {
    if (!groups[item.showroom]) groups[item.showroom] = { count: 0, minutes: eta(item) };
    groups[item.showroom].count += item.quantity;
    groups[item.showroom].minutes = Math.min(groups[item.showroom].minutes, eta(item));
    return groups;
  }, {});
}
