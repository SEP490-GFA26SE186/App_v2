import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, ArrowRight, BookOpen, CheckCircle2, Lock, Mic, Pencil, Plus, Rocket, Timer, Trash2, UserRound } from "lucide-react-native";
import { AppText, Badge, Button, SelectField, Sheet, Skeleton, TextField } from "@/components/ui";
import { href, ROUTES } from "@/constants/routes";
import { VOICES } from "@/constants/story";
import { useChildUsage, useUpdateChild } from "@/hooks/useChildProfile";
import { useEnterKidMode } from "@/hooks/useKid";
import { parentKeys } from "@/hooks/useParent";
import { changeKidPin, PIN_REGEX, setKidPin } from "@/services/authService";
import useAuthStore from "@/stores/authStore";
import { toast } from "@/stores/toastStore";
import { colors, fonts, ink, radius, shadows } from "@/theme";
import type { Child } from "@/types/models";
import { ageLabel, childEmoji, formatBirthDate } from "@/utils/child";
import { isoToViDate, maskViDate, parseViDate, toIsoDate } from "@/utils/format";
import { SectionCard } from "./cards";
import { CharacterPortrait } from "./CharacterPortrait";

function Avatar({ child, size, bg }: { child: Child; size: number; bg: string }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, backgroundColor: bg }]}>
      <View style={styles.avatarInner}>
        <AppText style={{ fontSize: size * 0.5, lineHeight: size * 0.62 }}>{childEmoji(child)}</AppText>
      </View>
    </View>
  );
}

// Thời gian đọc hôm nay (tính từ các lượt đọc) — GET /children/:id/usage
function TodayUsage({ childId }: { childId: string }) {
  const { data: usage, isLoading } = useChildUsage(childId);
  if (isLoading || !usage) return <Skeleton height={30} radius={radius.full} />;
  return (
    <View style={styles.usage}>
      <Timer size={15} color={colors.primary} />
      <AppText variant="caption" weight="bold">
        {usage.sessionsCount ? `Hôm nay đọc ${usage.usedMinutes} phút • ${usage.sessionsCount} lượt` : "Hôm nay chưa đọc truyện nào"}
      </AppText>
    </View>
  );
}

/** Mở Chế độ Trẻ Em cho bé. Thoát ra phải nhập PIN của ba mẹ. */
export function EnterKidModeButton({ child }: { child: Child }) {
  const { enter, isPending } = useEnterKidMode();
  return <Button label="Vào Kid Mode" icon={Rocket} size="sm" loading={isPending} onPress={() => enter(child.id)} />;
}

// Thẻ lớn của bé đang được chọn
export function ActiveChildCard({ child, onEdit, onDelete }: { child: Child; onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={[styles.active, shadows.mid]}>
      <View style={styles.blob} />
      <View style={styles.activeTop}>
        <View>
          <Avatar child={child} size={96} bg={colors.primaryTint} />
          <Pressable onPress={onEdit} accessibilityLabel="Sửa hồ sơ bé" style={styles.editBtn}>
            <Pencil size={15} color={colors.white} />
          </Pressable>
        </View>
        <View style={styles.doneBox}>
          <AppText style={styles.doneNum}>{child.completedSessionsCount}</AppText>
          <AppText variant="caption" weight="regular" align="center">
            Truyện đã hoàn thành
          </AppText>
        </View>
      </View>
      <View style={styles.gap6}>
        <Badge label="● Đang hoạt động" />
        <View style={styles.nameRow}>
          <AppText variant="h1">{child.name}</AppText>
          <AppText variant="label" weight="bold" color={ink.muted}>
            ({ageLabel(child)}
            {child.birthDate ? ` • ${formatBirthDate(child.birthDate)}` : ""})
          </AppText>
        </View>
        {child.character?.appearance ? (
          <AppText variant="small" numberOfLines={2}>
            {child.character.appearance}
          </AppText>
        ) : null}
        <TodayUsage childId={child.id} />
      </View>
      <View style={styles.actionsRow}>
        <EnterKidModeButton child={child} />
        <Button label="Xóa hồ sơ" icon={Trash2} variant="link" size="sm" onPress={onDelete} style={styles.mutedLink} />
      </View>
    </View>
  );
}

