import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Animated, Modal, Pressable, StyleSheet, View } from "react-native";
import { Check, Delete, Lock, X } from "lucide-react-native";
import { AppText, Button } from "@/components/ui";
import { useExitKidMode } from "@/hooks/useKid";
import { colors, fonts, radius, shadows } from "@/theme";

// Khung hộp thoại to, bo tròn, thân thiện với bé
function KidDialog({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.dialog, shadows.high]}>{children}</View>
      </View>
    </Modal>
  );
}

export function StoryCompleteDialog({ childName, onReadAgain, onBookshelf }: { childName: string; onReadAgain: () => void; onBookshelf: () => void }) {
  return (
    <KidDialog onClose={onBookshelf}>
      <View style={[styles.party, shadows.glow]}>
        <AppText style={styles.partyEmoji}>🎉</AppText>
      </View>
      <AppText variant="overline" color={colors.secondaryDark}>
        Hoàn thành câu chuyện!
      </AppText>
      <AppText variant="h1" align="center">
        {childName} đã đọc xong truyện rồi!
      </AppText>
      <AppText align="center">Con muốn đọc lại từ đầu hay chọn truyện khác trên giá sách?</AppText>
      <View style={styles.actions}>
        <Button label="Đọc lại từ đầu" variant="surface" fullWidth onPress={onReadAgain} />
        <Button label="Về Tủ Sách 📚" fullWidth onPress={onBookshelf} />
      </View>
    </KidDialog>
  );
}

// PIN thoát Kid Mode của tài khoản phụ huynh: 4–6 chữ số
const PIN_MIN = 4;
const PIN_MAX = 6;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

// Cổng Ba Mẹ: nhập mã PIN để thoát chế độ trẻ em (BE kiểm PIN, trả token phụ huynh)
export function ParentGateDialog({ onClose }: { onClose: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const verify = useExitKidMode();
  const shake = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (!error) return;
    Animated.sequence([6, -6, 6, -6, 0].map((toValue) => Animated.timing(shake, { toValue, duration: 70, useNativeDriver: true }))).start();
  }, [error, shake]);

  const submit = (value = pin) => {
    if (verify.isPending || value.length < PIN_MIN) return;
    verify.mutate(value, {
      onError: () => {
        setError(true);
        setPin("");
      },
    });
  };
  const press = (d: string) => {
    if (verify.isPending || pin.length >= PIN_MAX) return;
    const next = pin + d;
    setError(false);
    setPin(next);
    if (next.length === PIN_MAX) submit(next); // đủ 6 số thì tự gửi
  };

  const key = (content: ReactNode, onPress: () => void, label: string, style?: object, disabled?: boolean) => (
    <Pressable key={label} onPress={onPress} disabled={disabled} accessibilityLabel={label} style={({ pressed }) => [styles.key, style, pressed && { transform: [{ scale: 0.95 }] }, disabled && styles.keyDisabled]}>
      {content}
    </Pressable>
  );

  return (
    <KidDialog onClose={onClose}>
      <Pressable onPress={onClose} accessibilityLabel="Đóng" style={styles.close} hitSlop={8}>
        <X size={20} color={colors.navy} />
      </Pressable>
      <View style={styles.lock}>
        <Lock size={26} color={colors.navySoft} />
      </View>
      <AppText variant="h2">Dành cho Ba Mẹ</AppText>
      <AppText variant="small" align="center">
        Nhập mã PIN phụ huynh để thoát Chế độ Trẻ Em
      </AppText>
      <Animated.View style={[styles.dots, { transform: [{ translateX: shake }] }]} accessibilityLiveRegion="polite">
        {Array.from({ length: Math.max(PIN_MIN, pin.length) }).map((_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i < pin.length ? colors.primary : error ? "rgba(186,26,26,0.4)" : colors.outline }]} />
        ))}
      </Animated.View>
      <AppText variant="small" weight="semibold" color={colors.danger} style={styles.errorLine}>
        {error ? "Mã PIN chưa đúng, thử lại nhé" : ""}
      </AppText>
      <View style={styles.pad}>
        {KEYS.map((d) => key(<AppText style={styles.keyText}>{d}</AppText>, () => press(d), d))}
        {key(
          verify.isPending ? <ActivityIndicator color={colors.white} /> : <Check size={22} color={pin.length < PIN_MIN ? "rgba(30,41,59,0.4)" : colors.white} />,
          () => submit(),
          "Xác nhận",
          { backgroundColor: pin.length < PIN_MIN ? colors.outline : colors.primary },
          pin.length < PIN_MIN || verify.isPending,
        )}
        {key(<AppText style={styles.keyText}>0</AppText>, () => press("0"), "0")}
        {key(<Delete size={22} color="rgba(30,41,59,0.6)" />, () => setPin((p) => p.slice(0, -1)), "Xóa", { backgroundColor: "transparent" })}
      </View>
    </KidDialog>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(30,41,59,0.4)", alignItems: "center", justifyContent: "center", padding: 16 },
  dialog: { width: "100%", maxWidth: 420, alignItems: "center", gap: 8, backgroundColor: colors.white, borderRadius: radius.stage, padding: 24 },
  party: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primaryTint, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  partyEmoji: { fontSize: 48, lineHeight: 58 },
  actions: { alignSelf: "stretch", gap: 8, marginTop: 16 },
  close: { position: "absolute", top: 16, right: 16, padding: 4 },
  lock: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.navyTint, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  dots: { flexDirection: "row", gap: 12, marginTop: 16 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  errorLine: { minHeight: 20 },
  pad: { width: 252, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  key: { width: 76, height: 56, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  keyDisabled: { opacity: 1 },
  keyText: { fontFamily: fonts.display, fontSize: 20, color: colors.navy },
});
