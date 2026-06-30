import { DELIVERY_PROOF_RETENTION_MS } from "./config.js";

export function hasDeliveryProof(order, type) {
  return !!(order && (type === "pickup" ? order.pickupConfirmedAt : order.arrivalConfirmedAt));
}

export function deliveryProofPhoto(order, type) {
  if (!order) return null;
  return type === "pickup" ? order.pickupProofPhoto : order.arrivalProofPhoto;
}

export function deliveryProofPhotoSrc(photo) {
  if (!photo) return "";
  return photo.publicUrl || photo.url || photo.dataUrl || "";
}

export function deliveryProofPhotoStorageLabel(photo) {
  if (!photo) return "";
  if (photo.publicUrl || photo.path) return "저장소 저장";
  if (photo.dataUrl) return "임시 저장";
  return "사진 기록";
}

export function deliveryProofPhotoSizeLabel(photo) {
  const size = Number(photo && photo.size ? photo.size : 0);
  if (!size) return "";
  if (size >= 1024 * 1024) return (size / 1024 / 1024).toFixed(1) + "MB";
  if (size >= 1024) return Math.round(size / 1024) + "KB";
  return size + "B";
}

export function deliveryProofPhotoMeta(photo) {
  if (!photo) return "";
  const parts = [deliveryProofPhotoStorageLabel(photo), deliveryProofPhotoSizeLabel(photo)].filter(Boolean);
  if (photo.capturedAt) {
    parts.push(new Date(photo.capturedAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }));
  }
  return parts.join(" · ");
}

export function safeMediaUrl(value) {
  return String(value || "").replace(/"/g, "%22");
}

export function renderDeliveryProofPhoto(photo, alt, className = "delivery-proof-preview") {
  const src = deliveryProofPhotoSrc(photo);
  if (!src) return "";
  const mediaSrc = safeMediaUrl(src);
  const meta = deliveryProofPhotoMeta(photo);
  return `
    <div class="delivery-proof-media">
      <img class="${className}" src="${mediaSrc}" alt="${alt}">
      ${meta ? '<span class="delivery-proof-meta">' + meta + '</span>' : ""}
      ${photo && photo.publicUrl ? '<a class="delivery-proof-link" href="' + mediaSrc + '" data-preview-src="' + mediaSrc + '" data-preview-alt="' + alt + '" target="_blank" rel="noopener">사진 원본 보기</a>' : ""}
    </div>
  `;
}

export function renderCustomerArrivalProof(order) {
  const photo = deliveryProofPhoto(order, "arrival");
  const src = deliveryProofPhotoSrc(photo);
  if (!src) return "";
  const mediaSrc = safeMediaUrl(src);
  const capturedAt = photo && photo.capturedAt
    ? new Date(photo.capturedAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : (order.arrivalConfirmedAt ? new Date(order.arrivalConfirmedAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
  return `
    <section class="summary-card customer-proof-card">
      <h3>도착 인증 사진</h3>
      <div class="delivery-proof-media">
        <img class="delivery-proof-preview" src="${mediaSrc}" alt="도착 인증 사진">
        <span class="delivery-proof-meta">${capturedAt ? "촬영 " + capturedAt : "도착 인증 완료"}</span>
        <a class="delivery-proof-link" href="${mediaSrc}" data-preview-src="${mediaSrc}" data-preview-alt="도착 인증 사진" target="_blank" rel="noopener">사진 크게 보기</a>
      </div>
    </section>
  `;
}

export function deliveryProofLabel(order, type) {
  const value = type === "pickup" ? order.pickupConfirmedAt : order.arrivalConfirmedAt;
  if (!value) return "미인증";
  const photo = deliveryProofPhoto(order, type);
  const photoLabel = deliveryProofPhotoSrc(photo) ? " · 사진 포함" + (deliveryProofPhotoStorageLabel(photo) ? " · " + deliveryProofPhotoStorageLabel(photo) : "") : "";
  return new Date(value).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) + photoLabel;
}

export function deliveryProofCompletedAt(order) {
  if (!order || (order.progressStep || 0) < 4) return "";
  const logs = Array.isArray(order.deliveryLogs) ? order.deliveryLogs : [];
  const doneLog = logs.find((log) => log.action === "배송 완료");
  return (doneLog && doneLog.createdAt) || order.arrivalConfirmedAt || order.updatedAt || order.createdAt || "";
}

export function isDeliveryProofRetentionExpired(order, now = Date.now()) {
  const completedAt = deliveryProofCompletedAt(order);
  if (!completedAt) return false;
  const time = new Date(completedAt).getTime();
  return Number.isFinite(time) && now - time > DELIVERY_PROOF_RETENTION_MS;
}

export function deliveryProofPhotoPaths(order) {
  const paths = [];
  const pushPhoto = (photo) => {
    if (photo && photo.path && !paths.includes(photo.path)) paths.push(photo.path);
  };
  pushPhoto(order && order.pickupProofPhoto);
  pushPhoto(order && order.arrivalProofPhoto);
  (Array.isArray(order && order.deliveryLogs) ? order.deliveryLogs : []).forEach((log) => pushPhoto(log.photo));
  return paths;
}

export function stripDeliveryProofPhotos(order) {
  if (!order) return 0;
  let removed = 0;
  if (deliveryProofPhotoSrc(order.pickupProofPhoto)) removed += 1;
  if (deliveryProofPhotoSrc(order.arrivalProofPhoto)) removed += 1;
  order.pickupProofPhoto = null;
  order.arrivalProofPhoto = null;
  if (Array.isArray(order.deliveryLogs)) {
    order.deliveryLogs = order.deliveryLogs.map((log) => {
      if (log && log.photo) removed += 1;
      return log && log.photo ? { ...log, photo: null } : log;
    });
  }
  return removed;
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("사진을 읽을 수 없습니다"));
    reader.readAsDataURL(file);
  });
}

