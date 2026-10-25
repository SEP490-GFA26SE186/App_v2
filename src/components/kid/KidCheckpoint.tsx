import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { CheckCircle2, Lightbulb, Volume2 } from "lucide-react-native";
import { AppText, Button } from "@/components/ui";
import { EMOTION_EMOJI, EMOTIONS } from "@/constants/story";
import { useAnswer } from "@/hooks/useKid";
import { UI_TEXT } from "@/services/kidService";
import { useKidStore } from "@/stores/sessionStores";
import { colors, fonts, radius, shadows } from "@/theme";
import type { AnswerResult, Emotion, KidCheckpoint as Checkpoint } from "@/types/models";
import { speakSequence, stopSpeaking, type SpeechItem } from "@/utils/speech";

const EMOTION_LIST = (Object.keys(EMOTIONS) as Emotion[]).map((value) => ({ value, label: EMOTIONS[value], emoji: EMOTION_EMOJI[value] }));
const EMOTION_TYPES = ["emotion_self", "emotion_other"];

/**
 * Điểm dừng sau một trang. BE chấm câu trả lời: không có đáp án ở máy bé.
 * emotion_* / perspective: sai lần đầu → gợi ý → chọn lại một lần → báo đáp án.
 * problem_solving: chọn một lần → phản hồi. reflection: bé kể cho ba mẹ rồi bấm tiếp tục.
 */
