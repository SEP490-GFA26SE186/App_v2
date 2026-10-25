import type {
  CaselCode,
  Character,
  Checkpoint,
  Child,
  CompetencyLevel,
  ConversationItem,
  Earnings,
  Evidence,
  Listing,
  MyListing,
  Order,
  Plan,
  PriceTier,
  ReadingProgress,
  Review,
  Scene,
  Story,
  StoryCharacter,
  StoryPage,
  Strike,
  SubSkill,
  Topic,
  User,
} from "@/types/models";

// "Cơ sở dữ liệu" trong bộ nhớ cho giai đoạn chỉ làm UI. Mọi service trong src/services đọc / ghi ở đây,
// trả về đúng shape response của BE để sau này chỉ cần thay services bằng lời gọi API thật.
// Tài khoản demo khớp docs/DEMO_ACCOUNTS.md của web: me.lanhuong@storyweaver.vn / 123456, PIN Kid Mode 1234.

const DAY = 86400000;
export const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();
export const daysLater = (n: number) => new Date(Date.now() + n * DAY).toISOString();
const img = (seed: string) => `https://picsum.photos/seed/storyweaver-${seed}/640/640`;

// ---------------- Tài khoản ----------------

export const DEMO = { identity: ["me.lanhuong@storyweaver.vn", "me_lanhuong"], password: "123456", pin: "1234" };

export const plans: Plan[] = [
  { id: "plan-free", code: "free", name: "Miễn phí", durationMonths: 1, priceVnd: 0, creditsPerMonth: 3, maxChildren: 1, maxCharacters: 3, canSell: false },
  { id: "plan-family-m", code: "family_month", name: "Gia đình (tháng)", durationMonths: 1, priceVnd: 79000, creditsPerMonth: 30, maxChildren: 3, maxCharacters: 10, canSell: true },
  { id: "plan-family-y", code: "family_year", name: "Gia đình (năm)", durationMonths: 12, priceVnd: 790000, creditsPerMonth: 30, maxChildren: 3, maxCharacters: 10, canSell: true },
];

export const db = {
  user: {
    id: "u-1",
    username: "me_lanhuong",
    email: "me.lanhuong@storyweaver.vn",
    fullName: "Nguyễn Lan Hương",
    phone: "0901234567",
    role: "parent",
    emailVerifiedAt: null,
    hasKidPin: true,
    wallet: { creditBalance: 18 },
  } as User,
  password: DEMO.password,
  kidPin: DEMO.pin as string | null,
  planId: "plan-family-m",
  periodEnd: daysLater(20),

  characters: [] as Character[],
  children: [] as Child[],
  stories: [] as Story[],
  /** Giá sách từng bé: storyId + tiến độ đọc */
  shelves: {} as Record<string, { storyId: string; addedAt: string; progress: ReadingProgress | null }[]>,
  /** Thời gian đọc theo ngày (YYYY-MM-DD) của từng bé */
  usage: {} as Record<string, Record<string, { usedMinutes: number; sessionsCount: number; completedCount: number }>>,
  generations: {} as Record<string, { status: "processing" | "succeeded" | "failed"; startedAt: number }>,

  listings: [] as Listing[],
  reviews: {} as Record<string, Review[]>,
  reportedListings: new Set<string>(),
  orders: [] as Order[],

  seller: { status: "approved" as const, displayName: "Mẹ Bin kể chuyện" },
  myListings: [] as MyListing[],
  strikes: [] as Strike[],
  earnings: null as unknown as Earnings,
};

// ---------------- Nhân vật & bé ----------------

db.characters = [
  { id: "c-bin", name: "Bin", appearance: "Tóc ngắn xoăn, má phúng phính, hay mặc áo khủng long xanh", childId: "child-bin", child: { id: "child-bin", name: "Bin" }, portraitStatus: "ready", portraitImageUrl: img("portrait-bin"), storiesCount: 3 },
  { id: "c-na", name: "Na", appearance: "Tóc buộc hai chùm, mắt tròn xoe, thích mặc váy vàng", childId: "child-na", child: { id: "child-na", name: "Na" }, portraitStatus: "none", portraitImageUrl: null, storiesCount: 2 },
  { id: "c-ba", name: "Bà nội", appearance: "Tóc bạc búi gọn, đeo kính, hay mặc áo bà ba nâu, rất hiền và hay kể chuyện cổ tích", childId: null, child: null, portraitStatus: "ready", portraitImageUrl: img("portrait-ba"), storiesCount: 1 },
  { id: "c-meo", name: "Mèo Mướp", appearance: "Mèo mướp lông vằn xám, đuôi dài, hay nằm sưởi nắng cạnh cửa sổ", childId: null, child: null, portraitStatus: "none", portraitImageUrl: null, storiesCount: 1 },
];

const characterOf = (id: string) => db.characters.find((c) => c.id === id) ?? null;

db.children = [
  { id: "child-bin", name: "Bin", birthDate: "2019-06-15", age: 7, preferredVoice: "vi-north-female", booksCount: 4, completedSessionsCount: 5, character: characterOf("c-bin") },
  { id: "child-na", name: "Na", birthDate: "2021-03-02", age: 5, preferredVoice: null, booksCount: 2, completedSessionsCount: 1, character: characterOf("c-na") },
];

