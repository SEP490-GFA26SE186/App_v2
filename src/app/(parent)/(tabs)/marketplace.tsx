import { useState } from "react";
import { ActivityIndicator, StyleSheet, TextInput, View } from "react-native";
import { ArrowDownUp, Search, SearchX, Store } from "lucide-react-native";
import { HeroBox } from "@/components/parent/dashboard";
import { Pagination } from "@/components/parent/library";
import { ListingCard } from "@/components/parent/ListingCard";
import { ParentHeader } from "@/components/parent/ParentHeader";
import { AppText, ChipRow, EmptyState, Screen, SelectField, Skeleton } from "@/components/ui";
import { CASEL, CASEL_OPTIONS } from "@/constants/casel";
import { useListings, usePriceTiers } from "@/hooks/useMarket";
import { useDebounce } from "@/hooks/useParent";
import type { ListingParams } from "@/services/marketService";
import { colors, fonts, ink, radius } from "@/theme";
import type { CaselCode } from "@/types/models";

const PAGE_SIZE = 8;
type Filters = Required<Pick<ListingParams, "competency" | "age" | "priceTierId" | "narration" | "sort">>;
const DEFAULT_FILTERS: Filters = { competency: "all", age: "all", priceTierId: "all", narration: "all", sort: "best_selling" };

const NARRATION_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "with", label: "Có giọng đọc" },
  { value: "without", label: "Chỉ có chữ" },
] as const;
// Truyện dành cho trẻ 5–8 tuổi (topics.age_min / age_max)
const AGE_OPTIONS = [{ value: "all", label: "Tất cả" }, ...[5, 6, 7, 8].map((a) => ({ value: String(a), label: `${a} tuổi` }))];
const SORT_OPTIONS = [
  { value: "best_selling", label: "Bán chạy" },
  { value: "rating", label: "Đánh giá cao" },
  { value: "newest", label: "Mới nhất" },
  { value: "price_asc", label: "Giá thấp" },
] as const;

export default function MarketplaceScreen() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search);
  const { data: priceTiers = [] } = usePriceTiers();
  const { data, isLoading, isFetching, isError, refetch } = useListings({ search: debouncedSearch, ...filters, page, limit: PAGE_SIZE });

  const setFilter =
    <K extends keyof Filters>(key: K) =>
    (value: Filters[K]) => {
      setFilters((f) => ({ ...f, [key]: value }));
      setPage(1);
    };
  const resetAll = () => {
    setSearch("");
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };
  const priceOptions = [{ value: "all", label: "Tất cả" }, ...priceTiers.map((t) => ({ value: t.id, label: t.label }))];
  const competencyChips = [{ value: "all", label: "Tất cả năng lực" }, ...CASEL_OPTIONS.map((o) => ({ ...o, icon: CASEL[o.value as CaselCode].icon }))];

  return (
    <Screen header={<ParentHeader />} onRefresh={refetch}>
      <HeroBox>
        <View style={styles.gap4}>
          <View style={styles.inline}>
            <Store size={14} color={colors.primaryDark} />
            <AppText variant="overline">Chợ truyện</AppText>
          </View>
          <AppText variant="h1">Truyện từ các gia đình khác</AppText>
          <AppText>Mọi truyện đều được chuyên gia duyệt từng trang theo checklist sư phạm trước khi đăng bán. Mua xong, truyện vào giá sách để bé đọc ngay.</AppText>
        </View>
        <View style={styles.search}>
          <Search size={18} color={ink.ghost} />
          <TextInput
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              setPage(1);
            }}
            placeholder="Tìm theo tên truyện, bài học, người bán..."
            placeholderTextColor={ink.ghost}
            style={styles.searchInput}
          />
        </View>
        <View style={styles.filters}>
          <SelectField look="pill" label="Độ tuổi" value={filters.age} options={AGE_OPTIONS} onChange={setFilter("age")} />
          <SelectField look="pill" label="Giá" value={filters.priceTierId} options={priceOptions} onChange={setFilter("priceTierId")} />
          <SelectField look="pill" label="Giọng đọc" value={filters.narration} options={[...NARRATION_OPTIONS]} onChange={setFilter("narration")} />
          <SelectField look="pill" label="Sắp xếp" value={filters.sort} options={[...SORT_OPTIONS]} onChange={setFilter("sort")} highlight icon={ArrowDownUp} />
        </View>
        {/* Lọc theo năng lực CASEL */}
        <ChipRow items={competencyChips} value={filters.competency} onChange={setFilter("competency")} />
      </HeroBox>

      <View style={styles.section}>
        <View style={styles.inline}>
          <AppText variant="h2">Truyện đang bán</AppText>
          <View style={styles.countPill}>
            <AppText variant="caption" weight="bold">
              {data?.pagination.total ?? "…"} truyện
            </AppText>
          </View>
          {isFetching && !isLoading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        </View>

        {isLoading ? (
          <>
            <Skeleton height={420} />
            <Skeleton height={420} />
          </>
        ) : isError || !data ? (
          <EmptyState title="Không tải được chợ truyện 😢" action="Thử lại" onAction={() => refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState icon={SearchX} title="Chưa có truyện phù hợp với bộ lọc" action="Xóa bộ lọc" onAction={resetAll} />
        ) : (
          <View style={[styles.list, isFetching && { opacity: 0.6 }]}>
            {data.items.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </View>
        )}
        {data && data.pagination.totalPages > 1 ? <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={setPage} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap4: { gap: 4 },
  inline: { flexDirection: "row", alignItems: "center", gap: 8 },
  search: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.outline, borderRadius: radius.full, paddingHorizontal: 16 },
  searchInput: { flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.navy, paddingVertical: 10 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  section: { gap: 16 },
  countPill: { backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 2 },
  list: { gap: 16 },
});
