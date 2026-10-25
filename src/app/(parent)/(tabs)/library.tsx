import { useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { BookOpen, ChevronRight, LayoutGrid, List, PlusCircle, Search, SearchX, Sparkles } from "lucide-react-native";
import { NoChildState } from "@/components/parent/cards";
import { HeroBox } from "@/components/parent/dashboard";
import { ContinueReadingItem, LibraryStoryCard, LibraryStoryRow, Pagination } from "@/components/parent/library";
import { ParentHeader } from "@/components/parent/ParentHeader";
import { AppText, Button, ChipRow, EmptyState, SelectField, Skeleton } from "@/components/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { CASEL_OPTIONS } from "@/constants/casel";
import { href, ROUTES } from "@/constants/routes";
import { useChildBookshelf, useSelectedChild } from "@/hooks/useChildProfile";
import { useDebounce } from "@/hooks/useParent";
import { colors, fonts, ink, radius, shadows } from "@/theme";
import type { ShelfStatus } from "@/types/models";

const PAGE_SIZE = 6;
const COMPETENCY_OPTIONS = [{ value: "all", label: "Tất cả" }, ...CASEL_OPTIONS];
const TABS: { value: ShelfStatus; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "reading", label: "Đang đọc" },
  { value: "completed", label: "Đã đọc xong" },
  { value: "not_started", label: "Chưa đọc" },
];

