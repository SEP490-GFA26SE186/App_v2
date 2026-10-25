import { useState, type ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { ArrowLeft, type LucideIcon } from "lucide-react-native";
import { colors, fonts } from "@/theme";
import { AppText } from "./AppText";
import { IconButton } from "./Button";

interface ScreenProps {
  children: ReactNode;
  /** Kéo xuống để tải lại (react-query refetch). */
  onRefresh?: () => Promise<unknown>;
  scroll?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: Edge[];
}

/** Khung màn hình: nền canvas, vùng an toàn, cuộn dọc, khoảng cách giữa các khối như `space-y-6` của web. */
export function Screen({ children, onRefresh, scroll = true, header, footer, contentStyle, edges = ["top"] }: ScreenProps) {
  const [refreshing, setRefreshing] = useState(false);
  const refresh = onRefresh
    ? async () => {
        setRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
        }
      }
    : undefined;

  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.flex, contentStyle]}>{children}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

interface HeaderProps {
  title: string;
  /** Nhóm menu như breadcrumb của web ("Gia đình › Bé nhà mình"). */
  section?: string;
  back?: boolean;
  right?: ReactNode;
  backIcon?: LucideIcon;
}

/** Topbar của AppShell: tiêu đề trang (+ nhóm), nút quay lại cho trang con. */
export function ScreenHeader({ title, section, back = true, right, backIcon = ArrowLeft }: HeaderProps) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      {back ? <IconButton icon={backIcon} label="Quay lại" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} /> : null}
      <View style={styles.flex}>
        {section ? (
          <AppText variant="caption" color="rgba(30,41,59,0.5)" numberOfLines={1}>
            {section}
          </AppText>
        ) : null}
        <AppText numberOfLines={1} style={styles.title}>
          {title}
        </AppText>
      </View>
      {right}
    </View>
  );
}

/** Tiêu đề khối trong trang: dòng nhỏ có biểu tượng + h1 + mô tả (đầu trang Bé nhà mình, Cài đặt…). */
export function PageIntro({ icon: Icon, eyebrow, title, text, eyebrowColor = colors.secondaryDark }: { icon?: LucideIcon; eyebrow?: string; title: string; text?: string; eyebrowColor?: string }) {
  return (
    <View style={styles.intro}>
      {eyebrow ? (
        <View style={styles.eyebrow}>
          {Icon ? <Icon size={16} color={eyebrowColor} /> : null}
          <AppText variant="label" weight="bold" color={eyebrowColor}>
            {eyebrow}
          </AppText>
        </View>
      ) : null}
      <AppText variant="h1">{title}</AppText>
      {text ? <AppText>{text}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 16, paddingBottom: 40, gap: 24 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 56,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(241,232,220,0.7)",
    backgroundColor: colors.canvas,
  },
  title: { fontFamily: fonts.display, fontSize: 16, color: colors.navy },
  intro: { gap: 4 },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: 6 },
});