// ---------------- Chương trình sư phạm ----------------

const skill = (caselCode: CaselCode) => ({ caselCode, nameVi: { self_awareness: "Tự nhận thức", self_management: "Tự quản lý", social_awareness: "Nhận thức xã hội", relationship_skills: "Kỹ năng quan hệ", responsible_decision_making: "Ra quyết định có trách nhiệm" }[caselCode] });

export const topics: Topic[] = [
  { id: "t-fear", title: "Gọi tên nỗi sợ", ageMin: 4, ageMax: 7, skill: skill("self_awareness") },
  { id: "t-anger", title: "Khi con thấy giận", ageMin: 4, ageMax: 8, skill: skill("self_management") },
  { id: "t-breathe", title: "Hít thở khi lo lắng", ageMin: 5, ageMax: 8, skill: skill("self_management") },
  { id: "t-sad-friend", title: "Bạn ấy đang buồn", ageMin: 4, ageMax: 7, skill: skill("social_awareness") },
  { id: "t-share", title: "Chia sẻ đồ chơi với bạn", ageMin: 4, ageMax: 6, skill: skill("relationship_skills") },
  { id: "t-sorry", title: "Nói lời xin lỗi", ageMin: 5, ageMax: 8, skill: skill("relationship_skills") },
  { id: "t-choice", title: "Chọn cách tốt nhất", ageMin: 6, ageMax: 8, skill: skill("responsible_decision_making") },
  { id: "t-strength", title: "Con giỏi ở điều gì?", ageMin: 5, ageMax: 8, skill: skill("self_awareness") },
];

export const subSkills: SubSkill[] = [
  { id: "ss-sa1", code: "SA1", nameVi: "Gọi tên cảm xúc của mình", descriptionVi: "Bé nói được mình đang vui, buồn, giận hay sợ.", isActive: true, skill: skill("self_awareness") },
  { id: "ss-sa2", code: "SA2", nameVi: "Nhận ra điểm mạnh của bản thân", descriptionVi: "Bé biết mình làm tốt điều gì.", isActive: true, skill: skill("self_awareness") },
  { id: "ss-sm1", code: "SM1", nameVi: "Bình tĩnh khi giận", descriptionVi: "Bé dừng lại, hít thở trước khi phản ứng.", isActive: true, skill: skill("self_management") },
  { id: "ss-sm2", code: "SM2", nameVi: "Kiên nhẫn chờ đến lượt", descriptionVi: "Bé chờ được khi chưa tới lượt mình.", isActive: true, skill: skill("self_management") },
  { id: "ss-so1", code: "SO1", nameVi: "Hiểu cảm xúc của người khác", descriptionVi: "Bé đoán được bạn đang cảm thấy thế nào.", isActive: true, skill: skill("social_awareness") },
  { id: "ss-so2", code: "SO2", nameVi: "Thể hiện sự đồng cảm", descriptionVi: "Bé an ủi, hỏi han khi bạn buồn.", isActive: true, skill: skill("social_awareness") },
  { id: "ss-rs1", code: "RS1", nameVi: "Chia sẻ và hợp tác", descriptionVi: "Bé cùng chơi, cùng làm với bạn.", isActive: true, skill: skill("relationship_skills") },
  { id: "ss-rs2", code: "RS2", nameVi: "Nói lời xin lỗi", descriptionVi: "Bé nhận lỗi và làm lành khi lỡ làm bạn buồn.", isActive: true, skill: skill("relationship_skills") },
  { id: "ss-rd1", code: "RD1", nameVi: "Suy nghĩ trước khi làm", descriptionVi: "Bé nghĩ xem việc mình làm sẽ dẫn tới điều gì.", isActive: true, skill: skill("responsible_decision_making") },
];

export const CASEL_TEXT_EN: Record<string, string> = {
  "ss-sa1": "Identifying one's emotions",
  "ss-sa2": "Identifying personal, cultural, and linguistic assets",
  "ss-sm1": "Managing one's emotions",
  "ss-sm2": "Exhibiting self-discipline and self-motivation",
  "ss-so1": "Taking others' perspectives",
  "ss-so2": "Demonstrating empathy and compassion",
  "ss-rs1": "Practicing teamwork and collaborative problem-solving",
  "ss-rs2": "Resolving conflicts constructively",
  "ss-rd1": "Anticipating and evaluating the consequences of one's actions",
};

export const aiPricing = {
  lengths: [
    { length: "short" as const, pages: 6, checkpoints: 3, credits: 1 },
    { length: "medium" as const, pages: 8, checkpoints: 3, credits: 1 },
    { length: "long" as const, pages: 10, checkpoints: 4, credits: 2 },
  ],
  images: { characterPortrait: 1, scene: 1, maxScenes: 4 },
};

// ---------------- Truyện ----------------

const NARRATION_OFF = { enabled: false, total: 0, ready: 0, pending: 0, failed: 0, missing: 0, complete: false };
const narrationDone = (total: number) => ({ enabled: true, total, ready: total, pending: 0, failed: 0, missing: 0, complete: true });

