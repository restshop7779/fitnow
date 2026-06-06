export default function ProfileView({ user, catalogSource, onOpenAuth, onSignOut }) {
  return (
    <section className="view active">
      <section className="profile-card">
        <p className="eyebrow">MY FITNOW</p>
        <h2>{user.name}</h2>
        <span>{user.isGuest ? "게스트 모드로 체험 중" : user.email}</span>
        <button onClick={user.isGuest ? onOpenAuth : onSignOut}>{user.isGuest ? "로그인하기" : "로그아웃"}</button>
      </section>
      <section className="profile-list">
        <div>
          <span>데이터 소스</span>
          <strong>{catalogSource === "supabase" ? "Supabase 연결됨" : "로컬 샘플"}</strong>
        </div>
        <div>
          <span>주문 범위</span>
          <strong>{user.isGuest ? "현재 기기" : "내 계정"}</strong>
        </div>
        <div>
          <span>다음 단계</span>
          <strong>{user.isGuest ? "이메일 로그인" : "주문 동기화"}</strong>
        </div>
      </section>
    </section>
  );
}
