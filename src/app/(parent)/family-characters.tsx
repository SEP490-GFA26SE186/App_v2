import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { BookOpen, Pencil, Plus, Trash2, UsersRound } from "lucide-react-native";
import { CharacterPortrait } from "@/components/parent/CharacterPortrait";
import { AppText, Badge, Button, Card, EmptyState, IconButton, Note, PageIntro, Screen, ScreenHeader, Sheet, Spinner, TextField } from "@/components/ui";
import { href, ROUTES } from "@/constants/routes";
import { useSubscription } from "@/hooks/useParent";
import { useCharacterMutations, useCharacters } from "@/hooks/useStudio";
import { toast } from "@/stores/toastStore";
import { colors, ink } from "@/theme";
import type { Character } from "@/types/models";

function CharacterSheet({ character, onClose }: { character: Character | null; onClose: () => void }) {
  const [name, setName] = useState(character?.name ?? "");
  const [appearance, setAppearance] = useState(character?.appearance ?? "");
  const { create, update } = useCharacterMutations();
  const isChild = Boolean(character?.childId);
  const renamed = character && name.trim() !== character.name;

  const submit = () => {
    if (!name.trim() || appearance.trim().length < 3) return toast.error("Ba mẹ nhập tên và mô tả (ít nhất 3 ký tự) nhé");
    const body = { ...(isChild ? {} : { name: name.trim() }), appearance: appearance.trim() };
    const opts = {
      onSuccess: () => {
        toast.success(character ? "Đã lưu nhân vật" : "Đã thêm nhân vật");
        onClose();
      },
      onError: (err: Error) => toast.error(err.message),
    };
    if (character) update.mutate({ id: character.id, ...body }, opts);
    else create.mutate({ name: name.trim(), appearance: appearance.trim() }, opts);
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={character ? `Sửa nhân vật ${character.name}` : "Thêm nhân vật gia đình"}
      description="Mô tả bằng chữ để AI viết đúng tính cách, ngoại hình. Tên thật chỉ hiện trong truyện của gia đình — khi gửi AI và khi đăng bán đều được thay bằng tên chung."
      footer={
        <>
          <Button label="Hủy" variant="surface" size="sm" onPress={onClose} />
          <Button label="Lưu" size="sm" loading={create.isPending || update.isPending} onPress={submit} />
        </>
      }
    >
      <TextField
        label="Tên gọi trong truyện"
        value={name}
        onChangeText={setName}
        editable={!isChild}
        maxLength={100}
        placeholder="VD: Bà nội, Mèo Mướp, Anh Tí"
        hint={isChild ? "Nhân vật này là bé — đổi tên ở trang “Bé nhà mình”." : undefined}
      />
      <TextField label="Mô tả" value={appearance} onChangeText={setAppearance} multiline maxLength={1000} placeholder="VD: tóc bạc, đeo kính, rất hiền, hay kể chuyện cổ tích" />
      {renamed && character.storiesCount > 0 ? (
        <Note bg={colors.primaryTint} color={colors.primaryDark}>
          Tên mới sẽ hiện trong {character.storiesCount} truyện đang có nhân vật này. Truyện đã có giọng đọc cần bấm “Tạo lại giọng đọc” trong trang biên tập để bé nghe đúng tên.
        </Note>
      ) : null}
    </Sheet>
  );
}

// Nhân vật gia đình: ông bà, anh chị, thú cưng... dùng lại trong nhiều truyện.
export default function FamilyCharactersScreen() {
  const router = useRouter();
  const { data: characters = [], isLoading, error, refetch } = useCharacters();
  const { data: sub } = useSubscription();
  const [editing, setEditing] = useState<Character | "new" | null>(null);
  const [deleting, setDeleting] = useState<Character | null>(null);
  const { remove } = useCharacterMutations();
  const limit = sub?.plan?.maxCharacters;
  const full = limit != null && characters.length >= limit;

  return (
    <Screen header={<ScreenHeader section="Gia đình" title="Nhân vật gia đình" />} onRefresh={refetch}>
      <View style={styles.gap14}>
        <PageIntro
          icon={UsersRound}
          eyebrow="Nhân vật gia đình"
          title="Những người thân trong truyện của bé"
          text="Thêm ông bà, anh chị, bạn thân hay thú cưng một lần, dùng lại cho mọi truyện. Nhân vật của chính bé được tạo cùng hồ sơ bé."
        />
        <View style={styles.row}>
          {limit != null ? <Badge label={`${characters.length}/${limit} nhân vật`} bg={colors.surface} fg={ink.soft} /> : null}
          <Button label="Thêm nhân vật" icon={Plus} disabled={full} onPress={() => setEditing("new")} />
        </View>
      </View>
      {full ? (
        <Note bg={colors.primaryTint} color={colors.primaryDark}>
          Gói hiện tại cho tối đa {limit} nhân vật. Xoá bớt nhân vật không dùng hoặc nâng cấp gói ở mục Gói dịch vụ.
        </Note>
      ) : null}
      {full ? <Button label="Nâng cấp gói" variant="link" onPress={() => router.push(href(ROUTES.PARENT.BILLING))} /> : null}

      {isLoading ? <Spinner /> : null}
      {error ? <EmptyState title="Có lỗi xảy ra" text={error.message} /> : null}
      {!isLoading && !error && characters.length === 0 ? <EmptyState title="Chưa có nhân vật nào" text="Thêm người thân để AI viết truyện gần gũi với bé hơn." /> : null}

      {characters.map((c) => (
        <Card key={c.id} padding={18} style={styles.gap10}>
          <View style={styles.head}>
            <View style={styles.flex}>
              <AppText variant="h3">{c.name}</AppText>
              {c.child ? <Badge label={`Là bé ${c.child.name}`} size="sm" /> : null}
            </View>
            <IconButton icon={Pencil} label={`Sửa ${c.name}`} color={ink.muted} size={18} onPress={() => setEditing(c)} />
            {!c.childId ? <IconButton icon={Trash2} label={`Xoá ${c.name}`} color={ink.muted} size={18} onPress={() => setDeleting(c)} /> : null}
          </View>
          <AppText variant="small" color={ink.body} numberOfLines={3}>
            {c.appearance}
          </AppText>
          <CharacterPortrait character={c} />
          <View style={styles.inline}>
            <BookOpen size={13} color={ink.faint} />
            <AppText variant="caption" weight="regular" color={ink.faint}>
              {c.storiesCount ? `Có trong ${c.storiesCount} truyện` : "Chưa có trong truyện nào"}
            </AppText>
          </View>
        </Card>
      ))}

      {editing ? <CharacterSheet character={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
      <Sheet
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Xoá nhân vật “${deleting?.name ?? ""}”?`}
        description={deleting?.storiesCount ? `Các truyện đã viết (${deleting.storiesCount}) vẫn giữ nguyên nhân vật này; chỉ không chọn được cho truyện mới.` : "Nhân vật chưa có trong truyện nào."}
        footer={
          <>
            <Button label="Hủy" variant="surface" size="sm" onPress={() => setDeleting(null)} />
            <Button
              label="Xoá"
              icon={Trash2}
              variant="danger"
              size="sm"
              loading={remove.isPending}
              onPress={() =>
                deleting &&
                remove.mutate(deleting.id, {
                  onSuccess: () => {
                    toast.success("Đã xoá nhân vật");
                    setDeleting(null);
                  },
                  onError: (e) => toast.error(e.message),
                })
              }
            />
          </>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 4 },
  gap10: { gap: 10 },
  gap14: { gap: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 2 },
  inline: { flexDirection: "row", alignItems: "center", gap: 4 },
});
