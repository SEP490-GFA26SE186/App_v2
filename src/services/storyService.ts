import { aiPricing, db, plans, subSkills, topics } from "@/mocks/db";
import type { Analysis, Character, Checkpoint, CheckpointOption, CheckpointType, Generation, ShelfChild, Story, StoryLength, StorySummary } from "@/types/models";
import { tokenizeNames } from "@/utils/storyNames";
import { fail, respond, uid } from "./mockApi";

// Truyện riêng của phụ huynh — BE: /api/v1/stories (schema rev8), nhân vật: /api/v1/characters.
// Các việc chạy nền của BE (AI viết, vẽ tranh, tạo giọng đọc) được giả lập bằng mốc thời gian:
// mỗi lần đọc dữ liệu, `advanceJobs()` kiểm tra việc nào đã "xong" thì cập nhật.

const PAGES: Record<StoryLength, number> = { short: 6, medium: 8, long: 10, custom: 4 };
const JOB_MS = { write: 7000, portrait: 5000, scene: 6000, narration: 8000 };
const jobs = new Map<string, { kind: keyof typeof JOB_MS; at: number; targetId: string }>();
const startJob = (kind: keyof typeof JOB_MS, targetId: string) => jobs.set(`${kind}:${targetId}`, { kind, at: Date.now(), targetId });

const BLOCKED = ["đánh chết", "giết"];
const WARN = ["con ma", "quỷ"];

const findStory = (id: string) => db.stories.find((s) => s.id === id) ?? fail("Không tìm thấy truyện", 404);
const costOf = (length: StoryLength) => aiPricing.lengths.find((l) => l.length === length)?.credits ?? 0;
const spend = (credits: number) => {
  if (db.user.wallet.creditBalance < credits) fail("Ba mẹ không đủ credit", 402);
  db.user = { ...db.user, wallet: { creditBalance: db.user.wallet.creditBalance - credits } };
};

// ---- Nội dung AI "viết" (mock) ----

const AI_TEXT = [
  "Sáng hôm ấy, {NV1} thức dậy thật sớm, nắng vàng chiếu qua ô cửa sổ.",
  "{NV1} hớn hở chạy ra sân, nơi {NV2} đang đợi sẵn.",
  "Bỗng có chuyện xảy ra khiến {NV1} khựng lại, tim đập thình thịch.",
  "{NV1} nhìn quanh, không biết nên làm gì bây giờ.",
  "{NV2} nhẹ nhàng nắm tay {NV1}: “Mình cùng nghĩ cách nhé.”",
  "{NV1} hít một hơi thật sâu và nói ra điều mình đang nghĩ.",
  "Hai bạn cùng nhau tìm ra một cách thật hay.",
  "Mọi chuyện dần ổn thỏa, ai cũng mỉm cười.",
  "Buổi tối, {NV1} kể lại cho cả nhà nghe chuyện hôm nay.",
  "{NV1} thấy mình đã lớn thêm một chút.",
];

const aiCheckpoints = (story: Story): Checkpoint[] => {
  const n = story.pages.length;
  const scored = story.scored !== false;
  const seeds: { after: number; type: CheckpointType; question: string; hint?: string; answerEmotion?: Checkpoint["answerEmotion"]; options?: CheckpointOption[] }[] = scored
    ? [
        { after: 3, type: "emotion_self", question: "Lúc đó {NV1} cảm thấy thế nào?", hint: "Con nhìn xem tim {NV1} đập thình thịch kìa.", answerEmotion: "scared" },
        {
          after: Math.min(n - 1, 5),
          type: "problem_solving",
          question: "Nếu là {NV1}, con sẽ làm gì?",
          options: [
            { text: "Hít thở sâu rồi nói ra điều mình nghĩ", role: "constructive", feedback: "Nói ra giúp mọi người hiểu và giúp được mình." },
            { text: "Im lặng chạy về nhà", role: "avoidant", feedback: "Chạy đi thì chuyện vẫn còn đó con ạ." },
            { text: "Giận dỗi hét thật to", role: "impulsive", feedback: "Hét to làm mọi người giật mình và buồn đấy." },
          ],
        },
      ]
    : [];
  seeds.push({ after: n, type: "reflection", question: "Con đã bao giờ gặp chuyện giống {NV1} chưa?" });
  return seeds.map((s, i) => {
    const id = `${story.id}-cp${i + 1}-${Date.now().toString(36)}`;
    return {
      id,
      type: s.type,
      afterPageId: story.pages[s.after - 1].id,
      afterPageOrder: s.after,
      targetToken: null,
      question: s.question,
      hint: s.hint ?? null,
      answerEmotion: s.answerEmotion ?? null,
      options: (s.options ?? []).map((o, j) => ({ ...o, id: `${id}-o${j + 1}` })),
      locked: true,
    };
  });
};

