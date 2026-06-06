import { useState } from "react";

export default function StylistView({ onAddSet }) {
  const [hasResult, setHasResult] = useState(false);

  return (
    <section className="view active">
      <section className="section-head page-title">
        <div>
          <p className="eyebrow">AI STYLIST</p>
          <h2>상황을 말하면 즉시배송 룩으로 맞춰드려요</h2>
        </div>
      </section>
      <section className="stylist-card">
        <label htmlFor="stylist-input">오늘의 상황</label>
        <textarea id="stylist-input" defaultValue="성수에서 저녁 약속이 있고, 지금 입은 검정 슬랙스에 어울리는 포인트가 필요해." />
        <button className="primary-wide" onClick={() => setHasResult(true)}>
          룩 추천 받기
        </button>
      </section>
      <section className={`ai-result ${hasResult ? "active" : ""}`}>
        <p className="eyebrow">RECOMMENDATION</p>
        <h3>라이트 크롭 재킷 + 실버 링 세트</h3>
        <p>검정 슬랙스의 무게를 재킷의 짧은 기장으로 덜고, 링으로 손끝에 선명한 포인트를 더하세요. 두 아이템 모두 45분 안에 받을 수 있어요.</p>
        <button className="primary-wide" onClick={onAddSet}>
          추천 조합 담기
        </button>
      </section>
    </section>
  );
}
