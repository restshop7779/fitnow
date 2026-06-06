import { useState } from "react";
import { currencyFormatter } from "../utils/format.js";

const deliveryFee = 3500;

export default function CheckoutSheet({
  lineItems,
  cartCount,
  total,
  isSaving,
  error,
  onClose,
  onConfirm,
  onIncrement,
  onDecrement,
  onRemove,
}) {
  const [destinationLabel, setDestinationLabel] = useState("성수동 2가");
  const [requestNote, setRequestNote] = useState("문 앞에 두고 문자 주세요");
  const canConfirm = cartCount > 0 && !isSaving;

  return (
    <section className="sheet" aria-hidden="false" onClick={onClose}>
      <div className="sheet-panel" onClick={(event) => event.stopPropagation()}>
        <button className="sheet-close" aria-label="닫기" onClick={onClose}>
          ×
        </button>
        <p className="eyebrow">DELIVERY RESERVATION</p>
        <h2>오늘 18:42 도착으로 예약할까요?</h2>
        <div className="checkout-list">
          <div>
            <span>선택 상품</span>
            <strong>{cartCount}개</strong>
          </div>
          <div>
            <span>상품 금액</span>
            <strong>{currencyFormatter.format(total)}</strong>
          </div>
          <div>
            <span>즉시배송</span>
            <strong>{currencyFormatter.format(deliveryFee)}</strong>
          </div>
        </div>
        <div className="checkout-items">
          {lineItems.map((item) => (
            <article className="checkout-item-card" key={item.id}>
              <div>
                <strong>{item.product.name}</strong>
                <span>{item.size} 사이즈</span>
              </div>
              <div className="quantity-stepper" aria-label={`${item.product.name} 수량 조절`}>
                <button aria-label="수량 줄이기" onClick={() => onDecrement(item.id)}>
                  −
                </button>
                <span>{item.quantity}</span>
                <button aria-label="수량 늘리기" onClick={() => onIncrement(item.id)}>
                  +
                </button>
              </div>
              <button className="remove-line" onClick={() => onRemove(item.id)}>
                삭제
              </button>
            </article>
          ))}
        </div>
        <div className="delivery-options">
          <label>
            <span>배송지</span>
            <select value={destinationLabel} onChange={(event) => setDestinationLabel(event.target.value)}>
              <option>성수동 2가</option>
              <option>회사 로비</option>
              <option>스타일링 룸</option>
            </select>
          </label>
          <label>
            <span>요청사항</span>
            <input value={requestNote} onChange={(event) => setRequestNote(event.target.value)} placeholder="라이더에게 남길 메모" />
          </label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-wide" onClick={() => onConfirm({ destinationLabel, requestNote })} disabled={!canConfirm}>
          {isSaving ? "주문 저장 중" : "결제하고 추적하기"}
        </button>
      </div>
    </section>
  );
}
