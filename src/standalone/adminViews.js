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

export function adminOrderAssignmentActionsMarkup(state, options = {}) {
  const {
    order,
    adminRole,
    currentPartner,
    cancelled,
    readyForDelivery,
    selectIds = {},
  } = state;
  const assignedRiderLabel = options.assignedRiderLabel || (() => "기사 미배정");
  const isDeliveryOrderClaimed = options.isDeliveryOrderClaimed || (() => false);
  const riderOptionsForPartner = options.riderOptionsForPartner || (() => "");
  if (adminRole !== "total") return "";
  return `
    <div class="order-detail-block">
      <strong>지금배송 배정 운영</strong>
      <span>현재 배정: ${order.deliveryPartnerName || "오픈콜 대기"} · ${assignedRiderLabel(order)}</span>
      <span>총관리자는 배송사 사정에 따라 회수하거나 다른 센터로 변경할 수 있습니다.</span>
    </div>
    <div class="mini-actions">
      <select id="${selectIds.dongtanDetail}">${riderOptionsForPartner("지금배송 동탄센터", order.riderName)}</select>
      <button type="button" ${!cancelled && readyForDelivery ? "" : "disabled"} onclick="adminAssignDeliveryFromDetail('${order.id}', '지금배송 동탄센터', selectedValue('${selectIds.dongtanDetail}'))">동탄센터 배정</button>
      <select id="${selectIds.osanDetail}">${riderOptionsForPartner("지금배송 오산센터", order.riderName)}</select>
      <button type="button" ${!cancelled && readyForDelivery ? "" : "disabled"} onclick="adminAssignDeliveryFromDetail('${order.id}', '지금배송 오산센터', selectedValue('${selectIds.osanDetail}'))">오산센터 배정</button>
      ${currentPartner && order.deliveryPartnerName ? `<select id="${selectIds.currentRider}">${riderOptionsForPartner(currentPartner.name, order.riderName)}</select><button type="button" ${!cancelled ? "" : "disabled"} onclick="adminChangeRiderFromDetail('${order.id}', selectedValue('${selectIds.currentRider}'))">담당 기사 변경</button>` : ""}
      <button type="button" ${!cancelled && isDeliveryOrderClaimed(order) ? "" : "disabled"} onclick="adminReleaseDeliveryFromDetail('${order.id}')">다시 오픈콜</button>
      <button class="danger" type="button" ${!cancelled && isDeliveryOrderClaimed(order) ? "" : "disabled"} onclick="adminReleaseDeliveryFromDetail('${order.id}')">배정 회수</button>
    </div>
  `;
}

export function adminOrderPrimaryActionMarkup(state, options = {}) {
  const {
    order,
    adminRole,
    adminName,
    cancelled,
    readyForDelivery,
    pickupAuthed,
    arrivalAuthed,
    proofActionReady,
    deliveryActionReady,
    deliveryCompleteReady,
    canClaimDeliveryOrder,
    step,
    selectIds = {},
  } = state;
  const isDeliveryOrderClaimed = options.isDeliveryOrderClaimed || (() => false);
  const riderOptionsForPartner = options.riderOptionsForPartner || (() => "");
  if (cancelled) return '<div class="rider-primary-actions"><button type="button" disabled>취소된 주문</button></div>';
  if (!readyForDelivery) return '<div class="rider-primary-actions"><button type="button" disabled>업체 픽업 준비 대기</button></div>';
  if (!isDeliveryOrderClaimed(order)) {
    if (adminRole === "total") {
      return `
        <div class="rider-primary-actions">
          <select id="${selectIds.topDongtan}">${riderOptionsForPartner("지금배송 동탄센터")}</select>
          <button type="button" onclick="adminAssignDeliveryFromDetail('${order.id}', '지금배송 동탄센터', selectedValue('${selectIds.topDongtan}'))">동탄센터 배정</button>
          <select id="${selectIds.topOsan}">${riderOptionsForPartner("지금배송 오산센터")}</select>
          <button type="button" onclick="adminAssignDeliveryFromDetail('${order.id}', '지금배송 오산센터', selectedValue('${selectIds.topOsan}'))">오산센터 배정</button>
        </div>
      `;
    }
    if (adminRole === "delivery" && canClaimDeliveryOrder) {
      return `
        <div class="rider-primary-actions">
          <select id="${selectIds.topClaim}">${riderOptionsForPartner(adminName)}</select>
          <button type="button" onclick="claimDeliveryOrderFromDetail('${order.id}', selectedValue('${selectIds.topClaim}'))">내가 배정받기</button>
        </div>
      `;
    }
    return '<div class="rider-primary-actions"><button type="button" disabled>배송사 배정 필요</button></div>';
  }
  if (!pickupAuthed) {
    return '<div class="rider-primary-actions"><button type="button" ' + (proofActionReady ? "" : "disabled") + ' onclick="startDeliveryProofCapture(\'' + order.id + '\', \'pickup\')">사진 찍고 픽업 인증</button></div>';
  }
  if (step < 3) {
    return '<div class="rider-primary-actions"><button type="button" ' + (deliveryActionReady ? "" : "disabled") + ' onclick="adminAdvanceOrderFromDetail(\'' + order.id + '\', 3)">배송 시작 처리</button></div>';
  }
  if (!arrivalAuthed) {
    return '<div class="rider-primary-actions"><button type="button" ' + (proofActionReady ? "" : "disabled") + ' onclick="startDeliveryProofCapture(\'' + order.id + '\', \'arrival\')">사진 찍고 도착 인증</button></div>';
  }
  if (step < 4) {
    return '<div class="rider-primary-actions"><button type="button" ' + (deliveryCompleteReady ? "" : "disabled") + ' onclick="adminAdvanceOrderFromDetail(\'' + order.id + '\', 4)">배송완료 처리</button></div>';
  }
  return '<div class="rider-primary-actions"><button type="button" disabled>배송완료됨</button></div>';
}

