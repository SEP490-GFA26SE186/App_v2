import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, KeyRound, MailWarning, Settings, UserRound } from "lucide-react-native";
import { SectionCard } from "@/components/parent/cards";
import { VerifyEmailSheet } from "@/components/parent/ParentHeader";
import { AppText, Badge, Button, PageIntro, Screen, ScreenHeader, TextField } from "@/components/ui";
import { changePassword, MIN_REGISTER_PASSWORD } from "@/services/authService";
import useAuthStore from "@/stores/authStore";
import { toast } from "@/stores/toastStore";
import { colors, radius } from "@/theme";

function AccountCard() {
  const user = useAuthStore((s) => s.user);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const rows = [
    ["Họ và tên", user?.fullName || "—"],
    ["Tên đăng nhập", user?.username ?? "—"],
    ["Số điện thoại", user?.phone || "—"],
  ];
  return (
    <SectionCard icon={UserRound} tone="teal" title="Thông tin tài khoản">
      <View style={styles.rows}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <AppText variant="small">{label}</AppText>
            <AppText variant="label" weight="semibold">
              {value}
            </AppText>
          </View>
        ))}
        <View style={[styles.row, styles.emailRow]}>
          <AppText variant="small">Email</AppText>
          <View style={styles.emailValue}>
            <AppText variant="label" weight="semibold">
              {user?.email}
            </AppText>
            {user?.emailVerifiedAt ? (
              <Badge icon={CheckCircle2} label="Đã xác thực" size="sm" />
            ) : (
              <Button label="Chưa xác thực — nhập mã" icon={MailWarning} variant="tint" size="sm" onPress={() => setVerifyOpen(true)} />
            )}
          </View>
        </View>
      </View>
      <VerifyEmailSheet open={verifyOpen} onClose={() => setVerifyOpen(false)} />
    </SectionCard>
  );
}

const EMPTY = { currentPassword: "", newPassword: "", confirm: "" };

// PUT /auth/change-password
function ChangePasswordCard() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setForm(EMPTY);
      toast.success("Đã đổi mật khẩu 🔒");
    },
    onError: (err: Error) => setError(err.message),
  });
  const set = (key: keyof typeof EMPTY) => (v: string) => {
    setForm((f) => ({ ...f, [key]: v }));
    setError("");
  };
  const submit = () => {
    if (!form.currentPassword) return setError("Ba mẹ nhập mật khẩu hiện tại nhé");
    if (form.newPassword.length < MIN_REGISTER_PASSWORD) return setError(`Mật khẩu mới có ít nhất ${MIN_REGISTER_PASSWORD} ký tự`);
    if (form.newPassword === form.currentPassword) return setError("Mật khẩu mới cần khác mật khẩu hiện tại");
    if (form.newPassword !== form.confirm) return setError("Mật khẩu nhập lại chưa khớp");
    save.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  };
  return (
    <SectionCard icon={KeyRound} title="Đổi mật khẩu">
      <View style={styles.form}>
        <TextField label="Mật khẩu hiện tại" value={form.currentPassword} onChangeText={set("currentPassword")} secureTextEntry />
        <TextField label="Mật khẩu mới" value={form.newPassword} onChangeText={set("newPassword")} placeholder={`Ít nhất ${MIN_REGISTER_PASSWORD} ký tự`} secureTextEntry />
        <TextField label="Nhập lại mật khẩu mới" value={form.confirm} onChangeText={set("confirm")} secureTextEntry />
        {error ? (
          <AppText variant="small" weight="semibold" color={colors.danger}>
            {error}
          </AppText>
        ) : null}
        <Button label="Đổi mật khẩu" size="sm" loading={save.isPending} onPress={submit} style={styles.end} />
      </View>
    </SectionCard>
  );
}

export default function SettingsScreen() {
  return (
    <Screen header={<ScreenHeader section="Tài khoản" title="Cài đặt" />}>
      <PageIntro icon={Settings} eyebrow="Tài khoản" title="Cài đặt" text="Thông tin tài khoản và bảo mật. Mã PIN thoát Kid Mode nằm ở mục Bé nhà mình." />
      <AccountCard />
      <ChangePasswordCard />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rows: { gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 10 },
  emailRow: { alignItems: "flex-start" },
  emailValue: { flex: 1, alignItems: "flex-end", gap: 6 },
  form: { gap: 12 },
  end: { alignSelf: "flex-end" },
});
