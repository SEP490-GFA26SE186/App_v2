import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeDollarSign, ChevronRight, CreditCard, HelpCircle, LogOut, Settings, Smile, TrendingUp, UsersRound, type LucideIcon } from "lucide-react-native";
import { AppText, Card, InitialAvatar, Logo, Screen } from "@/components/ui";
import { href, ROUTES } from "@/constants/routes";
import { useParentProfile } from "@/hooks/useParent";
import useAuthStore from "@/stores/authStore";
import { toast } from "@/stores/toastStore";
import { colors, fonts, ink, radius } from "@/theme";

const R = ROUTES.PARENT;

// Phần còn lại của sidebar web (các mục không nằm ở thanh tab), giữ nguyên nhóm.
const SECTIONS: { title: string; items: { to: string; label: string; icon: LucideIcon }[] }[] = [
  {
    title: "Gia đình",
    items: [
      { to: R.CHILDREN, label: "Bé nhà mình", icon: Smile },
      { to: R.FAMILY_CHARACTERS, label: "Nhân vật gia đình", icon: UsersRound },
      { to: R.EQ_JOURNEY, label: "Báo cáo EQ", icon: TrendingUp },
    ],
  },
  { title: "Sáng tác & Chợ truyện", items: [{ to: R.SELLING, label: "Bán truyện", icon: BadgeDollarSign }] },
  {
    title: "Tài khoản",
    items: [
      { to: R.BILLING, label: "Gói dịch vụ & Credit", icon: CreditCard },
      { to: R.SETTINGS, label: "Cài đặt", icon: Settings },
      { to: R.HELP, label: "Trợ giúp", icon: HelpCircle },
    ],
  },
];

export default function MoreScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const parent = useParentProfile();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    queryClient.clear(); // không để dữ liệu của tài khoản cũ sót lại trong cache
    toast.info("Đã đăng xuất. Hẹn gặp lại!");
  };

  return (
    <Screen>
      <View style={styles.brand}>
        <Logo size={44} />
        <View>
          <AppText style={styles.brandName}>StoryWeaver</AppText>
          <AppText style={styles.brandSub}>Nuôi dưỡng EQ</AppText>
        </View>
      </View>

      <View style={styles.profile}>
        <InitialAvatar name={parent.name} size={44} />
        <View style={styles.flex}>
          <AppText variant="label" weight="bold" numberOfLines={1}>
            {parent.name}
          </AppText>
          <AppText variant="caption" color={colors.secondaryDark}>
            {parent.planName ?? "…"} · {parent.creditBalance ?? "—"} credit
          </AppText>
        </View>
      </View>

      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <AppText style={styles.sectionTitle}>{section.title}</AppText>
          <Card padding={6}>
            {section.items.map(({ to, label, icon: Icon }, i) => (
              <Pressable
                key={to}
                onPress={() => router.push(href(to))}
                style={({ pressed }) => [styles.item, i > 0 && styles.divider, pressed && { backgroundColor: colors.primaryTint }]}
                accessibilityRole="button"
              >
                <Icon size={20} color={ink.soft} />
                <AppText variant="label" style={styles.flex}>
                  {label}
                </AppText>
                <ChevronRight size={18} color={ink.ghost} />
              </Pressable>
            ))}
          </Card>
        </View>
      ))}

      <Pressable onPress={handleLogout} style={({ pressed }) => [styles.logout, pressed && { opacity: 0.8 }]} accessibilityRole="button">
        <LogOut size={18} color={colors.danger} />
        <AppText variant="label" weight="bold" color={colors.danger}>
          Đăng xuất
        </AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  brand: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandName: { fontFamily: fonts.display, fontSize: 20, color: colors.primary },
  brandSub: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 1, color: colors.secondary, textTransform: "uppercase" },
  profile: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: radius.md, padding: 12 },
  section: { gap: 8 },
  sectionTitle: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "rgba(30,41,59,0.45)", paddingHorizontal: 4 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 14, borderRadius: radius.md },
  divider: { borderTopWidth: 1, borderColor: colors.outline },
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: radius.full, backgroundColor: colors.dangerTint, paddingVertical: 12 },
});
