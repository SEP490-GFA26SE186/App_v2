import { StyleSheet, View } from "react-native";
import { FileText, Headphones, ShoppingBag, Sparkles } from "lucide-react-native";
import { AppText, Badge } from "@/components/ui";
import { CASEL, STORY_LENGTH_LABELS } from "@/constants/casel";
import { levelLabel, levelMeta } from "@/constants/eqLevels";
import { colors, ink } from "@/theme";
import type { BookshelfItem, CaselCode, EqLevel } from "@/types/models";

/** Nhãn năng lực CASEL của bài học gắn với truyện. */
export function CaselTag({ competency, short, bg = "rgba(255,255,255,0.92)", prefix = "" }: { competency?: CaselCode | null; short?: boolean; bg?: string; prefix?: string }) {
  if (!competency) return null;
  const meta = CASEL[competency];
  return <Badge icon={meta.icon} label={`${prefix}${short ? meta.short : meta.label}`} bg={bg} fg={colors.secondaryDark} />;
}

/** Nhãn mức độ EQ (luôn có chữ, không chỉ màu). */
export function LevelBadge({ level }: { level: EqLevel }) {
  const meta = levelMeta(level);
  return meta ? <Badge label={meta.label} bg={meta.badge.bg} fg={meta.badge.fg} size="sm" /> : <Badge label={levelLabel(level)} dashed fg={ink.faint} size="sm" />;
}

// private: truyện ba mẹ tự tạo · published: bản đăng bán đã mua trên chợ (dùng nguyên trạng)
export function KindBadge({ story }: { story: Pick<BookshelfItem, "kind"> }) {
  return story.kind === "published" ? (
    <Badge icon={ShoppingBag} label="Mua từ chợ" bg="rgba(255,255,255,0.92)" fg={colors.primaryDark} />
  ) : (
    <Badge icon={Sparkles} label="Ba mẹ tạo" bg="rgba(255,255,255,0.92)" fg={ink.soft} />
  );
}

export function StoryFacts({ story }: { story: Pick<BookshelfItem, "totalPages" | "length" | "useTts"> }) {
  return (
    <View style={styles.facts}>
      <View style={styles.fact}>
        <FileText size={12} color={ink.muted} />
        <AppText variant="caption" weight="regular">
          {story.totalPages} trang · {STORY_LENGTH_LABELS[story.length]}
        </AppText>
      </View>
      {story.useTts ? (
        <View style={styles.fact}>
          <Headphones size={12} color={ink.muted} />
          <AppText variant="caption" weight="regular">
            Có giọng đọc
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  facts: { flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 4 },
  fact: { flexDirection: "row", alignItems: "center", gap: 4 },
});