/** Hoàn tất các việc nền đã đủ thời gian. */
function advanceJobs() {
  const now = Date.now();
  for (const [key, job] of jobs) {
    if (now - job.at < JOB_MS[job.kind]) continue;
    jobs.delete(key);
    if (job.kind === "write") {
      const story = db.stories.find((s) => s.id === job.targetId);
      if (!story) continue;
      story.pages = story.pages.map((p, i) => ({ ...p, contentText: AI_TEXT[i % AI_TEXT.length], origin: "ai" }));
      story.checkpoints = aiCheckpoints(story);
      story.status = "ready";
      if (story.useAiImage) {
        story.scenes = [1, 2, 3].map((n) => ({ id: `${story.id}-sc${n}`, sceneOrder: n, description: `Cảnh ${n}`, imageStatus: "generating", imageUrl: null }));
        story.pages = story.pages.map((p, i) => ({ ...p, sceneId: `${story.id}-sc${Math.min(3, Math.floor((i * 3) / story.pages.length) + 1)}` }));
        startJob("scene", story.id);
      }
      db.generations[story.id] = { status: "succeeded", startedAt: job.at };
    } else if (job.kind === "portrait") {
      const c = db.characters.find((x) => x.id === job.targetId);
      if (c) Object.assign(c, { portraitStatus: "ready", portraitImageUrl: `https://picsum.photos/seed/storyweaver-portrait-${c.id}-${now}/640/640` });
    } else if (job.kind === "scene") {
      const story = db.stories.find((s) => s.id === job.targetId);
      story?.scenes.forEach((sc) => {
        if (sc.imageStatus === "generating" || sc.imageStatus === "queued") Object.assign(sc, { imageStatus: "ready", imageUrl: `https://picsum.photos/seed/storyweaver-${sc.id}-${now}/640/640` });
      });
      if (story && !story.cover.imageUrl && story.scenes[0]?.imageUrl) story.cover = { ...story.cover, imageUrl: story.scenes[0].imageUrl };
    } else if (job.kind === "narration") {
      const story = db.stories.find((s) => s.id === job.targetId);
      if (story) {
        story.narration = { ...story.narration, ready: story.narration.total, pending: 0, missing: 0, complete: true };
        story.readiness = { ready: true, reason: null };
      }
    }
  }
  // Tiến độ giọng đọc đang chạy: tăng dần cho thanh tiến độ
  for (const story of db.stories) {
    const job = jobs.get(`narration:${story.id}`);
    if (job && story.narration.total) {
      const ready = Math.min(story.narration.total - 1, Math.floor(((now - job.at) / JOB_MS.narration) * story.narration.total));
      story.narration = { ...story.narration, ready, pending: story.narration.total - ready };
    }
  }
}

const summaryOf = (s: Story): StorySummary => ({
  id: s.id,
  title: s.title,
  status: s.status,
  reviewedAt: s.reviewedAt,
  mode: s.mode,
  entry: s.entry,
  length: s.length,
  topic: s.topic,
  pageCount: s.pages.length,
  checkpointCount: s.checkpoints.length,
  cover: s.cover,
});

