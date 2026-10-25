import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Check, ChevronDown, type LucideIcon } from "lucide-react-native";
import { colors, fonts, ink, radius } from "@/theme";
import { AppText } from "./AppText";
import { Sheet } from "./Sheet";

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  /** "pill" = FilterSelect của web ("Năng lực: Tất cả"); "field" = ô chọn trong form. */
  look?: "pill" | "field";
  highlight?: boolean;
  icon?: LucideIcon;
  placeholder?: string;
}

/** <select> của web → nút mở bottom sheet danh sách lựa chọn. */
export function SelectField<T extends string>({ label, value, options, onChange, look = "field", highlight, icon: Icon = ChevronDown, placeholder }: Props<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  const pill = look === "pill";
  const tint = highlight ? colors.primaryDark : colors.navy;

  return (
    <View style={!pill && styles.fieldWrap}>
      {!pill ? <AppText variant="label">{label}</AppText> : null}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? placeholder ?? ""}`}
        style={({ pressed }) => [pill ? styles.pill : styles.field, pressed && styles.pressed]}
      >
        <AppText numberOfLines={1} style={[styles.text, { color: current ? tint : ink.ghost }, pill && highlight && { fontFamily: fonts.bold }]}>
          {pill ? `${label}: ${current?.label ?? ""}` : (current?.label ?? placeholder ?? "Chọn")}
        </AppText>
        <Icon size={16} color={highlight ? colors.primaryDark : ink.faint} />
      </Pressable>

      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <View style={styles.list}>
          {options.map((o) => {
            const active = o.value === value;
            return (
              <Pressable
                key={o.value}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                style={({ pressed }) => [styles.option, active && styles.optionActive, pressed && styles.pressed]}
              >
                <AppText variant="label" style={styles.flex} color={active ? colors.primaryDark : colors.navy}>
                  {o.label}
                </AppText>
                {active ? <Check size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { gap: 6 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.outline,
    borderRadius: radius.full,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 12,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.outline,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    minHeight: 46,
  },
  text: { flex: 1, fontFamily: fonts.semibold, fontSize: 14 },
  list: { gap: 6 },
  option: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.sm },
  optionActive: { backgroundColor: colors.primaryTint },
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
});
