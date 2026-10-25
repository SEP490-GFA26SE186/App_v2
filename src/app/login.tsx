import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Link } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, AtSign, CheckCircle2, KeyRound, Lock, Send } from "lucide-react-native";
import { AuthShell } from "@/components/auth/AuthShell";
import { AppText, Button, Sheet, TextField } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { EMAIL_REGEX, isValidIdentity, login, MIN_REGISTER_PASSWORD, requestPasswordReset, resetPassword } from "@/services/authService";
import useAuthStore from "@/stores/authStore";
import { toast } from "@/stores/toastStore";
import { colors, radius } from "@/theme";

export default function LoginScreen() {
  const saveSession = useAuthStore((s) => s.login);
  const [form, setForm] = useState({ identity: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<"identity" | "password" | "form", string>>>({});
  const [forgotOpen, setForgotOpen] = useState(false);

  const emailLogin = useMutation({
    mutationFn: ({ identity, password }: typeof form) => login(identity, password),
    onSuccess: (session) => {
      saveSession(session);
      toast.success(`Chào mừng ${session.user.fullName || session.user.username} trở lại ✨`);
    },
    onError: (err: Error) => {
      setErrors({ form: err.message });
      setForm((f) => ({ ...f, password: "" }));
    },
  });

  const set = (key: keyof typeof form) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined, form: undefined }));
  };

  const submit = () => {
    const next: typeof errors = {};
    if (!form.identity.trim()) next.identity = "Ba mẹ nhập email hoặc tên đăng nhập nhé";
    else if (!isValidIdentity(form.identity.trim())) next.identity = "Email hoặc tên đăng nhập chưa đúng định dạng";
    if (!form.password) next.password = "Ba mẹ nhập mật khẩu nhé";
    setErrors(next);
    if (!Object.keys(next).length) emailLogin.mutate({ identity: form.identity.trim(), password: form.password });
  };

  return (
    <AuthShell
      title="Đăng nhập"
      subtitle="Chào mừng Ba Mẹ trở lại cùng StoryWeaver"
      footer={
        <View style={styles.footer}>
          <AppText variant="small">Chưa có tài khoản?</AppText>
          <Link href={ROUTES.REGISTER} asChild>
            <Pressable>
              <AppText variant="small" weight="bold" color={colors.primaryDark}>
                Đăng ký ngay
              </AppText>
            </Pressable>
          </Link>
        </View>
      }
    >
      {errors.form ? (
        <View style={styles.alert} accessibilityRole="alert">
          <AppText variant="small" weight="semibold" color={colors.dangerDark}>
            {errors.form}
          </AppText>
        </View>
      ) : null}
      <TextField
        label="Email hoặc Tên đăng nhập"
        icon={AtSign}
        look="filled"
        value={form.identity}
        onChangeText={set("identity")}
        placeholder="ba_me@email.com"
        autoCapitalize="none"
        autoComplete="username"
        keyboardType="email-address"
        error={errors.identity}
      />
      <TextField
        label="Mật khẩu"
        icon={Lock}
        look="filled"
        value={form.password}
        onChangeText={set("password")}
        placeholder="••••••••••••"
        secureToggle
        autoComplete="current-password"
        error={errors.password}
        onSubmitEditing={submit}
      />
      <Button label="Quên mật khẩu?" variant="link" size="sm" onPress={() => setForgotOpen(true)} style={styles.forgot} />
      <Button
        label={emailLogin.isPending ? "Đang kết nối yêu thương..." : "Đăng nhập"}
        iconRight={emailLogin.isPending ? undefined : ArrowRight}
        size="lg"
        display
        fullWidth
        loading={emailLogin.isPending}
        onPress={submit}
      />
      <View style={styles.demo}>
        <AppText variant="caption" color={colors.secondaryDark}>
          Tài khoản demo
        </AppText>
        <Pressable onPress={() => setForm({ identity: "me.lanhuong@storyweaver.vn", password: "123456" })}>
          <AppText variant="small">
            me.lanhuong@storyweaver.vn / 123456 — PIN Kid Mode: 1234 <AppText variant="small" weight="bold" color={colors.primaryDark}>(bấm để điền)</AppText>
          </AppText>
        </Pressable>
      </View>
      <ForgotPasswordSheet open={forgotOpen} defaultIdentity={form.identity} onClose={() => setForgotOpen(false)} />
    </AuthShell>
  );
}

/**
 * Quên mật khẩu — 3 bước: nhập email → BE gửi mã (hạn 1 giờ) → dán mã + đặt mật khẩu mới → đăng nhập lại.
 */
