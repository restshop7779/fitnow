import { riderNicknamesForPartner, riderWorkBadge } from "./riders.js";

export function riderWorkBoardMarkup(rows, options = {}) {
  const formatKRW = options.formatKRW || ((value) => String(value || 0));
  if (!rows.length) return '<div class="line-item"><span>등록된 기사가 없습니다</span><strong>확인 필요</strong></div>';
  return rows.map((row) => {
    const badge = riderWorkBadge(row);
    return `
      <div class="vendor-product-row admin-order-row">
        <div>
          <strong>${row.riderName} <span class="admin-status-badge ${badge.cls}">${badge.label}</span></strong>
          <span>${row.partnerName}</span>
          <span>배정 ${row.assigned}건 · 픽업필요 ${row.pickupMissing}건 · 배송시작 ${row.deliveryStartReady}건 · 도착필요 ${row.arrivalMissing}건</span>
          <span>완료 ${row.done}건 · 정산 예정 ${formatKRW(row.payout)}</span>
        </div>
        <div class="mini-actions">
          <button type="button" onclick="focusRiderOrders('${row.riderName}', 'all')">전체</button>
          <button type="button" ${row.pickupMissing ? "" : "disabled"} onclick="focusRiderOrders('${row.riderName}', 'pickup_proof')">픽업 인증</button>
          <button type="button" ${row.deliveryStartReady ? "" : "disabled"} onclick="focusRiderOrders('${row.riderName}', 'delivery_start')">배송 시작</button>
          <button type="button" ${row.arrivalMissing ? "" : "disabled"} onclick="focusRiderOrders('${row.riderName}', 'arrival_proof')">도착 인증</button>
          <button type="button" ${row.completionReady ? "" : "disabled"} onclick="focusRiderOrders('${row.riderName}', 'delivery_finish')">완료 처리</button>
          <button type="button" ${row.done ? "" : "disabled"} onclick="focusRiderOrders('${row.riderName}', 'done')">완료</button>
        </div>
      </div>
    `;
  }).join("");
}

export function riderNicknameManagerMarkup(visiblePartners) {
  return visiblePartners.map((partner) => {
    const nicknames = riderNicknamesForPartner(partner);
    return `
      <details class="admin-store-group" open>
        <summary>${partner.name} <span>${nicknames.length}명</span></summary>
        <div class="vendor-form size-stock-grid" style="margin-top: 9px;">
          ${nicknames.map((name, index) => `
            <label>기사 ${index + 1}
              <input type="text" value="${name}" onchange="updateRiderNickname('${partner.name}', ${index}, this.value)" />
            </label>
          `).join("")}
        </div>
      </details>
    `;
  }).join("");
}

export function adminModeBannerMarkup(diagnostic, retentionLabel) {
  return `
    <div class="admin-mode-banner ${diagnostic.hasTestState ? "test" : "live"}">
      <div>
        <span>${diagnostic.hasTestState ? "TEST MODE" : "OPERATING MODE"}</span>
        <strong>${diagnostic.hasTestState ? "테스트 데이터가 남아 있습니다" : "운영 데이터 기준 화면입니다"}</strong>
        <p>${diagnostic.hasTestState ? "테스트 주문 " + diagnostic.orders + "건 · 테스트 상태 " + diagnostic.statuses + "건 · 점검 로그 " + diagnostic.logs + "건 · " + retentionLabel + " 초과 자동 정리" : "점검 로그와 테스트 주문이 없는 상태입니다."}</p>
      </div>
      ${diagnostic.hasTestState ? '<button type="button" onclick="clearAdminTestData()">정리</button>' : '<em>정상</em>'}
    </div>
  `;
}

export function adminReleaseReadinessMarkup(data) {
  const itemMarkup = data.items.map((item) => `
    <div class="${item.ready ? "ready" : "pending"}">
      <span>${item.label}</span>
      <strong>${item.ready ? "OK" : "확인 필요"}</strong>
      <em>${item.detail}</em>
    </div>
  `).join("");
  return `
    <div class="admin-release-readiness ${data.allReady ? "ready" : "pending"}">
      <div class="admin-release-readiness-head">
        <div>
          <span>배포 준비 상태</span>
          <strong>${data.allReady ? "배포 전 필수 점검 완료" : "배포 전 확인 항목이 남아 있습니다"}</strong>
        </div>
        <em>${data.readyCount}/4</em>
      </div>
      <div class="admin-release-readiness-grid">${itemMarkup}</div>
      <div class="admin-release-actions">
        <button class="primary" type="button" onclick="openAdminPreReleaseCheck()">최종 점검 모드</button>
        <button class="neutral" type="button" onclick="openAdminQaChecklist()">QA 체크리스트</button>
        <button class="success" type="button" ${data.diagnostic.hasTestState ? "" : "disabled"} onclick="clearAdminTestData()">테스트 데이터 정리</button>
        <button class="warning" type="button" onclick="openSettlementStatement()">정산서 미리보기</button>
        <button class="primary" type="button" ${data.settlementExportCount ? "" : "disabled"} onclick="downloadSettlementCsv('all')">정산 CSV ${data.settlementExportCount}건</button>
      </div>
    </div>
  `;
}

export function deliveryWorkShortcutsMarkup(items, adminName) {
  const urgentCount = items.slice(0, 5).reduce((sum, item) => sum + item.count, 0);
  return `
    <div class="delivery-work-shortcuts ${urgentCount ? "pending" : "ready"}">
      <div class="delivery-work-shortcuts-head">
        <div>
          <span>배송 작업 바로가기</span>
          <strong>${urgentCount ? "지금 처리할 배송 작업 " + urgentCount + "건" : "현재 긴급 배송 작업 없음"}</strong>
        </div>
        <em>${adminName}</em>
      </div>
      <div class="delivery-work-shortcut-grid">
        ${items.map((item) => `
          <button type="button" ${item.count ? "" : "disabled"} onclick="focusDeliveryWorkShortcut('${item.key}')">
            <span>${item.label}</span>
            <strong>${item.count}건</strong>
            <em>${item.detail}</em>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}
