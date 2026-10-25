import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { AlertTriangle, BadgeCheck, Ban, Banknote, Clock, Landmark, Send, Store, Wallet, X } from "lucide-react-native";
import { StoryCover } from "@/components/parent/StoryCover";
import { AppText, Badge, Button, Card, Screen, ScreenHeader, SelectField, Spinner, TextField } from "@/components/ui";
import { APPEAL_STATUS, BANKS, LISTING_STATUS, STRIKE_SOURCES, WITHDRAWAL_STATUS } from "@/constants/moderation";
import { href, ROUTES } from "@/constants/routes";
import {
  useAppealStrike,
  useApplySeller,
  useCancelWithdrawal,
  useEarnings,
  useMyListings,
  useMySeller,
  useRetryListingNarration,
  useSaveBank,
  useStrikes,
  useWithdraw,
} from "@/hooks/useMarket";
import { toast } from "@/stores/toastStore";
import { colors, ink, radius } from "@/theme";
import type { Earnings, MyListing } from "@/types/models";
import { formatDate, formatDateTime, formatNumber } from "@/utils/format";

const money = (v?: number) => `${formatNumber(v ?? 0)}đ`;

function ApplyForm() {
  const [form, setForm] = useState({ displayName: "", bio: "", expertise: "" });
  const apply = useApplySeller();
  const submit = () => {
    if (form.displayName.trim().length < 2) return toast.error("Biệt danh công khai có ít nhất 2 ký tự");
    apply.mutate(
      { displayName: form.displayName.trim(), bio: form.bio || undefined, expertise: form.expertise || undefined },
      { onSuccess: () => toast.success("Đã gửi hồ sơ, chuyên gia sẽ duyệt sớm"), onError: (err) => toast.error(err.message) },
    );
  };
  return (
    <View style={styles.gap12}>
      <TextField label="Biệt danh công khai" value={form.displayName} onChangeText={(displayName) => setForm({ ...form, displayName })} maxLength={100} placeholder="VD: Mẹ Mít kể chuyện" />
      <TextField label="Giới thiệu (không bắt buộc)" value={form.bio} onChangeText={(bio) => setForm({ ...form, bio })} multiline maxLength={2000} />
      <TextField label="Chuyên môn / kinh nghiệm (không bắt buộc)" value={form.expertise} onChangeText={(expertise) => setForm({ ...form, expertise })} maxLength={1000} placeholder="VD: giáo viên mầm non 5 năm" />
      <Button label="Gửi hồ sơ" loading={apply.isPending} onPress={submit} />
    </View>
  );
}

/** Giọng đọc của bản đăng bán (sinh lại bằng tên chung). Chuyên gia chỉ nhận duyệt khi đọc xong. */
function NarrationStatus({ listing: l }: { listing: MyListing }) {
  const retry = useRetryListingNarration();
  if (!l.hasNarration) return <AppText variant="caption" weight="regular" color={ink.faint}>Chỉ có chữ (không giọng đọc)</AppText>;
  const n = l.narration;
  if (!n || n.complete) return <AppText variant="caption" color={colors.secondaryDark}>Có giọng đọc</AppText>;
  const broken = n.failed > 0 || n.missing > 0;
  return (
    <View style={styles.wrap}>
      <AppText variant="caption" color={broken ? colors.danger : colors.primaryDark}>
        {broken ? `Giọng đọc lỗi ${n.failed + n.missing}/${n.total} đoạn — chuyên gia chưa duyệt được` : `Đang tạo giọng đọc ${n.ready}/${n.total} đoạn — xong mới vào hàng chờ duyệt`}
      </AppText>
      {broken ? <Button label="Tạo lại giọng đọc" variant="danger" size="sm" loading={retry.isPending} onPress={() => retry.mutate(l.id, { onSuccess: () => toast.success("Đang tạo lại giọng đọc") })} /> : null}
    </View>
  );
}

