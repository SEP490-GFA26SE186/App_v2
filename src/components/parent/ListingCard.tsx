import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Bot, CheckCircle2, FileText, ShoppingCart, Star, Store, Type, Volume2 } from "lucide-react-native";
import { AppText, Badge, Button, Card, TagEq } from "@/components/ui";
import { href, ROUTES } from "@/constants/routes";
import { colors, ink } from "@/theme";
import type { Listing } from "@/types/models";
import { coverOf } from "@/utils/child";
import { formatNumber, formatVND } from "@/utils/format";
import { StoryCover } from "./StoryCover";
import { CaselTag } from "./tags";

const Fact = ({ icon: Icon, text, color = ink.muted }: { icon: typeof FileText; text: string; color?: string }) => (
  <View style={styles.fact}>
    <Icon size={12} color={color} />
    <AppText variant="caption" weight={color === ink.muted ? "regular" : "semibold"} color={color}>
      {text}
    </AppText>
  </View>
);

/** Thẻ truyện đang bán trên chợ (listing đã được chuyên gia duyệt). */
export function ListingCard({ listing }: { listing: Listing }) {
  const router = useRouter();
  const { topic, priceTier, seller } = listing;
  const free = priceTier.priceVnd === 0;
  const open = () => router.push(href(ROUTES.PARENT.marketplaceListing(listing.id)));

  return (
    <Card padding={0} style={styles.card}>
      <StoryCover cover={coverOf(listing)} title={listing.title} style={styles.cover}>
        <View style={styles.tl}>
          <CaselTag competency={topic?.competency} short />
        </View>
        <View style={styles.tr}>{free ? <Badge label="Miễn phí" bg={colors.secondary} fg={colors.white} /> : <Badge label={formatVND(priceTier.priceVnd)} bg="rgba(255,255,255,0.92)" fg={colors.navy} />}</View>
      </StoryCover>
      <View style={styles.body}>
        <View style={styles.between}>
          {topic ? <TagEq label={`${topic.ageMin}–${topic.ageMax} tuổi`} size="sm" /> : <View />}
          <View style={styles.fact}>
            <Star size={13} color={colors.primary} fill={colors.primary} />
            <AppText variant="caption" weight="bold" color={colors.navy}>
              {listing.ratingAvg.toFixed(1)}
            </AppText>
            <AppText variant="caption" weight="regular">
              ({formatNumber(listing.ratingCount)})
            </AppText>
          </View>
        </View>
        <AppText variant="h3" numberOfLines={2}>
          {listing.title}
        </AppText>
        <AppText variant="small" numberOfLines={2}>
          {listing.description}
        </AppText>
        {topic ? (
          <AppText variant="caption" color={colors.secondaryDark} numberOfLines={1}>
            Bài học: {topic.title}
          </AppText>
        ) : null}
        <View style={styles.facts}>
          <Fact icon={FileText} text={`${listing.totalPages} trang`} />
          <Fact icon={ShoppingCart} text={`${formatNumber(listing.purchaseCount)} lượt mua`} />
          {listing.hasAiContent ? <Fact icon={Bot} text="AI hỗ trợ" /> : null}
          {listing.hasNarration ? <Fact icon={Volume2} text="Có giọng đọc" color={colors.secondaryDark} /> : <Fact icon={Type} text="Chỉ có chữ" />}
        </View>
        <Fact icon={Store} text={seller.displayName} />
        <Button
          label={listing.owned ? "Đã có — xem truyện" : free ? "Nhận miễn phí" : "Xem & mua"}
          icon={listing.owned ? CheckCircle2 : ShoppingCart}
          variant="surface"
          size="sm"
          fullWidth
          onPress={open}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden" },
  cover: { height: 176, width: "100%" },
  tl: { position: "absolute", top: 12, left: 12 },
  tr: { position: "absolute", top: 12, right: 12 },
  body: { padding: 16, gap: 8 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  facts: { flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 4 },
  fact: { flexDirection: "row", alignItems: "center", gap: 4 },
});