const pagesOf = (storyId: string, texts: string[], sceneOf?: (i: number) => string | null): StoryPage[] =>
  texts.map((contentText, i) => ({ id: `${storyId}-p${i + 1}`, pageOrder: i + 1, contentText, origin: contentText ? "ai" : "manual", sceneId: sceneOf?.(i) ?? null }));

const cast = (list: [string, string | null, string | null][]): StoryCharacter[] =>
  list.map(([token, name, characterId], i) => ({ token, name, characterId, isMain: i === 0 }));

type CpSeed = Omit<Checkpoint, "id" | "afterPageId" | "afterPageOrder" | "locked" | "hint" | "answerEmotion" | "targetToken" | "options"> &
  Partial<Pick<Checkpoint, "hint" | "answerEmotion" | "targetToken" | "options">> & { after: number };

const checkpointsOf = (storyId: string, locked: boolean, seeds: CpSeed[]): Checkpoint[] =>
  seeds.map(({ after, ...cp }, i) => ({
    id: `${storyId}-cp${i + 1}`,
    afterPageId: `${storyId}-p${after}`,
    afterPageOrder: after,
    locked,
    hint: null,
    answerEmotion: null,
    targetToken: null,
    options: [],
    ...cp,
    // id cho phương án để bé chọn (BE chấm theo optionId)
  })).map((cp) => ({ ...cp, options: cp.options.map((o, j) => ({ ...o, id: `${cp.id}-o${j + 1}` })) }));

const baseStory = (s: Partial<Story> & Pick<Story, "id" | "title" | "pages">): Story => ({
  status: "ready",
  reviewedAt: null,
  mode: "ai",
  entry: "topic",
  length: "short",
  topic: null,
  pageCount: s.pages.length,
  checkpointCount: s.checkpoints?.length ?? 0,
  cover: { imageUrl: null, competency: s.topic?.competency ?? null },
  kind: "private",
  scored: true,
  useTts: true,
  useAiImage: false,
  momentSummary: null,
  seedEvent: null,
  subSkills: [],
  characters: [],
  checkpoints: [],
  scenes: [],
  coverSceneId: null,
  narration: NARRATION_OFF,
  readiness: { ready: false, reason: "not_reviewed" },
  keywordWarnings: [],
  ...s,
});

// s1 — "Kể chuyện nhà mình", đã hoàn tất, có tranh AI, đủ giọng đọc
const s1Scenes: Scene[] = [1, 2, 3].map((n) => ({ id: `s1-sc${n}`, sceneOrder: n, description: `Cảnh ${n} trong phòng chơi`, imageStatus: "ready", imageUrl: img(`s1-scene${n}`) }));
const s1 = baseStory({
  id: "s1",
  title: "Bin và tòa lâu đài lego",
  entry: "family",
  reviewedAt: daysAgo(3),
  cover: { imageUrl: s1Scenes[0].imageUrl, competency: "self_management" },
  useAiImage: true,
  scenes: s1Scenes,
  momentSummary: "Em gái làm đổ lâu đài lego, {NV1} hét lên và đẩy em ngã.",
  seedEvent: "Mèo con chạy vào phòng làm rơi thêm vài viên gạch.",
  subSkills: [
    { id: "ss-sm1", nameVi: "Bình tĩnh khi giận", source: "moment", position: 1 },
    { id: "ss-rs2", nameVi: "Nói lời xin lỗi", source: "need", position: 2 },
  ],
  characters: cast([["{NV1}", "Bin", "c-bin"], ["{NV2}", "Na", "c-na"]]),
  pages: pagesOf(
    "s1",
    [
      "Chiều chủ nhật, {NV1} ngồi giữa phòng, cẩn thận xếp từng viên lego thành một tòa lâu đài thật cao.",
      "Bỗng {NV2} chạy tới, vấp chân vào thảm. Rầm! Tòa lâu đài đổ sập, gạch lego văng khắp nơi.",
      "Mặt {NV1} đỏ bừng, hai tay nắm chặt. {NV1} muốn hét thật to.",
      "{NV1} nhớ lời mẹ dặn: “Khi giận, mình đếm đến năm và hít thở thật sâu.” Một, hai, ba, bốn, năm…",
      "{NV2} rưng rưng nước mắt: “Em xin lỗi anh, em không cố ý.” {NV1} thấy lòng dịu lại.",
      "Hai anh em cùng nhau xây lại tòa lâu đài, lần này còn đẹp hơn trước. Cả nhà cùng vỗ tay.",
    ],
    (i) => (i < 2 ? "s1-sc1" : i < 4 ? "s1-sc2" : "s1-sc3"),
  ),
  checkpoints: checkpointsOf("s1", true, [
    { after: 2, type: "emotion_self", question: "Lúc tòa lâu đài đổ, {NV1} cảm thấy thế nào?", hint: "Con nhìn xem mặt {NV1} đỏ bừng, tay nắm chặt nhé.", answerEmotion: "angry" },
    {
      after: 4,
      type: "problem_solving",
      question: "Nếu là {NV1}, con sẽ làm gì?",
      options: [
        { text: "Hít thở thật sâu rồi nói cho em biết mình đang buồn", role: "constructive", feedback: "Đúng rồi, bình tĩnh giúp mình nói được điều mình muốn." },
        { text: "Bỏ đi chỗ khác, không chơi nữa", role: "avoidant", feedback: "Bỏ đi thì lâu đài vẫn đổ, mà hai anh em lại buồn." },
        { text: "Đẩy em ra cho bõ giận", role: "impulsive", feedback: "Đẩy em có thể làm em đau và buồn hơn đấy." },
      ],
    },
    { after: 6, type: "reflection", question: "Con đã bao giờ thấy giận khi đồ chơi bị làm hỏng chưa?" },
  ]),
  narration: narrationDone(9),
  readiness: { ready: true, reason: null },
});

