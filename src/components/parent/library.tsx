import { Pressable, StyleSheet, View } from "react-native";
import { BookOpen, ChevronLeft, ChevronRight, Clock, Play, RotateCcw } from "lucide-react-native";
import { AppText, Button, Card, ProgressBar } from "@/components/ui";
import { useEnterKidMode } from "@/hooks/useKid";
import { colors, fonts, ink, radius } from "@/theme";
import type { BookshelfItem } from "@/types/models";
import { coverOf, getPrimaryAction, getProgressLabel, getReadingStatus } from "@/utils/child";
import { formatRelativeDay } from "@/utils/format";
import { StoryCover } from "./StoryCover";
import { CaselTag, KindBadge, StoryFacts } from "./tags";

const PROGRESS_COLOR = { primary: colors.primaryDark, secondary: colors.secondaryDark, muted: ink.muted };

/** Nút đọc tiếp / bắt đầu / đọc lại → mở Kid Mode cho bé thẳng vào truyện. */
export function StoryAction({ story, childId, compact }: { story: BookshelfItem; childId: string; compact?: boolean }) {
  const { enter, isPending } = useEnterKidMode();
  const action = getPrimaryAction(story);
  return (
    <Button
      label={action.label}
      icon={action.replay ? RotateCcw : BookOpen}
      variant={action.variant}
      size="sm"
      fullWidth={!compact}
      loading={isPending}
      onPress={() => enter(childId, story.storyId)}
    />
  );
}

/** Thẻ "Tiếp tục đọc dở" có vạch màu bên trái. */
export function ContinueReadingItem({ story, childId, accent = "primary" }: { story: BookshelfItem; childId: string; accent?: "primary" | "secondary" }) {
  const { enter, isPending } = useEnterKidMode();
  const { currentPageOrder, progressPercentage, lastActivityAt } = story.readingProgress!;
  const color = accent === "primary" ? colors.primary : colors.secondary;
  const dark = accent === "primary" ? colors.primaryDark : colors.secondaryDark;
  return (
    <Card padding={14} style={styles.continueCard}>
      <View style={[styles.accent, { backgroundColor: color }]} />
      <StoryCover cover={coverOf(story)} title={story.title} style={styles.continueCover} />
      <View style={styles.continueBody}>
        <View style={styles.between}>
          <CaselTag competency={story.cover.competency} bg={colors.secondaryTint} short />
          <AppText variant="caption" weight="regular">
            Trang {currentPageOrder}/{story.totalPages}
          </AppText>
        </View>
        <AppText variant="h3" numberOfLines={1}>
          {story.title}
        </AppText>
        {story.topic ? (
          <AppText variant="small" numberOfLines={1}>
            Bài học: {story.topic.title}
          </AppText>
        ) : null}
        <View style={styles.between}>
          <AppText variant="caption" weight="regular">
            Tiến độ đọc
          </AppText>
          <AppText variant="caption" weight="bold" color={dark}>
            {progressPercentage}%
          </AppText>
        </View>
        <ProgressBar percent={progressPercentage} height={8} colors={accent === "primary" ? [colors.primaryDark, colors.primary] : ["rgba(0,168,150,0.6)", colors.secondary]} />
        <View style={styles.between}>
          <View style={styles.inline}>
            <Clock size={13} color={ink.muted} />
            <AppText variant="caption" weight="regular">
              {formatRelativeDay(lastActivityAt)}
            </AppText>
          </View>
          <Button label="Đọc tiếp" size="sm" variant={accent === "primary" ? "primary" : "teal"} iconRight={Play} loading={isPending} onPress={() => enter(childId, story.storyId)} />
        </View>
      </View>
    </Card>
  );
}

