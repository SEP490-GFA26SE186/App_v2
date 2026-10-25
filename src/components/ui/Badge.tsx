import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors, fonts, radius } from "@/theme";
import { AppText } from "./AppText";

interface Props {
  label: string;
  bg?: string;
  fg?: string;
  icon?: LucideIcon;
  dashed?: boolean;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
}

/** Nhãn bo tròn (tag-eq, tag-theme, nhãn trạng thái…). */
export function Badge({ label, bg = colors.secondaryTint, fg = colors.secondaryDark, icon: Icon, dashed, size = "md", style }: Props) {
  const small = size === "sm";
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: dashed ? "transparent" : bg, paddingVertical: small ? 2 : 4, paddingHorizontal: small ? 8 : 10 },
        dashed && styles.dashed,
        style,
      ]}
    >
      {Icon ? <Icon size={small ? 11 : 12} color={fg} /> : null}
      <AppText style={[styles.text, { color: fg, fontSize: small ? 11 : 12 }]} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

/** tag-eq (xanh ngọc) và tag-theme (cam) của web. */
export const TagEq = (p: Omit<Props, "bg" | "fg">) => <Badge {...p} bg={colors.secondaryTint} fg={colors.secondaryDark} />;
export const TagTheme = (p: Omit<Props, "bg" | "fg">) => <Badge {...p} bg={colors.primaryTint} fg={colors.primaryDark} />;

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: radius.full, alignSelf: "flex-start" },
  dashed: { borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(30,41,59,0.25)" },
  text: { fontFamily: fonts.bold },
});