const withCounts = (s: Story): Story => ({ ...s, pageCount: s.pages.length, checkpointCount: s.checkpoints.length });

// ---- Truyện ----

/** GET /stories?status&reviewed → { data: story[], pagination } — chỉ truyện riêng của gia đình */
export const getStories = ({ status, reviewed }: { status?: string; reviewed?: "true" | "false"; limit?: number } = {}) =>
  respond(() => {
    advanceJobs();
    const data = db.stories
      .filter((s) => s.kind === "private")
      .filter((s) => !status || s.status === status)
      .filter((s) => !reviewed || (reviewed === "true" ? !!s.reviewedAt : !s.reviewedAt))
      .map(summaryOf);
    return { data, pagination: { page: 1, limit: 50, total: data.length, totalPages: 1 } };
  });

/** Truyện đã viết xong nhưng ba mẹ chưa xem lại — bắt buộc xem lại trước khi đưa lên giá sách của bé. */
export const getPendingDrafts = async () => (await getStories({ status: "ready", reviewed: "false" })).data;

/** GET /stories/:id → story (chữ dạng token; `characters` là bảng token → tên) */
export const getStory = (id: string) =>
  respond(() => {
    advanceJobs();
    return withCounts(findStory(id));
  });

/** GET /stories/ai-pricing */
export const getAiPricing = () => respond(() => aiPricing);

interface CreatePayload {
  entry?: "topic" | "family";
  topicId?: string | null;
  length: StoryLength;
  title: string;
  characters: { characterId: string; isMain: boolean }[];
  situation?: string;
  analysisToken?: string;
  scored?: boolean;
  useAiImage?: boolean;
  useTts: boolean;
}

const analyses = new Map<string, Analysis & { situation: string }>();

/** POST /stories — ba lối vào: chuyện mẫu / kể chuyện nhà mình / tự viết. Truyện ở trạng thái draft. */
export const createStory = (payload: CreatePayload) =>
  respond(() => {
    const id = uid("s");
    const custom = payload.length === "custom";
    const topic = topics.find((t) => t.id === payload.topicId);
    const analysis = payload.analysisToken ? analyses.get(payload.analysisToken) : undefined;
    const characters = payload.characters.map((c, i) => {
      const ch = db.characters.find((x) => x.id === c.characterId);
      return { token: `{NV${i + 1}}`, name: ch?.name ?? null, characterId: c.characterId, isMain: c.isMain };
    });
    const pages = Array.from({ length: PAGES[payload.length] }, (_, i) => ({ id: `${id}-p${i + 1}`, pageOrder: i + 1, contentText: "", origin: "manual" as const, sceneId: null }));
    const competency = topic?.skill.caselCode ?? analysis?.subSkills[0]?.skill.caselCode ?? null;
    const story: Story = {
      id,
      title: payload.title,
      status: "draft",
      reviewedAt: null,
      mode: custom ? "manual" : "ai",
      entry: custom ? "handwritten" : (payload.entry ?? "topic"),
      length: payload.length,
      topic: topic ? { title: topic.title, competency: topic.skill.caselCode } : null,
      pageCount: pages.length,
      checkpointCount: 0,
      cover: { imageUrl: null, competency },
      kind: "private",
      scored: payload.scored ?? true,
      useTts: payload.useTts,
      useAiImage: !!payload.useAiImage,
      momentSummary: analysis?.momentSummary ?? null,
      seedEvent: analysis?.seedEvent ?? null,
      subSkills: (analysis?.subSkills ?? []).map((s) => ({ id: s.id, nameVi: s.nameVi, source: s.source, position: s.position })),
      characters,
      pages,
      checkpoints: [],
      scenes: [],
      coverSceneId: null,
      narration: { enabled: false, total: 0, ready: 0, pending: 0, failed: 0, missing: 0, complete: false },
      readiness: { ready: false, reason: "not_reviewed" },
      keywordWarnings: [],
    };
    db.stories.unshift(story);
    return story;
  });

