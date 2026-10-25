import { StyleSheet, View } from "react-native";
import { BookPlus, Check } from "lucide-react-native";
import { AppText, Button, Spinner } from "@/components/ui";
import { useShelfStatus, useToggleShelf } from "@/hooks/useStudio";
import { toast } from "@/stores/toastStore";

/** Đưa / bỏ một truyện trên giá sách của từng bé (truyện riêng đã sẵn sàng hoặc truyện đã mua). */
export function ShelfToggles({ storyId }: { storyId: string }) {
  const { data, isLoading } = useShelfStatus(storyId);
  const toggle = useToggleShelf(storyId);
  if (isLoading) return <Spinner size="small" />;
  if (!data?.children?.length) return <AppText variant="small">Ba mẹ chưa thêm hồ sơ bé nào.</AppText>;
  return (
    <View style={styles.wrap}>
      {data.children.map((c) => (
        <Button
          key={c.childId}
          label={c.inBookshelf ? `Đã có trên giá của ${c.name}` : `Đưa lên giá của ${c.name}`}
          icon={c.inBookshelf ? Check : BookPlus}
          variant={c.inBookshelf ? "tealTint" : "ghost"}
          size="sm"
          loading={toggle.isPending && toggle.variables?.childId === c.childId}
          onPress={() =>
            toggle.mutate(
              { childId: c.childId, add: !c.inBookshelf },
              { onSuccess: () => toast.success(c.inBookshelf ? `Đã bỏ khỏi giá của ${c.name}` : `Đã đưa lên giá của ${c.name}`), onError: (e) => toast.error(e.message) },
            )
          }
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
