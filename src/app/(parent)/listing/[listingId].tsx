import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Bot, Check, FileText, Flag, MessageSquareReply, ShieldCheck, ShoppingCart, Star, Store, Type, Volume2 } from "lucide-react-native";
import { ShelfToggles } from "@/components/parent/ShelfToggles";
import { StoryCover } from "@/components/parent/StoryCover";
import { CaselTag } from "@/components/parent/tags";
import { AppText, Badge, Button, Card, EmptyState, Screen, ScreenHeader, SelectField, Sheet, Spinner, TagEq, TagTheme, TextField } from "@/components/ui";
import { REPORT_CATEGORIES } from "@/constants/moderation";
import { href, ROUTES } from "@/constants/routes";
import { useCheckoutListing, useListing, useReplyReview, useReportListing, useReportReview, useReviews, useSaveReview } from "@/hooks/useMarket";
import { ApiError } from "@/services/mockApi";
import { toast } from "@/stores/toastStore";
import { colors, ink, radius } from "@/theme";
import type { Listing, Review } from "@/types/models";
import { coverOf } from "@/utils/child";
import { formatDate, formatNumber } from "@/utils/format";

const REVIEW_TAG_LABELS: Record<string, string> = {
  child_liked: "Bé rất thích",
  age_appropriate: "Hợp độ tuổi",
  clear_lesson: "Bài học rõ ràng",
  good_narration: "Giọng đọc hay",
};
const CATEGORY_OPTIONS = Object.entries(REPORT_CATEGORIES).map(([value, label]) => ({ value, label }));

function Stars({ value, onChange, size = 18 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <View style={styles.stars} accessibilityLabel={`${value} sao`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const icon = <Star size={size} color={n <= value ? colors.star : "rgba(30,41,59,0.25)"} fill={n <= value ? colors.star : "transparent"} />;
        return onChange ? (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={4} accessibilityLabel={`${n} sao`}>
            {icon}
          </Pressable>
        ) : (
          <View key={n}>{icon}</View>
        );
      })}
    </View>
  );
}

