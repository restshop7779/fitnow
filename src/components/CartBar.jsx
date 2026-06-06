import { currencyFormatter } from "../utils/format.js";

export default function CartBar({ count, total, onCheckout }) {
  return (
    <aside className="cart-bar" aria-live="polite">
      <div>
        <p>{count}개 선택</p>
        <strong>{currencyFormatter.format(total)}</strong>
      </div>
      <button disabled={count === 0} onClick={onCheckout}>
        배송 예약
      </button>
    </aside>
  );
}
