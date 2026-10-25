import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { BookOpen, CheckCircle2, Sparkles } from "lucide-react-native";
import { StoryCover } from "@/components/parent/StoryCover";
import { AppText, EmptyState, ProgressBar, Spinner } from "@/components/ui";
import { href, ROUTES } from "@/constants/routes";
import { useKidShelf } from "@/hooks/useKid";
import { useKidSessionStore } from "@/stores/sessionStores";
import { colors, radius, shadows } from "@/theme";

// Tủ sách của bé: chỉ truyện ba mẹ đã hoàn tất và đủ giọng đọc
export default function KidBookshelfScreen() {
  const router = useRouter();
  const child = useKidSessionStore((s) => s.child);
  const { data: items = [], isLoading, error } = useKidShelf();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View>
        <AppText variant="h1">Tủ sách của {child?.name ?? "bé"} 📚</AppText>
        <AppText>Chọn một truyện để đọc nhé!</AppText>
      </View>
      {isLoading ? <Spinner /> : null}
      {error ? <EmptyState emoji="🦉" title="Chưa mở được tủ sách" text="Bé nhờ ba mẹ thử lại nhé." /> : null}
      {!isLoading && !error && items.length === 0 ? <EmptyState icon={BookOpen} title="Tủ sách còn trống" text="Ba mẹ đưa truyện lên tủ sách cho bé ở trang sáng tác truyện nhé." /> : null}

      {items.map((item) => {
        const progress = item.readingProgress;
        return (
          <Pressable
            key={item.storyId}
            onPress={() => router.push(href(ROUTES.KID.story(item.storyId)))}
            accessibilityLabel={item.title}
            style={({ pressed }) => [styles.card, shadows.low, pressed && styles.pressed]}
          >
            <StoryCover cover={item.cover} title={item.title} showTitle style={styles.cover} />
            <View style={styles.body}>
              {progress?.isCompleted ? (
                <View style={styles.inline}>
                  <CheckCircle2 size={16} color={colors.secondaryDark} />
                  <AppText variant="label" weight="bold" color={colors.secondaryDark}>
                    Đã đọc xong — đọc lại nhé!
                  </AppText>
                </View>
              ) : progress ? (
                <>
                  <ProgressBar percent={progress.progressPercentage} height={8} colors={[colors.primary, colors.primary]} />
                  <AppText variant="small">
                    Đang đọc trang {progress.currentPageOrder}/{item.totalPages}
                  </AppText>
                </>
              ) : (
                <AppText variant="small">{item.totalPages} trang • Truyện mới</AppText>
              )}
            </View>
          </Pressable>
        );
      })}

      <View style={styles.footer}>
        <Sparkles size={15} color={colors.primary} />
        <AppText variant="caption" weight="regular" align="center">
          Không gian đọc truyện an toàn và diệu kỳ dành cho Bé Yêu
        </AppText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 18 },
  card: { backgroundColor: colors.white, borderRadius: radius.stage, overflow: "hidden" },
  pressed: { transform: [{ scale: 0.98 }] },
  cover: { aspectRatio: 1, width: "100%" },
  body: { padding: 18, gap: 8 },
  inline: { flexDirection: "row", alignItems: "center", gap: 6 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingTop: 8 },
});
