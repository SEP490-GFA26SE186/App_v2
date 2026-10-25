import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookMarked, BookOpen, Check, House, Lightbulb, PenLine, Plus, Shuffle, Sparkles, Star, type LucideIcon } from "lucide-react-native";
import { SubSkillPicker } from "@/components/parent/studio";
import { CaselTag } from "@/components/parent/tags";
import { AppText, Button, Card, ChipRow, Screen, ScreenHeader, Sheet, Spinner, Switch, TagTheme, TextField } from "@/components/ui";
import { href, ROUTES } from "@/constants/routes";
import { AI_LENGTHS } from "@/constants/story";
import { refreshCredit } from "@/hooks/useParent";
import { useAiPricing, useAnalyzeStory, useCharacterMutations, useCharacters, useCreateStory, useTopics } from "@/hooks/useStudio";
import { ApiError } from "@/services/mockApi";
import { generateStory } from "@/services/storyService";
import useAuthStore from "@/stores/authStore";
import { toast } from "@/stores/toastStore";
import { colors, ink, radius } from "@/theme";
import type { Analysis, StoryLength } from "@/types/models";

type Entry = "family" | "topic" | "manual";

function Section({ step, title, hint, children }: { step: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <Card style={styles.gap14}>
      <View>
        <View style={styles.inline}>
          <View style={styles.step}>
            <AppText variant="caption" weight="bold" color={colors.white}>
              {step}
            </AppText>
          </View>
          <AppText variant="h3" style={styles.flex}>
            {title}
          </AppText>
        </View>
        {hint ? (
          <AppText variant="small" style={styles.mt4}>
            {hint}
          </AppText>
        ) : null}
      </View>
      {children}
    </Card>
  );
}

function NewCharacterSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (c: { id: string; name: string }) => void }) {
  const [form, setForm] = useState({ name: "", appearance: "" });
  const { create } = useCharacterMutations();
  const submit = () =>
    create.mutate(
      { name: form.name.trim(), appearance: form.appearance.trim() },
      {
        onSuccess: (character) => {
          setForm({ name: "", appearance: "" });
          onCreated(character);
        },
      },
    );
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Thêm nhân vật gia đình"
      description="Ông bà, anh chị em, bạn bè… Tên thật không gửi cho AI, chỉ mô tả ngoại hình."
      footer={
        <>
          <Button label="Hủy" variant="surface" size="sm" onPress={onClose} />
          <Button label="Thêm nhân vật" size="sm" disabled={!form.name.trim() || !form.appearance.trim()} loading={create.isPending} onPress={submit} />
        </>
      }
    >
      <TextField label="Tên gọi" value={form.name} onChangeText={(name) => setForm((f) => ({ ...f, name }))} placeholder="VD: Bà nội" />
      <TextField label="Ngoại hình" value={form.appearance} onChangeText={(appearance) => setForm((f) => ({ ...f, appearance }))} multiline placeholder="VD: Tóc bạc búi gọn, đeo kính, hay mặc áo bà ba nâu" />
      {create.error ? (
        <AppText variant="small" weight="semibold" color={colors.danger}>
          {create.error.message}
        </AppText>
      ) : null}
    </Sheet>
  );
}

const SITUATION_MIN = 20;
const SITUATION_MAX = 2000;

// Ba lối vào: "Kể chuyện nhà mình" đặt đầu tiên
const ENTRIES: { value: Entry; icon: LucideIcon; title: string; text: string; note: string }[] = [
  { value: "family", icon: House, title: "Kể chuyện nhà mình", text: "Ba mẹ kể chuyện bé vừa gặp, AI tìm khoảnh khắc khó và viết truyện để bé tập lại đúng lúc đó.", note: "Có báo cáo EQ (tắt được)" },
  { value: "topic", icon: BookMarked, title: "Chuyện mẫu", text: "Chọn chuyện chuyên gia soạn sẵn, mỗi chuyện giúp bé tập một năng lực cảm xúc (CASEL).", note: "Có báo cáo EQ" },
  { value: "manual", icon: PenLine, title: "Tự viết", text: "Ba mẹ tự viết từng trang và điểm dừng (4–20 trang).", note: "Không tính vào báo cáo EQ" },
];

