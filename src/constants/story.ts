import { colors } from "@/theme";
import type { CheckpointType, Emotion, OptionRole } from "@/types/models";

// Nhãn tiếng Việt cho enum của truyện (schema rev8).

export const STORY_STATUS_LABELS = {
  draft: "Bản nháp",
  generating: "AI đang viết",
  ready: "Đã viết xong",
} as const;

// Kiểu điểm dừng (checkpoint_type)
export const CHECKPOINT_TYPES: Record<CheckpointType, { label: string; short: string }> = {
  emotion_self: { label: "Nhận diện cảm xúc của nhân vật chính", short: "Cảm xúc (nhân vật chính)" },
  emotion_other: { label: "Nhận diện cảm xúc của nhân vật khác", short: "Cảm xúc (nhân vật khác)" },
  perspective: { label: "Đặt mình vào vị trí người khác", short: "Thấu hiểu" },
  problem_solving: { label: "Giải quyết tình huống", short: "Giải quyết tình huống" },
  reflection: { label: "Liên hệ bản thân (không chấm điểm)", short: "Liên hệ bản thân" },
};

export const NEEDS_TARGET: CheckpointType[] = ["emotion_other", "perspective"];

// Bộ 5 cảm xúc cố định (emotion)
export const EMOTIONS: Record<Emotion, string> = {
  happy: "Vui",
  sad: "Buồn",
  angry: "Giận",
  scared: "Sợ",
  neutral: "Bình thường",
};

export const EMOTION_EMOJI: Record<Emotion, string> = { happy: "😄", sad: "😢", angry: "😠", scared: "😨", neutral: "😐" };

// Vai của phương án giải quyết tình huống (option_role) — do khung quy định, không đổi
export const OPTION_ROLES: Record<OptionRole, { label: string; bg: string; fg: string }> = {
  constructive: { label: "Xây dựng", bg: colors.secondaryTint, fg: colors.secondaryDark },
  avoidant: { label: "Né tránh", bg: colors.navyTint, fg: colors.navy },
  impulsive: { label: "Bốc đồng", bg: colors.primaryTint, fg: colors.primaryDark },
};

// Độ dài truyện AI viết (story_layout trong platform_settings); "custom" = tự viết
export const AI_LENGTHS = [
  { value: "short", label: "Ngắn", pages: 6 },
  { value: "medium", label: "Vừa", pages: 8 },
  { value: "long", label: "Dài", pages: 10 },
] as const;

// Giọng đọc VieNeu-TTS cho truyện của bé (child_profiles.preferred_voice)
export const VOICES = [
  { value: "vi-north-female", label: "Giọng nữ miền Bắc" },
  { value: "vi-north-male", label: "Giọng nam miền Bắc" },
  { value: "vi-south-female", label: "Giọng nữ miền Nam" },
  { value: "vi-south-male", label: "Giọng nam miền Nam" },
];
