// Kiểu dữ liệu khớp response của BE (schema rev8) — mock trong src/mocks trả đúng các shape này,
// để sau này thay services mock bằng API thật không phải sửa UI.

export type CaselCode =
  | "self_awareness"
  | "self_management"
  | "social_awareness"
  | "relationship_skills"
  | "responsible_decision_making";

export type EqLevel = "emerging" | "developing" | "secure" | null;
export type StoryLength = "short" | "medium" | "long" | "custom";
export type GenerationStatus = "none" | "queued" | "generating" | "ready" | "failed";
export type CheckpointType = "emotion_self" | "emotion_other" | "perspective" | "problem_solving" | "reflection";
export type Emotion = "happy" | "sad" | "angry" | "scared" | "neutral";
export type OptionRole = "constructive" | "avoidant" | "impulsive";

export interface Cover {
  imageUrl: string | null;
  competency: CaselCode | null;
}

export interface TopicRef {
  title: string;
  competency: CaselCode | null;
  ageMin?: number;
  ageMax?: number;
}

// ---- Tài khoản ----
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: "parent";
  emailVerifiedAt: string | null;
  hasKidPin: boolean;
  wallet: { creditBalance: number };
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  durationMonths: number;
  priceVnd: number;
  creditsPerMonth: number;
  maxChildren: number;
  maxCharacters: number;
  canSell: boolean;
}

export interface Subscription {
  isFallback: boolean;
  plan: Plan;
  status: "active";
  periodEnd: string | null;
  nextCreditGrantAt: string | null;
  usage: { childrenCount: number; charactersCount: number };
}

// ---- Bé & nhân vật ----
export interface Character {
  id: string;
  name: string;
  appearance: string;
  childId: string | null;
  child: { id: string; name: string } | null;
  portraitStatus: GenerationStatus;
  portraitImageUrl: string | null;
  storiesCount: number;
}

export interface Child {
  id: string;
  name: string;
  birthDate: string | null;
  age: number | null;
  preferredVoice: string | null;
  booksCount: number;
  completedSessionsCount: number;
  character: Character | null;
}

export interface Usage {
  usedMinutes: number;
  sessionsCount: number;
  completedCount: number;
}

export interface SubSkillLevel {
  id: string;
  nameVi: string;
  caselTextEn: string | null;
  level: EqLevel;
  items: number;
}

export interface CompetencyLevel {
  caselCode: CaselCode;
  nameVi: string;
  level: EqLevel;
  subSkills: SubSkillLevel[];
}

export interface EqSettings {
  window: number;
  minItems: number;
  developingFrom: number;
  secureFrom: number;
}

export interface Recommendation {
  id: string;
  title: string;
  skill: { caselCode: CaselCode } | null;
  subSkills: { id: string; nameVi: string }[];
}

export interface EqReport {
  childId: string;
  childName: string;
  settings: EqSettings;
  competencies: CompetencyLevel[];
  recommendations: Recommendation[];
}

export interface Evidence {
  subSkillId: string;
  answeredAt: string;
  storyTitle: string;
  question: string;
  firstChoiceText: string | null;
  correctFirstTry: boolean;
  usedHint: boolean;
  source: string;
  momentSummary: string | null;
}

export interface ConversationItem {
  storyId: string;
  storyTitle: string;
  subSkillId: string | null;
  prompts: string[];
  reflection?: { question: string; answered: boolean };
}

export interface TrendWeek {
  weekStart: string;
  competencies: Partial<Record<CaselCode, { items: number; level: EqLevel }>>;
}

export interface EqJourney extends EqReport {
  evidence: Evidence[];
  conversation: ConversationItem[];
  trend: TrendWeek[];
}

export interface ChildOverview {
  profile: Child;
  todayUsage: Usage;
  readingStats: { booksInBookshelf: number; completedStories: number };
  eqReport: EqReport;
}

// ---- Tủ sách ----
export interface ReadingProgress {
  currentPageOrder: number;
  progressPercentage: number;
  lastActivityAt: string;
  isCompleted: boolean;
}

export interface BookshelfItem {
  storyId: string;
  title: string;
  kind: "private" | "published";
  topic: TopicRef | null;
  totalPages: number;
  length: StoryLength;
  useTts: boolean;
  cover: Cover;
  readingProgress: ReadingProgress | null;
}

export type ShelfStatus = "all" | "reading" | "completed" | "not_started";

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Bookshelf {
  items: BookshelfItem[];
  pagination: Pagination;
  counts: Record<ShelfStatus, number>;
  continueReading: BookshelfItem[];
}

// ---- Sáng tác ----
export interface StoryCharacter {
  token: string;
  name: string | null;
  isMain: boolean;
  characterId: string | null;
}

export interface StoryPage {
  id: string;
  pageOrder: number;
  contentText: string;
  origin: "ai" | "ai_edited" | "manual";
  sceneId: string | null;
}

export interface CheckpointOption {
  id?: string;
  text: string;
  role?: OptionRole;
  isCorrect?: boolean;
  feedback?: string;
}

export interface Checkpoint {
  id: string;
  type: CheckpointType;
  afterPageId: string;
  afterPageOrder: number;
  targetToken: string | null;
  question: string;
  hint: string | null;
  answerEmotion: Emotion | null;
  options: CheckpointOption[];
  locked: boolean;
}

export interface Scene {
  id: string;
  sceneOrder: number;
  description: string;
  imageStatus: GenerationStatus;
  imageUrl: string | null;
}

export interface Narration {
  enabled: boolean;
  total: number;
  ready: number;
  pending: number;
  failed: number;
  missing: number;
  complete: boolean;
}

