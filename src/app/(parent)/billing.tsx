import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Check, Coins, Crown, ReceiptText, Undo2 } from "lucide-react-native";
import { AppText, Badge, Button, Card, IconCircle, Screen, ScreenHeader, Spinner, TextField } from "@/components/ui";
import { REFUND_STATUS } from "@/constants/moderation";
import { href, ROUTES } from "@/constants/routes";
import { AI_LENGTHS } from "@/constants/story";
import { useCheckoutPlan, useOrders, usePlans, useRequestRefund } from "@/hooks/useMarket";
import { useParentProfile, useSubscription } from "@/hooks/useParent";
import { useAiPricing } from "@/hooks/useStudio";
import { toast } from "@/stores/toastStore";
import { colors, ink } from "@/theme";
import type { OrderItem, Plan } from "@/types/models";
import { formatDate, formatNumber } from "@/utils/format";

function RefundForm({ item, onDone }: { item: OrderItem; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const send = useRequestRefund();
  const submit = () => {
    if (reason.trim().length < 10) return toast.error("Ba mẹ ghi lý do ít nhất 10 ký tự nhé");
    send.mutate(
      { id: item.id, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success("Đã gửi yêu cầu hoàn tiền. Quản trị viên sẽ chuyển trả vào tài khoản đã thanh toán.");
          onDone();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };
  return (
    <View style={styles.gap8}>
      <TextField value={reason} onChangeText={setReason} multiline maxLength={2000} placeholder="Lý do hoàn tiền (VD: mua nhầm gói, truyện không như mô tả...)" />
      <View style={styles.row}>
        <Button label="Gửi yêu cầu" size="sm" loading={send.isPending} onPress={submit} />
        <Button label="Hủy" variant="ghost" size="sm" onPress={onDone} />
      </View>
    </View>
  );
}

// Lịch sử thanh toán (đơn có phí) + yêu cầu hoàn tiền trong thời hạn.
function PaymentHistory() {
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading } = useOrders();
  if (isLoading) return <Spinner size="small" />;
  if (!data?.orders.length) return null;
  return (
    <Card padding={18} style={styles.gap12}>
      <View style={styles.row}>
        <ReceiptText size={20} color={colors.primary} />
        <AppText variant="h3">Lịch sử thanh toán</AppText>
      </View>
      <AppText variant="small">Ba mẹ có thể yêu cầu hoàn tiền trong {data.refundWindowDays} ngày kể từ lúc thanh toán.</AppText>
      {data.orders.flatMap((o) =>
        o.items.map((i) => {
          const st = i.refund && REFUND_STATUS[i.refund.status];
          return (
            <View key={i.id} style={styles.order}>
              <AppText variant="label" weight="bold">
                {i.itemType === "plan" ? `Gói ${i.title}` : `Truyện “${i.title}”`}
              </AppText>
              <AppText variant="caption" weight="regular">
                {formatNumber(i.unitPriceVnd)}đ • {formatDate(o.paidAt)} • mã {o.payosOrderCode}
              </AppText>
              {st ? <Badge label={st.label} bg={st.bg} fg={st.fg} size="sm" /> : null}
              {i.refund?.decisionNote ? <AppText variant="small">Quản trị viên: {i.refund.decisionNote}</AppText> : null}
              {i.refundable && open !== i.id ? <Button label={`Yêu cầu hoàn tiền (đến ${formatDate(i.deadline)})`} icon={Undo2} variant="link" size="sm" onPress={() => setOpen(i.id)} /> : null}
              {open === i.id ? <RefundForm item={i} onDone={() => setOpen(null)} /> : null}
            </View>
          );
        }),
      )}
    </Card>
  );
}

// Gói dịch vụ & credit (rev8): mỗi gói cấp credit hằng tháng; truyện AI tốn credit theo độ dài. Trả qua payOS.
export default function BillingScreen() {
  const router = useRouter();
  const { data: plans = [], isLoading } = usePlans();
  const { data: sub } = useSubscription();
  const pricing = useAiPricing();
  const { creditBalance } = useParentProfile();
  const checkout = useCheckoutPlan();
  const currentCode = sub?.plan?.code;

  const buy = (plan: Plan) =>
    checkout.mutate(plan.id, {
      onSuccess: () => {
        if (plan.priceVnd > 0) router.push(href(ROUTES.PARENT.paymentResult("plan", plan.name, plan.priceVnd)));
        else toast.success(`Đã chuyển sang ${plan.name}`);
      },
      onError: (err) => toast.error(err.message),
    });

  const priceText = pricing.data?.lengths
    .map((p) => `${AI_LENGTHS.find((l) => l.value === p.length)?.label ?? p.length} ${p.pages} trang: ${p.credits} credit`)
    .join(" · ");

  return (
    <Screen header={<ScreenHeader section="Tài khoản" title="Gói dịch vụ & Credit" />}>
      <View style={styles.gap6}>
        <AppText variant="h1">Gói dịch vụ & Credit</AppText>
        <AppText>
          Mỗi truyện AI viết giúp dùng credit theo độ dài{priceText ? ` (${priceText})` : ""}.
          {pricing.data?.images ? ` Tranh AI: ${pricing.data.images.scene} credit mỗi cảnh, chân dung nhân vật ${pricing.data.images.characterPortrait} credit (dùng lại cho mọi truyện).` : ""} Truyện tự viết không dùng credit. Credit được cấp mới mỗi tháng, phần còn dư không cộng dồn sang tháng sau.
        </AppText>
      </View>

      <Card padding={18} style={styles.gap14}>
        <View style={styles.row}>
          <IconCircle icon={Crown} size={48} iconSize={24} />
          <View>
            <AppText variant="small">Gói hiện tại</AppText>
            <AppText variant="h2">{sub?.plan?.name ?? "—"}</AppText>
            {sub?.periodEnd ? <AppText variant="small">Đến {formatDate(sub.periodEnd)}</AppText> : null}
          </View>
        </View>
        <View style={styles.row}>
          <IconCircle icon={Coins} tone="teal" size={48} iconSize={24} />
          <View>
            <AppText variant="small">Credit còn lại</AppText>
            <AppText variant="h2">{creditBalance ?? "—"}</AppText>
            {sub?.nextCreditGrantAt ? <AppText variant="small">Cấp mới ngày {formatDate(sub.nextCreditGrantAt)}</AppText> : null}
          </View>
        </View>
      </Card>

      {isLoading ? (
        <Spinner />
      ) : (
        plans.map((plan) => {
          const current = plan.code === currentCode;
          const busy = checkout.isPending && checkout.variables === plan.id;
          const features = [
            `${plan.creditsPerMonth} credit mỗi tháng (${plan.creditsPerMonth} truyện AI)`,
            `Tối đa ${plan.maxChildren} bé`,
            `Tối đa ${plan.maxCharacters} nhân vật`,
            plan.canSell ? "Được đăng bán truyện trên Chợ truyện" : "Chưa đăng bán truyện",
          ];
          return (
            <Card key={plan.id} padding={20} style={[styles.gap14, current && styles.current]}>
              <View>
                <AppText variant="h2">{plan.name}</AppText>
                <AppText style={styles.price}>
                  {plan.priceVnd === 0 ? "0đ" : `${formatNumber(plan.priceVnd)}đ`}
                  <AppText variant="label" color={ink.faint}>
                    {" "}
                    / {plan.durationMonths === 12 ? "năm" : "tháng"}
                  </AppText>
                </AppText>
              </View>
              <View style={styles.gap8}>
                {features.map((line) => (
                  <View key={line} style={styles.feature}>
                    <Check size={16} color={colors.secondary} />
                    <AppText variant="small" color={colors.navy} style={styles.flex}>
                      {line}
                    </AppText>
                  </View>
                ))}
              </View>
              <Button
                label={current ? "Đang dùng" : plan.priceVnd === 0 ? "Chuyển về gói này" : "Thanh toán qua payOS"}
                fullWidth
                disabled={current || checkout.isPending}
                loading={busy}
                onPress={() => buy(plan)}
              />
            </Card>
          );
        })
      )}
      <AppText variant="caption" weight="regular" color={ink.faint}>
        Thanh toán bằng chuyển khoản / quét mã VietQR qua payOS. Gói trả trước, gia hạn thủ công. Đổi gói giữa kỳ: kỳ mới bắt đầu ngay, credit còn lại được giữ.
      </AppText>
      <PaymentHistory />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap6: { gap: 6 },
  gap8: { gap: 8 },
  gap12: { gap: 12 },
  gap14: { gap: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  current: { borderWidth: 2, borderColor: colors.primary },
  price: { fontFamily: "Comfortaa_700Bold", fontSize: 28, lineHeight: 38, color: colors.primaryDark, marginTop: 6 },
  feature: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  order: { gap: 4, borderTopWidth: 1, borderColor: colors.outline, paddingTop: 12 },
});
