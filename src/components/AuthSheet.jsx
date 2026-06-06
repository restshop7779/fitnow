import { useState } from "react";

export default function AuthSheet({ isSubmitting, error, onClose, onGuest, onSubmit }) {
  const [email, setEmail] = useState("");

  return (
    <section className="sheet" aria-hidden="false" onClick={onClose}>
      <div className="sheet-panel" onClick={(event) => event.stopPropagation()}>
        <button className="sheet-close" aria-label="닫기" onClick={onClose}>
          ×
        </button>
        <p className="eyebrow">SIGN IN</p>
        <h2>내 주문과 스타일 추천을 이어서 볼 수 있어요.</h2>
        <label className="auth-label" htmlFor="auth-email">
          이메일
        </label>
        <input
          id="auth-email"
          className="auth-input"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <p className="auth-hint">게스트 장바구니는 로그인한 계정으로 이어받습니다.</p>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-wide" disabled={isSubmitting || !email} onClick={() => onSubmit(email)}>
          {isSubmitting ? "로그인 요청 중" : "이메일로 시작하기"}
        </button>
        <button className="secondary-wide" onClick={onGuest}>
          게스트로 계속하기
        </button>
      </div>
    </section>
  );
}
