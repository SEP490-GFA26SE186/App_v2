// Định dạng hiển thị theo chuẩn Việt Nam. Tự ghép dấu chấm hàng nghìn để không phụ thuộc Intl của Hermes.

export const formatNumber = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const formatVND = (n: number) => `${formatNumber(n)} đ`;

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO → "15/06/2026" */
export const formatDate = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/** ISO → "15/06/2026 14:30" */
export const formatDateTime = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${formatDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ISO time → "hôm nay" / "hôm qua" / "3 ngày trước" / "12/09/2026"
export const formatRelativeDay = (iso: string) => {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const date = new Date(iso);
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
  if (days <= 0) return "hôm nay";
  if (days === 1) return "hôm qua";
  if (days < 7) return `${days} ngày trước`;
  return formatDate(iso);
};

/** Ngày theo giờ máy (không dùng toISOString vì lệch ngày theo UTC lúc sáng sớm ở VN) */
export const toIsoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** "2020-05-10" → "10/05/2020" */
export const isoToViDate = (iso?: string | null) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

/** Tự chèn "/" khi gõ: "10052020" → "10/05/2020" */
export const maskViDate = (text: string) => {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join("/");
};

/** "10/05/2020" → "2020-05-10"; ngày không tồn tại (VD 31/02) → null */
export const parseViDate = (text: string) => {
  const match = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [day, month, year] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return toIsoDate(date);
};

/** Ngày "YYYY-MM-DD" lệch `days` ngày so với hôm nay. VD -1 = hôm qua */
export const dateOffset = (days: number) => toIsoDate(new Date(Date.now() + days * 86400000));