function ReviewForm({ listingId, mine, tags, onDone }: { listingId: string; mine: Review | null; tags: string[]; onDone: () => void }) {
  const [rating, setRating] = useState(mine?.rating ?? 0);
  const [comment, setComment] = useState(mine?.comment ?? "");
  const [picked, setPicked] = useState<string[]>(mine?.tags ?? []);
  const save = useSaveReview(listingId);
  const submit = () => {
    if (!rating) return toast.error("Ba mẹ chọn số sao nhé");
    save.mutate(
      { rating, comment: comment.trim() || undefined, tags: picked },
      {
        onSuccess: () => {
          toast.success(mine ? "Đã cập nhật đánh giá" : "Cảm ơn ba mẹ đã đánh giá!");
          onDone();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };
  return (
    <View style={styles.reviewForm}>
      <Stars value={rating} onChange={setRating} size={28} />
      <View style={styles.wrap}>
        {tags.map((t) => {
          const on = picked.includes(t);
          return (
            <Button key={t} label={REVIEW_TAG_LABELS[t] ?? t} variant={on ? "tealTint" : "white"} size="sm" onPress={() => setPicked((p) => (on ? p.filter((x) => x !== t) : [...p, t]))} />
          );
        })}
      </View>
      <TextField value={comment} onChangeText={setComment} multiline maxLength={1000} placeholder="Bé thích đoạn nào? Truyện giúp bé điều gì? (không bắt buộc)" />
      <Button label={mine ? "Lưu đánh giá" : "Gửi đánh giá"} size="sm" loading={save.isPending} onPress={submit} />
    </View>
  );
}

function ReplyForm({ reviewId }: { reviewId: string }) {
  const [text, setText] = useState("");
  const reply = useReplyReview();
  return (
    <View style={styles.replyRow}>
      <TextField value={text} onChangeText={setText} maxLength={1000} placeholder="Trả lời ba mẹ (một lần)" containerStyle={styles.flex} />
      <Button
        label="Trả lời"
        variant="ghost"
        size="sm"
        loading={reply.isPending}
        onPress={() => text.trim().length >= 2 && reply.mutate({ id: reviewId, reply: text.trim() }, { onSuccess: () => toast.success("Đã trả lời đánh giá") })}
      />
    </View>
  );
}

function ReportReview({ reviewId }: { reviewId: string }) {
  const [category, setCategory] = useState("other");
  const [open, setOpen] = useState(false);
  const report = useReportReview();
  return (
    <>
      <Button label="Báo cáo" icon={Flag} variant="link" size="sm" onPress={() => setOpen(true)} style={styles.faint} />
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Báo cáo đánh giá"
        footer={
          <Button
            label="Gửi"
            variant="danger"
            size="sm"
            loading={report.isPending}
            onPress={() =>
              report.mutate(
                { id: reviewId, category },
                {
                  onSuccess: () => {
                    toast.success("Đã gửi báo cáo, kiểm duyệt viên sẽ xem xét");
                    setOpen(false);
                  },
                },
              )
            }
          />
        }
      >
        <SelectField label="Loại vi phạm" value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
      </Sheet>
    </>
  );
}

// Đánh giá truyện: chỉ ba mẹ đã mua và có bé đọc hết truyện mới đánh giá được.
function ListingReviews({ listing }: { listing: Listing }) {
  const [editing, setEditing] = useState(false);
  const { data, isLoading } = useReviews(listing.id);
  if (isLoading || !data) return <Spinner size="small" />;
  const total = Object.values(data.distribution).reduce((a, b) => a + b, 0);

  return (
    <Card padding={20} style={styles.gap14}>
      <View style={styles.wrap}>
        <AppText variant="h2">Đánh giá</AppText>
        {total > 0 ? (
          <View style={styles.inline}>
            <Stars value={Math.round(listing.ratingAvg)} />
            <AppText variant="label" weight="bold">
              {listing.ratingAvg.toFixed(1)}
            </AppText>
            <AppText variant="small">({total} đánh giá)</AppText>
          </View>
        ) : (
          <AppText variant="small" color={ink.faint}>
            Chưa có đánh giá
          </AppText>
        )}
      </View>
      {data.myReview?.hidden ? (
        <View style={styles.hidden}>
          <AppText variant="small" color={colors.danger}>
            Đánh giá của ba mẹ đã bị ẩn do vi phạm quy định cộng đồng.
          </AppText>
        </View>
      ) : data.canReview ? (
        data.myReview && !editing ? (
          <View style={styles.inline}>
            <AppText variant="small">Ba mẹ đã đánh giá {data.myReview.rating} sao.</AppText>
            <Button label="Sửa đánh giá" variant="link" size="sm" onPress={() => setEditing(true)} />
          </View>
        ) : (
          <ReviewForm listingId={listing.id} mine={data.myReview} tags={data.tags} onDone={() => setEditing(false)} />
        )
      ) : !data.isSeller && listing.owned ? (
        <AppText variant="small">Khi bé đọc hết truyện, ba mẹ có thể đánh giá để giúp các gia đình khác chọn truyện.</AppText>
      ) : null}

      {data.reviews.map((r, i) => (
        <View key={r.id} style={[styles.review, i > 0 && styles.divider]}>
          <View style={styles.wrap}>
            <Stars value={r.rating} size={15} />
            <AppText variant="label" weight="bold">
              {r.author}
            </AppText>
            <AppText variant="caption" weight="regular" color={ink.faint}>
              {formatDate(r.updatedAt)}
            </AppText>
            {!r.mine && !data.isSeller ? <ReportReview reviewId={r.id} /> : null}
          </View>
          {r.tags.length ? (
            <View style={styles.wrap}>
              {r.tags.map((t) => (
                <Badge key={t} label={REVIEW_TAG_LABELS[t] ?? t} size="sm" />
              ))}
            </View>
          ) : null}
          {r.comment ? (
            <AppText variant="small" color={ink.body}>
              {r.comment}
            </AppText>
          ) : null}
          {r.sellerReply ? (
            <View style={styles.reply}>
              <MessageSquareReply size={15} color={colors.primary} />
              <AppText variant="small" color={ink.body} style={styles.flex}>
                <AppText variant="small" weight="bold" color={colors.navy}>Người bán:</AppText> {r.sellerReply}
              </AppText>
            </View>
          ) : data.isSeller ? (
            <ReplyForm reviewId={r.id} />
          ) : null}
        </View>
      ))}
    </Card>
  );
}

/** Phụ huynh báo cáo truyện đang bán (mỗi người một lần / truyện). */
function ReportListingButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [sent, setSent] = useState(false);
  const report = useReportListing(listingId);
  const submit = () => {
    if (!category) return toast.error("Ba mẹ chọn loại vấn đề giúp nhé");
    report.mutate(
      { category, description: description.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Cảm ơn ba mẹ! Kiểm duyệt viên sẽ xem lại truyện này.");
          setSent(true);
          setOpen(false);
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) setSent(true);
          toast.error(err.message);
        },
      },
    );
  };
  if (sent)
    return (
      <View style={styles.inline}>
        <Flag size={14} color={ink.faint} />
        <AppText variant="small" color={ink.faint}>
          Ba mẹ đã báo cáo truyện này
        </AppText>
      </View>
    );
  return (
    <>
      <Button label="Báo cáo nội dung không phù hợp" icon={Flag} variant="link" size="sm" onPress={() => setOpen(true)} style={styles.faint} />
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Báo cáo truyện"
        description="Thông tin của ba mẹ không được gửi cho người bán."
        footer={
          <>
            <Button label="Hủy" variant="surface" size="sm" onPress={() => setOpen(false)} />
            <Button label="Gửi báo cáo" icon={Flag} variant="danger" size="sm" loading={report.isPending} onPress={submit} />
          </>
        }
      >
        <AppText variant="label">Vấn đề là gì?</AppText>
        <View style={styles.wrap}>
          {CATEGORY_OPTIONS.map(({ value, label }) => (
            <Pressable key={value} onPress={() => setCategory(value)} style={[styles.radio, category === value && styles.radioOn]} accessibilityRole="radio" accessibilityState={{ checked: category === value }}>
              <AppText variant="small" color={colors.navy}>
                {label}
              </AppText>
            </Pressable>
          ))}
        </View>
        <TextField value={description} onChangeText={setDescription} multiline maxLength={2000} placeholder="Mô tả thêm (không bắt buộc), VD: trang 3 có cảnh làm bé sợ" />
      </Sheet>
    </>
  );
}