/** Thẻ truyện dạng lưới. */
export function LibraryStoryCard({ story, childId }: { story: BookshelfItem; childId: string }) {
  const progress = getProgressLabel(story);
  const reading = getReadingStatus(story) === "reading";
  return (
    <Card padding={14} style={styles.gap10}>
      <StoryCover cover={coverOf(story)} title={story.title} style={styles.gridCover}>
        <View style={styles.coverTags}>
          <CaselTag competency={story.cover.competency} short />
          <KindBadge story={story} />
        </View>
        {reading ? (
          <View style={styles.coverProgress}>
            <ProgressBar percent={story.readingProgress!.progressPercentage} height={6} track="rgba(255,255,255,0.6)" colors={[colors.primary, colors.primary]} />
          </View>
        ) : null}
      </StoryCover>
      <View style={styles.between}>
        <AppText variant="caption" weight="regular" numberOfLines={1} style={styles.flex}>
          {story.topic ? `Bài học: ${story.topic.title}` : "Truyện tự viết"}
        </AppText>
        <AppText variant="caption" weight={progress.tone === "muted" ? "regular" : "bold"} color={PROGRESS_COLOR[progress.tone]}>
          {progress.text}
        </AppText>
      </View>
      <AppText variant="h3" numberOfLines={2}>
        {story.title}
      </AppText>
      <StoryFacts story={story} />
      <StoryAction story={story} childId={childId} />
    </Card>
  );
}

/** Dạng danh sách của thẻ truyện (chế độ xem "list"). */
export function LibraryStoryRow({ story, childId }: { story: BookshelfItem; childId: string }) {
  const progress = getProgressLabel(story);
  return (
    <Card padding={12} style={styles.rowCard}>
      <StoryCover cover={coverOf(story)} title={story.title} size="sm" style={styles.rowCover} />
      <View style={styles.rowBody}>
        <View style={styles.inlineWrap}>
          <KindBadge story={story} />
        </View>
        <AppText variant="title" numberOfLines={1}>
          {story.title}
        </AppText>
        <StoryFacts story={story} />
        <View style={styles.between}>
          <AppText variant="caption" weight={progress.tone === "muted" ? "regular" : "bold"} color={PROGRESS_COLOR[progress.tone]}>
            {progress.text}
          </AppText>
          <StoryAction story={story} childId={childId} compact />
        </View>
      </View>
    </Card>
  );
}

// Trả về danh sách số trang, rút gọn bằng "…" khi quá nhiều trang
const getPages = (page: number, total: number): (number | "…")[] => {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const sorted = [...new Set([1, total, page - 1, page, page + 1])].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? (["…", p] as const) : [p]));
};

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  const nav = (disabled: boolean, icon: typeof ChevronLeft, to: number, label: string) => {
    const Icon = icon;
    return (
      <Pressable disabled={disabled} onPress={() => onChange(to)} accessibilityLabel={label} style={[styles.pageBtn, styles.pageNav, disabled && { opacity: 0.4 }]}>
        <Icon size={18} color={ink.soft} />
      </Pressable>
    );
  };
  return (
    <View style={styles.pagination}>
      {nav(page <= 1, ChevronLeft, page - 1, "Trang trước")}
      {getPages(page, totalPages).map((p, i) =>
        p === "…" ? (
          <AppText key={`gap-${i}`} color={ink.ghost}>
            …
          </AppText>
        ) : (
          <Pressable key={p} onPress={() => onChange(p)} accessibilityState={{ selected: p === page }} style={[styles.pageBtn, p === page && styles.pageActive]}>
            <AppText style={{ fontFamily: p === page ? fonts.bold : fonts.semibold, color: p === page ? colors.white : colors.navy, fontSize: 14 }}>{p}</AppText>
          </Pressable>
        ),
      )}
      {nav(page >= totalPages, ChevronRight, page + 1, "Trang sau")}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap10: { gap: 10 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  inline: { flexDirection: "row", alignItems: "center", gap: 4 },
  inlineWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  continueCard: { flexDirection: "row", gap: 12, paddingLeft: 20, overflow: "hidden" },
  accent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 7 },
  continueCover: { width: 96, borderRadius: radius.md },
  continueBody: { flex: 1, gap: 6 },
  gridCover: { aspectRatio: 4 / 3, width: "100%", borderRadius: radius.md },
  coverTags: { position: "absolute", top: 8, left: 8, right: 8, flexDirection: "row", flexWrap: "wrap", gap: 4 },
  coverProgress: { position: "absolute", left: 12, right: 12, bottom: 12 },
  rowCard: { flexDirection: "row", gap: 12 },
  rowCover: { width: 92, aspectRatio: 1, borderRadius: radius.md },
  rowBody: { flex: 1, gap: 6 },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  pageBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  pageNav: { backgroundColor: colors.surface },
  pageActive: { backgroundColor: colors.primary },
});
