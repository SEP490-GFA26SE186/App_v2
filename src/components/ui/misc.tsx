import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Animated, Image, Pressable, ScrollView, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { LucideIcon } from "lucide-react-native";
import { colors, fonts, radius, tones, type Tone } from "@/theme";
import { AppText } from "./AppText";
import { Button } from "./Button";
import { Card } from "./Card";

/** Switch của web: nền xanh ngọc khi bật, núm trắng. */
export function Switch({ value, onChange, label, disabled }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const x = useState(() => new Animated.Value(value ? 1 : 0))[0];
  useEffect(() => {
    Animated.timing(x, { toValue: value ? 1 : 0, duration: 160, useNativeDriver: true }).start();
  }, [value, x]);
  return (
    <Pressable
      onPress={() => onChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      style={[styles.switch, { backgroundColor: value ? colors.secondary : "rgba(30,41,59,0.2)" }, disabled && { opacity: 0.6 }]}
    >
      <Animated.View style={[styles.knob, { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }]} />
    </Pressable>
  );
}

/** Thanh tiến độ bo tròn, mặc định dải cam đậm → cam như web. */
export function ProgressBar({ percent, height = 10, colors: gradient = [colors.primaryDark, colors.primary], track = colors.outline }: { percent: number; height?: number; colors?: [string, string]; track?: string }) {
  const width = `${Math.max(0, Math.min(100, percent))}%` as DimensionValue;
  return (
    <View style={[styles.track, { height, backgroundColor: track }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fill, { width }]} />
    </View>
  );
}

/** Khối xương (animate-pulse) khi đang tải. */
export function Skeleton({ height, width = "100%", radius: r = radius.card, style }: { height: number; width?: DimensionValue; radius?: number; style?: StyleProp<ViewStyle> }) {
  const o = useState(() => new Animated.Value(0.6))[0];
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(o, { toValue: 0.6, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [o]);
  return <Animated.View style={[{ height, width, borderRadius: r, backgroundColor: colors.surface, opacity: o }, style]} />;
}

export const Spinner = ({ size = "large" }: { size?: "small" | "large" }) => (
  <View style={styles.spinner}>
    <ActivityIndicator size={size} color={colors.primary} />
  </View>
);

/** Ô tròn chứa biểu tượng theo tone (StatCard, SectionCard). */
export function IconCircle({ icon: Icon, tone = "orange", size = 44, iconSize = 22, rounded = "full" }: { icon: LucideIcon; tone?: Tone; size?: number; iconSize?: number; rounded?: "full" | "md" }) {
  const t = tones[tone];
  return (
    <View style={{ width: size, height: size, borderRadius: rounded === "full" ? size / 2 : radius.md, backgroundColor: t.bg, alignItems: "center", justifyContent: "center" }}>
      <Icon size={iconSize} color={t.fg} />
    </View>
  );
}

/** Thẻ trống / lỗi / mời hành động — dùng chung cho mọi màn. */
export function EmptyState({ emoji, icon: Icon, title, text, action, onAction, actionIcon }: { emoji?: string; icon?: LucideIcon; title: string; text?: string; action?: string; onAction?: () => void; actionIcon?: LucideIcon }) {
  return (
    <Card style={styles.empty} padding={28}>
      {emoji ? <AppText style={styles.emoji}>{emoji}</AppText> : null}
      {Icon ? <Icon size={40} color={colors.primary} /> : null}
      <AppText variant="h3" align="center">
        {title}
      </AppText>
      {text ? (
        <AppText variant="small" align="center">
          {text}
        </AppText>
      ) : null}
      {action && onAction ? <Button label={action} onPress={onAction} icon={actionIcon} style={styles.emptyAction} /> : null}
    </Card>
  );
}

/** Dải chip cuộn ngang (tab lọc tủ sách, năng lực ở chợ truyện…). */
export function ChipRow<T extends string>({ items, value, onChange }: { items: { value: T; label: string; icon?: LucideIcon }[]; value: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {items.map(({ value: v, label, icon: Icon }) => {
        const active = v === value;
        return (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [styles.chip, active ? styles.chipActive : styles.chipIdle, pressed && { transform: [{ scale: 0.96 }] }]}
          >
            {Icon ? <Icon size={14} color={active ? colors.white : "rgba(30,41,59,0.7)"} /> : null}
            <AppText style={[styles.chipText, { color: active ? colors.white : "rgba(30,41,59,0.7)", fontFamily: active ? fonts.bold : fonts.semibold }]}>{label}</AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Chữ cái đầu của tên trong vòng tròn (BE không lưu ảnh đại diện người dùng). */
export function InitialAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const initial = name.trim().split(/\s+/).pop()?.[0]?.toUpperCase() ?? "?";
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primaryTint, alignItems: "center", justifyContent: "center" }}>
      <AppText style={{ fontFamily: fonts.display, color: colors.primaryDark, fontSize: size * 0.4 }}>{initial}</AppText>
    </View>
  );
}

export const Logo = ({ size = 40 }: { size?: number }) => (
  <Image source={require("@/assets/logo.png")} style={{ width: size, height: size, borderRadius: size / 2 }} accessibilityIgnoresInvertColors />
);

/** Ô chọn có dấu tích (chọn nhân vật, kỹ năng…). */
export function CheckBox({ checked, label, onPress, children }: { checked: boolean; label?: string; onPress: () => void; children?: ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label} style={[styles.check, checked && styles.checkOn]}>
      {children}
    </Pressable>
  );
}

/** Đoạn ghi chú có biểu tượng (dòng "Tên thật được che…", lưu ý báo cáo EQ…). */
export function Note({ icon: Icon, children, bg = colors.navyTint, color = "rgba(30,41,59,0.8)" }: { icon?: LucideIcon; children: ReactNode; bg?: string; color?: string }) {
  return (
    <View style={[styles.note, { backgroundColor: bg }]}>
      {Icon ? <Icon size={16} color={color} style={styles.noteIcon} /> : null}
      <AppText variant="small" color={color} style={styles.flex}>
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  switch: { width: 48, height: 28, borderRadius: 14, padding: 4 },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.white },
  track: { borderRadius: radius.full, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.full },
  spinner: { paddingVertical: 32, alignItems: "center" },
  empty: { alignItems: "center", gap: 8 },
  emoji: { fontSize: 44, lineHeight: 54 },
  emptyAction: { alignSelf: "center", marginTop: 8 },
  chips: { gap: 8, paddingVertical: 2, paddingRight: 4 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radius.full, paddingHorizontal: 16, paddingVertical: 7 },
  chipActive: { backgroundColor: colors.primary },
  chipIdle: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.outline },
  chipText: { fontSize: 14 },
  check: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: colors.outline, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  note: { flexDirection: "row", gap: 8, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 12 },
  noteIcon: { marginTop: 2 },
  flex: { flex: 1 },
});