/** POST /stories/analyze — phân tích lời kể "Kể chuyện nhà mình" (không trừ credit). */
export const analyzeStory = (payload: { situation: string; characters: { characterId: string; isMain: boolean }[]; length: StoryLength; subSkillIds?: string[] }) =>
  respond((): Analysis => {
    const text = payload.situation.toLowerCase();
    if (BLOCKED.some((k) => text.includes(k))) fail("Lời kể có từ không phù hợp cho bé, ba mẹ kể nhẹ nhàng hơn nhé", 422);
    const guess = /giận|hét|đẩy|đánh/.test(text) ? ["ss-sm1", "ss-rs2"] : /sợ|khóc|lo/.test(text) ? ["ss-sa1", "ss-sm2"] : ["ss-so1", "ss-rs1"];
    const ids = payload.subSkillIds?.length ? payload.subSkillIds : guess;
    const firstSentence = payload.situation.trim().split(/(?<=[.!?])\s/)[0];
    const analysis: Analysis = {
      momentSummary: firstSentence.length > 12 ? firstSentence : null,
      seedEvent: payload.subSkillIds?.length ? null : "Một bạn nhỏ khác đến rủ cùng chơi, cho bé thêm dịp tập kỹ năng.",
      subSkills: ids.map((sid, i) => {
        const s = subSkills.find((x) => x.id === sid)!;
        return { id: s.id, code: s.code, nameVi: s.nameVi, descriptionVi: s.descriptionVi, skill: s.skill, source: payload.subSkillIds?.length ? "parent" : i === 0 ? "moment" : "need", position: i + 1 };
      }),
      analysisToken: uid("analysis"),
      expiresAt: new Date(Date.now() + 30 * 60000).toISOString(),
    };
    analyses.set(analysis.analysisToken, { ...analysis, situation: payload.situation });
    return analysis;
  }, 2200);

export const deleteStory = (id: string) =>
  respond(() => {
    db.stories = db.stories.filter((s) => s.id !== id);
    for (const key of Object.keys(db.shelves)) db.shelves[key] = db.shelves[key].filter((x) => x.storyId !== id);
    return { deleted: true };
  });

/** POST /stories/:id/generate → { aiRequestId }. Giữ credit; 402 khi không đủ credit. */
export const generateStory = (id: string) =>
  respond(() => {
    const story = findStory(id);
    spend(costOf(story.length));
    story.status = "generating";
    db.generations[id] = { status: "processing", startedAt: Date.now() };
    startJob("write", id);
    return { aiRequestId: uid("ai") };
  });

/** GET /stories/:id/generation → { status, errorCode, errorMessage } | null */
export const getGeneration = (id: string) =>
  respond((): Generation | null => {
    advanceJobs();
    const g = db.generations[id];
    return g ? { status: g.status, errorCode: null, errorMessage: null } : null;
  });

// ---- Editor (mỗi lệnh trả lại toàn bộ truyện) ----

const keywordCheck = (story: Story, path: string, text: string) => {
  const lower = text.toLowerCase();
  const blocked = BLOCKED.find((k) => lower.includes(k));
  if (blocked) fail(`Có từ không phù hợp cho bé: “${blocked}”`, 422, [{ path, message: `Có từ không phù hợp cho bé: “${blocked}”` }]);
  story.keywordWarnings = [...story.keywordWarnings.filter((w) => w.path !== path), ...WARN.filter((k) => lower.includes(k)).map((keyword) => ({ path, keyword }))];
};

/** Sửa chữ sau khi đã hoàn tất → giọng đọc của đoạn đó không còn khớp (cần hoàn tất lại). */
const markStale = (story: Story) => {
  if (story.reviewedAt && story.narration.enabled) {
    story.narration = { ...story.narration, ready: Math.max(0, story.narration.ready - 1), missing: story.narration.missing + 1, complete: false };
    story.readiness = { ready: false, reason: "narration_incomplete" };
  }
};

