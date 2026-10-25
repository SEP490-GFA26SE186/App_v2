import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight, ClipboardCheck, Hourglass, Library, Timer, TrendingDown, TrendingUp } from "lucide-react-native";
import { NoChildState, SectionTitle, StatCard } from "@/components/parent/cards";
import { ContinueReadingCard, DraftReviewCard, EqRadarCard } from "@/components/parent/dashboard";
import { ListingCard } from "@/components/parent/ListingCard";
import { EmailVerifyBanner, ParentHeader } from "@/components/parent/ParentHeader";
import { AppText, Button, Card, EmptyState, Screen, Skeleton } from "@/components/ui";
import { href, ROUTES } from "@/constants/routes";
import { useChildBookshelf, useChildOverview, useChildUsage, useSelectedChild } from "@/hooks/useChildProfile";
import { useListings } from "@/hooks/useMarket";
import { useParentProfile, usePendingDrafts } from "@/hooks/useParent";
import { colors, ink, radius, shadows } from "@/theme";
import { childEmoji } from "@/utils/child";
import { dateOffset } from "@/utils/format";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 11) return "Chào buổi sáng";
  if (h < 14) return "Chào buổi trưa";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
};

function DashboardSkeleton() {
  return (
    <View style={styles.gap}>
      <Skeleton height={64} width="70%" radius={radius.md} />
      <Skeleton height={300} radius={radius.stage} />
      <Skeleton height={96} />
      <Skeleton height={96} />
      <Skeleton height={420} />
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { child, isEmpty } = useSelectedChild();
  const parent = useParentProfile();
  const overview = useChildOverview(child?.id);
  const yesterday = useChildUsage(child?.id, dateOffset(-1));
  const bookshelf = useChildBookshelf(child?.id, { limit: 1 });
  const drafts = usePendingDrafts();
  const featured = useListings({ sort: "best_selling", limit: 3 });

  const refresh = () => Promise.all([overview.refetch(), bookshelf.refetch(), drafts.refetch(), featured.refetch()]);

  const body = () => {
    if (isEmpty) return <NoChildState />;
    if (overview.isLoading || !child) return <DashboardSkeleton />;
    if (overview.isError || !overview.data) return <EmptyState title="Ôi, có lỗi xảy ra rồi 😢" action="Thử lại" onAction={() => overview.refetch()} />;

    const { todayUsage, readingStats, eqReport } = overview.data;
    const usageDelta = yesterday.data ? todayUsage.usedMinutes - yesterday.data.usedMinutes : null;
    const continueReading = bookshelf.data?.continueReading[0];
    const pendingDrafts = drafts.data ?? [];

    return (
      <>
        {/* Lời chào */}
        <View style={styles.greet}>
          <AppText variant="h1">
            {getGreeting()}, {parent.name}! 👋
          </AppText>
          <AppText>
            {todayUsage.sessionsCount ? (
              <>
                Hôm nay {child.name} đã đọc <AppText weight="bold" color={colors.primary}>{todayUsage.usedMinutes} phút</AppText> ({todayUsage.sessionsCount} lượt đọc).
              </>
            ) : (
              `Hôm nay ${child.name} chưa đọc truyện nào.`
            )}
          </AppText>
          <View style={[styles.childPill, shadows.low]}>
            <View style={styles.childEmoji}>
              <AppText style={styles.emoji}>{childEmoji(child)}</AppText>
            </View>
            <View>
              <AppText variant="label" weight="bold">
                {child.name}
                {child.age != null ? ` • ${child.age} tuổi` : ""}
              </AppText>
              <AppText variant="caption" weight="regular" color={colors.secondaryDark}>
                📚 {readingStats.booksInBookshelf} truyện trên giá sách
              </AppText>
            </View>
          </View>
        </View>

        <EmailVerifyBanner />

        {continueReading ? <ContinueReadingCard story={continueReading} childId={child.id} /> : null}

        {/* Thống kê nhanh */}
        <View style={styles.stats}>
          <StatCard
            icon={Timer}
            tone="orange"
            label="Thời gian đọc hôm nay"
            value={`${todayUsage.usedMinutes} phút`}
            hint={
              usageDelta == null ? undefined : (
                <View style={styles.delta}>
                  {usageDelta >= 0 ? <TrendingUp size={12} color={colors.secondaryDark} /> : <TrendingDown size={12} color={colors.secondaryDark} />}
                  <AppText variant="caption" color={colors.secondaryDark}>
                    {usageDelta >= 0 ? "+" : ""}
                    {usageDelta}m so với hôm qua
                  </AppText>
                </View>
              )
            }
          />
          <StatCard icon={Hourglass} tone="teal" label="Lượt đọc hôm nay" value={`${todayUsage.sessionsCount} lượt`} hint={`${todayUsage.completedCount} lượt đọc hết truyện`} hintColor={ink.muted} />
          <StatCard icon={Library} tone="navy" label="Truyện đã đọc xong" value={`${readingStats.completedStories} truyện`} hint={`${readingStats.booksInBookshelf} truyện trên giá sách`} hintColor={ink.muted} />
          <StatCard
            icon={ClipboardCheck}
            tone="orange"
            label="Truyện chờ xem lại"
            value={`${pendingDrafts.length} truyện`}
            hint={pendingDrafts.length ? "Xem lại xong mới đưa lên giá sách ✨" : "Đã xem lại hết 🎉"}
            hintColor={colors.primaryDark}
          />
        </View>

        <EqRadarCard childName={child.name} report={eqReport} />
        <DraftReviewCard draft={pendingDrafts[0]} moreCount={Math.max(0, pendingDrafts.length - 1)} />

        {/* Nổi bật trên chợ truyện */}
        {featured.data?.items.length ? (
          <View style={styles.section}>
            <SectionTitle
              title="Bán chạy trên Chợ truyện"
              text="Truyện từ các gia đình khác, đã được chuyên gia duyệt từng trang"
              right={<Button label="Xem chợ" variant="link" size="sm" iconRight={ChevronRight} onPress={() => router.push(href(ROUTES.PARENT.MARKETPLACE))} />}
            />
            {featured.data.items.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </View>
        ) : (
          <Card>
            <Skeleton height={80} />
          </Card>
        )}
      </>
    );
  };

  return (
    <Screen header={<ParentHeader />} onRefresh={refresh}>
      {body()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 20 },
  greet: { gap: 8 },
  childPill: { flexDirection: "row", alignItems: "center", gap: 12, alignSelf: "flex-start", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.outline, borderRadius: radius.full, paddingVertical: 6, paddingLeft: 6, paddingRight: 18, marginTop: 4 },
  childEmoji: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondaryTint, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 20, lineHeight: 26 },
  stats: { gap: 12 },
  delta: { flexDirection: "row", alignItems: "center", gap: 4 },
  section: { gap: 16 },
});