// s2 — Chuyện mẫu, AI đã viết xong, chờ ba mẹ xem lại
const s2 = baseStory({
  id: "s2",
  title: "Na học cách chia sẻ",
  length: "medium",
  topic: { title: "Chia sẻ đồ chơi với bạn", competency: "relationship_skills" },
  characters: cast([["{NV1}", "Na", "c-na"], ["{NV2}", "Bin", "c-bin"]]),
  pages: pagesOf("s2", [
    "{NV1} có một con gấu bông màu hồng rất đẹp, {NV1} ôm gấu đi khắp nhà.",
    "Sáng nay {NV2} cũng muốn được ôm gấu một lúc.",
    "{NV1} giấu gấu ra sau lưng: “Không cho đâu, gấu của em mà!”",
    "{NV2} cúi đầu, lặng lẽ ngồi xuống góc phòng.",
    "{NV1} nhìn anh rồi nhìn gấu. Hình như anh đang buồn lắm.",
    "{NV1} nghĩ một lúc rồi đưa gấu cho anh: “Mình cùng chơi nhé!”",
    "Hai anh em cho gấu đi dạo, cho gấu ăn bánh, cười vang cả nhà.",
    "Tối đó, {NV1} thấy chia sẻ làm niềm vui to gấp đôi.",
  ]),
  checkpoints: checkpointsOf("s2", true, [
    { after: 3, type: "emotion_other", question: "Khi không được ôm gấu, {NV2} cảm thấy thế nào?", targetToken: "{NV2}", hint: "Con xem {NV2} cúi đầu ngồi một mình kìa.", answerEmotion: "sad" },
    {
      after: 5,
      type: "perspective",
      question: "Nếu con là {NV2}, con mong {NV1} làm gì?",
      targetToken: "{NV2}",
      hint: "Ai cũng muốn được chơi cùng bạn mà.",
      options: [
        { text: "Cho mình chơi cùng gấu một lúc", isCorrect: true },
        { text: "Mang gấu đi chỗ khác", isCorrect: false },
        { text: "Cười trêu mình", isCorrect: false },
      ],
    },
    { after: 8, type: "reflection", question: "Con thích chia sẻ đồ chơi nào với bạn?" },
  ]),
  readiness: { ready: false, reason: "not_reviewed" },
});

// s3 — Tự viết, đang là bản nháp (còn trang trống)
const s3 = baseStory({
  id: "s3",
  title: "Chuyến đi thăm bà nội",
  status: "draft",
  mode: "manual",
  entry: "handwritten",
  length: "custom",
  characters: cast([["{NV1}", "Bin", "c-bin"], ["{NV2}", "Bà nội", "c-ba"], ["{NV3}", "Mèo Mướp", "c-meo"]]),
  pages: pagesOf("s3", [
    "Cuối tuần, {NV1} theo bố mẹ về quê thăm {NV2}.",
    "{NV2} đứng đợi ở cổng, tay cầm rổ ổi chín thơm phức.",
    "",
    "",
  ]).map((p) => ({ ...p, origin: "manual" as const })),
  checkpoints: checkpointsOf("s3", false, [{ after: 2, type: "emotion_self", question: "Khi gặp {NV2}, {NV1} cảm thấy thế nào?", hint: "", answerEmotion: "happy" }]),
});

// s4 — Chuyện mẫu, chưa cho AI viết (thử luồng "Cho AI viết truyện")
const s4 = baseStory({
  id: "s4",
  title: "Bin dũng cảm đi khám răng",
  status: "draft",
  topic: { title: "Gọi tên nỗi sợ", competency: "self_awareness" },
  characters: cast([["{NV1}", "Bin", "c-bin"], ["{NV2}", "Bà nội", "c-ba"]]),
  pages: pagesOf("s4", ["", "", "", "", "", ""]),
  checkpoints: [],
});

