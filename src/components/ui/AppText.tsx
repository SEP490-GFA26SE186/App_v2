import { StyleSheet, Text, type TextProps, type TextStyle } from "react-native";
import { colors, fonts, ink } from "@/theme";

// Thang chữ theo web: h1 = text-3xl (Comfortaa), h2 = text-2xl, h3 = text-lg/xl, body = 15–16px Nunito Sans.
const variants = {
  h1: { fontFamily: fonts.display, fontSize: 26, lineHeight: 34, color: colors.navy },
  h2: { fontFamily: fonts.display, fontSize: 21, lineHeight: 28, color: colors.navy },
  h3: { fontFamily: fonts.display, fontSize: 17, lineHeight: 24, color: colors.navy },
  title: { fontFamily: fonts.display, fontSize: 15, lineHeight: 21, color: colors.navy },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: ink.soft },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.navy },
  small: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: ink.muted },
  caption: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: ink.muted },
  overline: { fontFamily: fonts.extrabold, fontSize: 11, lineHeight: 14, letterSpacing: 1, textTransform: "uppercase", color: colors.primaryDark },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof variants;
const weights = { regular: fonts.sans, semibold: fonts.semibold, bold: fonts.bold, extrabold: fonts.extrabold, display: fonts.display };

interface Props extends TextProps {
  variant?: TextVariant;
  color?: string;
  weight?: keyof typeof weights;
  align?: TextStyle["textAlign"];
}

export function AppText({ variant = "body", color, weight, align, style, ...props }: Props) {
  return (
    <Text
      {...props}
      style={[variants[variant], weight && { fontFamily: weights[weight] }, color && { color }, align && { textAlign: align }, style]}
    />
  );
}

export const textStyles = StyleSheet.create(variants);