export async function compressDeliveryProofPhoto(file, type) {
  const source = await readFileAsDataUrl(file);
  const image = new Image();
  image.src = source;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error("사진을 불러올 수 없습니다"));
  });
  const maxSize = 960;
  const scale = Math.min(1, maxSize / Math.max(image.width || maxSize, image.height || maxSize));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((image.width || maxSize) * scale));
  canvas.height = Math.max(1, Math.round((image.height || maxSize) * scale));
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
  return {
    dataUrl,
    name: file.name || (type === "pickup" ? "pickup-proof.jpg" : "arrival-proof.jpg"),
    mimeType: "image/jpeg",
    size: dataUrl.length,
    capturedAt: new Date().toISOString(),
  };
}

export function dataUrlToBlob(dataUrl) {
  const parts = String(dataUrl || "").split(",");
  const meta = parts[0] || "";
  const body = parts[1] || "";
  const mime = (meta.match(/data:(.*?);base64/) || [])[1] || "image/jpeg";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

export function deliveryProofUploadPath(orderId, type, capturedAt) {
  const safeOrderId = String(orderId || "order").replace(/[^a-z0-9_-]/gi, "-").slice(0, 80);
  const stamp = String(capturedAt || new Date().toISOString()).replace(/[^0-9]/g, "").slice(0, 14) || Date.now();
  return safeOrderId + "/" + type + "-" + stamp + ".jpg";
}

export async function uploadDeliveryProofPhoto(supabaseClient, orderId, type, photo) {
  if (!supabaseClient || !photo || !photo.dataUrl) return photo;
  const path = deliveryProofUploadPath(orderId, type, photo.capturedAt);
  const blob = dataUrlToBlob(photo.dataUrl);
  const uploadResult = await supabaseClient.storage
    .from("delivery-proof-photos")
    .upload(path, blob, { cacheControl: "3600", upsert: true, contentType: photo.mimeType || "image/jpeg" });
  if (uploadResult.error) throw uploadResult.error;
  const publicResult = supabaseClient.storage.from("delivery-proof-photos").getPublicUrl(path);
  const publicUrl = publicResult && publicResult.data ? publicResult.data.publicUrl : "";
  return {
    name: photo.name,
    mimeType: photo.mimeType || "image/jpeg",
    size: blob.size,
    capturedAt: photo.capturedAt,
    path,
    publicUrl,
  };
}