export interface StorySummary {
  id: string;
  title: string;
  status: "draft" | "generating" | "ready";
  reviewedAt: string | null;
  mode: "ai" | "manual";
  entry: "topic" | "family" | "handwritten";
  length: StoryLength;
  topic: TopicRef | null;
  pageCount: number;
  checkpointCount: number;
  cover: Cover;
}

export interface Story extends StorySummary {
  kind: "private" | "published";
  scored: boolean;
  useTts: boolean;
  useAiImage: boolean;
  momentSummary: string | null;
  seedEvent: string | null;
  subSkills: { id: string; nameVi: string; source: string; position: number }[];
  characters: StoryCharacter[];
  pages: StoryPage[];
  checkpoints: Checkpoint[];
  scenes: Scene[];
  coverSceneId: string | null;
  narration: Narration;
  readiness: { ready: boolean; reason: "not_reviewed" | "narration_incomplete" | null };
  keywordWarnings: { path: string; keyword: string }[];
}

export interface Generation {
  status: "queued" | "processing" | "succeeded" | "failed" | "blocked";
  errorCode: string | null;
  errorMessage: string | null;
}

export interface AiPricing {
  lengths: { length: StoryLength; pages: number; checkpoints: number; credits: number }[];
  images: { characterPortrait: number; scene: number; maxScenes: number };
}

export interface Topic {
  id: string;
  title: string;
  ageMin: number;
  ageMax: number;
  skill: { caselCode: CaselCode; nameVi: string };
}

export interface SubSkill {
  id: string;
  code: string;
  nameVi: string;
  descriptionVi: string;
  isActive: boolean;
  skill: { caselCode: CaselCode; nameVi: string };
}

export interface AnalyzedSkill {
  id: string;
  code: string;
  nameVi: string;
  descriptionVi: string;
  skill: { caselCode: CaselCode; nameVi: string };
  source: "moment" | "need" | "parent";
  position: number;
}

export interface Analysis {
  momentSummary: string | null;
  seedEvent: string | null;
  subSkills: AnalyzedSkill[];
  analysisToken: string;
  expiresAt: string;
}

export interface ShelfChild {
  childId: string;
  name: string;
  inBookshelf: boolean;
  addedAt: string | null;
}

// ---- Chợ truyện ----
export interface PriceTier {
  id: string;
  label: string;
  priceVnd: number;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  topic: TopicRef | null;
  totalPages: number;
  checkpointCount: number;
  priceTier: PriceTier;
  seller: { displayName: string };
  purchaseCount: number;
  ratingAvg: number;
  ratingCount: number;
  hasAiContent: boolean;
  hasNarration: boolean;
  owned: boolean;
  isMine: boolean;
  publishedStoryId: string;
  cover: Cover;
  preview?: string;
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  tags: string[];
  author: string;
  updatedAt: string;
  mine: boolean;
  sellerReply: string | null;
  hidden?: boolean;
}

export interface ReviewsData {
  reviews: Review[];
  distribution: Record<string, number>;
  myReview: Review | null;
  canReview: boolean;
  isSeller: boolean;
  tags: string[];
}

// ---- Thanh toán / bán truyện ----
export interface OrderItem {
  id: string;
  itemType: "plan" | "listing";
  title: string;
  unitPriceVnd: number;
  refundable: boolean;
  deadline: string;
  refund: { status: "pending" | "approved" | "rejected"; decisionNote?: string } | null;
}

export interface Order {
  id: string;
  totalVnd: number;
  paidAt: string;
  payosOrderCode: number;
  items: OrderItem[];
}

export type SellerStatus = "pending" | "approved" | "rejected" | "suspended";

export interface MyListing {
  id: string;
  title: string;
  status: "submitted" | "in_review" | "changes_requested" | "rejected" | "published" | "suspended" | "archived";
  priceVnd: number;
  hasNarration: boolean;
  narration: { total: number; ready: number; failed: number; missing: number; complete: boolean } | null;
  lastDecision: { comment: string } | null;
  publishedStoryId: string;
  cover: Cover;
}

export interface Strike {
  id: string;
  source: "report" | "rejection" | "takedown";
  reason: string;
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  active: boolean;
  appeal: { status: "pending" | "approved" | "rejected" | "cancelled"; decisionNote?: string } | null;
}

export interface Withdrawal {
  id: string;
  amountVnd: number;
  status: "requested" | "processing" | "paid" | "rejected" | "cancelled";
  createdAt: string;
  rejectReason?: string;
}

export interface Earnings {
  balance: { pendingVnd: number; availableVnd: number; lockedVnd: number };
  bank: { bankBin: string; bankName: string; accountNumber: string; accountHolder: string } | null;
  withdrawals: Withdrawal[];
  minWithdrawalVnd: number;
  holdDays: number;
  sellerShareRate: number;
}

// ---- Kid Mode ----
export interface KidShelfItem {
  storyId: string;
  title: string;
  totalPages: number;
  cover: Cover;
  readingProgress: ReadingProgress | null;
}

export interface KidPage {
  id: string;
  pageOrder: number;
  text: string;
  imageUrl: string | null;
}

export interface KidCheckpoint {
  id: string;
  type: CheckpointType;
  afterPageId: string;
  question: string;
  options: { id: string; text: string }[];
  result: AnswerResult | null;
}

export interface AnswerResult {
  checkpointId: string;
  done: boolean;
  correct: boolean | null;
  attempts: number;
  hint?: string;
  answer?: { emotion?: Emotion; optionId?: string };
  feedback?: string;
}

export interface ReadingSession {
  session: { id: string; currentPageId: string | null };
  story: { id: string; title: string; pages: KidPage[]; checkpoints: KidCheckpoint[] };
}
