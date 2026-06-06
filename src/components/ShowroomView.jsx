export default function ShowroomView({ showrooms, isLoading }) {
  return (
    <section className="view active">
      <section className="section-head page-title">
        <div>
          <p className="eyebrow">SHOWROOMS</p>
          <h2>오늘 바로 연결되는 편집숍</h2>
        </div>
      </section>
      <section className="showroom-list">
        {isLoading && <p className="inline-status">근처 쇼룸을 불러오는 중입니다.</p>}
        {!isLoading &&
          showrooms.map((showroom) => (
            <article className="showroom-card" key={showroom.name}>
              <div className={`showroom-cover ${showroom.cover}`} />
              <div>
                <p className="eyebrow">{showroom.area}</p>
                <h3>{showroom.name}</h3>
                <span>{showroom.summary}</span>
              </div>
              <button>입장</button>
            </article>
          ))}
      </section>
    </section>
  );
}
