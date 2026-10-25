import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { colors, radius, shadows } from "@/theme";
import { AppText } from "./AppText";
import { IconButton } from "./Button";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

/** Modal của web trên điện thoại = bottom sheet: tiêu đề + mô tả, nội dung cuộn được, chân có nút. */
export function Sheet({ open, onClose, title, description, children, footer }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Đóng" />
        <View style={[styles.sheet, shadows.high, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <View style={styles.flex}>
              <AppText variant="h2">{title}</AppText>
              {description ? (
                <AppText variant="small" style={styles.desc}>
                  {description}
                </AppText>
              ) : null}
            </View>
            <IconButton icon={X} label="Đóng" onPress={onClose} />
          </View>
          {children ? (
            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          ) : null}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(30,41,59,0.4)" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.stage, borderTopRightRadius: radius.stage, maxHeight: "90%" },
  grabber: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.outline, marginTop: 10 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 24, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderColor: colors.outline },
  flex: { flex: 1 },
  desc: { marginTop: 4 },
  body: { flexGrow: 0 },
  bodyContent: { paddingHorizontal: 24, paddingVertical: 20, gap: 16 },
  footer: { flexDirection: "row", justifyContent: "flex-end", gap: 8, paddingHorizontal: 24, paddingTop: 14, borderTopWidth: 1, borderColor: colors.outline },
});
