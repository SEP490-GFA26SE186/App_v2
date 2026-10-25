import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, shadows } from "@/theme";

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  elevated?: "low" | "mid" | "high";
  onPress?: () => void;
  accessibilityLabel?: string;
}

/** .card của web: bo 24, viền outline, nền trắng, bóng ấm. Truyền onPress để thành thẻ bấm được. */
export function Card({ children, style, padding = 20, elevated = "low", onPress, accessibilityLabel }: Props) {
  const content = [styles.card, shadows[elevated], { padding }, style];
  if (!onPress) return <View style={content}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [content, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.outline },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
});
