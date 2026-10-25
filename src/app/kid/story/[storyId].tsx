import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, ArrowRight, Lock, PartyPopper, Volume2 } from "lucide-react-native";
import { KidCheckpoint } from "@/components/kid/KidCheckpoint";
import { StoryCompleteDialog } from "@/components/kid/KidDialogs";
import { AppText, Button, EmptyState, ProgressBar, Skeleton } from "@/components/ui";
import { href, ROUTES } from "@/constants/routes";
import { useCompleteReading, useReading, useSaveProgress } from "@/hooks/useKid";
import { UI_TEXT } from "@/services/kidService";
import { useKidSessionStore, useKidStore } from "@/stores/sessionStores";
import { colors, fonts, radius, shadows } from "@/theme";
import type { AnswerResult, ReadingSession } from "@/types/models";
import { speak, stopSpeaking } from "@/utils/speech";

const STAGE_TONES: [string, string][] = [
  [colors.primaryTint, colors.secondaryTint],
  [colors.secondaryTint, colors.primaryTint],
  [colors.navyTint, colors.secondaryTint],
];
const STAGE_EMOJI = ["🏡", "🌳", "🧸", "🌙", "🌈", "🦉"];

/**
 * Đọc truyện tuyến tính: trang → (điểm dừng sau trang, nếu có) → trang tiếp.
 * Không qua được trang khi điểm dừng ngay sau nó chưa xong.
 */
function Reader({ session, story, onRestart }: ReadingSession & { onRestart: () => void }) {
  const router = useRouter();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const child = useKidSessionStore((s) => s.child);
  const { muted, setParentGateOpen } = useKidStore();
  const saveProgress = useSaveProgress(session.id);
  const complete = useCompleteReading(session.id);

  const pages = story.pages;
  const [index, setIndex] = useState(Math.max(0, pages.findIndex((p) => p.id === session.currentPageId)));
  const [results, setResults] = useState(() => new Map<string, AnswerResult>(story.checkpoints.filter((c) => c.result).map((c) => [c.id, c.result!])));
  const [atCheckpoint, setAtCheckpoint] = useState(false);
  const [finished, setFinished] = useState(false);

  const page = pages[index];
  const checkpoint = useMemo(() => story.checkpoints.find((c) => c.afterPageId === page.id), [story, page]);
  const checkpointDone = !checkpoint || !!results.get(checkpoint.id)?.done;
  const isLast = index === pages.length - 1;

  // Sang trang mới: đọc trang (nếu không tắt tiếng), lưu tiến độ.
  useEffect(() => {
    if (!muted) speak(page.text);
    saveProgress.mutate(page.id);
    return stopSpeaking;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi đổi trang
  }, [page.id]);

  const goTo = (i: number) => {
    setAtCheckpoint(false);
    setIndex(i);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const next = () => {
    if (checkpoint && !atCheckpoint && !checkpointDone) {
      setAtCheckpoint(true);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
      return;
    }
    if (!checkpointDone) return;
    if (!isLast) return goTo(index + 1);
    complete.mutate(undefined, {
      onSuccess: () => {
        setFinished(true);
        if (!muted) speak(UI_TEXT.storyEnd);
      },
    });
  };

  const showCheckpoint = checkpoint && (atCheckpoint || results.has(checkpoint.id));

  return (
    <View style={styles.flex}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        <View style={[styles.titleBar, shadows.low]}>
          <View style={styles.flex}>
            <AppText variant="label" weight="bold" color={colors.primaryDark}>
              {child?.name ?? "Bé"} đang đọc
            </AppText>
            <AppText variant="h2" numberOfLines={1}>
              {story.title}
            </AppText>
          </View>
          <View style={styles.pageChip}>
            <AppText variant="label" weight="bold" color={colors.secondaryDark}>
              Trang {page.pageOrder}/{pages.length}
            </AppText>
          </View>
        </View>
        <ProgressBar percent={((index + 1) / pages.length) * 100} height={8} colors={[colors.secondary, colors.primary]} />

        <LinearGradient colors={STAGE_TONES[index % STAGE_TONES.length]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.stage, shadows.mid]}>
          {page.imageUrl ? <Image source={{ uri: page.imageUrl }} style={styles.stageImg} /> : <AppText style={styles.stageEmoji}>{STAGE_EMOJI[index % STAGE_EMOJI.length]}</AppText>}
        </LinearGradient>

        <View style={[styles.textCard, shadows.low]}>
          <AppText style={styles.pageText}>{page.text}</AppText>
          {!muted ? (
            <Pressable onPress={() => speak(page.text)} style={styles.listen}>
              <Volume2 size={20} color={colors.secondaryDark} />
              <AppText variant="label" weight="bold" color={colors.secondaryDark}>
                Nghe lại trang này
              </AppText>
            </Pressable>
          ) : null}
        </View>

        {showCheckpoint && checkpoint ? (
          <KidCheckpoint key={checkpoint.id} sessionId={session.id} checkpoint={checkpoint} result={results.get(checkpoint.id) ?? null} onDone={(r) => setResults((m) => new Map(m).set(checkpoint.id, r))} />
        ) : null}
      </ScrollView>

      <View style={styles.nav}>
        <Button label="Trang trước" icon={ArrowLeft} variant="surface" display disabled={index === 0} onPress={() => goTo(index - 1)} />
        <Button
          label={checkpoint && !checkpointDone && !atCheckpoint ? "Trả lời câu hỏi 🦉" : isLast ? "Hoàn thành" : "Trang sau"}
          iconRight={checkpoint && !checkpointDone && !atCheckpoint ? undefined : isLast ? PartyPopper : ArrowRight}
          size="lg"
          display
          disabled={complete.isPending || (atCheckpoint && !checkpointDone)}
          loading={complete.isPending}
          onPress={next}
          style={styles.flex}
        />
      </View>
      <Pressable onPress={() => setParentGateOpen(true)} style={styles.parentLink}>
        <Lock size={15} color="rgba(30,41,59,0.5)" />
        <AppText variant="caption" color="rgba(30,41,59,0.5)">
          Dành cho Ba Mẹ
        </AppText>
      </Pressable>

      {finished ? (
        <StoryCompleteDialog
          childName={child?.name ?? "Bé"}
          onReadAgain={onRestart}
          onBookshelf={() => {
            stopSpeaking();
            router.replace(href(ROUTES.KID.BOOKSHELF));
          }}
        />
      ) : null}
    </View>
  );
}

