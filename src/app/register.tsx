import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Link } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, AtSign, Lock, Mail, Phone, UserRound } from "lucide-react-native";
import { AuthShell } from "@/components/auth/AuthShell";
import { AppText, Button, TextField } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { EMAIL_REGEX, MIN_REGISTER_PASSWORD, register, USERNAME_REGEX } from "@/services/authService";
import useAuthStore from "@/stores/authStore";
import { toast } from "@/stores/toastStore";
import { colors, radius } from "@/theme";

const EMPTY = { fullName: "", username: "", email: "", phone: "", password: "", confirmPassword: "" };
type Field = keyof typeof EMPTY;

export default function RegisterScreen() {
  const saveSession = useAuthStore((s) => s.login);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field | "form", string>>>({});

  const signup = useMutation({
    mutationFn: register,
    onSuccess: (session) => {
      saveSession(session);
      toast.success(`Chào mừng ${session.user.fullName || session.user.username}! Ba mẹ kiểm tra email để xác thực tài khoản nhé ✨`);
    },
    onError: (err: Error) => setErrors({ form: err.message }),
  });

  const set = (key: Field) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined, form: undefined }));
  };

  // Khớp auth.validation.js của BE
  const submit = () => {
    const next: typeof errors = {};
    const username = form.username.trim();
    if (!username) next.username = "Ba mẹ nhập tên đăng nhập nhé";
    else if (!USERNAME_REGEX.test(username)) next.username = "Từ 3–50 ký tự, chỉ gồm chữ không dấu, số và dấu _";
    if (!form.email.trim()) next.email = "Ba mẹ nhập email nhé";
    else if (!EMAIL_REGEX.test(form.email.trim())) next.email = "Email chưa đúng định dạng";
    if (form.password.length < MIN_REGISTER_PASSWORD) next.password = `Mật khẩu có ít nhất ${MIN_REGISTER_PASSWORD} ký tự`;
    if (form.confirmPassword !== form.password) next.confirmPassword = "Mật khẩu nhập lại chưa khớp";
    setErrors(next);
    if (Object.keys(next).length) return;
    signup.mutate({ username, email: form.email.trim(), password: form.password, fullName: form.fullName.trim(), phone: form.phone.trim() });
  };

  return (
    <AuthShell
      title="Đăng ký"
      subtitle="Tạo tài khoản phụ huynh để cùng bé khám phá StoryWeaver"
      footer={
        <View style={styles.footer}>
          <AppText variant="small">Đã có tài khoản?</AppText>
          <Link href={ROUTES.LOGIN} asChild>
            <Pressable>
              <AppText variant="small" weight="bold" color={colors.primaryDark}>
                Đăng nhập
              </AppText>
            </Pressable>
          </Link>
        </View>
      }
    >
      {errors.form ? (
        <View style={styles.alert}>
          <AppText variant="small" weight="semibold" color={colors.dangerDark}>
            {errors.form}
          </AppText>
        </View>
      ) : null}
      <TextField label="Họ và tên" icon={UserRound} look="filled" value={form.fullName} onChangeText={set("fullName")} placeholder="Nguyễn Lan Hương" maxLength={150} error={errors.fullName} />
      <TextField label="Tên đăng nhập *" icon={AtSign} look="filled" value={form.username} onChangeText={set("username")} placeholder="me_lanhuong" maxLength={50} autoCapitalize="none" hint="Chữ không dấu, số và dấu _" error={errors.username} />
      <TextField label="Email *" icon={Mail} look="filled" value={form.email} onChangeText={set("email")} placeholder="ba_me@email.com" autoCapitalize="none" keyboardType="email-address" error={errors.email} />
      <TextField label="Số điện thoại" icon={Phone} look="filled" value={form.phone} onChangeText={set("phone")} placeholder="0901234567" maxLength={20} keyboardType="phone-pad" error={errors.phone} />
      <TextField label="Mật khẩu *" icon={Lock} look="filled" value={form.password} onChangeText={set("password")} placeholder="••••••••" secureToggle hint={`Ít nhất ${MIN_REGISTER_PASSWORD} ký tự`} error={errors.password} />
      <TextField label="Nhập lại mật khẩu *" icon={Lock} look="filled" value={form.confirmPassword} onChangeText={set("confirmPassword")} placeholder="••••••••" secureTextEntry error={errors.confirmPassword} />
      <Button
        label={signup.isPending ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
        iconRight={signup.isPending ? undefined : ArrowRight}
        size="lg"
        display
        fullWidth
        loading={signup.isPending}
        onPress={submit}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: "row", justifyContent: "center", gap: 4, marginTop: 4 },
  alert: { backgroundColor: "rgba(255,218,214,0.7)", borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 10 },
});