// Chi tiết truyện đang bán: xem trước trang đầu, mua qua payOS (0đ nhận ngay), rồi đưa lên giá sách.
export default function ListingDetailScreen() {
  const router = useRouter();
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { data: l, isLoading, error } = useListing(listingId);
  const checkout = useCheckoutListing();
  const header = <ScreenHeader section="Chợ truyện" title="Chi tiết truyện" />;

  if (isLoading) return <Screen header={header}><Spinner /></Screen>;
  if (error || !l) return <Screen header={header}><EmptyState title="Không tìm thấy truyện" text={error?.message} /></Screen>;

  const free = l.priceTier.priceVnd === 0;
  const buy = () =>
    checkout.mutate(l.id, {
      onSuccess: () => {
        if (free) toast.success("Đã nhận truyện — đưa lên giá sách cho bé nhé!");
        else router.push(href(ROUTES.PARENT.paymentResult("listing", l.title, l.priceTier.priceVnd, l.id)));
      },
      onError: (e) => toast.error(e.message),
    });

  return (
    <Screen header={header}>
      <Card padding={20} style={styles.gap14}>
        <StoryCover cover={coverOf(l)} title={l.title} style={styles.cover} />
        <View style={styles.wrap}>
          <CaselTag competency={l.topic?.competency} bg={colors.secondaryTint} />
          {l.topic ? <TagEq label={`${l.topic.ageMin}–${l.topic.ageMax} tuổi`} /> : null}
          {l.hasAiContent ? <TagTheme icon={Bot} label="AI hỗ trợ" /> : null}
          {l.hasNarration ? <TagEq icon={Volume2} label="Có giọng đọc" /> : <TagTheme icon={Type} label="Chỉ có chữ — ba mẹ đọc cùng bé" />}
        </View>
        <AppText variant="h1">{l.title}</AppText>
        {l.description ? <AppText>{l.description}</AppText> : null}
        <View style={styles.facts}>
          {l.topic ? <AppText variant="small">Bài học: {l.topic.title}</AppText> : null}
          <View style={styles.inline}>
            <FileText size={14} color={ink.muted} />
            <AppText variant="small">
              {l.totalPages} trang • {l.checkpointCount} điểm dừng
            </AppText>
          </View>
          <View style={styles.inline}>
            <Store size={14} color={ink.muted} />
            <AppText variant="small">{l.seller.displayName}</AppText>
          </View>
          <View style={styles.inline}>
            <ShoppingCart size={14} color={ink.muted} />
            <AppText variant="small">{formatNumber(l.purchaseCount)} lượt mua</AppText>
          </View>
        </View>
        {l.preview ? (
          <View style={styles.preview}>
            <AppText variant="overline" color={ink.faint}>
              Trang 1
            </AppText>
            <AppText color={ink.body}>{l.preview}</AppText>
          </View>
        ) : null}
        <View style={styles.inlineTop}>
          <ShieldCheck size={18} color={colors.secondary} />
          <AppText variant="small" style={styles.flex}>
            Chuyên gia sư phạm đã duyệt từng trang theo checklist sư phạm. Truyện dùng tên nhân vật chung, có thể đọc ngay trên giá sách của bé.
          </AppText>
        </View>

        {l.isMine ? (
          <AppText variant="label" color={ink.muted}>
            Đây là truyện ba mẹ đăng bán.
          </AppText>
        ) : l.owned ? (
          <View style={styles.gap8}>
            <View style={styles.inline}>
              <Check size={18} color={colors.secondaryDark} />
              <AppText variant="label" weight="bold" color={colors.secondaryDark}>
                Ba mẹ đã có truyện này
              </AppText>
            </View>
            <ShelfToggles storyId={l.publishedStoryId} />
          </View>
        ) : (
          <Button label={free ? "Nhận miễn phí" : `Mua ${formatNumber(l.priceTier.priceVnd)}đ qua payOS`} icon={ShoppingCart} size="lg" fullWidth loading={checkout.isPending} onPress={buy} />
        )}
        {!l.isMine ? (
          <View style={styles.reportRow}>
            <ReportListingButton listingId={l.id} />
          </View>
        ) : null}
      </Card>
      <ListingReviews listing={l} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap8: { gap: 8 },
  gap14: { gap: 14 },
  wrap: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  inline: { flexDirection: "row", alignItems: "center", gap: 6 },
  inlineTop: { flexDirection: "row", gap: 8 },
  cover: { aspectRatio: 1, width: "100%", borderRadius: radius.md },
  facts: { gap: 4 },
  preview: { backgroundColor: colors.surface, borderRadius: radius.card, padding: 16, gap: 4 },
  reportRow: { borderTopWidth: 1, borderColor: colors.outline, paddingTop: 10 },
  faint: { opacity: 0.6 },
  stars: { flexDirection: "row", gap: 2 },
  reviewForm: { gap: 12, backgroundColor: colors.surface, borderRadius: radius.card, padding: 16 },
  replyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  review: { gap: 6, paddingTop: 12 },
  divider: { borderTopWidth: 1, borderColor: colors.outline },
  reply: { flexDirection: "row", gap: 6, backgroundColor: colors.surface, borderRadius: radius.md, padding: 10, marginLeft: 12 },
  hidden: { backgroundColor: colors.dangerTint, borderRadius: radius.md, padding: 12 },
  radio: { borderWidth: 1.5, borderColor: colors.outline, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8 },
  radioOn: { borderColor: colors.danger, backgroundColor: colors.dangerTint },
});
