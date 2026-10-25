import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ShieldCheck } from "lucide-react-native";
import { AppText, Button, Card, EmptyState, Screen, ScreenHeader, SelectField, Spinner, TextField } from "@/components/ui";
import { href, ROUTES } from "@/constants/routes";
import { useCreateListing, usePriceTiers } from "@/hooks/useMarket";
import { useStory } from "@/hooks/useStudio";
import { ApiError } from "@/services/mockApi";
import { toast } from "@/stores/toastStore";
import { colors, ink } from "@/theme";

// Đăng bán một truyện riêng đã hoàn tất: tên mới, mô tả, giá, tên chung cho từng nhân vật.
// BE tạo bản sao đã gỡ cá nhân hoá (không chuyện thật, không giọng đọc của gia đình) và gửi chuyên gia duyệt.
export default function NewListingScreen() {
  const router = useRouter();
  const { storyId } = useLocalSearchParams<{ storyId: string }>();
  const { data: story, isLoading } = useStory(storyId);
  const { data: tiers = [] } = usePriceTiers();
  const [form, setForm] = useState({ title: "", description: "", priceTierId: "" });
  const [aliases, setAliases] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useCreateListing();
  const header = <ScreenHeader section="Bán truyện" title="Đăng bán truyện" />;

  if (isLoading) return <Screen header={header}><Spinner /></Screen>;
  if (!story) return <Screen header={header}><EmptyState title="Không tìm thấy truyện." /></Screen>;

  const submit = () => {
    if (form.title.trim().length < 3) return setErrors({ "listing.title": "Tên truyện có ít nhất 3 ký tự" });
    if (!form.priceTierId) return toast.error("Ba mẹ chọn giá bán nhé");
    setErrors({});
    create.mutate(
      {
        storyId: story.id,
        title: form.title.trim(),
        description: form.description || undefined,
        priceTierId: form.priceTierId,
        aliases: story.characters.map((c) => ({ token: c.token, aliasName: aliases[c.token] ?? "" })),
      },
      {
        onSuccess: () => {
          toast.success("Đã gửi truyện cho chuyên gia duyệt");
          router.replace(href(ROUTES.PARENT.SELLING));
        },
        onError: (err) => {
          if (err instanceof ApiError) setErrors(Object.fromEntries(err.errors.map((x) => [x.path, x.message])));
          toast.error(err.message);
        },
      },
    );
  };

  return (
    <Screen header={header}>
      <View style={styles.gap8}>
        <AppText variant="h1">Đăng bán truyện</AppText>
        <View style={styles.inlineTop}>
          <ShieldCheck size={18} color={colors.secondary} />
          <AppText variant="small" style={styles.flex}>
            Bản đăng bán dùng tên chung thay tên thật, không kèm chuyện thật ở nhà và không kèm giọng đọc của gia đình.
          </AppText>
        </View>
      </View>
      <Card padding={20} style={styles.gap16}>
        <TextField label="Tên truyện trên Chợ (không dùng tên thật)" value={form.title} onChangeText={(title) => setForm({ ...form, title })} maxLength={200} placeholder="VD: Bé và cơn giận" error={errors["listing.title"]} />
        <TextField label="Mô tả (không bắt buộc)" value={form.description} onChangeText={(description) => setForm({ ...form, description })} multiline maxLength={2000} />
        <SelectField label="Giá" value={form.priceTierId} placeholder="— Chọn giá —" options={tiers.map((t) => ({ value: t.id, label: t.label }))} onChange={(priceTierId) => setForm({ ...form, priceTierId })} />
        <View style={styles.gap10}>
          <AppText variant="label">Tên chung cho nhân vật</AppText>
          <AppText variant="caption" weight="regular">
            {story.useTts ? "Truyện có giọng đọc: hệ thống đọc lại bằng tên chung này (vài phút) trước khi chuyên gia duyệt." : "Truyện đang tắt giọng đọc: bản đăng bán chỉ có chữ, người mua sẽ thấy nhãn “Chỉ có chữ”."}
          </AppText>
          {story.characters.map((c) => (
            <TextField
              key={c.token}
              label={`${c.name ?? c.token}${c.isMain ? " (chính)" : ""} →`}
              value={aliases[c.token] ?? ""}
              onChangeText={(t) => setAliases({ ...aliases, [c.token]: t })}
              maxLength={100}
              placeholder="VD: Bống"
              error={errors[`aliases.${c.token}`]}
            />
          ))}
        </View>
        {Object.entries(errors)
          .filter(([path]) => path.startsWith("pages.") || path.startsWith("checkpoints."))
          .map(([path, msg]) => (
            <AppText key={path} variant="small" color={colors.danger}>
              {msg}
            </AppText>
          ))}
        <Button label="Gửi chuyên gia duyệt" loading={create.isPending} onPress={submit} />
      </Card>
      <AppText variant="caption" weight="regular" color={ink.faint} align="center">
        Truyện gốc của gia đình vẫn giữ nguyên tên thật trên giá sách của bé.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap8: { gap: 8 },
  gap10: { gap: 10 },
  gap16: { gap: 16 },
  inlineTop: { flexDirection: "row", gap: 8 },
});
