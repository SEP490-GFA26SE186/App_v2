import { BookOpen, Brain, HeartHandshake, Scale, Users, Wind, type LucideIcon } from "lucide-react-native";
import { colors } from "@/theme";
import type { CaselCode, StoryLength } from "@/types/models";

// 5 năng lực CASEL (enum casel_competency). Mỗi bài học (topic) gắn đúng 1 năng lực.
export const CASEL: Record<CaselCode, { label: string; short: string; icon: LucideIcon }> = {
  self_awareness: { label: "Tự nhận thức", short: "Tự nhận thức", icon: Brain },
  self_management: { label: "Tự quản lý", short: "Tự quản lý", icon: Wind },
  social_awareness: { label: "Nhận thức xã hội", short: "Nhận thức XH", icon: Users },
  relationship_skills: { label: "Kỹ năng quan hệ", short: "Kỹ năng QH", icon: HeartHandshake },
  responsible_decision_making: { label: "Ra quyết định có trách nhiệm", short: "Ra quyết định", icon: Scale },
};

export const CASEL_CODES = Object.keys(CASEL) as CaselCode[];

export interface CoverPalette {
  gradient: [string, string, string];
  tone: string;
  icon: LucideIcon;
}

// Bìa dự phòng khi truyện chưa có tranh: nền + biểu tượng theo năng lực CASEL (cùng màu Tailwind của web).
export const CASEL_COVER: Record<CaselCode, CoverPalette> = {
  self_awareness: { gradient: ["#fde68a", "#ffedd5", "#ffe4e6"], tone: "#b45309", icon: Brain },
  self_management: { gradient: ["#bae6fd", "#cffafe", "#ccfbf1"], tone: "#0369a1", icon: Wind },
  social_awareness: { gradient: ["#ddd6fe", "#f3e8ff", "#e0e7ff"], tone: "#6d28d9", icon: Users },
  relationship_skills: { gradient: ["#fecdd3", "#fce7f3", "#ffedd5"], tone: "#be123c", icon: HeartHandshake },
  responsible_decision_making: { gradient: ["#a7f3d0", "#ccfbf1", "#ecfccb"], tone: "#047857", icon: Scale },
};

// Truyện không gắn năng lực (truyện tự viết không chọn bài học)
export const NEUTRAL_COVER: CoverPalette = {
  gradient: [colors.primaryTint, colors.surface, colors.secondaryTint],
  tone: colors.primaryDark,
  icon: BookOpen,
};

export const CASEL_OPTIONS = CASEL_CODES.map((value) => ({ value, label: CASEL[value].label }));

// story_length: Ngắn / Vừa / Dài = 6 / 8 / 10 trang; custom = truyện tự viết (4–20 trang)
export const STORY_LENGTH_LABELS: Record<StoryLength, string> = { short: "Ngắn", medium: "Vừa", long: "Dài", custom: "Tự viết" };