// Thẻ nhỏ của các bé khác — bấm để chuyển hồ sơ
export function OtherChildCard({ child, onSelect }: { child: Child; onSelect: () => void }) {
  return (
    <View style={[styles.other, shadows.low]}>
      <View style={styles.otherTop}>
        <Avatar child={child} size={72} bg={colors.secondaryTint} />
        <View style={styles.flex}>
          <View style={styles.nameRow}>
            <AppText variant="h3">{child.name}</AppText>
            <Badge label={ageLabel(child)} bg={colors.white} fg={ink.muted} size="sm" />
          </View>
          {child.birthDate ? <AppText variant="caption" weight="regular">Sinh ngày {formatBirthDate(child.birthDate)}</AppText> : null}
          <View style={styles.inline}>
            <BookOpen size={15} color={colors.secondaryDark} />
            <AppText variant="caption" weight="bold" color={colors.secondaryDark}>
              {child.booksCount} truyện trong tủ
            </AppText>
          </View>
        </View>
      </View>
      <View style={styles.between}>
        <View style={styles.inline}>
          <CheckCircle2 size={15} color={colors.secondary} />
          <AppText variant="caption" weight="regular">
            Hồ sơ đã đồng bộ
          </AppText>
        </View>
        <Button label="Chọn bé này" icon={ArrowLeftRight} variant="white" size="sm" onPress={onSelect} />
      </View>
    </View>
  );
}

export function AddChildCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.add, pressed && { borderColor: colors.primary, backgroundColor: colors.primaryTint }]} accessibilityRole="button">
      <Plus size={28} color={ink.muted} />
      <AppText variant="label" weight="bold" color={ink.muted}>
        Thêm hồ sơ bé mới
      </AppText>
      <AppText variant="caption" weight="regular">
        Mỗi bé có mục tiêu EQ và thế giới truyện riêng
      </AppText>
    </Pressable>
  );
}

const today = toIsoDate(new Date());
const minDate = `${new Date().getFullYear() - 12}-01-01`;

/** Kiểm tra ngày sinh gõ tay; trả về thông báo lỗi hoặc "" nếu hợp lệ */
const validateBirthDate = (text: string) => {
  if (!text) return "Ba mẹ nhập ngày sinh của bé nhé";
  const iso = parseViDate(text);
  if (!iso) return "Ngày sinh chưa đúng, ba mẹ nhập theo dạng dd/mm/yyyy (VD 10/05/2020)";
  if (iso > today) return "Ngày sinh không được sau hôm nay";
  if (iso < minDate) return `Ngày sinh phải từ ${isoToViDate(minDate)} trở đi (bé tối đa 12 tuổi)`;
  return "";
};

