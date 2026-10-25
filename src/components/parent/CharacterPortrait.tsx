import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { AlertTriangle, UserRound, WandSparkles } from "lucide-react-native";
import { AppText, Button } from "@/components/ui";
import { useAiPricing, useGeneratePortrait } from "@/hooks/useStudio";
import { ApiError } from "@/services/mockApi";
import { toast } from "@/stores/toastStore";
import { colors, ink, radius } from "@/theme";
import type { Character } from "@/types/models";

const DRAWING = new Set(["queued", "generating"]);

/**
 * Chân dung AI của nhân vật (1 ảnh, dùng làm ảnh tham chiếu để tranh cảnh vẽ đúng nhân vật).
 * Nút tạo / vẽ lại báo giá trước; đang vẽ thì hiện vòng xoay (danh sách nhân vật tự tải lại).
 */
export function CharacterPortrait({ character }: { character: Character }) {
  const generate = useGeneratePortrait();
  const { data: pricing } = useAiPricing();
  const cost = pricing?.images?.characterPortrait;
  const drawing = DRAWING.has(character.portraitStatus) || (generate.isPending && generate.variables === character.id);
  const failed = character.portraitStatus === "failed";

  const start = () =>
    generate.mutate(character.id, {
      onSuccess: () => toast.success(`Đang vẽ chân dung ${character.name}${cost ? ` — đã dùng ${cost} credit` : ""}`),
      onError: (e) => toast.error(e instanceof ApiError && e.status === 402 ? "Ba mẹ không đủ credit để vẽ chân dung" : e.message),
    });

  return (
    <View style={styles.root}>
      <View style={styles.box}>
        {character.portraitImageUrl && !drawing ? (
          <Image source={{ uri: character.portraitImageUrl }} style={styles.img} accessibilityLabel={`Chân dung ${character.name}`} />
        ) : drawing ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <UserRound size={56} color="rgba(30,41,59,0.3)" />
        )}
      </View>
      <View style={styles.footer}>
        {drawing ? (
          <AppText variant="caption" color={colors.primaryDark}>
            AI đang vẽ chân dung… (khoảng 30 giây)
          </AppText>
        ) : failed ? (
          <View style={styles.inline}>
            <AlertTriangle size={13} color={colors.danger} />
            <AppText variant="caption" color={colors.danger}>
              Vẽ chưa được, credit đã hoàn lại
            </AppText>
          </View>
        ) : (
          <AppText variant="caption" weight="regular" color={ink.faint} style={styles.flex}>
            {character.portraitImageUrl ? "Tranh trong truyện vẽ theo chân dung này" : "Chưa có chân dung AI"}
          </AppText>
        )}
        {!drawing ? (
          <Button
            label={`${character.portraitImageUrl ? "Vẽ lại" : "Tạo chân dung AI"}${cost ? ` · ${cost} credit` : ""}`}
            icon={WandSparkles}
            variant="tint"
            size="sm"
            disabled={!character.appearance?.trim()}
            onPress={start}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  box: { aspectRatio: 1, width: "100%", borderRadius: radius.md, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surface, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  img: { width: "100%", height: "100%" },
  footer: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  inline: { flexDirection: "row", alignItems: "center", gap: 4 },
  flex: { flexShrink: 1 },
});