function AppealForm({ strikeId, onDone }: { strikeId: string; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const appeal = useAppealStrike();
  const submit = () => {
    if (reason.trim().length < 20) return toast.error("Lý do kháng nghị tối thiểu 20 ký tự");
    appeal.mutate({ id: strikeId, reason: reason.trim() }, { onSuccess: () => (toast.success("Đã gửi kháng nghị, Admin sẽ xem xét"), onDone()), onError: (e) => toast.error(e.message) });
  };
  return (
    <View style={styles.gap8}>
      <TextField value={reason} onChangeText={setReason} multiline maxLength={2000} placeholder="Vì sao ba mẹ cho rằng cảnh cáo này chưa đúng? (tối thiểu 20 ký tự)" />
      <View style={styles.wrap}>
        <Button label="Gửi kháng nghị" icon={Send} size="sm" loading={appeal.isPending} onPress={submit} />
        <Button label="Hủy" variant="ghost" size="sm" onPress={onDone} />
      </View>
    </View>
  );
}

// Cảnh cáo của người bán: lý do, hạn hiệu lực, kháng nghị (mỗi cảnh cáo một lần, Admin xét).
function StrikesPanel() {
  const [appealing, setAppealing] = useState<string | null>(null);
  const { data } = useStrikes();
  if (!data?.strikes.length) return null;
  return (
    <Card padding={18} style={styles.gap12}>
      <View style={styles.inline}>
        <AlertTriangle size={20} color={colors.danger} />
        <AppText variant="h3" style={styles.flex}>
          Cảnh cáo ({data.activeStrikes}/{data.strikeLimit} còn hiệu lực)
        </AppText>
      </View>
      <AppText variant="small">Mỗi cảnh cáo có hiệu lực 90 ngày. Đủ {data.strikeLimit} cảnh cáo còn hiệu lực thì tài khoản bán bị khoá. Ba mẹ được kháng nghị mỗi cảnh cáo một lần.</AppText>
      {data.strikes.map((s) => {
        const ap = s.appeal && APPEAL_STATUS[s.appeal.status];
        return (
          <View key={s.id} style={styles.item}>
            <View style={styles.wrap}>
              <AppText variant="label" weight="bold">
                {STRIKE_SOURCES[s.source]}
              </AppText>
              <AppText variant="caption" weight="regular" color={ink.faint}>
                {formatDate(s.issuedAt)}
              </AppText>
              <Badge size="sm" label={s.revokedAt ? "Đã gỡ" : s.active ? `Hiệu lực đến ${formatDate(s.expiresAt)}` : "Hết hạn"} bg={s.active ? colors.dangerTint : colors.navyTint} fg={s.active ? colors.danger : colors.navy} />
              {ap ? <Badge size="sm" label={`Kháng nghị: ${ap.label}`} bg={ap.bg} fg={ap.fg} /> : null}
            </View>
            <AppText variant="small" color={ink.body}>
              {s.reason}
            </AppText>
            {s.appeal?.decisionNote ? <AppText variant="small">Admin: {s.appeal.decisionNote}</AppText> : null}
            {s.active && !s.appeal ? (
              appealing === s.id ? (
                <AppealForm strikeId={s.id} onDone={() => setAppealing(null)} />
              ) : (
                <Button label="Kháng nghị cảnh cáo này" variant="link" size="sm" onPress={() => setAppealing(s.id)} />
              )
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

function BankForm({ current, onDone }: { current: Earnings["bank"]; onDone: () => void }) {
  const [form, setForm] = useState({ bankBin: current?.bankBin ?? "", accountNumber: "", accountHolder: current?.accountHolder ?? "" });
  const save = useSaveBank();
  const submit = () => {
    if (!form.bankBin || !form.accountNumber || !form.accountHolder) return toast.error("Ba mẹ điền đủ thông tin tài khoản nhé");
    const bank = BANKS.find((b) => b.bin === form.bankBin);
    save.mutate({ ...form, bankName: bank?.name ?? "" }, { onSuccess: () => (toast.success("Đã lưu tài khoản nhận tiền"), onDone()), onError: (e) => toast.error(e.message) });
  };
  return (
    <View style={styles.gap10}>
      <SelectField label="Ngân hàng" value={form.bankBin} placeholder="— Ngân hàng —" options={BANKS.map((b) => ({ value: b.bin, label: b.name }))} onChange={(bankBin) => setForm({ ...form, bankBin })} />
      <TextField label="Số tài khoản" value={form.accountNumber} onChangeText={(t) => setForm({ ...form, accountNumber: t.trim() })} keyboardType="number-pad" />
      <TextField label="Tên chủ tài khoản" value={form.accountHolder} onChangeText={(accountHolder) => setForm({ ...form, accountHolder })} autoCapitalize="characters" />
      <Button label="Lưu tài khoản" size="sm" loading={save.isPending} onPress={submit} />
    </View>
  );
}

// Doanh thu người bán: chờ (giữ vài ngày) → rút được → rút qua chi hộ payOS (Admin duyệt).
function EarningsPanel() {
  const { data, isLoading } = useEarnings();
  const [editBank, setEditBank] = useState(false);
  const [amount, setAmount] = useState("");
  const withdraw = useWithdraw();
  const cancel = useCancelWithdrawal();
  if (isLoading) return <Spinner size="small" />;
  if (!data) return null;
  const { balance, bank, withdrawals, minWithdrawalVnd, holdDays, sellerShareRate } = data;

  return (
    <Card padding={18} style={styles.gap14}>
      <View style={styles.inline}>
        <Wallet size={20} color={colors.primary} />
        <AppText variant="h3">Doanh thu</AppText>
      </View>
      <AppText variant="small">
        Ba mẹ nhận {Math.round(sellerShareRate * 100)}% giá bán mỗi lượt mua. Doanh thu được giữ {holdDays} ngày (để xử lý hoàn tiền) rồi mới rút được.
      </AppText>
      <View style={styles.balances}>
        {[
          { icon: Clock, label: "Đang giữ", value: balance.pendingVnd },
          { icon: Banknote, label: "Rút được", value: balance.availableVnd },
          { icon: Landmark, label: "Đang rút", value: balance.lockedVnd },
        ].map(({ icon: Icon, label, value }) => (
          <View key={label} style={styles.balance}>
            <View style={styles.inline}>
              <Icon size={15} color={ink.muted} />
              <AppText variant="small">{label}</AppText>
            </View>
            <AppText variant="h3">{money(value)}</AppText>
          </View>
        ))}
      </View>
      <View style={styles.gap8}>
        <AppText variant="label" weight="bold">
          Tài khoản nhận tiền
        </AppText>
        {bank && !editBank ? (
          <View style={styles.wrap}>
            <AppText variant="small" color={colors.navy}>
              {bank.bankName} • {bank.accountNumber} • {bank.accountHolder}
            </AppText>
            <Button label="Đổi" variant="link" size="sm" onPress={() => setEditBank(true)} />
          </View>
        ) : (
          <>
            {bank ? <AppText variant="small">Đổi tài khoản thì 24 giờ sau mới rút được.</AppText> : null}
            <BankForm current={bank} onDone={() => setEditBank(false)} />
          </>
        )}
      </View>
      {bank ? (
        <View style={styles.gap8}>
          <TextField label={`Số tiền rút (tối thiểu ${money(minWithdrawalVnd)})`} value={amount} onChangeText={(t) => setAmount(t.replace(/\D/g, ""))} keyboardType="number-pad" />
          <Button
            label="Rút tiền"
            disabled={balance.availableVnd < minWithdrawalVnd}
            loading={withdraw.isPending}
            onPress={() => withdraw.mutate(Number(amount), { onSuccess: () => (toast.success("Đã gửi yêu cầu rút tiền"), setAmount("")), onError: (e) => toast.error(e.message) })}
          />
        </View>
      ) : null}
      {withdrawals.map((w) => {
        const s = WITHDRAWAL_STATUS[w.status];
        return (
          <View key={w.id} style={[styles.wrap, styles.withdrawal]}>
            <AppText variant="label" weight="bold">
              {money(w.amountVnd)}
            </AppText>
            <Badge size="sm" label={s.label} bg={s.bg} fg={s.fg} />
            <AppText variant="caption" weight="regular" color={ink.faint}>
              {formatDateTime(w.createdAt)}
            </AppText>
            {w.rejectReason ? <AppText variant="caption" color={colors.danger}>— {w.rejectReason}</AppText> : null}
            {w.status === "requested" ? <Button label="Huỷ" icon={X} variant="link" size="sm" onPress={() => cancel.mutate(w.id, { onError: (e) => toast.error(e.message) })} style={styles.faint} /> : null}
          </View>
        );
      })}
    </Card>
  );
}

// Bán truyện: hồ sơ người bán (cần gói được bán) + danh sách truyện đã đăng và kết quả duyệt.
export default function SellingScreen() {
  const router = useRouter();
  const { data: me, isLoading } = useMySeller();
  const status = me?.seller?.status;
  const isSeller = status === "approved" || status === "suspended";
  const { data: listings = [] } = useMyListings(isSeller);

  return (
    <Screen header={<ScreenHeader section="Sáng tác & Chợ truyện" title="Bán truyện" />}>
      <View style={styles.gap6}>
        <AppText variant="h1">Bán truyện</AppText>
        <AppText>Đăng bán truyện ba mẹ đã viết lên Chợ truyện. Tên thật của gia đình được thay bằng tên chung trước khi đăng.</AppText>
      </View>

      {isLoading ? (
        <Spinner />
      ) : (
        <Card padding={18} style={styles.gap12}>
          {!me?.planCanSell && status !== "approved" ? (
            <>
              <AppText>Gói hiện tại chưa cho phép đăng bán. Nâng cấp gói Gia đình để mở tính năng này.</AppText>
              <Button label="Nâng cấp gói Gia đình" variant="link" onPress={() => router.push(href(ROUTES.PARENT.BILLING))} />
            </>
          ) : status === "approved" ? (
            <View style={styles.inline}>
              <BadgeCheck size={20} color={colors.secondaryDark} />
              <AppText variant="label" weight="bold" color={colors.secondaryDark} style={styles.flex}>
                Ba mẹ là người bán: {me?.seller?.displayName}
              </AppText>
            </View>
          ) : status === "suspended" ? (
            <View style={styles.gap6}>
              <View style={styles.inline}>
                <Ban size={20} color={colors.danger} />
                <AppText variant="label" weight="bold" color={colors.danger}>
                  Tài khoản bán “{me?.seller?.displayName}” đang bị khoá
                </AppText>
              </View>
              <AppText variant="small">
                Do có đủ cảnh cáo còn hiệu lực. Truyện của ba mẹ tạm ẩn khỏi Chợ truyện và chưa đăng bán mới được. Ba mẹ có thể kháng nghị từng cảnh cáo bên dưới; doanh thu đã có vẫn rút được.
              </AppText>
            </View>
          ) : status === "pending" ? (
            <View style={styles.inline}>
              <Clock size={20} color={colors.primaryDark} />
              <AppText variant="label" color={colors.primaryDark} style={styles.flex}>
                Hồ sơ “{me?.seller?.displayName}” đang chờ chuyên gia duyệt.
              </AppText>
            </View>
          ) : (
            <>
              <View style={styles.inline}>
                <Store size={20} color={colors.primary} />
                <AppText variant="h3">{status === "rejected" ? "Hồ sơ chưa được duyệt — nộp lại" : "Đăng ký làm người bán"}</AppText>
              </View>
              <ApplyForm />
            </>
          )}
        </Card>
      )}

      {isSeller ? <StrikesPanel /> : null}
      {isSeller ? <EarningsPanel /> : null}
      {isSeller ? (
        <Card padding={18} style={styles.gap12}>
          <AppText variant="h3">Truyện đã đăng bán</AppText>
          <AppText variant="small">Mở một truyện đã hoàn tất trong “Sáng tác truyện” rồi bấm “Đăng bán”.</AppText>
          {listings.length === 0 ? <AppText variant="small">Chưa có truyện nào.</AppText> : null}
          {listings.map((l) => {
            const s = LISTING_STATUS[l.status];
            return (
              <View key={l.id} style={styles.listing}>
                <StoryCover cover={l.cover} title={l.title} size="sm" style={styles.listingCover} />
                <View style={[styles.flex, styles.gap4]}>
                  <AppText variant="label" weight="bold">
                    {l.title}
                  </AppText>
                  <View style={styles.wrap}>
                    <Badge size="sm" label={s.label} bg={s.bg} fg={s.fg} />
                    <AppText variant="caption" weight="regular">
                      {l.priceVnd ? money(l.priceVnd) : "Miễn phí"}
                    </AppText>
                  </View>
                  <NarrationStatus listing={l} />
                  {l.lastDecision?.comment ? <AppText variant="small">Chuyên gia: {l.lastDecision.comment}</AppText> : null}
                </View>
              </View>
            );
          })}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap4: { gap: 4 },
  gap6: { gap: 6 },
  gap8: { gap: 8 },
  gap10: { gap: 10 },
  gap12: { gap: 12 },
  gap14: { gap: 14 },
  inline: { flexDirection: "row", alignItems: "center", gap: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  item: { gap: 6, borderTopWidth: 1, borderColor: colors.outline, paddingTop: 12 },
  balances: { gap: 8 },
  balance: { backgroundColor: colors.surface, borderRadius: radius.card, padding: 14, gap: 2 },
  withdrawal: { borderTopWidth: 1, borderColor: colors.outline, paddingTop: 10 },
  faint: { opacity: 0.7 },
  listing: { flexDirection: "row", gap: 12, borderTopWidth: 1, borderColor: colors.outline, paddingTop: 12 },
  listingCover: { width: 64, height: 64, borderRadius: radius.sm },
});
