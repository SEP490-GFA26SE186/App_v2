import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { PlusCircle, type LucideIcon } from "lucide-react-native";
import { AppText, Card, EmptyState, IconCircle } from "@/components/ui";
import { href, ROUTES } from "@/constants/routes";
import type { Tone } from "@/theme";

/** Thẻ thống kê nhanh ở dashboard. */
export function StatCard({ icon, tone = "orange", label, value, hint, hintColor }: { icon: LucideIcon; tone?: Tone; label: string; value: string; hint?: ReactNode; hintColor?: string }) {
  return (
    <Card style={styles.stat} padding={16}>
      <IconCircle icon={icon} tone={tone} rounded="md" />
      <View style={styles.flex}>
        <AppText variant="caption">{label}</AppText>
        <AppText variant="h2" style={styles.statValue}>
          {value}
        </AppText>
        {hint ? (
          typeof hint === "string" ? (
            <AppText variant="caption" color={hintColor}>
              {hint}
            </AppText>
          ) : (
            hint
          )
        ) : null}
      </View>
    </Card>
  );
}

/** Khung chung cho các khối cài đặt (hồ sơ bé, tài khoản…). */
export function SectionCard({ icon, tone = "orange", title, subtitle, action, children }: { icon: LucideIcon; tone?: Tone; title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card padding={20} style={styles.section}>
      <View style={styles.sectionHead}>
        <IconCircle icon={icon} tone={tone} size={40} />
        <View style={styles.flex}>
          <AppText variant="h3">{title}</AppText>
          {subtitle ? <AppText variant="small">{subtitle}</AppText> : null}
        </View>
        {action}
      </View>
      {children}
    </Card>
  );
}

/** Phụ huynh chưa tạo hồ sơ bé nào → các màn phụ thuộc bé hiện lời mời tạo hồ sơ. */
export function NoChildState() {
  const router = useRouter();
  return (
    <EmptyState
      emoji="🌱"
      title="Chưa có hồ sơ bé nào"
      text="Ba mẹ tạo hồ sơ cho bé để StoryWeaver gợi ý truyện, theo dõi thời gian đọc và hành trình EQ riêng cho bé nhé."
      action="Tạo hồ sơ bé"
      actionIcon={PlusCircle}
      onAction={() => router.push(href(ROUTES.PARENT.CHILDREN))}
    />
  );
}

/** Khối có tiêu đề + nút "xem thêm" bên phải. */
export function SectionTitle({ title, text, right }: { title: string; text?: string; right?: ReactNode }) {
  return (
    <View style={styles.titleRow}>
      <View style={styles.flex}>
        <AppText variant="h2">{title}</AppText>
        {text ? <AppText variant="small">{text}</AppText> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stat: { flexDirection: "row", gap: 14 },
  statValue: { marginTop: 2 },
  section: { gap: 18 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
});
