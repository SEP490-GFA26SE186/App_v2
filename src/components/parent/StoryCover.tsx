import { useState, type ReactNode } from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "@/components/ui";
import { CASEL_COVER, NEUTRAL_COVER } from "@/constants/casel";
import { colors, fonts } from "@/theme";
import type { Cover } from "@/types/models";

const SIZES = {
  sm: { icon: 26, title: 12, pad: 8, sparkles: false },
  md: { icon: 60, title: 17, pad: 16, sparkles: true },
  lg: { icon: 88, title: 22, pad: 20, sparkles: true },
};

interface Props {
  cover: Cover;
  title?: string;
  subtitle?: string;
  showTitle?: boolean;
  size?: keyof typeof SIZES;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/**
 * Ảnh bìa truyện: tranh một cảnh của truyện (vuông, không chữ).
 * Chưa có ảnh / ảnh lỗi → nền gradient + biểu tượng theo năng lực CASEL (không có năng lực → màu trung tính).
 * Tên truyện luôn do giao diện vẽ (bật `showTitle`), không bao giờ nằm trong ảnh.
 */
export function StoryCover({ cover, title, subtitle, showTitle, size = "md", style, children }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const s = SIZES[size];
  const showImage = !!cover.imageUrl && failedUrl !== cover.imageUrl;
  const palette = (cover.competency && CASEL_COVER[cover.competency]) || NEUTRAL_COVER;
  const Icon = palette.icon;

  return (
    <View style={[styles.root, style]} accessibilityRole="image" accessibilityLabel={title ?? "Bìa truyện"}>
      {showImage ? (
        <>
          <Image source={{ uri: cover.imageUrl! }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailedUrl(cover.imageUrl)} />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.15)", "rgba(0,0,0,0.45)"]} style={styles.shade} />
        </>
      ) : (
        <LinearGradient colors={palette.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fallback}>
          <Icon size={s.icon} strokeWidth={1.75} color={palette.tone} style={{ opacity: 0.8 }} />
          {s.sparkles ? (
            <>
              <AppText style={[styles.sparkle, { top: 14, left: 22, fontSize: 18 }]}>✦</AppText>
              <AppText style={[styles.sparkle, { bottom: 36, right: 30, fontSize: 13, opacity: 0.8 }]}>✦</AppText>
              <AppText style={[styles.sparkle, { top: 36, right: 46, fontSize: 11, opacity: 0.7 }]}>✦</AppText>
            </>
          ) : null}
        </LinearGradient>
      )}
      {showTitle && title ? (
        <View style={[styles.titleBox, { padding: s.pad }]} pointerEvents="none">
          <AppText numberOfLines={2} style={[styles.title, { fontSize: s.title, color: showImage ? colors.white : colors.navy }, showImage && styles.titleShadow]}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText numberOfLines={1} variant="caption" color={showImage ? "rgba(255,255,255,0.85)" : "rgba(30,41,59,0.65)"}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: "hidden", backgroundColor: colors.surface },
  shade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "50%" },
  fallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  sparkle: { position: "absolute", color: "rgba(255,255,255,0.9)" },
  titleBox: { position: "absolute", left: 0, right: 0, bottom: 0 },
  title: { fontFamily: fonts.display, lineHeight: undefined },
  titleShadow: { textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
});
