// Hạ tầng cho services mock: độ trễ giả lập mạng + lỗi cùng dạng với lỗi của BE.
// Khi nối API thật: thay `respond(...)` trong từng service bằng `api.get/post(...)` (axios) — UI không đổi.

/** Lỗi có kèm `status` và danh sách `errors` của BE (VD hoàn tất khi còn trang trống: [{ path: "pages.<id>", message }]). */
export class ApiError extends Error {
  status: number;
  errors: { path: string; message: string }[];
  constructor(message: string, status = 400, errors: { path: string; message: string }[] = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

const LATENCY = { min: 250, max: 650 };
export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Bản sao sâu để UI không vô tình sửa thẳng vào "cơ sở dữ liệu" mock. */
const clone = <T>(value: T): T => (value === undefined ? value : JSON.parse(JSON.stringify(value)));

/** Trả dữ liệu sau một khoảng trễ ngẫu nhiên (giống gọi mạng). */
export async function respond<T>(produce: () => T, latency = LATENCY.min + Math.random() * (LATENCY.max - LATENCY.min)): Promise<T> {
  await wait(latency);
  return clone(produce());
}

export const fail = (message: string, status = 400, errors?: { path: string; message: string }[]): never => {
  throw new ApiError(message, status, errors);
};

export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
