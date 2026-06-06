export default function TopBar() {
  return (
    <header className="top-bar">
      <button className="icon-button menu-icon" aria-label="메뉴">
        <span />
        <span />
      </button>
      <div className="brand-lockup">
        <p>FITNOW</p>
        <button className="location-button">성수 쇼룸권</button>
      </div>
      <button className="icon-button search-icon" aria-label="검색" />
    </header>
  );
}