function ForgotPasswordSheet({ open, defaultIdentity, onClose }: { open: boolean; defaultIdentity: string; onClose: () => void }) {
  const [step, setStep] = useState<"request" | "reset" | "done">("request");
  const [email, setEmail] = useState(EMAIL_REGEX.test(defaultIdentity) ? defaultIdentity : "");
  const [form, setForm] = useState({ token: "", newPassword: "", confirm: "" });
  const [error, setError] = useState("");
  const request = useMutation({ mutationFn: requestPasswordReset, onSuccess: () => setStep("reset") });
  const reset = useMutation({ mutationFn: resetPassword, onSuccess: () => setStep("done"), onError: (e: Error) => setError(e.message) });

  const close = () => {
    setStep("request");
    setError("");
    onClose();
  };

  const submitReset = () => {
    if (!form.token.trim()) return setError("Ba mẹ dán mã khôi phục trong email vào nhé");
    if (form.newPassword.length < MIN_REGISTER_PASSWORD) return setError(`Mật khẩu mới có ít nhất ${MIN_REGISTER_PASSWORD} ký tự`);
    if (form.newPassword !== form.confirm) return setError("Mật khẩu nhập lại chưa khớp");
    reset.mutate({ token: form.token.trim(), newPassword: form.newPassword });
  };
  const setField = (key: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [key]: v }));
    setError("");
  };

  if (step === "done") {
    return (
      <Sheet open={open} onClose={close} title="Đặt lại mật khẩu">
        <View style={styles.done}>
          <CheckCircle2 size={44} color={colors.secondary} />
          <AppText variant="h3">Đã đặt lại mật khẩu!</AppText>
          <AppText variant="small">Ba mẹ đăng nhập lại bằng mật khẩu mới nhé.</AppText>
          <Button label="Quay lại đăng nhập" onPress={close} style={styles.center} />
        </View>
      </Sheet>
    );
  }

  if (step === "reset") {
    return (
      <Sheet open={open} onClose={close} title="Đặt mật khẩu mới" description={email ? `Mã khôi phục đã gửi tới ${email}, có hiệu lực trong 1 giờ.` : "Dán mã khôi phục trong email (hiệu lực 1 giờ)."}>
        <TextField label="Mã khôi phục" look="filled" value={form.token} onChangeText={setField("token")} placeholder="Dán mã trong email" autoCapitalize="none" />
        <TextField label="Mật khẩu mới" look="filled" value={form.newPassword} onChangeText={setField("newPassword")} placeholder={`Ít nhất ${MIN_REGISTER_PASSWORD} ký tự`} secureToggle />
        <TextField label="Nhập lại mật khẩu mới" look="filled" value={form.confirm} onChangeText={setField("confirm")} secureTextEntry />
        {error ? (
          <AppText variant="small" weight="semibold" color={colors.danger}>
            {error}
          </AppText>
        ) : null}
        <Button label="Đặt lại mật khẩu" icon={KeyRound} fullWidth loading={reset.isPending} onPress={submitReset} />
        <Button label="Chưa nhận được mã? Gửi lại" variant="link" size="sm" onPress={() => setStep("request")} style={styles.center} />
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={close} title="Quên mật khẩu?" description="Nhập email đã đăng ký, StoryWeaver sẽ gửi mã khôi phục mật khẩu.">
      <TextField
        label="Email"
        look="filled"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setError("");
        }}
        placeholder="ba_me@email.com"
        autoCapitalize="none"
        keyboardType="email-address"
        error={error}
      />
      <Button
        label="Gửi mã khôi phục"
        icon={Send}
        fullWidth
        disabled={!email.trim()}
        loading={request.isPending}
        onPress={() => (EMAIL_REGEX.test(email.trim()) ? request.mutate(email.trim()) : setError("Email chưa đúng định dạng"))}
      />
      <Button label="Đã có mã khôi phục? Nhập mã" variant="link" size="sm" onPress={() => setStep("reset")} style={styles.center} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: "row", justifyContent: "center", gap: 4, marginTop: 4 },
  alert: { backgroundColor: "rgba(255,218,214,0.7)", borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 10 },
  forgot: { alignSelf: "flex-end", marginTop: -6 },
  demo: { backgroundColor: colors.secondaryTint, borderRadius: radius.md, padding: 12, gap: 2 },
  done: { alignItems: "center", gap: 8, paddingVertical: 12 },
  center: { alignSelf: "center" },
});
