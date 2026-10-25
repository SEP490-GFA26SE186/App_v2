import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors, fonts, radius, shadows } from "@/theme";
import { AppText } from "./AppText";

// btn-primary / btn-ghost của web + các biến thể hay dùng (nền surface, teal, danger, chữ link).
const VARIANTS = {
  primary: { bg: colors.primary, fg: colors.white, border: "transparent" },
  teal: { bg: colors.secondary, fg: colors.white, border: "transparent" },
  ghost: { bg: colors.surface, fg: colors.navy, border: colors.outline },
  surface: { bg: colors.surface, fg: colors.navy, border: "transparent" },
  white: { bg: colors.white, fg: colors.navy, border: "transparent" },
  tint: { bg: colors.primaryTint, fg: colors.primaryDark, border: "transparent" },
  tealTint: { bg: colors.secondaryTint, fg: colors.secondaryDark, border: "transparent" },
  danger: { bg: colors.danger, fg: colors.white, border: "transparent" },
  link: { bg: "transparent", fg: colors.primaryDark, border: "transparent" },
  dangerLink: { bg: "transparent", fg: colors.danger, border: "transparent" },
} as const;

const SIZES = {
  sm: { py: 7, px: 14, font: 13, icon: 15 },
  md: { py: 11, px: 22, font: 15, icon: 18 },
  lg: { py: 14, px: 28, font: 17, icon: 20 },
} as const;

export type ButtonVariant = keyof typeof VARIANTS;

interface Props {
  label?: string;
  children?: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: keyof typeof SIZES;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  display?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Button({
  label,
  children,
  onPress,
  variant = "primary",
  size = "md",
  icon: Icon,
  iconRight: IconRight,
  loading,
  disabled,
  fullWidth,
  display,
  style,
  accessibilityLabel,
}: Props) {
  const v = VARIANTS[variant];
  const s = SIZES[size];
  const inactive = disabled || loading;
  const isLink = variant === "link" || variant === "dangerLink";

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: v.border === "transparent" ? 0 : 2,
          paddingVertical: isLink ? 4 : s.py,
          paddingHorizontal: isLink ? 0 : s.px,
        },
        variant === "primary" && !inactive && shadows.low,
        fullWidth && styles.full,
        inactive && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={v.fg} /> : Icon ? <Icon size={s.icon} color={v.fg} /> : null}
      {label ? (
        <AppText style={{ color: v.fg, fontSize: s.font, fontFamily: display ? fonts.display : fonts.bold }} numberOfLines={1}>
          {label}
        </AppText>
      ) : null}
      {children}
      {IconRight ? <IconRight size={s.icon} color={v.fg} /> : null}
    </Pressable>
  );
}

/** Nút tròn chỉ có biểu tượng (đóng, sửa, xoá…). */
export function IconButton({
  icon: Icon,
  onPress,
  label,
  color = colors.navy,
  bg = "transparent",
  size = 20,
  disabled,
  style,
}: {
  icon: LucideIcon;
  onPress?: () => void;
  label: string;
  color?: string;
  bg?: string;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.icon, { backgroundColor: bg }, disabled && styles.disabled, pressed && styles.pressed, style]}
    >
      <View>
        <Icon size={size} color={color} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: radius.full, alignSelf: "flex-start" },
  full: { alignSelf: "stretch" },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  icon: { padding: 8, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
});
