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