export function KidCheckpoint({ sessionId, checkpoint, result: initial, onDone }: { sessionId: string; checkpoint: Checkpoint; result: AnswerResult | null; onDone: (r: AnswerResult) => void }) {
  const muted = useKidStore((s) => s.muted);
  const answer = useAnswer(sessionId);
  const [result, setResult] = useState(initial);
  const [reading, setReading] = useState<string | null>(null); // lựa chọn đang được đọc (sáng lên để bé nhìn theo)
  const isEmotion = EMOTION_TYPES.includes(checkpoint.type);
  const done = result?.done;

  const sayAll = (items: SpeechItem[]) => {
    if (muted) return;
    speakSequence(items).then(() => setReading(null));
  };
  const choices = isEmotion ? EMOTION_LIST.map((e) => ({ key: e.value, text: e.label })) : checkpoint.options.map((o) => ({ key: o.id, text: o.text }));

  // Bé 4–8 tuổi phần lớn chưa tự đọc: đọc câu hỏi rồi lần lượt từng lựa chọn.
  const readQuestionAndChoices = () =>
    sayAll([{ text: checkpoint.question, onStart: () => setReading(null) }, ...(checkpoint.type === "reflection" ? [] : choices.map((c) => ({ text: c.text, onStart: () => setReading(c.key) })))]);

  useEffect(() => {
    if (!initial?.done) readQuestionAndChoices();
    return stopSpeaking;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ đọc một lần khi điểm dừng hiện ra
  }, []);

  /** Lời đáp sau khi chọn: gợi ý / phản hồi / khen / "đáp án là…". */
  const responseText = (r: AnswerResult): string[] => {
    if (!r.done) return [r.hint ?? UI_TEXT.tryAgain];
    if (r.feedback) return [r.feedback];
    if (r.correct) return [UI_TEXT.correct];
    if (r.correct === false) {
      const ans = r.answer?.emotion ? EMOTIONS[r.answer.emotion] : checkpoint.options.find((o) => o.id === r.answer?.optionId)?.text;
      return [UI_TEXT.answerIs, ans ?? ""];
    }
    return [];
  };

  const send = (choice: { emotion?: Emotion; optionId?: string }, chosenText?: string) => {
    stopSpeaking();
    setReading(null);
    answer.mutate(
      { checkpointId: checkpoint.id, ...choice },
      {
        onSuccess: (r) => {
          setResult(r);
          sayAll([chosenText, ...responseText(r)]);
          if (r.done) onDone(r);
        },
      },
    );
  };

  const pending = answer.isPending;
  const revealed = done && result?.correct === false ? result.answer : null;

  return (
    <View style={[styles.card, shadows.mid]} accessibilityLiveRegion="polite">
      <View style={styles.head}>
        <View style={styles.owl}>
          <AppText style={styles.owlEmoji}>🦉</AppText>
        </View>
        <View style={styles.flex}>
          <AppText variant="h2">{checkpoint.question}</AppText>
          {!muted ? (
            <Pressable
              onPress={() => {
                readQuestionAndChoices();
              }}
              style={styles.replay}
            >
              <Volume2 size={16} color={colors.secondaryDark} />
              <AppText variant="label" weight="bold" color={colors.secondaryDark}>
                Nghe lại câu hỏi
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </View>

      {checkpoint.type === "reflection" ? (
        <View style={styles.gap12}>
          <AppText>{UI_TEXT.reflection}</AppText>
          {!done ? <Button label="Con kể xong rồi" size="lg" display loading={pending} onPress={() => send({})} /> : null}
        </View>
      ) : isEmotion ? (
        <View style={styles.emotions}>
          {EMOTION_LIST.map((e) => {
            const isAnswer = revealed?.emotion === e.value;
            return (
              <Pressable
                key={e.value}
                disabled={pending || done}
                onPress={() => send({ emotion: e.value }, e.label)}
                accessibilityLabel={e.label}
                style={({ pressed }) => [styles.emotion, shadows.low, isAnswer ? styles.answer : reading === e.value ? styles.reading : null, pressed && styles.pressed, (pending || done) && !isAnswer && styles.dim]}
              >
                <AppText style={styles.emoji}>{e.emoji}</AppText>
                <AppText style={styles.choiceText}>{e.label}</AppText>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.gap12}>
          {checkpoint.options.map((o) => {
            const isAnswer = revealed?.optionId === o.id;
            return (
              <View key={o.id} style={styles.optionRow}>
                <Pressable
                  disabled={pending || done}
                  onPress={() => send({ optionId: o.id })}
                  style={({ pressed }) => [styles.option, shadows.low, isAnswer ? styles.answer : reading === o.id ? styles.reading : null, pressed && styles.pressed, (pending || done) && !isAnswer && styles.dim]}
                >
                  <AppText style={styles.choiceText}>{o.text}</AppText>
                </Pressable>
                {!muted ? (
                  <Pressable onPress={() => sayAll([o.text])} accessibilityLabel={`Nghe: ${o.text}`} style={styles.listen}>
                    <Volume2 size={22} color={colors.secondaryDark} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {pending ? <ActivityIndicator color={colors.primary} /> : null}
      {result && !done ? (
        <View style={[styles.feedback, { backgroundColor: colors.primaryTint }]}>
          <Lightbulb size={22} color={colors.primaryDark} />
          <AppText weight="semibold" color={colors.primaryDark} style={styles.flex}>
            {result.hint ?? UI_TEXT.tryAgain}
          </AppText>
        </View>
      ) : null}
      {done && result ? (
        <View style={[styles.feedback, { backgroundColor: colors.secondaryTint }]}>
          <CheckCircle2 size={22} color={colors.secondaryDark} />
          <AppText weight="semibold" color={colors.secondaryDark} style={styles.flex}>
            {result.feedback ?? (result.correct ? UI_TEXT.correct : result.correct === false ? "Đáp án là ô đang sáng nè. Mình cùng nhớ nhé!" : "Cảm ơn con đã kể!")}
          </AppText>
        </View>
      ) : null}
      {answer.isError ? (
        <AppText variant="small" weight="semibold" color={colors.danger}>
          Chưa gửi được. Con bấm lại nhé!
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap12: { gap: 12 },
  card: { backgroundColor: colors.white, borderRadius: radius.stage, padding: 20, gap: 18 },
  head: { flexDirection: "row", gap: 12 },
  owl: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryTint, alignItems: "center", justifyContent: "center" },
  owlEmoji: { fontSize: 24, lineHeight: 30 },
  replay: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  emotions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  emotion: { width: "30.5%", alignItems: "center", gap: 4, borderWidth: 2, borderColor: "transparent", borderRadius: radius.card, backgroundColor: colors.white, paddingVertical: 14 },
  emoji: { fontSize: 40, lineHeight: 50 },
  choiceText: { fontFamily: fonts.display, fontSize: 17, lineHeight: 24, color: colors.navy },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  option: { flex: 1, borderWidth: 2, borderColor: "transparent", borderRadius: radius.card, backgroundColor: colors.white, paddingHorizontal: 18, paddingVertical: 16 },
  listen: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.secondaryTint, alignItems: "center", justifyContent: "center" },
  answer: { borderColor: colors.secondary, backgroundColor: colors.secondaryTint },
  reading: { borderColor: colors.primary },
  pressed: { transform: [{ scale: 0.96 }] },
  dim: { opacity: 0.6 },
  feedback: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: radius.card, padding: 16 },
});
