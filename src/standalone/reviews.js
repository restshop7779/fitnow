import { dataUrlToBlob, safeMediaUrl } from "./deliveryProof.js";

export function normalizeReview(review) {
  if (!review || !review.orderId || !review.productKey) return null;
  return {
    ...review,
    isHidden: !!review.isHidden,
    hiddenReason: review.hiddenReason || "",
    hiddenBy: review.hiddenBy || "",
    hiddenAt: review.hiddenAt || "",
  };
}

export function readReviewStore(storageKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(parsed) ? parsed.map(normalizeReview).filter(Boolean) : [];
  } catch (error) {
    localStorage.removeItem(storageKey);
    return [];
  }
}

export function saveReviewStore(storageKey, reviews) {
  localStorage.setItem(storageKey, JSON.stringify((reviews || []).map(normalizeReview).filter(Boolean).slice(0, 80)));
}

export function mergeReviews(primary, secondary) {
  const merged = [];
  [...primary, ...secondary].forEach((review) => {
    review = normalizeReview(review);
    if (!review) return;
    const key = [review.orderId, review.productKey, review.size || "FREE", review.customerId || ""].join("|");
    const existing = merged.find((item) => [item.orderId, item.productKey, item.size || "FREE", item.customerId || ""].join("|") === key);
    if (!existing) {
      merged.push(review);
      return;
    }
    if (new Date(review.createdAt || 0).getTime() >= new Date(existing.createdAt || 0).getTime()) {
      Object.assign(existing, review);
    }
  });
  return merged
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 80);
}

export function reviewPhotoSrc(review) {
  if (!review) return "";
  return review.photoPublicUrl || review.photoUrl || review.photoDataUrl || "";
}

export function reviewPhotoUploadPath(review) {
  const safeOrderId = String(review && review.orderId ? review.orderId : "order").replace(/[^a-z0-9_-]/gi, "-").slice(0, 80);
  const safeProduct = String(review && review.productKey ? review.productKey : "product").replace(/[^a-z0-9_-]/gi, "-").slice(0, 80);
  const stamp = String(review && review.createdAt ? review.createdAt : new Date().toISOString()).replace(/[^0-9]/g, "").slice(0, 14) || Date.now();
  return safeOrderId + "/" + safeProduct + "-" + stamp + ".jpg";
}

export async function uploadReviewPhoto(supabaseClient, review) {
  if (!supabaseClient || !review || !review.photoDataUrl) return review;
  const path = reviewPhotoUploadPath(review);
  const blob = dataUrlToBlob(review.photoDataUrl);
  const uploadResult = await supabaseClient.storage
    .from("review-photos")
    .upload(path, blob, { cacheControl: "3600", upsert: true, contentType: "image/jpeg" });
  if (uploadResult.error) throw uploadResult.error;
  const publicResult = supabaseClient.storage.from("review-photos").getPublicUrl(path);
  review.photoPath = path;
  review.photoPublicUrl = publicResult && publicResult.data ? publicResult.data.publicUrl : "";
  delete review.photoDataUrl;
  return review;
}

export async function deleteReviewPhoto(supabaseClient, path) {
  if (!supabaseClient || !path) return;
  const result = await supabaseClient.storage.from("review-photos").remove([path]);
  if (result.error) throw result.error;
}

export function renderReviewPhoto(review) {
  const src = reviewPhotoSrc(review);
  if (!src) return "";
  const mediaSrc = safeMediaUrl(src);
  return `
    <div class="review-photo-media">
      <img src="${mediaSrc}" alt="리뷰 사진">
      ${review.photoPublicUrl ? '<a class="delivery-proof-link" href="' + mediaSrc + '" target="_blank" rel="noopener">사진 원본 보기</a>' : ""}
    </div>
  `;
}