export const updatePage = (storyId: string, pageId: string, contentText: string) =>
  respond(() => {
    const story = findStory(storyId);
    const page = story.pages.find((p) => p.id === pageId) ?? fail("Không tìm thấy trang", 404);
    keywordCheck(story, `pages.${pageId}`, contentText);
    page.contentText = tokenizeNames(contentText, story.characters);
    if (page.origin === "ai") page.origin = "ai_edited";
    markStale(story);
    return withCounts(story);
  });

export const createPage = (storyId: string) =>
  respond(() => {
    const story = findStory(storyId);
    if (story.pages.length >= 20) fail("Truyện tự viết tối đa 20 trang", 422);
    story.pages.push({ id: uid(`${storyId}-p`), pageOrder: story.pages.length + 1, contentText: "", origin: "manual", sceneId: null });
    return withCounts(story);
  });

export const deletePage = (storyId: string, pageId: string) =>
  respond(() => {
    const story = findStory(storyId);
    if (story.pages.length <= 4) fail("Truyện tự viết cần ít nhất 4 trang", 422);
    story.pages = story.pages.filter((p) => p.id !== pageId).map((p, i) => ({ ...p, pageOrder: i + 1 }));
    story.checkpoints = story.checkpoints
      .filter((c) => c.afterPageId !== pageId)
      .map((c) => ({ ...c, afterPageOrder: story.pages.find((p) => p.id === c.afterPageId)?.pageOrder ?? c.afterPageOrder }));
    return withCounts(story);
  });

export const updateCheckpoint = (storyId: string, checkpointId: string, body: Partial<Pick<Checkpoint, "question" | "hint" | "answerEmotion" | "options">>) =>
  respond(() => {
    const story = findStory(storyId);
    const cp = story.checkpoints.find((c) => c.id === checkpointId) ?? fail("Không tìm thấy điểm dừng", 404);
    keywordCheck(story, `checkpoints.${checkpointId}`, [body.question, body.hint, ...(body.options ?? []).flatMap((o) => [o.text, o.feedback])].join(" "));
    const tok = (t?: string | null) => (t == null ? t : tokenizeNames(t, story.characters));
    if (body.question !== undefined) cp.question = tok(body.question)!;
    if (body.hint !== undefined) cp.hint = tok(body.hint) ?? null;
    if (body.answerEmotion !== undefined) cp.answerEmotion = body.answerEmotion;
    if (body.options) cp.options = body.options.map((o, i) => ({ ...o, id: `${cp.id}-o${i + 1}`, text: tok(o.text)!, feedback: tok(o.feedback) ?? undefined }));
    markStale(story);
    return withCounts(story);
  });

/** body: { type, afterPageId, targetToken? } — chỉ truyện tự viết */
export const createCheckpoint = (storyId: string, body: { type: CheckpointType; afterPageId: string; targetToken?: string }) =>
  respond(() => {
    const story = findStory(storyId);
    const page = story.pages.find((p) => p.id === body.afterPageId) ?? fail("Không tìm thấy trang", 404);
    if (body.type === "reflection" && page.pageOrder !== story.pages.length) fail("Câu liên hệ bản thân chỉ đặt sau trang cuối", 422);
    const id = uid(`${storyId}-cp`);
    const options: CheckpointOption[] =
      body.type === "perspective"
        ? [0, 1, 2].map((i) => ({ id: `${id}-o${i + 1}`, text: "", isCorrect: i === 0 }))
        : body.type === "problem_solving"
          ? (["constructive", "avoidant", "impulsive"] as const).map((role, i) => ({ id: `${id}-o${i + 1}`, text: "", role, feedback: "" }))
          : [];
    story.checkpoints.push({ id, type: body.type, afterPageId: page.id, afterPageOrder: page.pageOrder, targetToken: body.targetToken ?? null, question: "", hint: null, answerEmotion: null, options, locked: false });
    story.checkpoints.sort((a, b) => a.afterPageOrder - b.afterPageOrder);
    return withCounts(story);
  });

