import { db, eqCompetencies, eqConversation, eqEvidence, eqRecommendations, plans } from "@/mocks/db";
import type { Bookshelf, BookshelfItem, Character, Child, ChildOverview, EqJourney, EqLevel, EqReport, ShelfStatus, TrendWeek, Usage } from "@/types/models";
import { toIsoDate } from "@/utils/format";
import { fail, respond, uid } from "./mockApi";

// Hồ sơ bé — BE: /api/v1/children (yêu cầu đăng nhập phụ huynh), schema rev8.

const EQ_SETTINGS = { window: 10, minItems: 3, developingFrom: 0.5, secureFrom: 0.8 };

const ageOf = (birthDate: string | null) => {
  if (!birthDate) return null;
  const b = new Date(`${birthDate}T00:00:00`);
  const now = new Date();
  return now.getFullYear() - b.getFullYear() - (now < new Date(now.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
};

/** Một mục giá sách của bé (bookshelf_items + reading progress), dùng chung cho tủ sách phụ huynh và Kid Mode. */
export const toShelfItem = (storyId: string, progress: BookshelfItem["readingProgress"]): BookshelfItem | null => {
  const s = db.stories.find((x) => x.id === storyId);
  if (!s) return null;
  return { storyId, title: s.title, kind: s.kind, topic: s.topic, totalPages: s.pages.length, length: s.length, useTts: s.useTts, cover: s.cover, readingProgress: progress };
};

const syncChild = (child: Child): Child => {
  const shelf = db.shelves[child.id] ?? [];
  return {
    ...child,
    age: ageOf(child.birthDate),
    booksCount: shelf.length,
    character: db.characters.find((c) => c.childId === child.id) ?? null,
  };
};

const findChild = (childId: string) => db.children.find((c) => c.id === childId) ?? fail("Không tìm thấy hồ sơ bé", 404);

/** GET /children → child[] */
export const getChildren = () => respond(() => db.children.map(syncChild));

interface ChildPayload {
  name: string;
  birthDate?: string | null;
  preferredVoice?: string | null;
  appearance?: string | null;
}

/** POST /children — appearance có → tạo kèm nhân vật đại diện của bé */
export const createChild = (payload: ChildPayload) =>
  respond(() => {
    const plan = plans.find((p) => p.id === db.planId)!;
    if (db.children.length >= plan.maxChildren) fail(`Gói hiện tại chỉ tạo được tối đa ${plan.maxChildren} hồ sơ bé. Ba mẹ nâng cấp gói để thêm bé nhé`, 422);
    const id = uid("child");
    if (payload.appearance) {
      db.characters.push({ id: uid("c"), name: payload.name, appearance: payload.appearance, childId: id, child: { id, name: payload.name }, portraitStatus: "none", portraitImageUrl: null, storiesCount: 0 });
    }
    const child: Child = { id, name: payload.name, birthDate: payload.birthDate ?? null, age: null, preferredVoice: payload.preferredVoice ?? null, booksCount: 0, completedSessionsCount: 0, character: null };
    db.children.push(child);
    db.shelves[id] = [];
    return syncChild(child);
  });

/** PUT /children/:id — appearance null → gỡ nhân vật đại diện */
export const updateChild = (childId: string, payload: Partial<ChildPayload>) =>
  respond(() => {
    const child = findChild(childId);
    if (payload.name !== undefined) child.name = payload.name;
    if (payload.birthDate !== undefined) child.birthDate = payload.birthDate;
    if (payload.preferredVoice !== undefined) child.preferredVoice = payload.preferredVoice;
    if (payload.appearance !== undefined) {
      const existing = db.characters.find((c) => c.childId === childId);
      if (payload.appearance === null) db.characters = db.characters.filter((c) => c.childId !== childId);
      else if (existing) existing.appearance = payload.appearance;
      else db.characters.push({ id: uid("c"), name: child.name, appearance: payload.appearance, childId, child: { id: childId, name: child.name }, portraitStatus: "none", portraitImageUrl: null, storiesCount: 0 } as Character);
    }
    const character = db.characters.find((c) => c.childId === childId);
    if (character) {
      character.name = child.name;
      character.child = { id: childId, name: child.name };
    }
    return syncChild(child);
  });

/** DELETE /children/:id (BE xóa mềm, đồng thời hủy phiên Kid Mode của bé) */
export const deleteChild = (childId: string) =>
  respond(() => {
    findChild(childId);
    db.children = db.children.filter((c) => c.id !== childId);
    db.characters = db.characters.filter((c) => c.childId !== childId);
    delete db.shelves[childId];
    return { deleted: true };
  });

/** GET /children/:id/usage?date=YYYY-MM-DD */
export const getChildUsage = (childId: string, date?: string) =>
  respond((): Usage => db.usage[childId]?.[date ?? toIsoDate(new Date())] ?? { usedMinutes: 0, sessionsCount: 0, completedCount: 0 });

const eqReportOf = (childId: string): EqReport => {
  const child = findChild(childId);
  return { childId, childName: child.name, settings: EQ_SETTINGS, competencies: eqCompetencies[childId] ?? emptyCompetencies(), recommendations: eqRecommendations(childId) };
};

const emptyCompetencies = () =>
  (eqCompetencies["child-na"] ?? []).map((c) => ({ ...c, level: null, subSkills: c.subSkills.map((s) => ({ ...s, level: null, items: 0 })) }));

/** GET /children/:id/overview → { profile, todayUsage, readingStats, eqReport } */
export const getChildOverview = (childId: string) =>
  respond((): ChildOverview => {
    const child = syncChild(findChild(childId));
    const shelf = db.shelves[childId] ?? [];
    return {
      profile: child,
      todayUsage: db.usage[childId]?.[toIsoDate(new Date())] ?? { usedMinutes: 0, sessionsCount: 0, completedCount: 0 },
      readingStats: { booksInBookshelf: shelf.length, completedStories: shelf.filter((s) => s.progress?.isCompleted).length },
      eqReport: eqReportOf(childId),
    };
  });

const LEVEL_STEPS: EqLevel[] = [null, "emerging", "developing", "secure"];

/** Mock xu hướng theo tuần: mức tăng dần tới mức hiện tại của từng năng lực. */
const trendOf = (childId: string, weeks: number): TrendWeek[] => {
  const competencies = eqCompetencies[childId] ?? [];
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: weeks }, (_, i) => {
    const back = weeks - 1 - i;
    const start = new Date(monday.getTime() - back * 7 * 86400000);
    const cells = Object.fromEntries(
      competencies.map((c, k) => {
        const finalStep = LEVEL_STEPS.indexOf(c.level);
        const step = Math.max(0, finalStep - Math.floor(back / 3));
        const items = finalStep > 0 && (i + k) % 3 !== 0 ? ((i + k) % 3) + (back < 2 ? 1 : 0) : 0;
        return [c.caselCode, { items, level: LEVEL_STEPS[step] }];
      }),
    );
    return { weekStart: toIsoDate(start), competencies: cells };
  });
};