// Truyện mua từ chợ (bản đăng bán dùng nguyên trạng, tên nhân vật chung)
const published = (id: string, title: string, competency: CaselCode, topicTitle: string, names: [string, string], texts: string[]): Story =>
  baseStory({
    id,
    title,
    kind: "published",
    reviewedAt: daysAgo(30),
    topic: { title: topicTitle, competency },
    cover: { imageUrl: img(`${id}-cover`), competency },
    characters: cast([["{NV1}", names[0], null], ["{NV2}", names[1], null]]),
    pages: pagesOf(id, texts),
    checkpoints: checkpointsOf(id, true, [
      { after: 2, type: "emotion_other", question: "{NV2} đang cảm thấy thế nào?", targetToken: "{NV2}", hint: "Con nhìn nét mặt của {NV2} nhé.", answerEmotion: "sad" },
      {
        after: 4,
        type: "problem_solving",
        question: "{NV1} nên làm gì bây giờ?",
        options: [
          { text: "Đến hỏi han và nói lời xin lỗi", role: "constructive", feedback: "Một lời xin lỗi chân thành giúp hai bạn làm lành." },
          { text: "Giả vờ như không có chuyện gì", role: "avoidant", feedback: "Im lặng thì bạn vẫn còn buồn đấy." },
          { text: "Nói to: “Tại cậu chứ!”", role: "impulsive", feedback: "Nói vậy làm bạn càng buồn hơn." },
        ],
      },
      { after: texts.length, type: "reflection", question: "Con đã bao giờ nói lời xin lỗi với bạn chưa?" },
    ]),
    narration: narrationDone(texts.length + 3),
    readiness: { ready: true, reason: null },
  });

const p1 = published("p1", "Thỏ con biết xin lỗi", "relationship_skills", "Nói lời xin lỗi", ["Thỏ Bông", "Sóc Nâu"], [
  "Thỏ Bông và Sóc Nâu cùng chơi ném bóng trên bãi cỏ.",
  "Thỏ Bông ném mạnh quá, quả bóng trúng vào đầu Sóc Nâu. Sóc Nâu ôm đầu khóc.",
  "Thỏ Bông đứng im, tai cụp xuống. Bông không biết phải làm sao.",
  "Mẹ Thỏ bảo: “Khi lỡ làm bạn đau, mình cần làm gì con nhỉ?”",
  "Thỏ Bông chạy tới: “Tớ xin lỗi, cậu có đau không?” Sóc Nâu gật đầu, lau nước mắt.",
  "Hai bạn lại cùng chơi, lần này Bông ném thật nhẹ nhàng.",
]);
const p2 = published("p2", "Gấu nhỏ hít thở sâu", "self_management", "Hít thở khi lo lắng", ["Gấu Mập", "Cáo Đỏ"], [
  "Gấu Mập sắp được lên sân khấu hát trong ngày hội của rừng xanh.",
  "Cáo Đỏ hát xong trước, Gấu Mập bỗng thấy tim đập thình thịch.",
  "Gấu nhớ lời cô giáo: hít vào thật sâu như ngửi bông hoa, thở ra như thổi nến.",
  "Một lần, hai lần, ba lần… Gấu Mập thấy người nhẹ hẳn.",
  "Gấu bước lên sân khấu và hát thật hay. Cả khu rừng vỗ tay rộn ràng.",
  "Từ hôm đó, mỗi lần lo lắng, Gấu Mập lại hít thở thật sâu.",
]);
const p3 = published("p3", "Chiếc ô của bạn Mèo", "social_awareness", "Bạn ấy đang buồn", ["Vịt Vàng", "Mèo Mun"], [
  "Trời đổ mưa to, Vịt Vàng thấy Mèo Mun đứng co ro dưới mái hiên.",
  "Mèo Mun quên mang ô, lông ướt sũng, mắt buồn thiu.",
  "Vịt Vàng nghĩ: “Nếu mình bị ướt, chắc mình cũng buồn lắm.”",
  "Vịt Vàng chạy lại, nghiêng chiếc ô che cho bạn.",
  "Hai bạn cùng đi dưới một chiếc ô, vừa đi vừa hát.",
  "Mèo Mun cười tươi: “Cảm ơn cậu, Vịt Vàng!”",
]);

db.stories = [s1, s2, s3, s4, p1, p2, p3];

// ---------------- Giá sách & thời gian đọc ----------------

const progress = (page: number, total: number, ago: number, done = false): ReadingProgress => ({
  currentPageOrder: page,
  progressPercentage: done ? 100 : Math.round((page / total) * 100),
  lastActivityAt: daysAgo(ago),
  isCompleted: done,
});

db.shelves = {
  "child-bin": [
    { storyId: "s1", addedAt: daysAgo(3), progress: progress(3, 6, 0) },
    { storyId: "p2", addedAt: daysAgo(9), progress: progress(2, 6, 2) },
    { storyId: "p1", addedAt: daysAgo(20), progress: progress(6, 6, 6, true) },
    { storyId: "p3", addedAt: daysAgo(12), progress: null },
  ],
  "child-na": [
    { storyId: "p1", addedAt: daysAgo(18), progress: progress(2, 6, 1) },
    { storyId: "s1", addedAt: daysAgo(3), progress: null },
  ],
};

