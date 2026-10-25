import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight, BookOpen, Bot, CheckCircle2, ClipboardCheck, Clock, FilePenLine, FileText, Info, PenLine, ShieldCheck } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { AppText, Button, Card, ProgressBar } from "@/components/ui";
import { STORY_LENGTH_LABELS } from "@/constants/casel";
import { EQ_REPORT_NOTE } from "@/constants/eqLevels";
import { href, ROUTES } from "@/constants/routes";
import { useEnterKidMode } from "@/hooks/useKid";
import { colors, ink, radius, shadows } from "@/theme";
import type { BookshelfItem, EqReport, StorySummary } from "@/types/models";
import { coverOf } from "@/utils/child";
import { formatRelativeDay } from "@/utils/format";
import { RadarChart } from "./RadarChart";
import { StoryCover } from "./StoryCover";
import { CaselTag, LevelBadge } from "./tags";

/** Truyện bé đang đọc dở gần nhất — bấm để mở Kid Mode đọc tiếp. */
export function ContinueReadingCard({ story, childId }: { story: BookshelfItem; childId: string }) {
  const { enter, isPending } = useEnterKidMode();
  const { currentPageOrder, progressPercentage, lastActivityAt } = story.readingProgress!;
  return (
    <View style={[styles.continue, shadows.mid]}>
      <View style={[styles.blob, { right: -60, bottom: -60, backgroundColor: "rgba(255,122,0,0.12)" }]} />
      <View style={[styles.blob, { left: -50, top: -50, backgroundColor: "rgba(0,168,150,0.12)" }]} />
      <StoryCover cover={coverOf(story)} title={story.title} size="lg" style={styles.continueCover}>
        <View style={styles.pageBadge}>
          <FileText size={12} color={colors.primary} />
          <AppText variant="caption" weight="bold" color={colors.navy}>
            Trang {currentPageOrder}/{story.totalPages}
          </AppText>
        </View>
      </StoryCover>
      <View style={styles.row}>
        <CaselTag competency={story.topic?.competency ?? story.cover.competency} bg={colors.secondaryTint} />
        <View style={styles.inline}>
          <Clock size={13} color={ink.muted} />
          <AppText variant="caption" weight="regular">
            Đọc lần cuối {formatRelativeDay(lastActivityAt)}
          </AppText>
        </View>
      </View>
      <View style={styles.gap4}>
        <AppText variant="overline">Đang đọc dở dang</AppText>
        <AppText variant="h2">{story.title}</AppText>
        {story.topic ? (
          <AppText>
            Bài học: <AppText weight="semibold" color={colors.navy}>{story.topic.title}</AppText>
          </AppText>
        ) : null}
      </View>
      <View style={styles.gap6}>
        <View style={styles.between}>
          <AppText variant="caption" weight="regular">
            Tiến độ câu chuyện
          </AppText>
          <AppText variant="caption" weight="bold" color={colors.primaryDark}>
            {progressPercentage}% hoàn thành
          </AppText>
        </View>
        <ProgressBar percent={progressPercentage} />
      </View>
      <Button label="Mở Kid Mode đọc tiếp" icon={BookOpen} size="lg" fullWidth loading={isPending} onPress={() => enter(childId, story.storyId)} />
    </View>
  );
}

/** Truyện riêng đã tạo xong, ba mẹ phải xem lại hết từng trang trước khi đưa lên giá sách của bé. */
export function DraftReviewCard({ draft, moreCount = 0 }: { draft?: StorySummary; moreCount?: number }) {
  const router = useRouter();
  return (
    <Card padding={20} style={styles.gap16}>
      <View style={styles.between}>
        <View style={styles.inline}>
          <ClipboardCheck size={22} color={colors.primary} />
          <AppText variant="h3">Truyện chờ ba mẹ xem lại</AppText>
        </View>
        {draft ? <View style={styles.dot} /> : null}
      </View>

      {!draft ? (
        <View style={styles.allDone}>
          <CheckCircle2 size={36} color={colors.secondary} />
          <AppText variant="title">Không có truyện nào đang chờ</AppText>
          <AppText variant="small" align="center">
            Mọi truyện ba mẹ tạo đều đã được xem lại ✨
          </AppText>
        </View>
      ) : (
        <>
          <View style={styles.draft}>
            <View style={styles.between}>
              <CaselTag competency={draft.topic?.competency ?? draft.cover.competency} bg={colors.white} />
              <View style={styles.inline}>
                {draft.mode === "ai" ? <Bot size={14} color={ink.muted} /> : <PenLine size={14} color={ink.muted} />}
                <AppText variant="caption" weight="bold">
                  {draft.mode === "ai" ? "AI viết giúp" : "Tự viết"}
                </AppText>
              </View>
            </View>
            <AppText variant="h3">{draft.title}</AppText>
            <AppText variant="small">
              {draft.topic ? `Bài học: ${draft.topic.title} · ` : ""}
              {draft.pageCount} trang ({STORY_LENGTH_LABELS[draft.length]}) · {draft.checkpointCount} điểm dừng
            </AppText>
          </View>
          <Button label="Xem lại & hoàn tất" icon={FilePenLine} fullWidth onPress={() => router.push(href(ROUTES.PARENT.studioStory(draft.id)))} />
          {moreCount > 0 ? <Button label={`Còn ${moreCount} truyện khác đang chờ`} variant="surface" size="sm" fullWidth onPress={() => router.push(href(ROUTES.PARENT.STUDIO))} /> : null}
        </>
      )}
      <View style={styles.footNote}>
        <ShieldCheck size={15} color={colors.secondary} />
        <AppText variant="caption" weight="regular" align="center" style={styles.flex}>
          Tên thật của bé được che trước khi gửi AI • Ba mẹ xem lại mọi trang trước khi bé đọc
        </AppText>
      </View>
    </Card>
  );
}

