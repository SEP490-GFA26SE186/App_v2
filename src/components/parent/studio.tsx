import { useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from "react-native";
import { AlertTriangle, BookPlus, Check, CheckCircle2, CircleHelp, ImageIcon, Lock, RefreshCw, RotateCcw, Save, Sparkles, Trash2 } from "lucide-react-native";
import { AppText, Badge, Button, Card, IconButton, ProgressBar, SelectField, Sheet, Spinner, TagEq, TagTheme, TextField } from "@/components/ui";
import { CASEL_CODES } from "@/constants/casel";
import { CHECKPOINT_TYPES, EMOTIONS, OPTION_ROLES } from "@/constants/story";
import { useSetStoryCover, useSubSkills } from "@/hooks/useStudio";
import { ApiError } from "@/services/mockApi";
import { toast } from "@/stores/toastStore";
import { colors, ink, radius } from "@/theme";
import type { Checkpoint, CheckpointOption, Emotion, Generation, OptionRole, Scene, Story, StoryCharacter, StoryPage } from "@/types/models";
import { coverOf } from "@/utils/child";
import { fillNames, nameOfToken } from "@/utils/storyNames";
import { ShelfToggles } from "./ShelfToggles";
import { StoryCover } from "./StoryCover";
import { CaselTag } from "./tags";

const DRAWING = new Set(["queued", "generating"]);
const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

// ---------------- Giọng đọc ----------------

/** Trạng thái giọng đọc của truyện — null = không cần hiện (chưa hoàn tất / tắt giọng đọc). */
export function narrationState(story?: Story) {
  const n = story?.narration;
  if (!story?.reviewedAt || !n?.enabled) return null;
  const percent = n.total ? Math.round((n.ready / n.total) * 100) : 100;
  if (n.complete) return { phase: "ready" as const, percent: 100, n };
  if (n.pending > 0) return { phase: "working" as const, percent, n };
  // Hết đoạn đang chờ mà vẫn thiếu: lỗi (thử lại được) hoặc chữ đã sửa sau lần hoàn tất (bấm hoàn tất lại)
  return { phase: n.failed > 0 ? ("failed" as const) : ("stale" as const), percent, n };
}

export function NarrationPanel({ story, onRetry, retrying }: { story: Story; onRetry: () => void; retrying: boolean }) {
  const state = narrationState(story);
  if (!state) return null;
  const { n, percent, phase } = state;
  if (phase === "ready") {
    return (
      <Card style={styles.rowCard}>
        <CheckCircle2 size={28} color={colors.secondaryDark} />
        <View style={styles.flex}>
          <AppText variant="h3">Giọng đọc đã sẵn sàng</AppText>
          <AppText variant="small">Đã đọc xong {n.total} đoạn. Bé có thể nghe truyện này.</AppText>
        </View>
      </Card>
    );
  }
  const working = phase === "working";
  return (
    <Card style={[styles.gap12, !working && styles.dangerBorder]}>
      <View style={styles.inline}>
        {working ? <ActivityIndicator color={colors.primary} /> : <AlertTriangle size={26} color={colors.danger} />}
        <View style={styles.flex}>
          <AppText variant="h3">{working ? "Đang tạo giọng đọc…" : "Giọng đọc chưa đủ"}</AppText>
          <AppText variant="small">
            {working
              ? `Đã xong ${n.ready}/${n.total} đoạn. Truyện 8 trang mất khoảng 5–6 phút; ba mẹ có thể rời trang này.`
              : n.missing > 0 && n.failed === 0
                ? `Có ${n.missing} đoạn đã sửa chữ sau lần hoàn tất trước. Bấm hoàn tất lại để đọc lại các đoạn đó.`
                : `Có ${n.failed + n.missing} đoạn chưa đọc được. Bé chưa nghe được truyện này cho tới khi đủ giọng đọc.`}
          </AppText>
        </View>
      </View>
      <ProgressBar percent={percent} height={8} track={colors.navyTint} colors={[colors.primary, colors.primary]} />
      {n.failed > 0 && !working ? <Button label="Thử lại giọng đọc" icon={RotateCcw} loading={retrying} onPress={onRetry} /> : null}
    </Card>
  );
}

/** Dòng trạng thái trên thanh Hoàn tất: chưa hoàn tất / đang tạo giọng đọc / sẵn sàng / lỗi. */
export function FinishBarStatus({ story }: { story: Story }) {
  const voice = narrationState(story);
  if (!story.reviewedAt) return <AppText variant="small">Xem lại hết các trang và điểm dừng rồi bấm hoàn tất.</AppText>;
  if (!voice) return <AppText variant="small">Truyện đã hoàn tất. Sửa thêm thì bấm hoàn tất lại.</AppText>;
  if (voice.phase === "working") {
    return (
      <View style={styles.gap6}>
        <View style={styles.inline}>
          <ActivityIndicator size="small" color={colors.primary} />
          <AppText variant="label">
            Đang tạo giọng đọc · {voice.n.ready}/{voice.n.total} đoạn
          </AppText>
        </View>
        <ProgressBar percent={voice.percent} height={6} track={colors.navyTint} colors={[colors.primary, colors.primary]} />
      </View>
    );
  }
  if (voice.phase === "ready") {
    return (
      <View style={styles.inline}>
        <CheckCircle2 size={16} color={colors.secondaryDark} />
        <AppText variant="label" color={colors.secondaryDark} style={styles.flex}>
          Giọng đọc đã sẵn sàng — bé nghe được truyện này.
        </AppText>
      </View>
    );
  }
  return (
    <View style={styles.inline}>
      <AlertTriangle size={16} color={colors.danger} />
      <AppText variant="label" color={colors.danger} style={styles.flex}>
        {voice.phase === "failed" ? `Còn ${voice.n.failed + voice.n.missing} đoạn giọng đọc chưa tạo được.` : `Có ${voice.n.missing} đoạn đã sửa chữ — bấm hoàn tất lại để đọc lại.`}
      </AppText>
    </View>
  );
}

// ---------------- AI viết ----------------

/** Trạng thái AI viết truyện. `busy`: job còn chạy hoặc truyện vẫn đang generating. */
export function GenerationPanel({
  generation,
  busy,
  neverGenerated,
  onStart,
  starting,
  startError,
  cost,
}: {
  generation?: Generation | null;
  busy: boolean;
  neverGenerated: boolean;
  onStart: () => void;
  starting: boolean;
  startError?: string;
  cost?: number;
}) {
  if (busy) {
    return (
      <Card padding={28} style={styles.centerCard}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText variant="h2" align="center">
          Cú Weaver đang viết truyện…
        </AppText>
        <AppText variant="small" align="center">
          Thường mất từ 30 giây đến khoảng 3 phút với truyện dài. Ba mẹ cứ để trang này mở hoặc quay lại sau, truyện vẫn được viết tiếp. (Bản demo: khoảng 7 giây)
        </AppText>
      </Card>
    );
  }
  const failed = generation && (generation.status === "failed" || generation.status === "blocked");
  if (!failed && !neverGenerated) return null;
  return (
    <Card padding={28} style={[styles.centerCard, failed && styles.dangerBorder]}>
      {failed ? <AlertTriangle size={36} color={colors.danger} /> : <Sparkles size={36} color={colors.primary} />}
      <AppText variant="h2" align="center">
        {failed ? "AI chưa viết được truyện" : "Truyện đang chờ AI viết"}
      </AppText>
      {failed ? (
        <AppText variant="small" align="center">
          {generation?.errorMessage || "Có lỗi xảy ra."} Credit của lần này đã được hoàn lại.
        </AppText>
      ) : null}
      {startError ? (
        <AppText variant="small" weight="semibold" color={colors.danger} align="center">
          {startError}
        </AppText>
      ) : null}
      <Button
        label={`${failed ? "Cho AI viết lại" : "Cho AI viết truyện"}${cost ? ` · ${cost} credit` : ""}`}
        icon={failed ? RotateCcw : Sparkles}
        loading={starting}
        onPress={onStart}
        style={styles.center}
      />
    </Card>
  );
}

// ---------------- Giá sách & bìa ----------------

const SHELF_REASON: Record<string, string> = {
  not_reviewed: "Bấm hoàn tất truyện trước khi đưa lên giá sách.",
  narration_incomplete: "Đợi giọng đọc tạo xong (hoặc thử lại giọng đọc) rồi mới đưa lên giá sách được.",
};

// Đưa truyện lên giá sách của từng bé. Chỉ mở khi truyện "sẵn sàng cho trẻ".
export function ShelfPanel({ story }: { story: Story }) {
  if (!story.reviewedAt) return null;
  return (
    <Card style={styles.gap12}>
      <View style={styles.inline}>
        <BookPlus size={22} color={colors.primary} />
        <AppText variant="h3">Giá sách của bé</AppText>
      </View>
      {!story.readiness.ready ? (
        <View style={styles.inlineTop}>
          <Lock size={16} color={ink.muted} />
          <AppText variant="small" style={styles.flex}>
            {SHELF_REASON[story.readiness.reason ?? ""] ?? "Truyện chưa sẵn sàng cho bé đọc."}
          </AppText>
        </View>
      ) : (
        <ShelfToggles storyId={story.id} />
      )}
    </Card>
  );
}

/** Ảnh bìa: chọn tranh một cảnh làm bìa. "Dùng ảnh mặc định" = cảnh 1. */
export function CoverPicker({ story, disabled }: { story: Story; disabled: boolean }) {
  const setCover = useSetStoryCover(story.id);
  const cover = coverOf(story);
  const scenes = story.scenes.filter((s) => s.imageUrl && !DRAWING.has(s.imageStatus)).sort((a, b) => a.sceneOrder - b.sceneOrder);
  const drawing = story.scenes.some((s) => DRAWING.has(s.imageStatus));
  const selectedId = story.coverSceneId;
  const pendingId = setCover.isPending ? setCover.variables : undefined;
  const choose = (sceneId: string | null) => {
    if (sceneId === selectedId) return;
    setCover.mutate(sceneId, {
      onSuccess: () => toast.success(sceneId ? "Đã đổi ảnh bìa" : "Đã dùng ảnh bìa mặc định"),
      onError: (err) => toast.error(err instanceof ApiError && err.status === 422 ? err.message : err.message),
    });
  };

  return (
    <Card style={styles.gap14}>
      <View>
        <View style={styles.inline}>
          <ImageIcon size={20} color={colors.primary} />
          <AppText variant="h3">Ảnh bìa</AppText>
        </View>
        <AppText variant="small">Bìa dùng tranh của một cảnh trong truyện (mặc định là cảnh 1). Tên truyện luôn hiện trên bìa.</AppText>
      </View>
      <StoryCover cover={cover} title={story.title} showTitle style={styles.coverPreview} />
      {scenes.length > 0 ? (
        <View style={styles.sceneGrid}>
          {scenes.map((scene) => {
            const selected = scene.id === selectedId || (selectedId === null && scene.sceneOrder === 1);
            return (
              <Pressable
                key={scene.id}
                onPress={() => choose(scene.id)}
                disabled={disabled || setCover.isPending}
                accessibilityLabel={`Dùng tranh cảnh ${scene.sceneOrder} làm bìa`}
                style={[styles.sceneThumb, selected && styles.sceneSelected]}
              >
                <Image source={{ uri: scene.imageUrl! }} style={StyleSheet.absoluteFill} />
                <View style={styles.sceneLabel}>
                  <AppText variant="caption" weight="bold" color={colors.navy}>
                    Cảnh {scene.sceneOrder}
                  </AppText>
                </View>
                {selected ? (
                  <View style={styles.sceneCheck}>
                    <Check size={14} color={colors.white} />
                  </View>
                ) : null}
                {pendingId === scene.id ? (
                  <View style={styles.scenePending}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.surfaceBox}>
          <AppText variant="small">{drawing ? "Tranh đang được vẽ — xong là chọn được ảnh bìa." : "Truyện chưa có tranh nên bìa dùng màu theo năng lực của bài học."}</AppText>
        </View>
      )}
      {scenes.length > 0 ? (
        <Button
          label={selectedId === null ? "Đang dùng ảnh mặc định" : "Dùng ảnh mặc định"}
          icon={selectedId === null ? Check : RotateCcw}
          variant="ghost"
          size="sm"
          disabled={disabled || selectedId === null}
          loading={pendingId === null}
          onPress={() => choose(null)}
        />
      ) : null}
    </Card>
  );
}

/** Tranh AI của một cảnh, đặt trên trang đầu tiên của cảnh đó. */
export function ScenePicture({ scene, pageRange, cost, onRedraw, redrawing, disabled }: { scene: Scene; pageRange: string; cost?: number; onRedraw: () => void; redrawing: boolean; disabled: boolean }) {
  const drawing = DRAWING.has(scene.imageStatus);
  return (
    <Card padding={0} style={styles.scene}>
      <View style={styles.sceneImg}>
        {scene.imageUrl && !drawing ? (
          <Image source={{ uri: scene.imageUrl }} style={StyleSheet.absoluteFill} accessibilityLabel={`Tranh cảnh ${scene.sceneOrder}`} />
        ) : drawing ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.primary} />
            <AppText variant="label" color={colors.primaryDark} align="center">
              {scene.imageStatus === "generating" ? "AI đang vẽ tranh… (khoảng 15–30 giây)" : "Đang chờ vẽ chân dung nhân vật trước"}
            </AppText>
          </View>
        ) : scene.imageStatus === "failed" ? (
          <View style={styles.centerBox}>
            <AlertTriangle size={28} color={colors.danger} />
            <AppText variant="label" color={colors.danger}>
              Vẽ chưa được — credit đã hoàn lại
            </AppText>
          </View>
        ) : (
          <View style={styles.centerBox}>
            <ImageIcon size={30} color={ink.faint} />
            <AppText variant="small">Cảnh này chưa có tranh</AppText>
          </View>
        )}
      </View>
      <View style={styles.sceneFoot}>
        <AppText variant="caption" weight="regular">
          Tranh cảnh {scene.sceneOrder} · {pageRange}
        </AppText>
        {scene.description?.trim() && !drawing ? (
          <Button label={`${scene.imageUrl ? "Vẽ lại cảnh" : "Vẽ tranh"}${cost ? ` · ${cost} credit` : ""}`} icon={RefreshCw} variant="tint" size="sm" disabled={disabled} loading={redrawing} onPress={onRedraw} />
        ) : null}
      </View>
    </Card>
  );
}

// ---------------- Trang & điểm dừng ----------------

/** Sửa chữ một trang. Hiện tên thật thay token; lưu gửi chữ có tên, BE tự đổi lại thành token. */
export function PageEditor({
  page,
  characters,
  disabled,
  gap,
  warning,
  onSave,
  saving,
  onDelete,
  deleting,
}: {
  page: StoryPage;
  characters: StoryCharacter[];
  disabled: boolean;
  gap?: string;
  warning?: string;
  onSave: (text: string) => void;
  saving: boolean;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const original = fillNames(page.contentText, characters);
  const [text, setText] = useState(original);
  const dirty = text !== original;
  return (
    <Card style={[styles.gap10, gap ? styles.gapBorder : null]}>
      <View style={styles.between}>
        <AppText variant="title">Trang {page.pageOrder}</AppText>
        <View style={styles.inline}>
          {page.origin === "ai" ? <TagTheme label="AI viết" size="sm" /> : null}
          {page.origin === "ai_edited" ? <TagTheme label="AI viết, ba mẹ sửa" size="sm" /> : null}
          <AppText variant="caption">{wordCount(text)} tiếng</AppText>
          {onDelete ? <IconButton icon={Trash2} label={`Xóa trang ${page.pageOrder}`} color={ink.faint} size={16} disabled={disabled || deleting} onPress={onDelete} /> : null}
        </View>
      </View>
      <TextField value={text} onChangeText={setText} editable={!disabled} multiline placeholder="Viết lời kể cho trang này…" />
      {gap ? (
        <AppText variant="small" weight="semibold" color={colors.danger}>
          {gap}
        </AppText>
      ) : warning ? (
        <AppText variant="small" weight="semibold" color={colors.amber}>
          {warning}
        </AppText>
      ) : null}
      <Button label="Lưu trang" icon={Save} size="sm" disabled={disabled || !dirty} loading={saving} onPress={() => onSave(text)} style={styles.end} />
    </Card>
  );
}

const ROLE_ORDER: OptionRole[] = ["constructive", "avoidant", "impulsive"];

type CpForm = { question: string; hint: string; answerEmotion: string; options: CheckpointOption[] };

/** Trạng thái form từ điểm dừng của BE (chữ token → tên). Luôn đủ 3 phương án cho 2 kiểu có phương án. */
function initialForm(cp: Checkpoint, characters: StoryCharacter[]): CpForm {
  const name = (t?: string | null) => fillNames(t, characters);
  let options: CheckpointOption[] = [];
  if (cp.type === "perspective") options = [0, 1, 2].map((i) => ({ text: name(cp.options[i]?.text), isCorrect: cp.options[i]?.isCorrect === true }));
  else if (cp.type === "problem_solving") {
    const byRole = new Map(cp.options.map((o) => [o.role, o]));
    options = ROLE_ORDER.map((role) => ({ role, text: name(byRole.get(role)?.text), feedback: name(byRole.get(role)?.feedback) }));
  }
  return { question: name(cp.question), hint: name(cp.hint), answerEmotion: cp.answerEmotion ?? "", options };
}

/** Body gửi PUT /stories/:id/checkpoints/:cpId theo đúng luật từng kiểu. */
function toBody(type: Checkpoint["type"], form: CpForm) {
  const body = { question: form.question };
  if (type === "emotion_self" || type === "emotion_other") return { ...body, hint: form.hint, answerEmotion: (form.answerEmotion || "neutral") as Emotion };
  if (type === "perspective") return { ...body, hint: form.hint, options: form.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })) };
  if (type === "problem_solving") return { ...body, options: form.options.map((o) => ({ text: o.text, role: o.role, feedback: o.feedback })) };
  return body; // reflection: chỉ có câu hỏi
}

interface CpProps {
  checkpoint: Checkpoint;
  storyEntry: Story["entry"];
  characters: StoryCharacter[];
  disabled: boolean;
  gap?: string;
  warning?: string;
  onSave: (body: ReturnType<typeof toBody>, done: () => void) => void;
  saving: boolean;
  onDelete?: () => void;
  deleting?: boolean;
}

function CheckpointHead({ cp, characters, right }: { cp: Checkpoint; characters: StoryCharacter[]; right?: ReactNode }) {
  return (
    <View style={styles.gap6}>
      <View style={styles.between}>
        <View style={[styles.inline, styles.flex]}>
          <CircleHelp size={18} color={colors.secondaryDark} />
          <AppText variant="title" color={colors.secondaryDark} style={styles.flex}>
            Điểm dừng sau trang {cp.afterPageOrder}: {CHECKPOINT_TYPES[cp.type]?.label ?? cp.type}
          </AppText>
        </View>
        {right}
      </View>
      {cp.targetToken ? <TagEq label={`Hỏi về: ${nameOfToken(cp.targetToken, characters)}`} size="sm" /> : null}
    </View>
  );
}

/** Truyện AI (chuyện mẫu lẫn "Kể chuyện nhà mình") khoá câu hỏi: câu hỏi do khung của chuyên gia quyết định. */
export function CheckpointEditor(props: CpProps) {
  return props.checkpoint.locked || props.storyEntry === "family" ? <LockedCheckpoint {...props} /> : <EditableCheckpoint {...props} />;
}

function LockedCheckpoint({ checkpoint: cp, characters, gap, warning }: CpProps) {
  const form = initialForm(cp, characters);
  const rows = [
    ["Câu hỏi cho bé", form.question],
    cp.type === "emotion_self" || cp.type === "emotion_other" ? ["Cảm xúc đúng", EMOTIONS[form.answerEmotion as Emotion] ?? form.answerEmotion] : null,
    form.hint ? ["Gợi ý khi bé chọn sai", form.hint] : null,
  ].filter(Boolean) as [string, string][];
  return (
    <View style={[styles.checkpoint, gap ? styles.gapBorder : null]}>
      <CheckpointHead cp={cp} characters={characters} />
      <View style={styles.inline}>
        <Lock size={14} color={ink.soft} />
        <AppText variant="caption" color={ink.soft}>
          Câu hỏi do khung của chuyên gia sư phạm quyết định
        </AppText>
      </View>
      {rows.map(([label, value]) => (
        <View key={label}>
          <AppText variant="caption">{label}</AppText>
          <AppText variant="small" color={colors.navy}>
            {value || "—"}
          </AppText>
        </View>
      ))}
      {form.options.map((o, i) => (
        <View key={i} style={styles.option}>
          {o.role ? <Badge label={OPTION_ROLES[o.role].label} bg={OPTION_ROLES[o.role].bg} fg={OPTION_ROLES[o.role].fg} size="sm" /> : null}
          <AppText variant="small" color={colors.navy}>
            {o.text || "—"}
            {o.isCorrect ? <AppText variant="caption" color={colors.secondaryDark}> (đúng)</AppText> : null}
          </AppText>
          {o.feedback ? <AppText variant="small">{o.feedback}</AppText> : null}
        </View>
      ))}
      {gap ? <AppText variant="small" weight="semibold" color={colors.danger}>{gap}</AppText> : warning ? <AppText variant="small" weight="semibold" color={colors.amber}>{warning}</AppText> : null}
    </View>
  );
}

function EditableCheckpoint({ checkpoint: cp, characters, disabled, gap, warning, onSave, saving, onDelete, deleting }: CpProps) {
  const [form, setForm] = useState(() => initialForm(cp, characters));
  const [dirty, setDirty] = useState(false);
  const isEmotion = cp.type === "emotion_self" || cp.type === "emotion_other";
  const set = (patch: Partial<CpForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };
  const setOption = (i: number, patch: Partial<CheckpointOption>) => set({ options: form.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) });

  return (
    <View style={[styles.checkpoint, gap ? styles.gapBorder : null]}>
      <CheckpointHead cp={cp} characters={characters} right={onDelete ? <IconButton icon={Trash2} label="Xóa điểm dừng" color={ink.faint} size={16} disabled={disabled || deleting} onPress={onDelete} /> : null} />
      <TextField label="Câu hỏi cho bé" value={form.question} onChangeText={(question) => set({ question })} editable={!disabled} />
      {isEmotion ? (
        <>
          <SelectField label="Cảm xúc đúng" value={form.answerEmotion} placeholder="— Chọn cảm xúc —" options={Object.entries(EMOTIONS).map(([value, label]) => ({ value, label }))} onChange={(answerEmotion) => set({ answerEmotion })} />
          <TextField label="Gợi ý khi bé chọn sai" value={form.hint} onChangeText={(hint) => set({ hint })} editable={!disabled} />
        </>
      ) : null}
      {cp.type === "perspective" ? (
        <>
          <AppText variant="label">Ba phương án (đánh dấu phương án đúng)</AppText>
          {form.options.map((o, i) => (
            <View key={i} style={styles.optionRow}>
              <Pressable
                onPress={() => set({ options: form.options.map((x, j) => ({ ...x, isCorrect: j === i })) })}
                accessibilityRole="radio"
                accessibilityState={{ checked: !!o.isCorrect }}
                accessibilityLabel={`Phương án ${i + 1} là đúng`}
                style={[styles.radio, o.isCorrect && styles.radioOn]}
              >
                {o.isCorrect ? <View style={styles.radioDot} /> : null}
              </Pressable>
              <TextField value={o.text} onChangeText={(text) => setOption(i, { text })} editable={!disabled} placeholder={`Phương án ${i + 1}`} containerStyle={styles.flex} />
            </View>
          ))}
          <TextField label="Gợi ý khi bé chọn sai" value={form.hint} onChangeText={(hint) => set({ hint })} editable={!disabled} />
        </>
      ) : null}
      {cp.type === "problem_solving" ? (
        <>
          <AppText variant="label">Ba cách bé có thể làm (vai do khung quy định)</AppText>
          {form.options.map((o, i) => (
            <View key={o.role} style={styles.option}>
              <Badge label={OPTION_ROLES[o.role!].label} bg={OPTION_ROLES[o.role!].bg} fg={OPTION_ROLES[o.role!].fg} size="sm" />
              <TextField value={o.text} onChangeText={(text) => setOption(i, { text })} editable={!disabled} placeholder="Bé sẽ làm gì?" />
              <TextField value={o.feedback ?? ""} onChangeText={(feedback) => setOption(i, { feedback })} editable={!disabled} placeholder="Chuyện gì xảy ra sau đó?" />
            </View>
          ))}
        </>
      ) : null}
      {gap ? <AppText variant="small" weight="semibold" color={colors.danger}>{gap}</AppText> : warning ? <AppText variant="small" weight="semibold" color={colors.amber}>{warning}</AppText> : null}
      <Button label="Lưu điểm dừng" icon={Save} size="sm" disabled={disabled || !dirty} loading={saving} onPress={() => onSave(toBody(cp.type, form), () => setDirty(false))} style={styles.end} />
    </View>
  );
}

// ---------------- Chọn kỹ năng ("Đổi kỹ năng") ----------------

const MAX_SKILLS = 2;

/** Chọn 1–2 kỹ năng con nhóm theo 5 năng lực CASEL. Thứ tự chọn = thứ tự ưu tiên. */
export function SubSkillPicker({ initial, busy, onClose, onConfirm }: { initial: string[]; busy: boolean; onClose: () => void; onConfirm: (ids: string[]) => void }) {
  const { data: subSkills = [], isLoading } = useSubSkills();
  const [picked, setPicked] = useState(initial.slice(0, MAX_SKILLS));
  const groups = useMemo(() => CASEL_CODES.map((code) => ({ code, items: subSkills.filter((s) => s.skill.caselCode === code) })).filter((g) => g.items.length), [subSkills]);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_SKILLS ? [...p.slice(1), id] : [...p, id]));

  return (
    <Sheet
      open
      onClose={onClose}
      title="Đổi kỹ năng bé sẽ tập"
      description="Chọn 1–2 kỹ năng. Kỹ năng chọn đầu tiên là kỹ năng chính; hệ thống đọc lại chuyện để tìm chỗ cho bé tập."
      footer={
        <>
          <Button label="Hủy" variant="surface" size="sm" onPress={onClose} />
          <Button label={`Dùng ${picked.length || ""} kỹ năng này`} size="sm" disabled={!picked.length} loading={busy} onPress={() => onConfirm(picked)} />
        </>
      }
    >
      {isLoading ? <Spinner size="small" /> : null}
      {groups.map(({ code, items }) => (
        <View key={code} style={styles.gap8}>
          <CaselTag competency={code} bg={colors.secondaryTint} />
          {items.map((s) => {
            const index = picked.indexOf(s.id);
            const on = index >= 0;
            return (
              <Pressable key={s.id} onPress={() => toggle(s.id)} accessibilityState={{ selected: on }} style={[styles.skill, on && styles.skillOn]}>
                <View style={[styles.skillBox, on && styles.skillBoxOn]}>{on ? picked.length > 1 ? <AppText variant="caption" weight="bold" color={colors.white}>{index + 1}</AppText> : <Check size={14} color={colors.white} /> : null}</View>
                <View style={styles.flex}>
                  <AppText variant="label">{s.nameVi}</AppText>
                  <AppText variant="caption" weight="regular">
                    {s.descriptionVi}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap6: { gap: 6 },
  gap8: { gap: 8 },
  gap10: { gap: 10 },
  gap12: { gap: 12 },
  gap14: { gap: 14 },
  center: { alignSelf: "center" },
  end: { alignSelf: "flex-end" },
  inline: { flexDirection: "row", alignItems: "center", gap: 8 },
  inlineTop: { flexDirection: "row", gap: 8 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rowCard: { flexDirection: "row", alignItems: "center", gap: 12, borderColor: "rgba(0,168,150,0.4)" },
  dangerBorder: { borderColor: "rgba(186,26,26,0.4)" },
  gapBorder: { borderColor: colors.danger, borderWidth: 2 },
  centerCard: { alignItems: "center", gap: 10 },
  surfaceBox: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14 },
  coverPreview: { aspectRatio: 1, width: "62%", alignSelf: "center", borderRadius: radius.md },
  sceneGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sceneThumb: { width: "31%", aspectRatio: 1, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.outline, overflow: "hidden" },
  sceneSelected: { borderColor: colors.primary },
  sceneLabel: { position: "absolute", left: 4, bottom: 4, backgroundColor: "rgba(255,255,255,0.9)", borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 1 },
  sceneCheck: { position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  scenePending: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center" },
  scene: { overflow: "hidden" },
  sceneImg: { aspectRatio: 4 / 3, width: "100%", backgroundColor: colors.surface },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 20 },
  sceneFoot: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  checkpoint: { marginLeft: 16, gap: 10, borderRadius: radius.card, borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(0,168,150,0.4)", backgroundColor: "rgba(230,247,245,0.4)", padding: 16 },
  option: { gap: 6, backgroundColor: colors.white, borderRadius: radius.md, padding: 12 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.outline, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  radioOn: { borderColor: colors.secondary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.secondary },
  skill: { flexDirection: "row", gap: 12, borderWidth: 2, borderColor: colors.outline, borderRadius: radius.md, padding: 12 },
  skillOn: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  skillBox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: colors.outline, alignItems: "center", justifyContent: "center" },
  skillBoxOn: { borderColor: colors.primary, backgroundColor: colors.primary },
});
