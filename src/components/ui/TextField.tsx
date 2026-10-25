import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { Eye, EyeOff, type LucideIcon } from "lucide-react-native";
import { colors, fonts, ink, radius } from "@/theme";
import { AppText } from "./AppText";

interface Props extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string | null;
  icon?: LucideIcon;
  /** "filled" = nền surface như trang đăng nhập; "outline" = viền outline như form trong app. */
  look?: "filled" | "outline";
  secureToggle?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  counter?: boolean;
}

export function TextField({ label, hint, error, icon: Icon, look = "outline", secureToggle, containerStyle, counter, multiline, style, secureTextEntry, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const secure = secureToggle ? hidden : secureTextEntry;
  const length = String(props.value ?? "").length;

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <View
        style={[
          styles.box,
          look === "filled" ? styles.filled : styles.outline,
          focused && (look === "filled" ? styles.filledFocus : styles.outlineFocus),
          !!error && styles.invalid,
          props.editable === false && styles.readonly,
        ]}
      >
        {Icon ? <Icon size={18} color={colors.muted} style={styles.leftIcon} /> : null}
        <TextInput
          {...props}
          multiline={multiline}
          secureTextEntry={secure}
          placeholderTextColor={ink.ghost}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[styles.input, multiline && styles.multiline, Icon && { paddingLeft: 40 }, secureToggle && { paddingRight: 44 }, style]}
        />
        {secureToggle ? (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            accessibilityLabel={hidden ? "Hiện mật khẩu" : "Ẩn mật khẩu"}
            hitSlop={8}
            style={styles.eye}
          >
            {hidden ? <Eye size={18} color={colors.muted} /> : <EyeOff size={18} color={colors.muted} />}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : hint || counter ? (
        <View style={styles.hintRow}>
          <AppText variant="caption" color={ink.faint} style={styles.flex}>
            {hint}
          </AppText>
          {counter && props.maxLength ? (
            <AppText variant="caption" color={ink.faint}>
              {length}/{props.maxLength}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  box: { borderRadius: radius.md, justifyContent: "center" },
  filled: { backgroundColor: colors.surface, borderWidth: 3, borderColor: "transparent" },
  filledFocus: { backgroundColor: colors.white, borderColor: "rgba(0,168,150,0.2)" },
  outline: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.outline },
  outlineFocus: { borderColor: colors.secondary },
  invalid: { borderColor: "rgba(186,26,26,0.5)" },
  readonly: { backgroundColor: colors.surface },
  input: { fontFamily: fonts.sans, fontSize: 15, color: colors.navy, paddingHorizontal: 16, paddingVertical: 12, minHeight: 46 },
  multiline: { minHeight: 110, textAlignVertical: "top" },
  leftIcon: { position: "absolute", left: 14 },
  eye: { position: "absolute", right: 12, padding: 4 },
  hintRow: { flexDirection: "row", gap: 8 },
  flex: { flex: 1 },
});