// Kỹ năng đến từ đâu (story_sub_skills.source)
const SKILL_SOURCE: Record<string, string> = { moment: "từ khoảnh khắc trong chuyện", need: "bé đang cần tập", parent: "ba mẹ chọn" };

/** Lỗi phân tích / tạo truyện "Kể chuyện nhà mình" → lời tiếng Việt (502: AI lỗi; 429: quá lượt trong ngày). */
const familyError = (err: Error) => {
  const status = err instanceof ApiError ? err.status : 0;
  if (status >= 500) return "Chưa phân tích được, ba mẹ thử lại nhé";
  if (status === 429) return err.message || "Hôm nay ba mẹ đã phân tích nhiều lần rồi, mai thử lại nhé";
  return (err instanceof ApiError && err.errors[0]?.message) || err.message;
};

export default function CreateStoryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const creditBalance = useAuthStore((s) => s.user?.wallet?.creditBalance);
  const topics = useTopics();
  const characters = useCharacters();
  const createStory = useCreateStory();
  const analyze = useAnalyzeStory();
  const pricing = useAiPricing();
  const priceOf = (len: StoryLength) => pricing.data?.lengths.find((p) => p.length === len);

  // ?topicId= từ "Chuyện mẫu nên đọc tiếp" của Báo cáo EQ → mở thẳng lối vào Chuyện mẫu, chọn sẵn chuyện
  const { topicId: suggestedTopicId } = useLocalSearchParams<{ topicId?: string }>();
  const [entry, setEntry] = useState<Entry | null>(suggestedTopicId ? "topic" : null);
  const [topicId, setTopicId] = useState<string | null>(suggestedTopicId ?? null);
  const [selected, setSelected] = useState<string[]>([]);
  const [mainId, setMainId] = useState<string | null>(null);
  const [length, setLength] = useState<StoryLength>("medium");
  const [title, setTitle] = useState("");
  const [situation, setSituation] = useState("");
  const [useTts, setUseTts] = useState(true);
  const [useAiImage, setUseAiImage] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [picking, setPicking] = useState(false);
  const [showNewCharacter, setShowNewCharacter] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isAi = entry === "family" || entry === "topic";

  const toggleCharacter = (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    setSelected(next);
    // Nhân vật chính bị bỏ chọn (hoặc chưa có) → lấy nhân vật đầu tiên còn lại
    if (!mainId || !next.includes(mainId)) setMainId(next[0] ?? null);
  };

  // Giá của lần AI viết này và credit còn lại sau khi viết
  const cost = isAi ? priceOf(length)?.credits : 0;
  const afterCost = creditBalance != null && cost != null ? creditBalance - cost : null;
  const notEnough = isAi && afterCost != null && afterCost < 0;
  const imageCosts = pricing.data?.images;
  const missingPortraits = (characters.data ?? []).filter((c) => selected.includes(c.id) && !c.portraitImageUrl && c.portraitStatus === "none").length;
  const imagesMax = isAi && useAiImage && imageCosts ? imageCosts.maxScenes * imageCosts.scene + missingPortraits * imageCosts.characterPortrait : 0;

  const chosenTopicId = (topics.data ?? []).some((t) => t.id === topicId) ? topicId : null;
  const situationLength = situation.trim().length;
  const missing =
    (entry === "topic" && !chosenTopicId && "Ba mẹ chọn một chuyện mẫu nhé") ||
    (entry === "family" && situationLength < SITUATION_MIN && `Ba mẹ kể chuyện dài thêm một chút nhé (ít nhất ${SITUATION_MIN} ký tự)`) ||
    (selected.length === 0 && "Ba mẹ chọn ít nhất một nhân vật nhé") ||
    (!title.trim() && "Ba mẹ đặt tên cho truyện nhé") ||
    (notEnough && `Truyện này cần ${cost} credit, ba mẹ còn ${creditBalance} credit`) ||
    "";

  // Nhân vật chính đứng đầu → token {NV1}. Analyze và tạo truyện phải gửi giống nhau.
  const orderedCharacters = () => [mainId!, ...selected.filter((id) => id !== mainId)].map((characterId) => ({ characterId, isMain: characterId === mainId }));
  const mainName = (characters.data ?? []).find((c) => c.id === mainId)?.name ?? "bé";

  const pickEntry = (value: Entry | null) => {
    setEntry(value);
    setAnalysis(null);
    setError("");
    if (value === "manual") setUseAiImage(false);
  };

  const runAnalyze = async (subSkillIds?: string[]) => {
    if (missing) return setError(missing);
    setError("");
    try {
      setAnalysis(await analyze.mutateAsync({ situation: situation.trim(), characters: orderedCharacters(), length, ...(subSkillIds?.length ? { subSkillIds } : {}) }));
    } catch (err) {
      setError(familyError(err as Error));
    } finally {
      setPicking(false);
    }
  };

  /** Tạo truyện rồi (truyện AI) cho AI viết ngay; xong mở trình sửa truyện. */
  const createAndOpen = async (payload: Parameters<typeof createStory.mutateAsync>[0], ai: boolean) => {
    setError("");
    setSubmitting(true);
    try {
      const story = await createStory.mutateAsync(payload);
      if (ai) {
        try {
          await generateStory(story.id);
          refreshCredit(queryClient);
          if (cost) toast.success(`Đã dùng ${cost} credit — AI đang viết truyện`);
        } catch (err) {
          // Truyện đã tạo; báo lỗi rồi để trang editor cho bấm "Cho AI viết" lại
          toast.error(err instanceof ApiError && err.status === 402 ? "Ba mẹ không đủ credit để AI viết truyện" : (err as Error).message);
        }
      }
      router.replace(href(ROUTES.PARENT.studioStory(story.id)));
    } catch (err) {
      setError(entry === "family" ? familyError(err as Error) : (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const base = () => ({ title: title.trim(), characters: orderedCharacters(), useTts });

  const submit = () => {
    if (missing) return setError(missing);
    if (entry === "topic") return createAndOpen({ entry: "topic", topicId: chosenTopicId, length, ...base(), useAiImage }, true);
    // Tự viết có thể không gắn chuyện mẫu; BE đặt entry = handwritten
    return createAndOpen({ ...(chosenTopicId ? { topicId: chosenTopicId } : {}), length: "custom", ...base(), useAiImage: false }, false);
  };

  const createFamily = (scored: boolean) => {
    if (!analysis) return;
    if (notEnough) return setError(`Truyện này cần ${cost} credit, ba mẹ còn ${creditBalance} credit`);
    if (new Date(analysis.expiresAt) <= new Date()) {
      setAnalysis(null);
      return setError("Bản phân tích đã hết hạn, ba mẹ bấm “Xem bé sẽ tập gì” lại nhé");
    }
    createAndOpen({ entry: "family", length, ...base(), situation: situation.trim(), analysisToken: analysis.analysisToken, scored, useAiImage }, true);
  };

  const entryMeta = ENTRIES.find((e) => e.value === entry);
  const busy = submitting || analyze.isPending;
  const sortedSkills = [...(analysis?.subSkills ?? [])].sort((a, b) => a.position - b.position);

  const costNote =
    cost == null ? (
      <AppText variant="small">Đang tải giá…</AppText>
    ) : notEnough ? (
      <AppText variant="small" weight="semibold" color={colors.danger}>
        Truyện {priceOf(length) ? `${priceOf(length)!.pages} trang` : "này"} cần {cost} credit, ba mẹ còn {creditBalance} credit. Chọn độ dài ngắn hơn hoặc nâng gói.
      </AppText>
    ) : cost === 0 ? (
      <AppText variant="small">Lần viết này miễn phí.</AppText>
    ) : (
      <AppText variant="small">
        AI viết truyện này dùng <AppText variant="small" weight="bold" color={colors.navy}>{cost} credit</AppText>
        {afterCost != null ? (
          <>
            {" "}— ba mẹ đang có {creditBalance}, còn <AppText variant="small" weight="bold" color={colors.navy}>{afterCost}</AppText> sau khi viết
          </>
        ) : null}
        . Nếu AI viết lỗi, credit được hoàn lại.
        {imagesMax > 0 ? `\nTranh dùng thêm tối đa ${imagesMax} credit, trừ dần khi vẽ từng cảnh${afterCost != null && afterCost < imagesMax ? " — không đủ thì truyện vẫn viết, tranh vẽ được đến đâu hay đến đó" : ""}.` : ""}
      </AppText>
    );

  const errorText = error ? (
    <AppText variant="small" weight="semibold" color={colors.danger}>
      {error}
    </AppText>
  ) : null;

  const topicSection = (
    <Section
      step={1}
      title={entry === "topic" ? "Chọn chuyện mẫu" : "Chọn chuyện mẫu (không bắt buộc)"}
      hint={entry === "topic" ? "Chuyện mẫu do chuyên gia soạn, mỗi chuyện gắn một năng lực cảm xúc (CASEL)." : "Truyện tự viết không bắt buộc chọn chuyện mẫu."}
    >
      {entry !== "topic" ? (
        <>
          <Button label="Không chọn chuyện mẫu" variant={!topicId ? "teal" : "surface"} size="sm" onPress={() => setTopicId(null)} />
          <AppText variant="small">Truyện tự viết không tính vào báo cáo EQ.</AppText>
        </>
      ) : null}
      {topics.isLoading ? <Spinner size="small" /> : null}
      {suggestedTopicId && topics.data ? (
        <View style={styles.tealNote}>
          <AppText variant="small" color={colors.secondaryDark}>
            {topics.data.some((t) => t.id === suggestedTopicId) ? "Đã chọn sẵn chuyện mẫu gợi ý từ Báo cáo EQ. Ba mẹ có thể đổi chuyện khác." : "Chuyện mẫu gợi ý không còn mở, ba mẹ chọn chuyện khác nhé."}
          </AppText>
        </View>
      ) : null}
      <View style={styles.gap10}>
        {(topics.data ?? []).map((t) => (
          <Pressable key={t.id} onPress={() => setTopicId(t.id)} accessibilityState={{ selected: topicId === t.id }} accessibilityLabel={`Chuyện mẫu: ${t.title}`} style={[styles.choice, topicId === t.id && styles.choiceOn]}>
            <CaselTag competency={t.skill.caselCode} bg={colors.secondaryTint} />
            <AppText variant="title">{t.title}</AppText>
            <AppText variant="caption" weight="regular" color={ink.faint}>
              {t.ageMin}–{t.ageMax} tuổi
            </AppText>
          </Pressable>
        ))}
      </View>
    </Section>
  );

  const situationSection = (
    <Section step={1} title="Kể chuyện của bé" hint="Chuyện vừa xảy ra ở nhà, ở lớp… Càng cụ thể (ai, làm gì, bé phản ứng ra sao) truyện càng giống chuyện thật.">
      <TextField
        value={situation}
        onChangeText={(t) => (setSituation(t), setError(""))}
        maxLength={SITUATION_MAX}
        multiline
        editable={!analyze.isPending}
        counter
        hint="Ba mẹ cứ dùng tên thật — hệ thống đổi tên thành ký hiệu trước khi gửi cho AI."
        placeholder="VD: Bin đang xếp lego thì em Na làm đổ, Bin hét lên và đẩy em ngã."
        error={situationLength > 0 && situationLength < SITUATION_MIN ? `Ít nhất ${SITUATION_MIN} ký tự (${situationLength}/${SITUATION_MAX})` : undefined}
      />
    </Section>
  );

  const confirmView = analysis ? (
    <Card style={styles.gap16}>
      <View>
        <View style={styles.inline}>
          <Sparkles size={16} color={colors.secondaryDark} />
          <AppText variant="label" weight="bold" color={colors.secondaryDark}>
            Bé sẽ tập gì
          </AppText>
        </View>
        <AppText variant="h2">Ba mẹ xem lại trước khi tạo truyện</AppText>
      </View>
      <View style={styles.gap4}>
        <AppText variant="title">Truyện của {mainName}:</AppText>
        <AppText color={ink.body}>{analysis.momentSummary ?? situation.trim()}</AppText>
      </View>
      <View style={styles.gap8}>
        <AppText variant="title">{mainName} sẽ tập:</AppText>
        {sortedSkills.map((s) => (
          <View key={s.id} style={styles.skill}>
            <View style={styles.wrap}>
              <CaselTag competency={s.skill.caselCode} short bg={colors.secondaryTint} />
              <AppText variant="label">{s.nameVi}</AppText>
              {SKILL_SOURCE[s.source] ? <AppText variant="caption" weight="regular" color={ink.faint}>· {SKILL_SOURCE[s.source]}</AppText> : null}
            </View>
            {s.descriptionVi ? <AppText variant="small">{s.descriptionVi}</AppText> : null}
          </View>
        ))}
      </View>
      {analysis.seedEvent ? (
        <View style={styles.seed}>
          <AppText variant="title">Truyện sẽ thêm:</AppText>
          <AppText color={colors.navy}>{analysis.seedEvent}</AppText>
          <AppText variant="caption" weight="regular">
            AI thêm tình tiết nhỏ này để bé có dịp tập kỹ năng. Phần còn lại giữ đúng chuyện ba mẹ kể.
          </AppText>
        </View>
      ) : null}
      {costNote}
      <View style={styles.gap8}>
        <Button label="Tạo truyện" icon={Sparkles} fullWidth disabled={busy || notEnough} loading={submitting} onPress={() => createFamily(true)} />
        <Button label="Đổi kỹ năng" icon={Shuffle} variant="tealTint" fullWidth disabled={busy} onPress={() => setPicking(true)} />
        <Button label="Chỉ kể truyện, không chấm điểm" icon={BookOpen} variant="surface" fullWidth disabled={busy || notEnough} onPress={() => createFamily(false)} />
        <Button label="Sửa lời kể" icon={PenLine} variant="surface" fullWidth disabled={busy} onPress={() => (setAnalysis(null), setError(""))} />
      </View>
      <AppText variant="caption" weight="regular" color={ink.faint}>
        “Chỉ kể truyện”: truyện vẫn bám chuyện ba mẹ kể nhưng không có câu hỏi chấm điểm, chỉ có câu suy ngẫm cuối truyện. Credit chỉ bị trừ khi ba mẹ tạo truyện.
      </AppText>
      {analyze.isPending ? (
        <View style={styles.inline}>
          <ActivityIndicator size="small" color={colors.secondaryDark} />
          <AppText variant="label" color={colors.secondaryDark} style={styles.flex}>
            Đang đọc lại chuyện với kỹ năng ba mẹ chọn… (thường 10–30 giây)
          </AppText>
        </View>
      ) : null}
      {errorText}
    </Card>
  ) : null;

  return (
    <Screen header={<ScreenHeader section="Sáng tác truyện" title="Tạo truyện mới" />}>
      <AppText variant="h1">Sáng tác truyện mới</AppText>

      {!entry ? (
        <Card style={styles.gap14}>
          <AppText variant="h3">Ba mẹ muốn bắt đầu thế nào?</AppText>
          {ENTRIES.map(({ value, icon: Icon, title: label, text, note }) => (
            <Pressable key={value} onPress={() => pickEntry(value)} accessibilityLabel={label} style={({ pressed }) => [styles.choice, pressed && styles.choiceOn]}>
              <View style={styles.entryIcon}>
                <Icon size={20} color={colors.primaryDark} />
              </View>
              <AppText variant="title">{label}</AppText>
              <AppText variant="small">{text}</AppText>
              <AppText variant="caption" color={colors.secondaryDark}>
                {note}
              </AppText>
            </Pressable>
          ))}
        </Card>
      ) : (
        <>
          <View style={styles.wrap}>
            {entryMeta ? <TagTheme icon={entryMeta.icon} label={entryMeta.title} /> : null}
            <Button label="Đổi cách tạo truyện" variant="link" size="sm" disabled={busy} onPress={() => pickEntry(null)} />
          </View>

          {entry === "family" && analysis ? (
            confirmView
          ) : (
            <>
              {entry === "family" ? situationSection : topicSection}

              <Section step={2} title="Chọn nhân vật" hint="Chọn các nhân vật xuất hiện trong truyện và một nhân vật chính (thường là bé).">
                {characters.isLoading ? <Spinner size="small" /> : null}
                {(characters.data ?? []).map((c) => {
                  const on = selected.includes(c.id);
                  return (
                    <View key={c.id} style={[styles.character, on && styles.characterOn]}>
                      <Pressable onPress={() => toggleCharacter(c.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`Chọn ${c.name}`} style={[styles.check, on && styles.checkOn]}>
                        {on ? <Check size={14} color={colors.white} /> : null}
                      </Pressable>
                      <Pressable onPress={() => toggleCharacter(c.id)} style={styles.flex}>
                        <AppText variant="label" weight="bold">
                          {c.name} {c.childId ? <AppText variant="caption" color={colors.secondaryDark}>(con)</AppText> : null}
                        </AppText>
                        <AppText variant="caption" weight="regular" color={ink.faint} numberOfLines={2}>
                          {c.appearance}
                        </AppText>
                      </Pressable>
                      {on ? <Button label={mainId === c.id ? "Nhân vật chính" : "Đặt làm chính"} icon={Star} variant={mainId === c.id ? "primary" : "white"} size="sm" onPress={() => setMainId(c.id)} /> : null}
                    </View>
                  );
                })}
                <Pressable onPress={() => setShowNewCharacter(true)} style={styles.addCharacter}>
                  <Plus size={18} color={ink.muted} />
                  <AppText variant="label" color={ink.muted}>
                    Thêm nhân vật
                  </AppText>
                </Pressable>
              </Section>

              {isAi ? (
                <Section step={3} title="Độ dài truyện" hint="AI viết cả truyện một lần, ba mẹ xem và sửa lại.">
                  <ChipRow
                    items={AI_LENGTHS.map((l) => ({ value: l.value, label: `${l.label} · ${priceOf(l.value)?.pages ?? l.pages} trang${priceOf(l.value) ? ` · ${priceOf(l.value)!.credits} credit` : ""}` }))}
                    value={length as (typeof AI_LENGTHS)[number]["value"]}
                    onChange={setLength}
                  />
                </Section>
              ) : null}

              <Section step={isAi ? 4 : 3} title="Thông tin truyện">
                <TextField label="Tên truyện" value={title} onChangeText={setTitle} maxLength={200} placeholder="VD: Bin và chú khủng long xanh" />
                <View style={styles.toggleRow}>
                  <View style={styles.flex}>
                    <AppText variant="label">Giọng đọc kể truyện</AppText>
                    <AppText variant="caption" weight="regular" color={ink.faint}>
                      Đọc cả lời kể, câu hỏi, gợi ý và phản hồi cho bé
                    </AppText>
                  </View>
                  <Switch value={useTts} onChange={setUseTts} label="Giọng đọc kể truyện" />
                </View>
                <View style={[styles.toggleRow, !isAi && styles.dim]}>
                  <View style={styles.flex}>
                    <AppText variant="label">Tranh minh họa bằng AI</AppText>
                    <AppText variant="caption" weight="regular" color={ink.faint}>
                      {!isAi
                        ? "Hiện chỉ dành cho truyện AI viết"
                        : imageCosts
                          ? `AI vẽ tối đa ${imageCosts.maxScenes} cảnh (${imageCosts.scene} credit/cảnh)${missingPortraits ? ` + ${missingPortraits} chân dung còn thiếu (${imageCosts.characterPortrait} credit/chân dung)` : ""}, vẽ sau khi chữ xong`
                          : "AI vẽ tranh cho từng cảnh sau khi viết xong chữ"}
                    </AppText>
                  </View>
                  <Switch value={isAi && useAiImage} onChange={setUseAiImage} label="Tranh minh họa bằng AI" disabled={!isAi} />
                </View>
              </Section>

              <Card style={styles.gap12}>
                {!isAi ? (
                  <AppText variant="small">Truyện tự viết không dùng credit và không tính vào báo cáo EQ.</AppText>
                ) : (
                  <>
                    {costNote}
                    {entry === "family" ? <AppText variant="small">Bước tiếp theo chỉ đọc chuyện để xem bé sẽ tập gì — chưa trừ credit.</AppText> : null}
                  </>
                )}
                {entry === "family" ? (
                  <Button label="Xem bé sẽ tập gì" icon={Lightbulb} fullWidth disabled={busy} loading={analyze.isPending} onPress={() => runAnalyze()} />
                ) : (
                  <Button label={isAi ? "Tạo & cho AI viết" : "Tạo truyện"} icon={Sparkles} fullWidth disabled={busy || notEnough} loading={submitting} onPress={submit} />
                )}
                {analyze.isPending ? (
                  <View style={styles.tealNote}>
                    <AppText variant="small" weight="semibold" color={colors.secondaryDark}>
                      Đang đọc chuyện của ba mẹ để tìm khoảnh khắc cho bé tập… thường mất 10–30 giây.
                    </AppText>
                  </View>
                ) : null}
                {errorText}
              </Card>
            </>
          )}
        </>
      )}

      <NewCharacterSheet
        open={showNewCharacter}
        onClose={() => setShowNewCharacter(false)}
        onCreated={(character) => {
          setShowNewCharacter(false);
          toggleCharacter(character.id);
          toast.success(`Đã thêm ${character.name}`);
        }}
      />
      {picking ? <SubSkillPicker initial={sortedSkills.map((s) => s.id)} busy={analyze.isPending} onClose={() => !analyze.isPending && setPicking(false)} onConfirm={(ids) => runAnalyze(ids)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  mt4: { marginTop: 4 },
  gap4: { gap: 4 },
  gap8: { gap: 8 },
  gap10: { gap: 10 },
  gap12: { gap: 12 },
  gap14: { gap: 14 },
  gap16: { gap: 16 },
  inline: { flexDirection: "row", alignItems: "center", gap: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  step: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  choice: { gap: 6, borderWidth: 2, borderColor: colors.outline, borderRadius: radius.md, padding: 16 },
  choiceOn: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  entryIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primaryTint, alignItems: "center", justifyContent: "center" },
  tealNote: { backgroundColor: colors.secondaryTint, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10 },
  character: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderWidth: 2, borderColor: colors.outline, borderRadius: radius.md, padding: 12 },
  characterOn: { borderColor: colors.secondary, backgroundColor: "rgba(230,247,245,0.6)" },
  check: { marginTop: 2, width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: colors.outline, alignItems: "center", justifyContent: "center" },
  checkOn: { borderColor: colors.secondary, backgroundColor: colors.secondary },
  addCharacter: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 2, borderStyle: "dashed", borderColor: colors.outline, borderRadius: radius.md, padding: 14 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14 },
  dim: { opacity: 0.6 },
  skill: { gap: 4, backgroundColor: colors.surface, borderRadius: radius.md, padding: 12 },
  seed: { gap: 4, backgroundColor: colors.primaryTint, borderRadius: radius.md, padding: 14 },
});
