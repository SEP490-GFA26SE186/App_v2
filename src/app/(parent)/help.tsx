import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ChevronDown, FileText, HelpCircle, ShieldCheck } from "lucide-react-native";
import { AppText, Card, PageIntro, Screen, ScreenHeader } from "@/components/ui";
import { FAQS } from "@/constants/moderation";
import { colors, ink } from "@/theme";

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Card padding={18}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.q} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <AppText variant="h3" style={styles.flex}>
          {q}
        </AppText>
        <ChevronDown size={20} color={ink.muted} style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }} />
      </Pressable>
      {open ? (
        <AppText color={ink.body} style={styles.a}>
          {a}
        </AppText>
      ) : null}
    </Card>
  );
}

// Trợ giúp: câu hỏi thường gặp (dùng chung nội dung với trang chủ) + chính sách.
export default function HelpScreen() {
  return (
    <Screen header={<ScreenHeader section="Tài khoản" title="Trợ giúp" />}>
      <PageIntro icon={HelpCircle} eyebrow="Trợ giúp" title="Ba mẹ cần giúp gì?" />
      <View style={styles.list}>
        {FAQS.map((f) => (
          <Faq key={f.q} {...f} />
        ))}
      </View>
      <Card style={styles.link}>
        <ShieldCheck size={24} color={colors.secondary} />
        <AppText variant="label" weight="bold">
          Chính sách bảo mật
        </AppText>
      </Card>
      <Card style={styles.link}>
        <FileText size={24} color={colors.primary} />
        <AppText variant="label" weight="bold">
          Điều khoản dịch vụ
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: 12 },
  q: { flexDirection: "row", alignItems: "center", gap: 10 },
  a: { marginTop: 8 },
  link: { flexDirection: "row", alignItems: "center", gap: 12 },
});
