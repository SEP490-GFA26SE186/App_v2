import { Pressable, StyleSheet, View } from "react-native";
import { Stack, usePathname, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, BookOpen, Lock, Volume2, VolumeX } from "lucide-react-native";
import { ParentGateDialog } from "@/components/kid/KidDialogs";
import { AppText, Logo } from "@/components/ui";
import { href, ROUTES } from "@/constants/routes";
import { useKidSessionStore, useKidStore } from "@/stores/sessionStores";
import { colors, fonts, radius, shadows } from "@/theme";
import { childEmoji } from "@/utils/child";
import { stopSpeaking } from "@/utils/speech";

// Chế độ Trẻ Em: không menu người lớn, nút to, thoát ra ngoài phải qua cổng PIN của ba mẹ
export default function KidLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { muted, toggleMuted, parentGateOpen, setParentGateOpen } = useKidStore();
  const child = useKidSessionStore((s) => s.child);
  const onShelf = pathname === ROUTES.KID.BOOKSHELF;

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={[styles.header, shadows.low]}>
        <Pressable
          onPress={() => (onShelf ? undefined : router.replace(href(ROUTES.KID.BOOKSHELF)))}
          accessibilityLabel="Về tủ sách"
          style={[styles.circle, { width: 48, height: 48 }, onShelf && styles.hiddenBtn]}
          disabled={onShelf}
        >
          <ArrowLeft size={24} color={colors.primary} />
        </Pressable>
        <Logo size={36} />
        <View style={styles.flex}>
          {child ? (
            <View style={styles.childChip}>
              <BookOpen size={15} color={colors.secondary} />
              <AppText style={styles.childName} numberOfLines={1}>
                Bé {child.name}
              </AppText>
            </View>
          ) : null}
        </View>
        <Pressable
          onPress={() => {
            if (!muted) stopSpeaking();
            toggleMuted();
          }}
          accessibilityLabel={muted ? "Bật tiếng" : "Tắt tiếng"}
          accessibilityState={{ checked: !muted }}
          style={styles.circle}
        >
          {muted ? <VolumeX size={22} color="rgba(30,41,59,0.4)" /> : <Volume2 size={22} color={colors.secondary} />}
        </Pressable>
        <Pressable onPress={() => setParentGateOpen(true)} accessibilityLabel="Bố Mẹ" style={styles.parentBtn}>
          <Lock size={17} color="rgba(30,41,59,0.6)" />
          <AppText style={styles.parentText}>Bố Mẹ</AppText>
        </Pressable>
        <View style={styles.avatar}>
          <AppText style={styles.avatarEmoji}>{childEmoji(child)}</AppText>
        </View>
      </View>

      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas }, animation: "fade" }} />

      {parentGateOpen ? <ParentGateDialog onClose={() => setParentGateOpen(false)} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "rgba(255,253,249,0.95)", zIndex: 1 },
  circle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", ...shadows.low },
  hiddenBtn: { opacity: 0, width: 0, marginRight: -8 },
  childChip: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: colors.secondaryTint, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  childName: { fontFamily: fonts.bold, fontSize: 13, color: colors.secondaryDark, flexShrink: 1 },
  parentBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 11, ...shadows.low },
  parentText: { fontFamily: fonts.bold, fontSize: 12, color: "rgba(30,41,59,0.6)" },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatarEmoji: { fontSize: 18, lineHeight: 24 },
});