// Dùng cho cả Thêm bé mới và Sửa hồ sơ bé (khi truyền `child`). Field khớp children.validation.js của BE
export function ChildFormSheet({
  child,
  onClose,
  onSubmit,
  isPending,
  serverError,
}: {
  child: Child | null;
  onClose: () => void;
  onSubmit: (p: { name: string; birthDate: string | null; appearance?: string | null }) => void;
  isPending: boolean;
  serverError?: string;
}) {
  const [form, setForm] = useState({ name: child?.name ?? "", birthDate: isoToViDate(child?.birthDate), appearance: child?.character?.appearance ?? "" });
  const [error, setError] = useState("");
  const [dateError, setDateError] = useState("");

  const submit = () => {
    if (!form.name.trim()) return setError("Ba mẹ nhập tên gọi của bé nhé");
    const dErr = validateBirthDate(form.birthDate);
    if (dErr) return setDateError(dErr);
    const appearance = form.appearance.trim();
    // Sửa hồ sơ: gửi null để xóa mô tả; tạo mới: bỏ trống thì không gửi
    onSubmit({ name: form.name.trim(), birthDate: parseViDate(form.birthDate), appearance: appearance || (child ? null : undefined) });
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={child ? `Sửa hồ sơ ${child.name}` : "Thêm hồ sơ bé mới"}
      description="Thông tin giúp AI chọn truyện phù hợp với độ tuổi của bé"
      footer={
        <>
          <Button label="Hủy" variant="surface" size="sm" onPress={onClose} />
          <Button label={child ? "Lưu thông tin" : "Tạo hồ sơ"} size="sm" loading={isPending} onPress={submit} />
        </>
      }
    >
      <TextField label="Tên gọi ở nhà" value={form.name} onChangeText={(name) => (setForm((f) => ({ ...f, name })), setError(""))} maxLength={100} placeholder="Ví dụ: Bé Bi" />
      <TextField
        label="Ngày sinh"
        value={form.birthDate}
        onChangeText={(t) => (setForm((f) => ({ ...f, birthDate: maskViDate(t) })), setDateError(""))}
        onBlur={() => form.birthDate && setDateError(validateBirthDate(form.birthDate))}
        placeholder="dd/mm/yyyy"
        keyboardType="number-pad"
        maxLength={10}
        error={dateError}
        hint="Gõ ngày dạng dd/mm/yyyy, VD 10/05/2020"
      />
      <TextField
        label="Ngoại hình của bé (không bắt buộc)"
        value={form.appearance}
        onChangeText={(appearance) => setForm((f) => ({ ...f, appearance }))}
        maxLength={500}
        multiline
        placeholder="Ví dụ: tóc ngắn xoăn, má phúng phính, hay mặc áo khủng long xanh"
        hint="AI dùng mô tả này để vẽ bé thành nhân vật chính trong truyện"
      />
      {error || serverError ? (
        <AppText variant="small" weight="semibold" color={colors.danger}>
          {error || serverError}
        </AppText>
      ) : null}
    </Sheet>
  );
}

// characters.portrait_status
const PORTRAIT_STATUS = {
  none: { label: "Chưa có chân dung", bg: colors.surface, fg: ink.muted },
  queued: { label: "Đang chờ vẽ", bg: colors.primaryTint, fg: colors.primaryDark },
  generating: { label: "AI đang vẽ", bg: colors.primaryTint, fg: colors.primaryDark },
  ready: { label: "Đã có chân dung", bg: colors.secondaryTint, fg: colors.secondaryDark },
  failed: { label: "Vẽ thất bại", bg: colors.dangerTint, fg: colors.dangerDark },
};

/** Nhân vật đại diện của bé (mỗi bé tối đa 1 nhân vật). Chân dung AI là ảnh tham chiếu để tranh trong truyện vẽ đúng bé. */
export function CharacterCard({ child, onEdit }: { child: Child; onEdit: () => void }) {
  const router = useRouter();
  const character = child.character;
  const status = character && PORTRAIT_STATUS[character.portraitStatus];
  return (
    <SectionCard icon={UserRound} title="Nhân vật đại diện của bé" subtitle="Bé xuất hiện trong truyện với ngoại hình này" action={status ? <Badge label={status.label} bg={status.bg} fg={status.fg} size="sm" /> : null}>
      {character ? (
        <View style={styles.gap14}>
          <View style={styles.surfaceBox}>
            <AppText variant="caption">Mô tả ngoại hình</AppText>
            <AppText variant="small" color={colors.navy}>
              {character.appearance}
            </AppText>
          </View>
          <CharacterPortrait character={{ ...character, name: character.name ?? child.name }} />
          <View style={styles.actionsRow}>
            <Button label="Sửa mô tả" variant="surface" size="sm" onPress={onEdit} />
            <Button label="Nhân vật gia đình" variant="link" size="sm" iconRight={ArrowRight} onPress={() => router.push(href(ROUTES.PARENT.FAMILY_CHARACTERS))} />
          </View>
        </View>
      ) : (
        <View style={[styles.surfaceBox, styles.gap10]}>
          <AppText variant="small">Chưa có nhân vật. Thêm mô tả để AI viết {child.name} thành nhân vật chính trong truyện.</AppText>
          <Button label="Thêm mô tả ngoại hình" variant="link" size="sm" iconRight={ArrowRight} onPress={onEdit} />
        </View>
      )}
    </SectionCard>
  );
}

