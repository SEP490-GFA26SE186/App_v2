import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShieldCheck } from "lucide-react-native";
import { AppText, Logo } from "@/components/ui";
import { colors, fonts, shadows } from "@/theme";

/** Khung chung cho đăng nhập / đăng ký: thương hiệu, thẻ bo lớn, dòng an toàn cho trẻ em ở cuối. */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Logo size={44} />
            <AppText style={styles.brandText}>StoryWeaver AI</AppText>
          </View>
          <View style={[styles.card, shadows.low]}>
            <View style={styles.head}>
              <AppText variant="h1" align="center">
                {title}
              </AppText>
              <AppText variant="small" align="center">
                {subtitle}
              </AppText>
            </View>
            {children}
            {footer}
          </View>
          <View style={styles.safe}>
            <ShieldCheck size={16} color={colors.secondary} />
            <AppText variant="small" color={colors.muted} align="center">
              Môi trường giáo dục an toàn cho trẻ em • Tuân thủ chuẩn COPPA
            </AppText>
          </View>
          <AppText variant="caption" weight="regular" color={colors.muted} align="center">
            © {new Date().getFullYear()} StoryWeaver AI. Mọi quyền được bảo lưu.
          </AppText>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: 20, gap: 20 },
  brand: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  brandText: { fontFamily: fonts.display, fontSize: 20, color: colors.navy },
  card: { backgroundColor: colors.white, borderRadius: 48, borderWidth: 1, borderColor: colors.outline, padding: 28, gap: 16 },
  head: { gap: 6, marginBottom: 12 },
  safe: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 16 },
});