export default function StoryReaderScreen() {
  const { storyId } = useLocalSearchParams<{ storyId: string }>();
  const { data, isLoading, error, refetch } = useReading(storyId);

  if (isLoading) {
    return (
      <View style={styles.content}>
        <Skeleton height={80} radius={radius.stage} />
        <Skeleton height={300} radius={radius.stage} />
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={styles.content}>
        <EmptyState emoji="🦉" title="Cú Weaver chưa mở được câu chuyện này" text={error?.message ?? "Bé nhờ ba mẹ xem lại nhé."} />
      </View>
    );
  }
  // Đọc lại từ đầu: mở lượt đọc mới (key đổi theo session → Reader khởi tạo lại)
  return <Reader key={data.session.id} session={data.session} story={data.story} onRestart={() => refetch()} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 24, gap: 16 },
  titleBar: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.white, borderRadius: radius.stage, paddingHorizontal: 18, paddingVertical: 14 },
  pageChip: { backgroundColor: colors.secondaryTint, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 4 },
  stage: { height: 280, borderRadius: radius.stage, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  stageImg: { width: "100%", height: "100%" },
  stageEmoji: { fontSize: 120, lineHeight: 140 },
  textCard: { backgroundColor: colors.white, borderRadius: radius.stage, padding: 22, gap: 16 },
  pageText: { fontFamily: fonts.display, fontSize: 21, lineHeight: 34, color: colors.navy },
  listen: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", backgroundColor: colors.secondaryTint, borderRadius: radius.full, paddingHorizontal: 18, paddingVertical: 10 },
  nav: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 10 },
  parentLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
});
