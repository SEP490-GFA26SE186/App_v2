import { db } from "@/mocks/db";
import { useKidSessionStore } from "@/stores/sessionStores";
import type { AnswerResult, Emotion, KidShelfItem, ReadingSession } from "@/types/models";
import { fillNames } from "@/utils/storyNames";
import { fail, respond, uid } from "./mockApi";

// Kid Mode. BE thật dùng token riêng của bé (kidSessionToken) và chấm câu trả lời ở server —
// mock giữ đúng luật chấm: emotion / perspective sai lần đầu → gợi ý → chọn lại một lần → báo đáp án;
// problem_solving chọn một lần → phản hồi; reflection không chấm.

const sessions = new Map<string, { childId: string; storyId: string; attempts: Record<string, number> }>();

const currentChildId = () => useKidSessionStore.getState().child?.id ?? fail("Phiên Kid Mode đã hết hạn", 401);

// ---- Phía ba mẹ ----

/** POST /auth/kid-mode/enter { childId } → { child, session: { kidSessionToken } }. Cần đặt PIN trước. */
export const enterKidMode = (childId: string) =>
  respond(() => {
    if (!db.kidPin) fail("Tài khoản chưa có mã PIN, ba mẹ đặt PIN trước nhé", 422);
    const child = db.children.find((c) => c.id === childId) ?? fail("Không tìm thấy hồ sơ bé", 404);
    return { child: { id: child.id, name: child.name, birthDate: child.birthDate }, session: { kidSessionToken: uid("kid") } };
  });

/** POST /auth/kid-mode/exit { pin, kidSessionToken } → { tokens }. Sai PIN → 401. */
export const exitKidMode = (pin: string) =>
  respond(() => {
    if (pin !== db.kidPin) fail("Mã PIN chưa đúng", 401);
    return { tokens: { accessToken: uid("access"), refreshToken: uid("refresh") } };
  }, 500);

// ---- Phía bé ----

/** GET /kid/bookshelf → chỉ truyện ba mẹ đã hoàn tất và đủ giọng đọc */
export const getKidShelf = () =>
  respond((): KidShelfItem[] =>
    (db.shelves[currentChildId()] ?? []).flatMap(({ storyId, progress }) => {
      const s = db.stories.find((x) => x.id === storyId);
      return s?.readiness.ready ? [{ storyId, title: s.title, totalPages: s.pages.length, cover: s.cover, readingProgress: progress }] : [];
    }),
  );

/** Câu nhắc dùng chung (BE: GET /kid/ui-audio → assets[key] = { text, audioUrl }) */
export const UI_TEXT = {
  correct: "Đúng rồi! Con giỏi quá!",
  tryAgain: "Con thử chọn lại nhé!",
  answerIs: "Đáp án là",
  reflection: "Con kể cho ba mẹ nghe nhé.",
  storyEnd: "Hoan hô! Con đã đọc xong câu chuyện rồi!",
};

/** POST /kid/sessions { storyId } → { session, story }. 422: truyện chưa sẵn sàng. */
export const startReading = (storyId: string) =>
  respond((): ReadingSession => {
    const childId = currentChildId();
    const story = db.stories.find((s) => s.id === storyId) ?? fail("Không tìm thấy truyện", 404);
    if (!story.readiness.ready) fail("Truyện chưa sẵn sàng, bé nhờ ba mẹ xem lại nhé", 422);
    const item = db.shelves[childId]?.find((x) => x.storyId === storyId);
    const id = uid("session");
    sessions.set(id, { childId, storyId, attempts: {} });
    const name = (t: string) => fillNames(t, story.characters);
    const restart = item?.progress?.isCompleted;
    const currentPage = !restart && item?.progress ? story.pages[item.progress.currentPageOrder - 1] : null;
    return {
      session: { id, currentPageId: currentPage?.id ?? null },
      story: {
        id: story.id,
        title: story.title,
        pages: story.pages.map((p) => ({
          id: p.id,
          pageOrder: p.pageOrder,
          text: name(p.contentText),
          imageUrl: story.scenes.find((sc) => sc.id === p.sceneId)?.imageUrl ?? null,
        })),
        checkpoints: story.checkpoints.map((c) => ({
          id: c.id,
          type: c.type,
          afterPageId: c.afterPageId,
          question: name(c.question),
          options: c.options.map((o) => ({ id: o.id!, text: name(o.text) })),
          result: null,
        })),
      },
    };
  }, 700);

const shelfItemOf = (sessionId: string) => {
  const s = sessions.get(sessionId) ?? fail("Phiên đọc đã hết hạn", 401);
  return { s, item: db.shelves[s.childId]?.find((x) => x.storyId === s.storyId) };
};

export const saveProgress = (sessionId: string, pageId: string) =>
  respond(() => {
    const { s, item } = shelfItemOf(sessionId);
    const story = db.stories.find((x) => x.id === s.storyId)!;
    const page = story.pages.find((p) => p.id === pageId);
    if (item && page) {
      item.progress = {
        currentPageOrder: page.pageOrder,
        progressPercentage: Math.round((page.pageOrder / story.pages.length) * 100),
        lastActivityAt: new Date().toISOString(),
        isCompleted: item.progress?.isCompleted && page.pageOrder === 1 ? false : (item.progress?.isCompleted ?? false),
      };
    }
    return { ok: true };
  }, 150);

/** POST /kid/sessions/:id/answers → { result } */
export const answerCheckpoint = (sessionId: string, body: { checkpointId: string; emotion?: Emotion; optionId?: string }) =>
  respond((): AnswerResult => {
    const { s } = shelfItemOf(sessionId);
    const story = db.stories.find((x) => x.id === s.storyId)!;
    const cp = story.checkpoints.find((c) => c.id === body.checkpointId) ?? fail("Không tìm thấy câu hỏi", 404);
    const attempts = (s.attempts[cp.id] = (s.attempts[cp.id] ?? 0) + 1);
    const name = (t?: string | null) => (t ? fillNames(t, story.characters) : undefined);
    const base = { checkpointId: cp.id, attempts };

    if (cp.type === "reflection") return { ...base, done: true, correct: null };
    if (cp.type === "problem_solving") {
      const option = cp.options.find((o) => o.id === body.optionId);
      return { ...base, done: true, correct: option?.role === "constructive", feedback: name(option?.feedback) };
    }
    const correctOption = cp.options.find((o) => o.isCorrect);
    const correct = cp.type === "perspective" ? body.optionId === correctOption?.id : body.emotion === cp.answerEmotion;
    if (correct) return { ...base, done: true, correct: true };
    if (attempts < 2) return { ...base, done: false, correct: false, hint: name(cp.hint) ?? UI_TEXT.tryAgain };
    return { ...base, done: true, correct: false, answer: cp.type === "perspective" ? { optionId: correctOption?.id } : { emotion: cp.answerEmotion ?? undefined } };
  }, 400);

export const completeReading = (sessionId: string) =>
  respond(() => {
    const { s, item } = shelfItemOf(sessionId);
    const story = db.stories.find((x) => x.id === s.storyId)!;
    if (item) item.progress = { currentPageOrder: story.pages.length, progressPercentage: 100, lastActivityAt: new Date().toISOString(), isCompleted: true };
    const child = db.children.find((c) => c.id === s.childId);
    if (child) child.completedSessionsCount += 1;
    return { ok: true };
  });