export const deleteCheckpoint = (storyId: string, checkpointId: string) =>
  respond(() => {
    const story = findStory(storyId);
    story.checkpoints = story.checkpoints.filter((c) => c.id !== checkpointId);
    return withCounts(story);
  });

/** POST /stories/:id/review — hoàn tất; 422 kèm errors khi còn chỗ chưa viết xong */
export const reviewStory = (id: string) =>
  respond(() => {
    const story = findStory(id);
    const errors = [
      ...story.pages.filter((p) => !p.contentText.trim()).map((p) => ({ path: `pages.${p.id}`, message: `Trang ${p.pageOrder} chưa có chữ` })),
      ...story.checkpoints
        .filter((c) => !c.question.trim() || (c.options.length > 0 && c.options.some((o) => !o.text.trim())))
        .map((c) => ({ path: `checkpoints.${c.id}`, message: `Điểm dừng sau trang ${c.afterPageOrder} chưa viết xong` })),
    ];
    if (errors.length) fail(`Còn ${errors.length} chỗ chưa viết xong`, 422, errors);
    story.reviewedAt = new Date().toISOString();
    story.status = "ready";
    if (story.useTts) {
      const total = story.pages.length + story.checkpoints.length;
      story.narration = { enabled: true, total, ready: 0, pending: total, failed: 0, missing: 0, complete: false };
      story.readiness = { ready: false, reason: "narration_incomplete" };
      startJob("narration", id);
    } else {
      story.readiness = { ready: true, reason: null };
    }
    return withCounts(story);
  });

/** POST /stories/:id/narration/retry → story. Chỉ đọc lại các đoạn lỗi / thiếu. */
export const retryNarration = (id: string) =>
  respond(() => {
    const story = findStory(id);
    story.narration = { ...story.narration, pending: story.narration.total - story.narration.ready, failed: 0, missing: 0 };
    startJob("narration", id);
    return withCounts(story);
  });

// ---- Tranh ----

/** POST /stories/:id/images → bật tranh và vẽ mọi cảnh còn thiếu. */
export const drawStoryImages = (id: string) =>
  respond(() => {
    const story = findStory(id);
    if (!story.scenes.length) {
      story.scenes = [1, 2, 3].map((n) => ({ id: `${id}-sc${n}`, sceneOrder: n, description: `Cảnh ${n}`, imageStatus: "queued", imageUrl: null }));
      story.pages = story.pages.map((p, i) => ({ ...p, sceneId: `${id}-sc${Math.min(3, Math.floor((i * 3) / story.pages.length) + 1)}` }));
    }
    spend(story.scenes.filter((s) => !s.imageUrl).length * aiPricing.images.scene);
    story.useAiImage = true;
    story.scenes.forEach((s) => s.imageUrl || (s.imageStatus = "generating"));
    startJob("scene", id);
    return { started: true };
  });

/** POST /stories/:id/scenes/:sceneId/image → vẽ lại một cảnh. */
export const redrawScene = (id: string, sceneId: string) =>
  respond(() => {
    const story = findStory(id);
    spend(aiPricing.images.scene);
    const scene = story.scenes.find((s) => s.id === sceneId) ?? fail("Không tìm thấy cảnh", 404);
    scene.imageStatus = "generating";
    startJob("scene", id);
    return { started: true };
  });

/** PUT /stories/:id/cover { sceneId | null } → story. null = mặc định (cảnh 1). 422 khi cảnh chưa có tranh. */
export const setStoryCover = (id: string, sceneId: string | null) =>
  respond(() => {
    const story = findStory(id);
    const scene = sceneId ? story.scenes.find((s) => s.id === sceneId) : story.scenes.slice().sort((a, b) => a.sceneOrder - b.sceneOrder)[0];
    if (sceneId && !scene?.imageUrl) fail("Cảnh này chưa có tranh để làm bìa", 422);
    story.coverSceneId = sceneId;
    story.cover = { ...story.cover, imageUrl: scene?.imageUrl ?? null };
    return withCounts(story);
  });