function LibraryContent({ childId, childName }: { childId: string; childName: string }) {
  const router = useRouter();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const collectionY = useRef(0);
  const [search, setSearch] = useState("");
  const [competency, setCompetency] = useState("all");
  const [tab, setTab] = useState<ShelfStatus>("all");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"grid" | "list">("grid");
  const debouncedSearch = useDebounce(search);

  const { data, isLoading, isFetching, isError, refetch } = useChildBookshelf(childId, { search: debouncedSearch, competency, status: tab, page, limit: PAGE_SIZE });

  // Mọi thay đổi bộ lọc đều quay về trang 1
  const withReset =
    <T,>(setter: (v: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };
  const resetAll = () => {
    setSearch("");
    setCompetency("all");
    setTab("all");
    setPage(1);
  };
  const handlePage = (p: number) => {
    setPage(p);
    scrollRef.current?.scrollTo({ y: collectionY.current, animated: true });
  };
  const continueReading = data?.continueReading ?? [];

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <HeroBox>
        <View style={styles.gap4}>
          <View style={styles.inline}>
            <BookOpen size={14} color={colors.primaryDark} />
            <AppText variant="overline">Giá sách của bé</AppText>
          </View>
          <AppText variant="h1">Tủ sách của {childName}</AppText>
          <AppText>Truyện ba mẹ đã tạo và xem lại, cùng truyện mua từ chợ — bé mở đọc trong Chế độ Trẻ Em</AppText>
        </View>
        <View style={styles.wrapRow}>
          <View style={[styles.donePill, shadows.low]}>
            <Sparkles size={16} color={colors.primary} />
            <AppText variant="label" weight="bold">
              {data ? `${data.counts.completed}/${data.counts.all}` : "…"} Đã đọc xong
            </AppText>
          </View>
          <Button label="Tạo truyện mới" icon={PlusCircle} size="sm" onPress={() => router.push(href(ROUTES.PARENT.STUDIO))} />
        </View>
        <View style={styles.search}>
          <Search size={18} color={ink.ghost} />
          <TextInput
            value={search}
            onChangeText={withReset(setSearch)}
            placeholder="Tìm theo tên truyện hoặc bài học..."
            placeholderTextColor={ink.ghost}
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>
        <SelectField look="pill" label="Năng lực" value={competency} options={COMPETENCY_OPTIONS} onChange={withReset(setCompetency)} />
        <ChipRow items={TABS.map((t) => ({ value: t.value, label: `${t.label} (${data?.counts[t.value] ?? 0})` }))} value={tab} onChange={withReset(setTab)} />
      </HeroBox>

      {continueReading.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.between}>
            <AppText variant="h2">Tiếp tục đọc dở 📖</AppText>
            <Button label="Xem tất cả" variant="link" size="sm" iconRight={ChevronRight} onPress={() => withReset(setTab)("reading")} />
          </View>
          {continueReading.slice(0, 2).map((story, i) => (
            <ContinueReadingItem key={story.storyId} story={story} childId={childId} accent={i % 2 ? "secondary" : "primary"} />
          ))}
        </View>
      ) : null}

      <View style={styles.section} onLayout={(e) => (collectionY.current = e.nativeEvent.layout.y)}>
        <View style={styles.between}>
          <View style={styles.inline}>
            <AppText variant="h2">Truyện trên giá</AppText>
            <View style={styles.countPill}>
              <AppText variant="caption" weight="bold">
                {data?.pagination.total ?? "…"} Truyện
              </AppText>
            </View>
            {isFetching && !isLoading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          </View>
          <View style={styles.inline}>
            {(
              [
                { value: "grid", icon: LayoutGrid, label: "Dạng lưới" },
                { value: "list", icon: List, label: "Dạng danh sách" },
              ] as const
            ).map(({ value, icon: Icon, label }) => (
              <Pressable key={value} onPress={() => setView(value)} accessibilityLabel={label} accessibilityState={{ selected: view === value }} style={[styles.viewBtn, view === value && styles.viewActive]}>
                <Icon size={18} color={view === value ? colors.primary : ink.muted} />
              </Pressable>
            ))}
          </View>
        </View>

        {isLoading ? (
          <>
            <Skeleton height={340} />
            <Skeleton height={340} />
          </>
        ) : isError || !data ? (
          <EmptyState title="Không tải được tủ sách 😢" action="Thử lại" onAction={() => refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState icon={SearchX} title="Chưa có truyện phù hợp" text="Thử đổi từ khóa hoặc bỏ bớt bộ lọc ba mẹ nhé." action="Xóa bộ lọc" onAction={resetAll} />
        ) : (
          <View style={[styles.list, isFetching && { opacity: 0.6 }]}>
            {data.items.map((story) =>
              view === "grid" ? <LibraryStoryCard key={story.storyId} story={story} childId={childId} /> : <LibraryStoryRow key={story.storyId} story={story} childId={childId} />,
            )}
          </View>
        )}

        {data && data.pagination.total > 0 ? (
          <View style={styles.pager}>
            <AppText variant="small" align="center">
              Hiển thị <AppText variant="small" weight="bold" color={colors.navy}>{data.items.length}</AppText> trên tổng số{" "}
              <AppText variant="small" weight="bold" color={colors.navy}>{data.pagination.total}</AppText> truyện
            </AppText>
            {data.pagination.totalPages > 1 ? <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={handlePage} /> : null}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

export default function LibraryScreen() {
  const { child, isEmpty } = useSelectedChild();
  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ParentHeader />
      {isEmpty ? (
        <View style={styles.content}>
          <NoChildState />
        </View>
      ) : !child ? (
        <View style={styles.content}>
          <Skeleton height={260} radius={radius.stage} />
        </View>
      ) : (
        // key theo bé để reset bộ lọc/trang khi đổi hồ sơ
        <LibraryContent key={child.id} childId={child.id} childName={child.name} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 16, paddingBottom: 40, gap: 28 },
  gap4: { gap: 4 },
  inline: { flexDirection: "row", alignItems: "center", gap: 6 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  donePill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.white, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 8 },
  search: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.outline, borderRadius: radius.full, paddingHorizontal: 16 },
  searchInput: { flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.navy, paddingVertical: 10 },
  section: { gap: 14 },
  countPill: { backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 2 },
  viewBtn: { padding: 6, borderRadius: radius.full },
  viewActive: { backgroundColor: colors.primaryTint },
  list: { gap: 14 },
  pager: { gap: 14, borderTopWidth: 1, borderColor: colors.outline, paddingTop: 16, marginTop: 6 },
});
