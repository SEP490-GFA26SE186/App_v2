import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { BookOpen, Bot, ChevronRight, PenLine, Plus } from "lucide-react-native";
import { ParentHeader } from "@/components/parent/ParentHeader";
import { StoryCover } from "@/components/parent/StoryCover";
import { CaselTag } from "@/components/parent/tags";
import { AppText, Badge, Button, Card, EmptyState, PageIntro, Screen, Spinner } from "@/components/ui";
import { STORY_LENGTH_LABELS } from "@/constants/casel";
import { href, ROUTES } from "@/constants/routes";
import { STORY_STATUS_LABELS } from "@/constants/story";
import { useStories } from "@/hooks/useStudio";
import { colors, ink, radius } from "@/theme";
import type { StorySummary } from "@/types/models";
import { coverOf } from "@/utils/child";

const statusOf = (story: StorySummary) => {
  if (story.status === "generating") return { label: STORY_STATUS_LABELS.generating, bg: colors.primaryTint, fg: colors.primaryDark };
  if (story.reviewedAt) return { label: "Đã hoàn tất", bg: colors.secondaryTint, fg: colors.secondaryDark };
  if (story.status === "ready") return { label: "Chờ ba mẹ xem lại", bg: colors.primaryTint, fg: colors.primaryDark };
  return { label: STORY_STATUS_LABELS.draft, bg: colors.navyTint, fg: colors.navy };
};

// Danh sách truyện riêng ba mẹ đã tạo (GET /stories)
export default function StudioScreen() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useStories();
  const stories = data?.data ?? [];
  const create = () => router.push(href(ROUTES.PARENT.STUDIO_NEW));

  return (
    <Screen header={<ParentHeader />} onRefresh={refetch}>
      <View style={styles.head}>
        <PageIntro title="Sáng tác truyện" text="Truyện ba mẹ tạo riêng cho bé — AI viết giúp hoặc tự viết." />
        <Button label="Tạo truyện mới" icon={Plus} onPress={create} />
      </View>

      {isLoading ? <Spinner /> : null}
      {error ? <EmptyState title="Không tải được danh sách truyện" text={error.message} action="Thử lại" onAction={() => refetch()} /> : null}
      {!isLoading && !error && stories.length === 0 ? (
        <EmptyState icon={BookOpen} title="Chưa có truyện nào" text="Bắt đầu bằng một bài học và chuyện thật ở nhà của bé." action="Tạo truyện đầu tiên" actionIcon={Plus} onAction={create} />
      ) : null}

      <View style={styles.list}>
        {stories.map((story) => {
          const status = statusOf(story);
          return (
            <Card key={story.id} padding={14} style={styles.row} onPress={() => router.push(href(ROUTES.PARENT.studioStory(story.id)))} accessibilityLabel={story.title}>
              <StoryCover cover={coverOf(story)} title={story.title} size="sm" style={styles.cover} />
              <View style={styles.body}>
                <View style={styles.tags}>
                  <CaselTag competency={story.topic?.competency ?? story.cover.competency} bg={colors.secondaryTint} short />
                  <Badge label={status.label} bg={status.bg} fg={status.fg} />
                </View>
                <AppText variant="h3" numberOfLines={1}>
                  {story.title}
                </AppText>
                <View style={styles.meta}>
                  {story.mode === "manual" ? <PenLine size={14} color={ink.muted} /> : <Bot size={14} color={ink.muted} />}
                  <AppText variant="small" style={styles.flex}>
                    {story.mode === "manual" ? "Tự viết" : `AI viết giúp · ${STORY_LENGTH_LABELS[story.length]}`} · {story.pageCount} trang · {story.checkpointCount} điểm dừng
                  </AppText>
                </View>
              </View>
              <ChevronRight size={22} color={ink.ghost} />
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: 14 },
  list: { gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  cover: { width: 72, height: 72, borderRadius: radius.md },
  body: { flex: 1, gap: 6 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  flex: { flex: 1 },
});