const today = new Date();
const key = (offset: number) => {
  const d = new Date(today.getTime() + offset * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
db.usage = {
  "child-bin": { [key(0)]: { usedMinutes: 24, sessionsCount: 2, completedCount: 1 }, [key(-1)]: { usedMinutes: 18, sessionsCount: 2, completedCount: 0 } },
  "child-na": { [key(-1)]: { usedMinutes: 9, sessionsCount: 1, completedCount: 0 } },
};

// ---------------- Báo cáo EQ ----------------

const sub = (id: string, level: CompetencyLevel["level"], items: number) => ({
  id,
  nameVi: subSkills.find((s) => s.id === id)!.nameVi,
  caselTextEn: CASEL_TEXT_EN[id] ?? null,
  level,
  items,
});

export const eqCompetencies: Record<string, CompetencyLevel[]> = {
  "child-bin": [
    { caselCode: "self_awareness", nameVi: "Tự nhận thức", level: "developing", subSkills: [sub("ss-sa1", "developing", 6), sub("ss-sa2", null, 1)] },
    { caselCode: "self_management", nameVi: "Tự quản lý", level: "emerging", subSkills: [sub("ss-sm1", "emerging", 4), sub("ss-sm2", null, 2)] },
    { caselCode: "social_awareness", nameVi: "Nhận thức xã hội", level: "developing", subSkills: [sub("ss-so1", "secure", 7), sub("ss-so2", "developing", 5)] },
    { caselCode: "relationship_skills", nameVi: "Kỹ năng quan hệ", level: "developing", subSkills: [sub("ss-rs1", "developing", 5), sub("ss-rs2", "developing", 3)] },
    { caselCode: "responsible_decision_making", nameVi: "Ra quyết định có trách nhiệm", level: null, subSkills: [sub("ss-rd1", null, 1)] },
  ],
  "child-na": [
    { caselCode: "self_awareness", nameVi: "Tự nhận thức", level: null, subSkills: [sub("ss-sa1", null, 1), sub("ss-sa2", null, 0)] },
    { caselCode: "self_management", nameVi: "Tự quản lý", level: null, subSkills: [sub("ss-sm1", null, 0), sub("ss-sm2", null, 0)] },
    { caselCode: "social_awareness", nameVi: "Nhận thức xã hội", level: null, subSkills: [sub("ss-so1", null, 2), sub("ss-so2", null, 0)] },
    { caselCode: "relationship_skills", nameVi: "Kỹ năng quan hệ", level: null, subSkills: [sub("ss-rs1", null, 1), sub("ss-rs2", null, 1)] },
    { caselCode: "responsible_decision_making", nameVi: "Ra quyết định có trách nhiệm", level: null, subSkills: [sub("ss-rd1", null, 0)] },
  ],
};

export const eqEvidence: Record<string, Evidence[]> = {
  "child-bin": [
    { subSkillId: "ss-sm1", answeredAt: daysAgo(0), storyTitle: "Bin và tòa lâu đài lego", question: "Lúc tòa lâu đài đổ, Bin cảm thấy thế nào?", firstChoiceText: "Buồn", correctFirstTry: false, usedHint: true, source: "ai_template", momentSummary: "Em gái làm đổ lâu đài lego, Bin hét lên và đẩy em ngã." },
    { subSkillId: "ss-sm1", answeredAt: daysAgo(2), storyTitle: "Gấu nhỏ hít thở sâu", question: "Gấu Mập nên làm gì khi thấy tim đập thình thịch?", firstChoiceText: "Chạy về nhà", correctFirstTry: false, usedHint: false, source: "ai_template", momentSummary: null },
    { subSkillId: "ss-so1", answeredAt: daysAgo(6), storyTitle: "Thỏ con biết xin lỗi", question: "Sóc Nâu đang cảm thấy thế nào?", firstChoiceText: "Buồn", correctFirstTry: true, usedHint: false, source: "ai_template", momentSummary: null },
    { subSkillId: "ss-rs2", answeredAt: daysAgo(6), storyTitle: "Thỏ con biết xin lỗi", question: "Thỏ Bông nên làm gì bây giờ?", firstChoiceText: "Đến hỏi han và nói lời xin lỗi", correctFirstTry: true, usedHint: false, source: "ai_template", momentSummary: null },
    { subSkillId: "ss-sa1", answeredAt: daysAgo(9), storyTitle: "Gấu nhỏ hít thở sâu", question: "Trước khi lên sân khấu, Gấu Mập cảm thấy thế nào?", firstChoiceText: "Sợ", correctFirstTry: true, usedHint: false, source: "ai_template", momentSummary: null },
  ],
  "child-na": [],
};

export const eqConversation: Record<string, ConversationItem[]> = {
  "child-bin": [
    {
      storyId: "s1",
      storyTitle: "Bin và tòa lâu đài lego",
      subSkillId: "ss-sm1",
      prompts: ["Lần gần nhất con thấy giận là khi nào?", "Khi giận, con làm gì để bình tĩnh lại?"],
      reflection: { question: "Con đã bao giờ thấy giận khi đồ chơi bị làm hỏng chưa?", answered: false },
    },
    {
      storyId: "p1",
      storyTitle: "Thỏ con biết xin lỗi",
      subSkillId: "ss-rs2",
      prompts: ["Vì sao Thỏ Bông cần xin lỗi Sóc Nâu?", "Con thường nói gì khi lỡ làm bạn buồn?"],
      reflection: { question: "Con đã bao giờ nói lời xin lỗi với bạn chưa?", answered: true },
    },
  ],
  "child-na": [],
};

export const eqRecommendations = (childId: string) =>
  (childId === "child-bin" ? ["t-anger", "t-choice", "t-breathe"] : ["t-fear", "t-sad-friend", "t-share"]).map((id) => {
    const t = topics.find((x) => x.id === id)!;
    return { id: t.id, title: t.title, skill: { caselCode: t.skill.caselCode }, subSkills: subSkills.filter((s) => s.skill.caselCode === t.skill.caselCode).slice(0, 2).map((s) => ({ id: s.id, nameVi: s.nameVi })) };
  });

// ---------------- Chợ truyện ----------------

export const priceTiers: PriceTier[] = [
  { id: "tier-free", label: "Miễn phí", priceVnd: 0 },
  { id: "tier-19", label: "19.000đ", priceVnd: 19000 },
  { id: "tier-29", label: "29.000đ", priceVnd: 29000 },
  { id: "tier-39", label: "39.000đ", priceVnd: 39000 },
];
const tier = (id: string) => priceTiers.find((t) => t.id === id)!;

const listing = (l: Partial<Listing> & Pick<Listing, "id" | "title" | "description" | "topic">): Listing => ({
  totalPages: 6,
  checkpointCount: 3,
  priceTier: tier("tier-19"),
  seller: { displayName: "Bố Tôm kể chuyện" },
  purchaseCount: 120,
  ratingAvg: 4.6,
  ratingCount: 18,
  hasAiContent: true,
  hasNarration: true,
  owned: false,
  isMine: false,
  publishedStoryId: `pub-${l.id}`,
  cover: { imageUrl: img(`${l.id}-cover`), competency: l.topic?.competency ?? null },
  preview: undefined,
  ...l,
});

db.listings = [
  listing({ id: "l1", title: "Thỏ con biết xin lỗi", description: "Thỏ Bông lỡ ném bóng trúng bạn và học cách nói lời xin lỗi chân thành.", topic: { title: "Nói lời xin lỗi", competency: "relationship_skills", ageMin: 5, ageMax: 7 }, priceTier: tier("tier-free"), purchaseCount: 1240, ratingAvg: 4.8, ratingCount: 36, owned: true, publishedStoryId: "p1", seller: { displayName: "Cô Mai mầm non" }, cover: p1.cover, preview: p1.pages[0].contentText.replace("{NV1}", "Thỏ Bông").replace("{NV2}", "Sóc Nâu") }),
  listing({ id: "l2", title: "Gấu nhỏ hít thở sâu", description: "Trước giờ biểu diễn, Gấu Mập run lắm. Một bài hít thở nhỏ giúp gấu bình tĩnh lại.", topic: { title: "Hít thở khi lo lắng", competency: "self_management", ageMin: 4, ageMax: 6 }, purchaseCount: 860, ratingAvg: 4.7, ratingCount: 29, owned: true, publishedStoryId: "p2", cover: p2.cover }),
  listing({ id: "l3", title: "Chiếc ô của bạn Mèo", description: "Một chiều mưa, Vịt Vàng nhận ra bạn Mèo đang buồn và tìm cách giúp bạn.", topic: { title: "Bạn ấy đang buồn", competency: "social_awareness", ageMin: 4, ageMax: 7 }, priceTier: tier("tier-29"), purchaseCount: 532, ratingAvg: 4.9, ratingCount: 21, owned: true, publishedStoryId: "p3", cover: p3.cover }),
  listing({ id: "l4", title: "Bạn mới ở lớp Lá", description: "Ngày đầu tới lớp mới, Tí chẳng quen ai. Liệu Tí có tìm được bạn chơi cùng?", topic: { title: "Bạn ấy đang buồn", competency: "social_awareness", ageMin: 5, ageMax: 7 }, hasNarration: false, purchaseCount: 210, ratingAvg: 4.4, ratingCount: 9, seller: { displayName: "Mẹ Su & Sóc" } }),
  listing({ id: "l5", title: "Khi em bé ra đời", description: "Nhà có thêm em bé, Bống vừa vui vừa tủi thân. Bống học cách gọi tên cảm xúc của mình.", topic: { title: "Gọi tên nỗi sợ", competency: "self_awareness", ageMin: 5, ageMax: 8 }, priceTier: tier("tier-29"), totalPages: 8, purchaseCount: 410, ratingAvg: 4.7, ratingCount: 15 }),
  listing({ id: "l6", title: "Chọn quà cho mẹ", description: "Su có 20 nghìn đồng tiết kiệm. Mua kẹo cho mình hay mua hoa tặng mẹ?", topic: { title: "Chọn cách tốt nhất", competency: "responsible_decision_making", ageMin: 6, ageMax: 8 }, priceTier: tier("tier-free"), purchaseCount: 980, ratingAvg: 4.5, ratingCount: 40, hasAiContent: false }),
  listing({ id: "l7", title: "Cuộc thi vẽ tranh", description: "Hai bạn thân cùng thi vẽ. Khi một bạn thắng, bạn kia sẽ làm gì?", topic: { title: "Chia sẻ đồ chơi với bạn", competency: "relationship_skills", ageMin: 5, ageMax: 8 }, priceTier: tier("tier-39"), totalPages: 10, checkpointCount: 4, purchaseCount: 95, ratingAvg: 4.2, ratingCount: 6 }),
  listing({ id: "l8", title: "Bé và tòa lâu đài lego", description: "Lâu đài lego đổ sập, bé giận lắm. Đếm đến năm, hít thở thật sâu nào!", topic: { title: "Khi con thấy giận", competency: "self_management", ageMin: 4, ageMax: 7 }, isMine: true, seller: { displayName: "Mẹ Bin kể chuyện" }, purchaseCount: 57, ratingAvg: 4.6, ratingCount: 5, cover: s1.cover }),
];
for (const l of db.listings) l.preview ??= "Ngày xửa ngày xưa, ở một khu rừng nhỏ xanh mát, có một bạn nhỏ rất thích khám phá…";

const review = (id: string, rating: number, author: string, comment: string | null, tags: string[], ago: number, sellerReply: string | null = null): Review => ({
  id, rating, author, comment, tags, updatedAt: daysAgo(ago), mine: false, sellerReply,
});
db.reviews = {
  l1: [
    review("r1", 5, "Mẹ Bống", "Con mình nghe đi nghe lại, tối nào cũng đòi đọc. Bài học xin lỗi rất nhẹ nhàng.", ["child_liked", "clear_lesson"], 2, "Cảm ơn mẹ Bống đã yêu thích truyện ạ!"),
    review("r2", 5, "Bố Khoai", "Giọng đọc dễ nghe, câu hỏi vừa sức bé 5 tuổi.", ["good_narration", "age_appropriate"], 8),
    review("r3", 4, "Mẹ Sữa", null, ["age_appropriate"], 15),
  ],
  l2: [review("r4", 5, "Mẹ Tép", "Bé nhà mình hay lo lắng, đọc xong tự biết hít thở.", ["clear_lesson"], 4)],
};

// ---------------- Thanh toán & bán truyện ----------------

db.orders = [
  { id: "o1", totalVnd: 79000, paidAt: daysAgo(1), payosOrderCode: 260125001, items: [{ id: "oi1", itemType: "plan", title: "Gia đình (tháng)", unitPriceVnd: 79000, refundable: true, deadline: daysLater(2), refund: null }] },
  { id: "o2", totalVnd: 19000, paidAt: daysAgo(9), payosOrderCode: 260116042, items: [{ id: "oi2", itemType: "listing", title: "Gấu nhỏ hít thở sâu", unitPriceVnd: 19000, refundable: false, deadline: daysAgo(6), refund: { status: "rejected", decisionNote: "Bé đã đọc hết truyện nên không áp dụng hoàn tiền." } }] },
  { id: "o3", totalVnd: 29000, paidAt: daysAgo(12), payosOrderCode: 260113077, items: [{ id: "oi3", itemType: "listing", title: "Chiếc ô của bạn Mèo", unitPriceVnd: 29000, refundable: false, deadline: daysAgo(9), refund: null }] },
];

db.myListings = [
  { id: "ml1", title: "Bé và tòa lâu đài lego", status: "published", priceVnd: 19000, hasNarration: true, narration: { total: 9, ready: 9, failed: 0, missing: 0, complete: true }, lastDecision: null, publishedStoryId: "pub-l8", cover: s1.cover },
  { id: "ml2", title: "Cún con và vũng nước", status: "submitted", priceVnd: 29000, hasNarration: true, narration: { total: 11, ready: 6, failed: 0, missing: 0, complete: false }, lastDecision: null, publishedStoryId: "pub-ml2", cover: { imageUrl: null, competency: "self_awareness" } },
  { id: "ml3", title: "Cuộc phiêu lưu ở sở thú", status: "changes_requested", priceVnd: 0, hasNarration: false, narration: null, lastDecision: { comment: "Trang 5 có đoạn sư tử gầm hơi đáng sợ với bé 4 tuổi, ba mẹ viết nhẹ nhàng hơn nhé." }, publishedStoryId: "pub-ml3", cover: { imageUrl: null, competency: "social_awareness" } },
];

db.strikes = [
  { id: "st1", source: "report", reason: "Trang 4 có tiếng sấm được tả quá đáng sợ, nhiều phụ huynh báo cáo bé giật mình.", issuedAt: daysAgo(30), expiresAt: daysLater(60), revokedAt: null, active: true, appeal: null },
  { id: "st2", source: "rejection", reason: "Bản đăng bán còn sót tên thật của bé ở trang 2.", issuedAt: daysAgo(120), expiresAt: daysAgo(30), revokedAt: null, active: false, appeal: { status: "rejected", decisionNote: "Tên thật xuất hiện rõ ở trang 2, cảnh cáo giữ nguyên." } },
];

db.earnings = {
  balance: { pendingVnd: 45600, availableVnd: 182400, lockedVnd: 0 },
  bank: { bankBin: "970436", bankName: "Vietcombank", accountNumber: "0123456789", accountHolder: "NGUYEN LAN HUONG" },
  withdrawals: [{ id: "w1", amountVnd: 150000, status: "paid", createdAt: daysAgo(20) }],
  minWithdrawalVnd: 50000,
  holdDays: 7,
  sellerShareRate: 0.8,
};