/** Giọng đọc mặc định của bé (child_profiles.preferred_voice). */
export function ReadingSettingsCard({ child }: { child: Child }) {
  const saved = child.preferredVoice ?? "";
  const [voice, setVoice] = useState(saved);
  const update = useUpdateChild(child.id);
  const dirty = voice !== saved;
  const save = () =>
    update.mutate({ preferredVoice: voice || null }, { onSuccess: () => toast.success(`Đã lưu cài đặt cho ${child.name} ✨`), onError: (err) => toast.error(err.message) });

  return (
    <SectionCard icon={Mic} tone="teal" title="Giọng đọc" subtitle="Áp dụng khi bé nghe truyện trong Chế độ Trẻ Em">
      <View style={[styles.surfaceBox, styles.gap10]}>
        <SelectField label="Giọng đọc truyện" value={voice} options={[{ value: "", label: "Giọng mặc định" }, ...VOICES]} onChange={setVoice} />
        <AppText variant="caption" weight="regular">
          Dùng cho truyện có bật giọng đọc (AI đọc bằng tiếng Việt)
        </AppText>
      </View>
      <View style={styles.endRow}>
        {dirty ? <Button label="Hoàn tác" variant="link" size="sm" onPress={() => setVoice(saved)} style={styles.mutedLink} /> : null}
        <Button label="Lưu cài đặt" size="sm" disabled={!dirty} loading={update.isPending} onPress={save} />
      </View>
    </SectionCard>
  );
}

// Đặt PIN lần đầu: POST /auth/kid-pin/set · Đổi PIN: PUT /auth/kid-pin/change (xác minh bằng PIN cũ hoặc mật khẩu)
function PinSheet({ hasPin, onClose, onSaved }: { hasPin: boolean; onClose: () => void; onSaved: () => void }) {
  const [verifyBy, setVerifyBy] = useState<"pin" | "password">("pin");
  const [form, setForm] = useState({ currentPin: "", password: "", pin: "", confirm: "" });
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: () =>
      hasPin ? changeKidPin({ newPin: form.pin, ...(verifyBy === "pin" ? { currentPin: form.currentPin } : { password: form.password }) }) : setKidPin(form.pin),
    onSuccess: onSaved,
    onError: (err: Error) => setError(err.message),
  });
  const setField = (key: keyof typeof form, digits?: boolean) => (v: string) => {
    setForm((f) => ({ ...f, [key]: digits ? v.replace(/\D/g, "").slice(0, 6) : v }));
    setError("");
  };
  const submit = () => {
    if (hasPin && verifyBy === "pin" && !PIN_REGEX.test(form.currentPin)) return setError("Ba mẹ nhập mã PIN hiện tại nhé");
    if (hasPin && verifyBy === "password" && !form.password) return setError("Ba mẹ nhập mật khẩu tài khoản nhé");
    if (!PIN_REGEX.test(form.pin)) return setError("Mã PIN gồm 4–6 chữ số");
    if (form.pin !== form.confirm) return setError("Hai mã PIN chưa khớp nhau");
    save.mutate();
  };
  const pinInput = (label: string, key: "currentPin" | "pin" | "confirm", extra?: ReactNode) => (
    <View style={styles.gap6}>
      <View style={styles.between}>
        <AppText variant="label">{label}</AppText>
        {extra}
      </View>
      <TextInput value={form[key]} onChangeText={setField(key, true)} keyboardType="number-pad" secureTextEntry maxLength={6} style={styles.pinInput} />
    </View>
  );

  return (
    <Sheet open onClose={onClose} title={hasPin ? "Đổi mã PIN" : "Đặt mã PIN"} description="Dùng để thoát Chế độ Trẻ Em — áp dụng cho mọi hồ sơ bé">
      {hasPin &&
        (verifyBy === "pin" ? (
          pinInput("Mã PIN hiện tại", "currentPin", <Button label="Quên PIN?" variant="link" size="sm" onPress={() => setVerifyBy("password")} />)
        ) : (
          <View style={styles.gap6}>
            <View style={styles.between}>
              <AppText variant="label">Mật khẩu tài khoản</AppText>
              <Button label="Dùng PIN cũ" variant="link" size="sm" onPress={() => setVerifyBy("pin")} />
            </View>
            <TextField value={form.password} onChangeText={setField("password")} secureTextEntry />
          </View>
        ))}
      {pinInput("Mã PIN mới (4–6 số)", "pin")}
      {pinInput("Nhập lại mã PIN mới", "confirm")}
      {error ? (
        <AppText variant="small" weight="semibold" color={colors.danger}>
          {error}
        </AppText>
      ) : null}
      <Button label="Lưu mã PIN" fullWidth loading={save.isPending} onPress={submit} />
    </Sheet>
  );
}

