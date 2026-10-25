import { Fragment, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bot, CheckCircle2, PenLine, Plus, RotateCcw, Store, Trash2 } from "lucide-react-native";
import { CaselTag } from "@/components/parent/tags";
import { CheckpointEditor, CoverPicker, FinishBarStatus, GenerationPanel, narrationState, NarrationPanel, PageEditor, ScenePicture, ShelfPanel } from "@/components/parent/studio";
import { AppText, Button, Card, EmptyState, Screen, ScreenHeader, SelectField, Spinner, TagEq, TagTheme } from "@/components/ui";
import { STORY_LENGTH_LABELS } from "@/constants/casel";
import { href, ROUTES } from "@/constants/routes";
import { CHECKPOINT_TYPES, NEEDS_TARGET, STORY_STATUS_LABELS } from "@/constants/story";
import { isGenerating, useAiPricing, useDeleteStory, useGenerateStory, useGeneration, useStory, useStoryEditor, useStoryImages } from "@/hooks/useStudio";
import { ApiError } from "@/services/mockApi";
import { toast } from "@/stores/toastStore";
import { colors, radius, shadows } from "@/theme";
import type { CheckpointType, StoryCharacter, StoryPage } from "@/types/models";

type ErrorList = { path: string; message: string }[];
// Lỗi theo đường dẫn của BE: "pages.<id>" / "checkpoints.<id>" → câu báo, để tô đỏ đúng chỗ
const gapsByPath = (errors: ErrorList) => Object.fromEntries(errors.map((e) => [e.path, e.message]));
// Từ `warn` (chuyên gia đặt) vẫn lưu được → nhắc phụ huynh cân nhắc; từ `block` BE trả 422 như một chỗ thiếu
const warningsByPath = (warnings: { path: string; keyword: string }[] = []) => {
  const byPath: Record<string, string[]> = {};
  for (const w of warnings) (byPath[w.path] ??= []).push(`“${w.keyword}”`);
  return Object.fromEntries(Object.entries(byPath).map(([path, kws]) => [path, `Có từ nên cân nhắc với bé: ${kws.join(", ")}. Ba mẹ xem diễn đạt nhẹ nhàng hơn nhé.`]));
};
const errorsOf = (err: Error): ErrorList => (err instanceof ApiError ? err.errors : []);

/** Thêm điểm dừng sau một trang (chỉ truyện tự viết). */
function AddCheckpointForm({ page, characters, onAdd, adding, onCancel }: { page: StoryPage; characters: StoryCharacter[]; onAdd: (b: { type: CheckpointType; afterPageId: string; targetToken?: string }) => void; adding: boolean; onCancel: () => void }) {
  const [type, setType] = useState<CheckpointType>("emotion_self");
  const others = characters.filter((c) => !c.isMain);
  const [target, setTarget] = useState(others[0]?.token ?? "");
  const needsTarget = NEEDS_TARGET.includes(type);
  return (
    <View style={styles.addCp}>
      <SelectField label={`Kiểu điểm dừng sau trang ${page.pageOrder}`} value={type} options={Object.entries(CHECKPOINT_TYPES).map(([value, { label }]) => ({ value: value as CheckpointType, label }))} onChange={setType} />
      {needsTarget ? <SelectField label="Hỏi về" value={target} options={others.map((c) => ({ value: c.token, label: c.name ?? c.token }))} onChange={setTarget} /> : null}
      <View style={styles.row}>
        <Button label="Hủy" variant="ghost" size="sm" onPress={onCancel} />
        <Button label="Thêm" size="sm" disabled={needsTarget && !target} loading={adding} onPress={() => onAdd({ type, afterPageId: page.id, ...(needsTarget ? { targetToken: target } : {}) })} />
      </View>
    </View>
  );
}

/** Xóa cả truyện: bấm lần 1 hiện xác nhận ngay tại chỗ, bấm "Xóa hẳn" mới xoá. */
function DeleteStoryButton({ onConfirm, deleting, disabled }: { onConfirm: () => void; deleting: boolean; disabled: boolean }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) return <Button label="Xóa truyện" icon={Trash2} variant="dangerLink" size="sm" disabled={disabled} onPress={() => setConfirming(true)} />;
  return (
    <View style={styles.gap8}>
      <AppText variant="label" color={colors.danger}>
        Xóa truyện này? Không khôi phục được.
      </AppText>
      <View style={styles.row}>
        <Button label="Giữ lại" variant="ghost" size="sm" onPress={() => setConfirming(false)} />
        <Button label="Xóa hẳn" icon={Trash2} variant="danger" size="sm" loading={deleting} onPress={onConfirm} />
      </View>
    </View>
  );
}

