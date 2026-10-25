import { colors } from "@/theme";
import type { EqLevel } from "@/types/models";

// Mức độ EQ theo kỹ năng con (spec sư phạm CASEL §7): không hiện điểm / % cho phụ huynh, chỉ mức.
// Thang một màu (xanh ngọc nhạt → đậm) theo thứ tự mức; luôn kèm nhãn chữ, không dùng màu đơn lẻ.
export const EQ_LEVELS = {
  emerging: { value: 1, label: "Đang làm quen", fill: "#9fdcd4", badge: { bg: colors.secondaryTint, fg: colors.secondaryDark } },
  developing: { value: 2, label: "Đang phát triển", fill: "#00a896", badge: { bg: colors.secondary, fg: colors.white } },
  secure: { value: 3, label: "Vững", fill: "#006b5f", badge: { bg: colors.secondaryDark, fg: colors.white } },
} as const;

export const EQ_LEVEL_ORDER = ["emerging", "developing", "secure"] as const;

export const NO_DATA_LABEL = "Chưa có dữ liệu";

export const levelMeta = (level: EqLevel) => (level ? EQ_LEVELS[level] : null);
export const levelLabel = (level: EqLevel) => levelMeta(level)?.label ?? NO_DATA_LABEL;

export const EQ_REPORT_NOTE =
  "Báo cáo phản ánh mức hiểu của con qua tình huống trong truyện, không phải đánh giá hành vi ngoài đời.";

export const EVIDENCE_SOURCE_LABEL: Record<string, string> = { ai_template: "AI viết theo mẫu của chuyên gia" };