export function settlementDetailMarkup({ partnerName, riderName, mode, rows, totalFee, totalPayout }, options = {}) {
  const formatKRW = options.formatKRW || ((value) => String(value || 0));
  const renderSettlementAuditTrail = options.renderSettlementAuditTrail || (() => "");
  const riderSettlementRate = options.riderSettlementRate || (() => 0);
  const settlementAuditEvents = options.settlementAuditEvents || (() => []);
  const settlementPayout = options.settlementPayout || ((deliveryFee) => deliveryFee || 0);
  const settlementTimeLabel = options.settlementTimeLabel || ((value) => value || "미처리");
  const canConfirmOpenOrder = options.canConfirmOpenOrder || (() => false);
  return `
    <div class="order-detail-grid">
      <div class="order-detail-block">
        <strong>${partnerName} · ${riderName}</strong>
        <span>${mode === "paid" ? "지급 완료 내역" : mode === "held" ? "보류 내역" : "주문별 정산 예정/지급 대기 내역"} · ${rows.length}건</span>
        <span>총 배송비 ${formatKRW(totalFee)} · 지급액 ${formatKRW(totalPayout)}</span>
      </div>
      <div class="admin-store-orders">
        ${rows.length ? rows.map((order) => {
          const rate = riderSettlementRate(partnerName, riderName);
          const payout = settlementPayout(order.deliveryFee || 0, partnerName, riderName);
          const statusLabel = order.settlementStatus === "paid" ? "지급완료" : order.settlementStatus === "held" ? "보류" : order.settlementStatus === "confirmed" ? "지급대기" : "확정대기";
          const statusClass = order.settlementStatus === "paid" ? "done" : order.settlementStatus === "held" ? "waiting" : order.settlementStatus === "confirmed" ? "moving" : "ready";
          const confirmer = order.settlementConfirmedBy || (order.settlementConfirmedAt ? "총관리자" : "미확정");
          const confirmDisabled = canConfirmOpenOrder(order) ? "" : "disabled";
          const auditEvents = settlementAuditEvents(order);
          const latestAudit = auditEvents[0];
          return `
            <div class="vendor-product-row admin-order-row">
              <div>
                <strong>${order.id} <span class="admin-status-badge ${statusClass}">${statusLabel}</span></strong>
                <div class="settlement-detail-progress">
                  <div><span>현재 상태</span><strong>${statusLabel}</strong></div>
                  <div><span>최근 처리</span><strong>${latestAudit ? latestAudit.label : "처리 대기"}</strong></div>
                  <div><span>최근 시각</span><strong>${latestAudit ? settlementTimeLabel(latestAudit.at) : "미처리"}</strong></div>
                </div>
                <span>배송비 ${formatKRW(order.deliveryFee || 0)} · 정산율 ${rate}% · 지급액 ${formatKRW(payout)}</span>
                <span>정산확정 ${settlementTimeLabel(order.settlementConfirmedAt)} · 확정자 ${confirmer}</span>
                <span>지급완료 ${settlementTimeLabel(order.settlementPaidAt)}</span>
                ${order.settlementClosedAt ? `<span>정산마감 ${settlementTimeLabel(order.settlementClosedAt)} · ${order.settlementCloseLabel || "마감명 없음"}</span>` : ""}
                ${order.settlementStatus === "held" ? `<span>보류 사유: ${order.settlementHoldReason || "사유 미입력"} · 보류일 ${settlementTimeLabel(order.settlementHeldAt)}</span>` : ""}
                ${renderSettlementAuditTrail(order, { compact: true })}
              </div>
              <div class="mini-actions order-detail-action">
                ${mode === "open" ? `<button class="${order.settlementStatus ? "settlement-waiting" : "settlement-confirm"}" type="button" ${confirmDisabled} onclick="confirmSettlementOrder('${order.id}', true)">${order.settlementStatus === "confirmed" ? "확정됨" : "정산 확정"}</button>` : ""}
                <button type="button" onclick="openAdminOrderDetail('${order.id}')">주문 상세</button>
              </div>
            </div>
          `;
        }).join("") : '<div class="line-item"><span>표시할 정산 주문이 없습니다</span><strong>비어있음</strong></div>'}
      </div>
    </div>
  `;
}
