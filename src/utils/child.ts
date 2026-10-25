import type { BookshelfItem, Cover, StorySummary } from "@/types/models";
import { isoToViDate } from "./format";

// BE chưa lưu emoji đại diện cho bé → chọn emoji cố định theo id để mỗi bé luôn có cùng một hình trên mọi màn.
const EMOJIS = ["🧒", "👧", "👦", "🐻", "🐰", "🦊", "🐼", "🦁"];

export const childEmoji = (child?: { id: string } | null) => {
  if (!child?.id) return EMOJIS[0];
  const hash = [...child.id].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 0);
  return EMOJIS[hash % EMOJIS.length];
};

export const formatBirthDate = (value?: string | null) => isoToViDate(value);

/** Nhãn tuổi — BE trả age = null khi chưa nhập ngày sinh */
export const ageLabel = (child?: { age: number | null } | null) => (child?.age == null ? "Chưa có ngày sinh" : `${child.age} tuổi`);

// ---- Trạng thái đọc của truyện trong tủ sách (dùng chung dạng lưới / danh sách) ----

export const getReadingStatus = (story: Pick<BookshelfItem, "readingProgress">) =>
  !story.readingProgress ? "not_started" : story.readingProgress.isCompleted ? "completed" : "reading";

export const getProgressLabel = (story: Pick<BookshelfItem, "readingProgress">) => {
  const status = getReadingStatus(story);
  if (status === "completed") return { text: "Đã đọc xong", tone: "secondary" as const };
  if (status === "reading") return { text: `${story.readingProgress!.progressPercentage}% Đang đọc`, tone: "primary" as const };
  return { text: "Chưa đọc", tone: "muted" as const };
};

// Nút hành động chính: đọc tiếp / bắt đầu / đọc lại
export const getPrimaryAction = (story: Pick<BookshelfItem, "readingProgress">) => {
  const status = getReadingStatus(story);
  if (status === "completed") return { label: "Đọc lại", variant: "surface" as const, replay: true };
  if (status === "reading") return { label: "Đọc tiếp", variant: "primary" as const, replay: false };
  return { label: "Bắt đầu đọc", variant: "teal" as const, replay: false };
};

// Ảnh bìa: BE trả `cover: { imageUrl, competency }` (ảnh = tranh một cảnh, mặc định cảnh 1).
export const coverOf = (item?: { cover?: Cover; topic?: StorySummary["topic"] } | null): Cover =>
  item?.cover ?? { imageUrl: null, competency: item?.topic?.competency ?? null };