/** Mã PIN thoát Kid Mode là của tài khoản phụ huynh, không theo từng bé */
export function KidPinCard() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [open, setOpen] = useState(false);
  const hasPin = !!user?.hasKidPin;
  const handleSaved = () => {
    setOpen(false);
    if (user) setUser({ ...user, hasKidPin: true });
    queryClient.invalidateQueries({ queryKey: parentKeys.me });
    toast.success(hasPin ? "Đã đổi mã PIN thoát Kid Mode 🔒" : "Đã đặt mã PIN thoát Kid Mode 🔒");
  };
  return (
    <SectionCard icon={Lock} title="Mã PIN thoát Kid Mode" subtitle="Dùng chung cho mọi hồ sơ bé trong tài khoản">
      <View style={[styles.surfaceBox, styles.between]}>
        <View style={styles.flex}>
          {hasPin ? (
            <AppText style={styles.dots}>••••</AppText>
          ) : (
            <AppText variant="label" weight="bold" color={colors.danger}>
              Chưa đặt mã PIN
            </AppText>
          )}
          <AppText variant="caption" weight="regular">
            Bé cần ba mẹ nhập PIN mới thoát được Chế độ Trẻ Em
          </AppText>
        </View>
        <Button label={hasPin ? "Đổi PIN" : "Đặt PIN"} icon={Pencil} variant="white" size="sm" onPress={() => setOpen(true)} />
      </View>
      {open ? <PinSheet hasPin={hasPin} onClose={() => setOpen(false)} onSaved={handleSaved} /> : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap6: { gap: 6 },
  gap10: { gap: 10 },
  gap14: { gap: 14 },
  inline: { flexDirection: "row", alignItems: "center", gap: 4 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  endRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 8 },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 },
  nameRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", gap: 8 },
  avatar: { borderRadius: 24, padding: 4 },
  avatarInner: { flex: 1, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center" },
  active: { backgroundColor: colors.white, borderRadius: radius.card, padding: 20, gap: 16, overflow: "hidden" },
  blob: { position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,122,0,0.08)" },
  activeTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  editBtn: { position: "absolute", right: -6, bottom: -6, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", ...shadows.mid },
  doneBox: { width: 104, alignItems: "center", backgroundColor: colors.secondaryTint, borderRadius: radius.md, padding: 12 },
  doneNum: { fontFamily: fonts.display, fontSize: 22, color: colors.secondaryDark },
  usage: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6, marginTop: 4 },
  mutedLink: { opacity: 0.7 },
  other: { backgroundColor: "rgba(253,248,240,0.9)", borderRadius: radius.card, padding: 18, gap: 14 },
  otherTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  add: { minHeight: 150, alignItems: "center", justifyContent: "center", gap: 6, borderRadius: radius.card, borderWidth: 2, borderStyle: "dashed", borderColor: colors.outline, backgroundColor: "rgba(253,248,240,0.6)", padding: 20 },
  surfaceBox: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, gap: 4 },
  dots: { fontFamily: fonts.display, fontSize: 18, letterSpacing: 4, color: ink.muted },
  pinInput: { borderWidth: 1.5, borderColor: colors.outline, borderRadius: radius.md, paddingVertical: 12, textAlign: "center", fontFamily: fonts.display, fontSize: 24, letterSpacing: 12, color: colors.navy },
});