export default function StoryEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { storyId } = useLocalSearchParams<{ storyId: string }>();
  const removeStory = useDeleteStory();
  const { data: story, isLoading, error } = useStory(storyId);
  const isCustom = story?.length === "custom";
  const generation = useGeneration(storyId, { enabled: !!story && !isCustom });
  const generate = useGenerateStory(storyId);
  const pricing = useAiPricing();
  const images = useStoryImages(storyId);
  const editor = useStoryEditor(storyId);
  const [gaps, setGaps] = useState<Record<string, string | undefined>>({});
  const [addingAfter, setAddingAfter] = useState<string | null>(null);
  const voice = narrationState(story);

  // Giọng đọc chạy xong (đang tạo → sẵn sàng / lỗi) trong lúc ba mẹ còn ở trang → báo ngay.
  const prevPhase = useRef(voice?.phase);
  useEffect(() => {
    if (prevPhase.current === "working" && voice?.phase === "ready") toast.success("Giọng đọc đã sẵn sàng — bé nghe được truyện này rồi");
    if (prevPhase.current === "working" && voice?.phase === "failed") toast.error("Có đoạn giọng đọc bị lỗi — ba mẹ bấm “Thử lại” nhé");
    prevPhase.current = voice?.phase;
  }, [voice?.phase]);

  const header = <ScreenHeader section="Sáng tác truyện" title="Biên tập truyện" />;
  if (isLoading) return <Screen header={header}><Spinner /></Screen>;
  if (error || !story) return <Screen header={header}><EmptyState title="Không mở được truyện" text={error?.message} /></Screen>;

  const characters = story.characters;
  const busy = story.status === "generating" || isGenerating(generation.data);
  const allEmpty = story.pages.every((p) => !p.contentText);
  const neverGenerated = !isCustom && !generation.data && allEmpty;
  const failedEmpty = ["failed", "blocked"].includes(generation.data?.status ?? "") && allEmpty;
  // Truyện AI chưa có chữ (chưa sinh / sinh lỗi) → chỉ hiện khung sinh truyện, chưa hiện editor
  const showEditor = !busy && !neverGenerated && !failedEmpty;
  const warnings = warningsByPath(story.keywordWarnings);
  const checkpointAfter = new Map(story.checkpoints.map((c) => [c.afterPageId, c]));
  const sceneById = new Map(story.scenes.map((sc) => [sc.id, sc]));
  const sceneFirstPage = new Map<string | null, string>();
  const scenePages = new Map<string | null, number[]>();
  for (const p of story.pages) {
    if (!sceneFirstPage.has(p.sceneId)) sceneFirstPage.set(p.sceneId, p.id);
    scenePages.set(p.sceneId, [...(scenePages.get(p.sceneId) ?? []), p.pageOrder]);
  }
  const pageRange = (id: string) => {
    const o = scenePages.get(id) ?? [];
    return o.length > 1 ? `trang ${o[0]}–${o[o.length - 1]}` : `trang ${o[0]}`;
  };

  const handleError = (err: Error) => {
    const errs = errorsOf(err);
    if (errs.length) setGaps((g) => ({ ...g, ...gapsByPath(errs) }));
    toast.error(errs[0]?.message || err.message);
  };

  const finish = () =>
    editor.review.mutate(undefined, {
      onSuccess: (updated) => {
        setGaps({});
        toast.success(updated.narration.pending > 0 ? "Đã hoàn tất — đang tạo giọng đọc" : "Đã hoàn tất truyện");
      },
      onError: (err) => {
        const errs = errorsOf(err);
        setGaps(gapsByPath(errs));
        const blocked = errs.filter((e) => e.message.startsWith("Có từ không phù hợp")).length;
        toast.error(blocked ? `Còn ${blocked} chỗ có từ không phù hợp cho bé, ba mẹ sửa giúp nhé` : errs.length ? `Còn ${errs.length} chỗ chưa viết xong` : err.message);
      },
    });

  const startError = generate.error ? (generate.error instanceof ApiError && generate.error.status === 402 ? "Ba mẹ không đủ credit để AI viết truyện." : generate.error.message) : undefined;

  return (
    <Screen
      header={header}
      footer={
        showEditor ? (
          <View style={[styles.finishBar, shadows.mid, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <FinishBarStatus story={story} />
            <View style={styles.rowEnd}>
              {voice?.phase === "failed" ? (
                <Button label="Thử lại" icon={RotateCcw} variant="ghost" size="sm" loading={editor.retryNarration.isPending} onPress={() => editor.retryNarration.mutate(undefined, { onSuccess: () => toast.success("Đang tạo lại giọng đọc"), onError: handleError })} />
              ) : null}
              <Button label="Hoàn tất" icon={CheckCircle2} disabled={busy} loading={editor.review.isPending} onPress={finish} />
            </View>
          </View>
        ) : null
      }
    >
      <Card padding={20} style={styles.gap10}>
        <View style={styles.wrap}>
          <CaselTag competency={story.topic?.competency ?? story.cover.competency} bg={colors.secondaryTint} />
          <TagTheme icon={isCustom ? PenLine : Bot} label={isCustom ? "Tự viết" : `${story.entry === "family" ? "Kể chuyện nhà mình" : "AI viết giúp"} · ${STORY_LENGTH_LABELS[story.length]}`} />
          {story.entry === "family" && story.scored === false ? <TagEq label="Không chấm điểm" /> : null}
          <TagEq label={story.reviewedAt ? "Đã hoàn tất" : STORY_STATUS_LABELS[story.status]} />
        </View>
        <AppText variant="h1">{story.title}</AppText>
        <AppText variant="small">
          {story.topic ? `Chuyện mẫu: ${story.topic.title} · ` : ""}Nhân vật: {characters.map((c) => c.name).filter(Boolean).join(", ")}
        </AppText>
        {story.entry === "family" && (story.momentSummary || story.seedEvent || story.subSkills.length > 0) ? (
          <View style={styles.family}>
            {story.momentSummary ? (
              <AppText variant="small">
                Khoảnh khắc: <AppText variant="small" weight="semibold" color={colors.navy}>{story.momentSummary.replace(/\{NV(\d+)\}/g, (t) => characters.find((c) => c.token === t)?.name ?? t)}</AppText>
              </AppText>
            ) : null}
            {story.seedEvent ? (
              <AppText variant="small">
                Truyện thêm: <AppText variant="small" weight="semibold" color={colors.navy}>{story.seedEvent}</AppText>
              </AppText>
            ) : null}
            {story.subSkills.length ? (
              <AppText variant="small">
                Bé tập: <AppText variant="small" weight="semibold" color={colors.navy}>{[...story.subSkills].sort((a, b) => a.position - b.position).map((s) => s.nameVi).join(" · ")}</AppText>
              </AppText>
            ) : null}
            <AppText variant="caption" weight="regular">
              Muốn đổi lời kể hay nhân vật, ba mẹ hãy tạo truyện mới.
            </AppText>
          </View>
        ) : null}
        {story.reviewedAt && story.kind !== "published" ? <Button label="Đăng bán truyện này" icon={Store} variant="link" size="sm" onPress={() => router.push(href(ROUTES.PARENT.sellingNew(story.id)))} /> : null}
        <DeleteStoryButton
          disabled={busy}
          deleting={removeStory.isPending}
          onConfirm={() =>
            removeStory.mutate(story.id, {
              onSuccess: () => {
                toast.success("Đã xóa truyện");
                router.back();
              },
              onError: (err) => toast.error(err.message),
            })
          }
        />
      </Card>

      {!isCustom ? (
        <GenerationPanel
          cost={pricing.data?.lengths.find((p) => p.length === story.length)?.credits}
          generation={generation.data}
          busy={busy}
          neverGenerated={neverGenerated}
          onStart={() => generate.mutate(undefined, { onSuccess: () => toast.success("AI đang viết truyện"), onError: handleError })}
          starting={generate.isPending}
          startError={startError}
        />
      ) : null}

      {showEditor ? (
        <>
          <NarrationPanel story={story} retrying={editor.retryNarration.isPending} onRetry={() => editor.retryNarration.mutate(undefined, { onSuccess: () => toast.success("Đang tạo lại giọng đọc"), onError: handleError })} />
          <ShelfPanel story={story} />
          {story.kind !== "published" ? <CoverPicker story={story} disabled={busy} /> : null}

          {!isCustom && !story.useAiImage ? (
            <Card style={styles.gap10}>
              <AppText variant="title">Thêm tranh minh hoạ AI</AppText>
              <AppText variant="small">
                AI vẽ các cảnh theo chân dung nhân vật{pricing.data?.images ? ` · ${pricing.data.images.scene} credit/cảnh, chân dung còn thiếu ${pricing.data.images.characterPortrait} credit` : ""}.
              </AppText>
              <Button label="Vẽ tranh cho truyện" loading={images.drawAll.isPending} disabled={busy} onPress={() => images.drawAll.mutate(undefined, { onSuccess: () => toast.success("Đang vẽ tranh cho truyện"), onError: (e) => toast.error(e.message) })} />
            </Card>
          ) : null}

          {story.pages.map((page) => {
            const cp = checkpointAfter.get(page.id);
            // Tranh của cảnh đặt trên trang đầu tiên của cảnh đó
            const scene = story.useAiImage && page.sceneId ? sceneById.get(page.sceneId) : undefined;
            const firstOfScene = scene && sceneFirstPage.get(scene.id) === page.id;
            return (
              <Fragment key={page.id}>
                {firstOfScene && scene ? (
                  <ScenePicture
                    scene={scene}
                    pageRange={pageRange(scene.id)}
                    cost={pricing.data?.images.scene}
                    disabled={busy}
                    redrawing={images.redraw.isPending && images.redraw.variables === scene.id}
                    onRedraw={() => images.redraw.mutate(scene.id, { onSuccess: () => toast.success("Đang vẽ lại cảnh"), onError: (e) => toast.error(e.message) })}
                  />
                ) : null}
                <PageEditor
                  key={`${page.id}:${page.contentText}`}
                  page={page}
                  characters={characters}
                  disabled={busy}
                  gap={gaps[`pages.${page.id}`]}
                  warning={warnings[`pages.${page.id}`]}
                  saving={editor.updatePage.isPending && editor.updatePage.variables?.pageId === page.id}
                  onSave={(contentText) =>
                    editor.updatePage.mutate(
                      { pageId: page.id, contentText },
                      { onSuccess: () => (toast.success(`Đã lưu trang ${page.pageOrder}`), setGaps((g) => ({ ...g, [`pages.${page.id}`]: undefined }))), onError: handleError },
                    )
                  }
                  onDelete={isCustom ? () => editor.deletePage.mutate(page.id, { onSuccess: () => toast.success("Đã xóa trang"), onError: handleError }) : undefined}
                  deleting={editor.deletePage.isPending && editor.deletePage.variables === page.id}
                />
                {cp ? (
                  <CheckpointEditor
                    key={`${cp.id}:${JSON.stringify([cp.question, cp.hint, cp.answerEmotion, cp.options])}`}
                    checkpoint={cp}
                    storyEntry={story.entry}
                    characters={characters}
                    disabled={busy}
                    gap={gaps[`checkpoints.${cp.id}`]}
                    warning={warnings[`checkpoints.${cp.id}`]}
                    saving={editor.updateCheckpoint.isPending && editor.updateCheckpoint.variables?.checkpointId === cp.id}
                    onSave={(body, done) =>
                      editor.updateCheckpoint.mutate(
                        { checkpointId: cp.id, body },
                        { onSuccess: () => (toast.success("Đã lưu điểm dừng"), done(), setGaps((g) => ({ ...g, [`checkpoints.${cp.id}`]: undefined }))), onError: handleError },
                      )
                    }
                    onDelete={isCustom ? () => editor.deleteCheckpoint.mutate(cp.id, { onSuccess: () => toast.success("Đã xóa điểm dừng"), onError: handleError }) : undefined}
                    deleting={editor.deleteCheckpoint.isPending && editor.deleteCheckpoint.variables === cp.id}
                  />
                ) : null}
                {isCustom && !cp && page.pageOrder > 1 ? (
                  addingAfter === page.id ? (
                    <AddCheckpointForm
                      page={page}
                      characters={characters}
                      adding={editor.createCheckpoint.isPending}
                      onCancel={() => setAddingAfter(null)}
                      onAdd={(body) => editor.createCheckpoint.mutate(body, { onSuccess: () => (toast.success("Đã thêm điểm dừng"), setAddingAfter(null)), onError: handleError })}
                    />
                  ) : (
                    <Button label={`Thêm điểm dừng sau trang ${page.pageOrder}`} icon={Plus} variant="link" size="sm" onPress={() => setAddingAfter(page.id)} style={styles.addLink} />
                  )
                ) : null}
              </Fragment>
            );
          })}

          {isCustom ? <Button label="Thêm trang" icon={Plus} variant="ghost" fullWidth loading={editor.createPage.isPending} onPress={() => editor.createPage.mutate(undefined, { onSuccess: () => toast.success("Đã thêm trang"), onError: handleError })} /> : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap8: { gap: 8 },
  gap10: { gap: 10 },
  row: { flexDirection: "row", gap: 8 },
  rowEnd: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  family: { gap: 4, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14 },
  addCp: { marginLeft: 16, gap: 12, borderRadius: radius.card, borderWidth: 2, borderStyle: "dashed", borderColor: colors.outline, backgroundColor: colors.surface, padding: 16 },
  addLink: { marginLeft: 16 },
  finishBar: { gap: 10, backgroundColor: "rgba(255,255,255,0.97)", borderTopWidth: 1, borderColor: colors.outline, paddingHorizontal: 16, paddingTop: 12 },
});
