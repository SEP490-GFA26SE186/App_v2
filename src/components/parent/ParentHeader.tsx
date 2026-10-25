import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Check, ChevronDown, Coins, MailWarning, Smile } from "lucide-react-native";
import { AppText, Button, Logo, Sheet, Skeleton, TextField } from "@/components/ui";
import { href, ROUTES } from "@/constants/routes";
import { useSelectedChild } from "@/hooks/useChildProfile";
import { parentKeys, useParentProfile } from "@/hooks/useParent";
import { sendVerificationEmail, verifyEmail } from "@/services/authService";
import useAuthStore from "@/stores/authStore";
import { useParentStore } from "@/stores/sessionStores";
import { toast } from "@/stores/toastStore";
import { colors, fonts, ink, radius, shadows } from "@/theme";
import { ageLabel, childEmoji } from "@/utils/child";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/** Chọn bé đang xem (dashboard, tủ sách, báo cáo EQ… đều theo bé này). */
export function ChildSwitcher() {
  const { child: current, children, isEmpty } = useSelectedChild();
  const setSelectedChildId = useParentStore((s) => s.setSelectedChildId);
  const [open, setOpen] = useState(false);

  if (isEmpty) return null;
  if (!current) return <Skeleton height={40} width={150} radius={radius.full} />;

  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`Đang xem ${current.name}, đổi bé`} style={styles.switcher}>
        <View style={styles.smile}>
          <Smile size={16} color={colors.secondary} />
        </View>
        <View>
          <AppText style={styles.switchName} numberOfLines={1}>
            {current.name} ({ageLabel(current)})
          </AppText>
          <AppText style={styles.switchSub}>📚 {current.booksCount} truyện trong tủ</AppText>
        </View>
        <ChevronDown size={16} color={colors.navy} />
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title="Chọn bé" description="Tổng quan, tủ sách và báo cáo EQ sẽ theo bé này">
        <View style={styles.list}>
          {children.map((child) => (
            <Pressable
              key={child.id}
              onPress={() => {
                setSelectedChildId(child.id);
                setOpen(false);
              }}
              style={({ pressed }) => [styles.option, child.id === current.id && styles.optionActive, pressed && { opacity: 0.8 }]}
            >
              <AppText style={styles.emoji}>{childEmoji(child)}</AppText>
              <View style={styles.flex}>
                <AppText variant="label" weight="bold">
                  {child.name}
                </AppText>
                <AppText variant="caption" weight="regular">
                  {ageLabel(child)} · 📚 {child.booksCount}
                </AppText>
              </View>
              {child.id === current.id ? <Check size={18} color={colors.secondary} /> : null}
            </Pressable>
          ))}
        </View>
      </Sheet>
    </>
  );
}

/** Topbar của các tab chính: logo + chọn bé + số credit (bấm để sang Gói dịch vụ). */
export function ParentHeader() {
  const router = useRouter();
  const parent = useParentProfile();
  return (
    <View style={styles.header}>
      <Logo size={34} />
      <View style={styles.flex} />
      <ChildSwitcher />
      {parent.creditBalance != null ? (
        <Pressable onPress={() => router.push(href(ROUTES.PARENT.BILLING))} accessibilityLabel="Credit AI còn lại trong tháng" style={styles.credit}>
          <Coins size={15} color={colors.primary} />
          <AppText style={styles.creditText}>{parent.creditBalance}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Nhắc xác thực email khi user.emailVerifiedAt còn trống. */
export function EmailVerifyBanner() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  if (!user || user.emailVerifiedAt) return null;
  return (
    <View style={styles.banner}>
      <View style={styles.bannerRow}>
        <MailWarning size={18} color={colors.primaryDark} />
        <AppText variant="small" color={colors.navy} style={styles.flex}>
          Email <AppText variant="small" weight="bold" color={colors.navy}>{user.email}</AppText> chưa được xác thực. Ba mẹ nhập mã đã gửi qua email để hoàn tất nhé.
        </AppText>
      </View>
      <Button label="Nhập mã xác thực" size="sm" onPress={() => setOpen(true)} />
      <VerifyEmailSheet open={open} onClose={() => setOpen(false)} />
    </View>
  );
}

/** Xác thực email: dán mã (hạn 24 giờ) → POST /auth/verify-email. Gửi lại mã thì mã cũ hết hiệu lực. */
export function VerifyEmailSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  const verify = useMutation({
    mutationFn: verifyEmail,
    onSuccess: (data) => {
      if (user) setUser({ ...user, emailVerifiedAt: data.emailVerifiedAt });
      queryClient.invalidateQueries({ queryKey: parentKeys.me });
      toast.success("Email đã được xác thực! Cảm ơn ba mẹ ✨");
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });
  const resend = useMutation({
    mutationFn: () => sendVerificationEmail(user!.email),
    onSuccess: () => {
      setToken("");
      toast.success(`Đã gửi mã mới tới ${user?.email}`);
    },
  });

  return (
    <Sheet open={open} onClose={onClose} title="Xác thực email" description={`StoryWeaver đã gửi mã xác thực tới ${user?.email}. Mã có hiệu lực trong 24 giờ. (Bản demo: nhập mã bất kỳ từ 6 ký tự)`}>
      <TextField
        label="Mã xác thực"
        value={token}
        onChangeText={(t) => {
          setToken(t);
          setError("");
        }}
        placeholder="Dán mã trong email"
        autoCapitalize="none"
        look="filled"
        error={error}
      />
      <Button label="Xác thực" fullWidth loading={verify.isPending} onPress={() => (token.trim() ? verify.mutate(token.trim()) : setError("Ba mẹ dán mã xác thực trong email vào nhé"))} />
      <Button label="Không thấy email? Gửi lại mã" variant="link" size="sm" loading={resend.isPending} onPress={() => resend.mutate()} style={styles.center} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: "rgba(241,232,220,0.7)", backgroundColor: colors.canvas },
  switcher: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.secondaryTint, borderRadius: radius.full, paddingVertical: 5, paddingLeft: 6, paddingRight: 10, maxWidth: 210 },
  smile: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  switchName: { fontFamily: fonts.bold, fontSize: 12, color: colors.navy },
  switchSub: { fontFamily: fonts.sans, fontSize: 11, color: ink.soft },
  credit: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.white, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 8, ...shadows.low },
  creditText: { fontFamily: fonts.bold, fontSize: 12, color: colors.navy },
  list: { gap: 6 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: radius.md },
  optionActive: { backgroundColor: colors.surface },
  emoji: { fontSize: 24, lineHeight: 30 },
  banner: { gap: 10, borderWidth: 1, borderColor: "rgba(255,122,0,0.3)", backgroundColor: "rgba(255,243,230,0.6)", borderRadius: radius.md, padding: 14 },
  bannerRow: { flexDirection: "row", gap: 8 },
  center: { alignSelf: "center" },
});