export function reviewFormMarkup({ order, target, items, existing }) {
  if (!target) {
    return `
      <section class="summary-card">
        <h3>리뷰할 상품이 없습니다</h3>
        <div class="line-item"><span>주문 상품을 확인해 주세요</span><strong>작성 대기</strong></div>
      </section>
    `;
  }

  const rating = existing ? existing.rating : 5;
  const fit = existing ? existing.fit || "정사이즈" : "정사이즈";
  const comment = existing ? existing.comment : "";
  const existingPhotoSrc = existing ? reviewPhotoSrc(existing) : "";

  return `
    <section class="review-target-card">
      <span>주문번호 ${order.id}</span>
      <strong>${target.name}</strong>
      <small>${target.showroom} · ${target.size || "FREE"} · ${order.createdLabel}</small>
    </section>
    <label>리뷰할 상품
      <select id="reviewProductKey">
        ${items.map((item) => '<option value="' + item.key + '|' + (item.size || "FREE") + '" ' + (item.key === target.key && (item.size || "FREE") === (target.size || "FREE") ? "selected" : "") + '>' + item.name + ' · ' + (item.size || "FREE") + '</option>').join("")}
      </select>
    </label>
    <label>별점
      <input id="reviewRating" type="hidden" value="${rating}" />
      <div class="review-rating-buttons">
        ${[1, 2, 3, 4, 5].map((score) => '<button class="' + (score <= rating ? "active" : "") + '" type="button" onclick="setReviewRating(' + score + ')">★</button>').join("")}
      </div>
    </label>
    <label>사이즈감
      <select id="reviewFit">
        ${["작게 느껴져요", "정사이즈", "여유 있어요"].map((label) => '<option ' + (label === fit ? "selected" : "") + '>' + label + '</option>').join("")}
      </select>
    </label>
    <label>후기
      <textarea id="reviewComment" required placeholder="착용감, 배송 속도, 상품 상태를 남겨주세요.">${comment || ""}</textarea>
    </label>
    <label>사진 첨부
      <input id="reviewPhoto" type="file" accept="image/*" onchange="previewReviewPhoto()" />
    </label>
    <div class="review-photo-preview" id="reviewPhotoPreview">${existingPhotoSrc ? '<img src="' + safeMediaUrl(existingPhotoSrc) + '" alt="리뷰 사진 미리보기" />' : '<span>사진을 추가하면 여기에 미리보기 됩니다</span>'}</div>
    <div class="review-photo-controls">
      <button class="secondary" id="reviewPhotoClearButton" type="button" ${existingPhotoSrc ? "" : "disabled"} onclick="clearReviewPhoto()">사진 삭제</button>
      <span id="reviewPhotoHelp">${existingPhotoSrc ? "기존 사진을 삭제하거나 새 사진으로 교체할 수 있습니다." : "선택한 사진은 리뷰 저장 시 함께 반영됩니다."}</span>
    </div>
  `;
}

export function applyReviewRating(score, documentRef = document) {
  const rating = Math.max(1, Math.min(5, Math.round(Number(score) || 5)));
  const input = documentRef.getElementById("reviewRating");
  if (input) input.value = String(rating);
  documentRef.querySelectorAll(".review-rating-buttons button").forEach((button, index) => {
    button.classList.toggle("active", index < rating);
  });
  return rating;
}

export function showReviewPhotoPlaceholder(message, documentRef = document) {
  const preview = documentRef.getElementById("reviewPhotoPreview");
  if (preview) preview.innerHTML = "<span>" + message + "</span>";
}

export function showReviewPhotoPreview(dataUrl, documentRef = document) {
  const preview = documentRef.getElementById("reviewPhotoPreview");
  if (preview) preview.innerHTML = '<img src="' + dataUrl + '" alt="리뷰 사진 미리보기" />';
  const clearButton = documentRef.getElementById("reviewPhotoClearButton");
  const help = documentRef.getElementById("reviewPhotoHelp");
  if (clearButton) clearButton.disabled = false;
  if (help) help.textContent = "선택한 사진을 삭제하거나 다른 사진으로 교체할 수 있습니다.";
}

export function showReviewPhotoRemoved(documentRef = document) {
  const input = documentRef.getElementById("reviewPhoto");
  const clearButton = documentRef.getElementById("reviewPhotoClearButton");
  const help = documentRef.getElementById("reviewPhotoHelp");
  if (input) input.value = "";
  showReviewPhotoPlaceholder("저장하면 리뷰 사진이 삭제됩니다", documentRef);
  if (clearButton) clearButton.disabled = true;
  if (help) help.textContent = "리뷰 저장을 누르면 사진 없이 저장됩니다.";
}