// ---- Giá sách của bé ----

/** GET /bookshelf/check/:storyId → { storyId, children: [{ childId, name, inBookshelf, addedAt }] } */
export const getShelfStatus = (storyId: string) =>
  respond(() => ({
    storyId,
    children: db.children.map((c): ShelfChild => {
      const item = db.shelves[c.id]?.find((x) => x.storyId === storyId);
      return { childId: c.id, name: c.name, inBookshelf: !!item, addedAt: item?.addedAt ?? null };
    }),
  }));

/** POST /bookshelf { childId, storyId }. 422 khi truyện chưa sẵn sàng (chưa hoàn tất / thiếu giọng đọc). */
export const addToShelf = (childId: string, storyId: string) =>
  respond(() => {
    const story = findStory(storyId);
    if (!story.readiness.ready) fail("Truyện chưa sẵn sàng cho bé đọc", 422);
    (db.shelves[childId] ??= []).unshift({ storyId, addedAt: new Date().toISOString(), progress: null });
    return { ok: true };
  });

export const removeFromShelf = (childId: string, storyId: string) =>
  respond(() => {
    db.shelves[childId] = (db.shelves[childId] ?? []).filter((x) => x.storyId !== storyId);
    return { ok: true };
  });

// ---- Nhân vật gia đình ----

/** GET /characters */
export const getCharacters = () =>
  respond(() => {
    advanceJobs();
    return db.characters;
  });

/** POST /characters { name, appearance } */
export const createCharacter = (payload: { name: string; appearance: string }) =>
  respond(() => {
    const plan = plans.find((p) => p.id === db.planId)!;
    if (db.characters.length >= plan.maxCharacters) fail(`Gói hiện tại cho tối đa ${plan.maxCharacters} nhân vật`, 422);
    const character: Character = { id: uid("c"), name: payload.name, appearance: payload.appearance, childId: null, child: null, portraitStatus: "none", portraitImageUrl: null, storiesCount: 0 };
    db.characters.push(character);
    return character;
  });

/** PUT /characters/:id { name?, appearance? } — nhân vật của bé không đổi tên ở đây */
export const updateCharacter = (id: string, payload: { name?: string; appearance?: string }) =>
  respond(() => {
    const c = db.characters.find((x) => x.id === id) ?? fail("Không tìm thấy nhân vật", 404);
    if (payload.name && c.childId) fail("Nhân vật của bé đổi tên ở trang Bé nhà mình", 422);
    Object.assign(c, payload);
    return c;
  });

/** DELETE /characters/:id — xoá mềm; nhân vật của bé → 422 */
export const deleteCharacter = (id: string) =>
  respond(() => {
    const c = db.characters.find((x) => x.id === id) ?? fail("Không tìm thấy nhân vật", 404);
    if (c.childId) fail("Không xoá được nhân vật của bé", 422);
    db.characters = db.characters.filter((x) => x.id !== id);
    return { deleted: true };
  });

/** POST /characters/:id/portrait → 202 { character } — giữ credit, AI vẽ 1 chân dung. */
export const generatePortrait = (id: string) =>
  respond(() => {
    const c = db.characters.find((x) => x.id === id) ?? fail("Không tìm thấy nhân vật", 404);
    spend(aiPricing.images.characterPortrait);
    c.portraitStatus = "generating";
    startJob("portrait", id);
    return c;
  });

// ---- Danh mục sư phạm (đọc) ----

/** GET /topics — chuyện mẫu đang mở */
export const getTopics = () => respond(() => topics);

/** GET /sub-skills — phụ huynh chỉ thấy mục đang bật */
export const getSubSkills = () => respond(() => subSkills.filter((s) => s.isActive));