/** GET /children/:id/eq-journey?weeks */
export const getChildEqJourney = (childId: string, weeks = 8) =>
  respond((): EqJourney => ({
    ...eqReportOf(childId),
    evidence: eqEvidence[childId] ?? [],
    conversation: eqConversation[childId] ?? [],
    trend: trendOf(childId, weeks),
  }));

/** GET /children/:id/bookshelf?page&limit&search&status&competency → { items, pagination, counts, continueReading } */
export const getChildBookshelf = (
  childId: string,
  { page = 1, limit = 10, search = "", status = "all", competency = "all" }: { page?: number; limit?: number; search?: string; status?: ShelfStatus; competency?: string } = {},
) =>
  respond((): Bookshelf => {
    const all = (db.shelves[childId] ?? [])
      .map((s) => toShelfItem(s.storyId, s.progress))
      .filter((x): x is BookshelfItem => !!x);
    const statusOf = (i: BookshelfItem): ShelfStatus => (!i.readingProgress ? "not_started" : i.readingProgress.isCompleted ? "completed" : "reading");
    const q = search.trim().toLowerCase();
    const scoped = all.filter(
      (i) => (competency === "all" || i.cover.competency === competency) && (!q || i.title.toLowerCase().includes(q) || i.topic?.title.toLowerCase().includes(q)),
    );
    const counts = { all: scoped.length, reading: 0, completed: 0, not_started: 0 } as Record<ShelfStatus, number>;
    for (const i of scoped) counts[statusOf(i)] += 1;
    const filtered = scoped.filter((i) => status === "all" || statusOf(i) === status);
    const total = filtered.length;
    return {
      items: filtered.slice((page - 1) * limit, page * limit),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      counts,
      continueReading: all
        .filter((i) => statusOf(i) === "reading")
        .sort((a, b) => b.readingProgress!.lastActivityAt.localeCompare(a.readingProgress!.lastActivityAt)),
    };
  });
