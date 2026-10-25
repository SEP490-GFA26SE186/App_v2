import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle2, Info, X, XCircle } from "lucide-react-native";
import useToastStore from "@/stores/toastStore";
import { colors, fonts, radius, shadows } from "@/theme";
import { AppText } from "./AppText";

const STYLES = {
  success: { icon: CheckCircle2, color: "#5eead4" },
  error: { icon: XCircle, color: "#fca5a5" },
  info: { icon: Info, color: "#fcd34d" },
};

/** Toast nền navy ở đáy màn hình (giống Toaster của web). */
export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  const insets = useSafeAreaInsets();
  if (!toasts.length) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 72 }]}>
      {toasts.map(({ id, message, type }) => {
        const { icon: Icon, color } = STYLES[type];
        return (
          <View key={id} style={[styles.toast, shadows.high]} accessibilityLiveRegion="polite" accessibilityRole="alert">
            <Icon size={19} color={color} />
            <AppText style={styles.text}>{message}</AppText>
            <Pressable onPress={() => dismiss(id)} accessibilityLabel="Đóng" hitSlop={8}>
              <X size={16} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16, gap: 8 },
  toast: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: colors.navy, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 12 },
  text: { flex: 1, color: colors.white, fontFamily: fonts.semibold, fontSize: 14 },
});