/** Thẻ báo cáo EQ ở dashboard: radar mức độ + mức từng năng lực. */
export function EqRadarCard({ childName, report }: { childName: string; report?: EqReport }) {
  const router = useRouter();
  const competencies = report?.competencies ?? [];
  const hasAnyLevel = competencies.some((c) => c.level);
  return (
    <Card padding={20} style={styles.gap16}>
      <View>
        <AppText variant="h2">Báo cáo EQ của {childName}</AppText>
        <AppText variant="small">Mức hiểu ở 5 năng lực CASEL, từ câu trả lời lần đọc đầu của các truyện AI</AppText>
      </View>
      {hasAnyLevel ? (
        <View style={styles.center}>
          <RadarChart competencies={competencies} />
        </View>
      ) : (
        <View style={styles.noData}>
          <AppText style={styles.bigEmoji}>🌱</AppText>
          <AppText variant="title">Chưa có dữ liệu để vẽ biểu đồ</AppText>
          <AppText variant="small" align="center">
            Mỗi kỹ năng cần ít nhất {report?.settings?.minItems ?? 3} câu trả lời. Biểu đồ sẽ hiện khi bé đọc thêm truyện có câu hỏi.
          </AppText>
        </View>
      )}
      <View style={styles.gap6}>
        {competencies.map((c) => (
          <View key={c.caselCode} style={styles.levelRow}>
            <AppText variant="label" style={styles.flex}>
              {c.nameVi}
            </AppText>
            <LevelBadge level={c.level} />
          </View>
        ))}
      </View>
      <View style={styles.inlineTop}>
        <Info size={14} color={ink.muted} style={styles.mt2} />
        <AppText variant="caption" weight="regular" style={styles.flex}>
          {EQ_REPORT_NOTE}
        </AppText>
      </View>
      <Button label="Xem báo cáo chi tiết" variant="link" iconRight={ArrowRight} onPress={() => router.push(href(ROUTES.PARENT.EQ_JOURNEY))} />
    </Card>
  );
}

/** Khối "hero" nền gradient nhẹ (đầu tủ sách, chợ truyện). */
export function HeroBox({ children }: { children: ReactNode }) {
  return (
    <LinearGradient colors={[colors.surface, colors.white, colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.hero, shadows.low]}>
      <View style={[styles.blob, { right: -60, top: -60, backgroundColor: "rgba(255,122,0,0.08)" }]} />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  inline: { flexDirection: "row", alignItems: "center", gap: 6 },
  inlineTop: { flexDirection: "row", gap: 8 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  center: { alignItems: "center" },
  gap4: { gap: 4 },
  gap6: { gap: 6 },
  gap16: { gap: 16 },
  mt2: { marginTop: 2 },
  continue: { backgroundColor: colors.white, borderRadius: radius.stage, padding: 20, gap: 16, overflow: "hidden" },
  blob: { position: "absolute", width: 220, height: 220, borderRadius: 110 },
  continueCover: { aspectRatio: 4 / 3, width: "100%", borderRadius: radius.card, ...shadows.mid },
  pageBadge: { position: "absolute", top: 12, left: 12, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.9)", borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  allDone: { alignItems: "center", gap: 6, backgroundColor: colors.secondaryTint, borderRadius: radius.md, padding: 20 },
  draft: { gap: 8, backgroundColor: colors.surface, borderRadius: radius.md, padding: 16 },
  footNote: { flexDirection: "row", alignItems: "center", gap: 6, borderTopWidth: 1, borderColor: colors.outline, paddingTop: 12 },
  noData: { alignItems: "center", gap: 6, backgroundColor: colors.surface, borderRadius: radius.md, padding: 20 },
  bigEmoji: { fontSize: 36, lineHeight: 44 },
  levelRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surface, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 9 },
  hero: { borderRadius: radius.stage, borderWidth: 1, borderColor: colors.outline, padding: 20, gap: 16, overflow: "hidden" },
});
