export default function BottomTabs({ activeView, onChangeView, onOpenTracking }) {
  return (
    <nav className="bottom-tabs" aria-label="주요 메뉴">
      <button className={activeView === "home" ? "active" : ""} onClick={() => onChangeView("home")}>
        홈
      </button>
      <button className={activeView === "showrooms" ? "active" : ""} onClick={() => onChangeView("showrooms")}>
        쇼룸
      </button>
      <button onClick={onOpenTracking}>추적</button>
      <button className={activeView === "orders" ? "active" : ""} onClick={() => onChangeView("orders")}>
        주문
      </button>
      <button className={activeView === "profile" ? "active" : ""} onClick={() => onChangeView("profile")}>
        마이
      </button>
    </nav>
  );
}
