import { db, plans, priceTiers } from "@/mocks/db";
import type { Listing, MyListing, ReviewsData } from "@/types/models";
import { fail, respond, uid } from "./mockApi";

// Chợ truyện, thanh toán (payOS) và bán truyện (rev8). Mock: thanh toán hoàn tất ngay, không mở payOS.

export const getPriceTiers = () => respond(() => priceTiers);

export interface ListingParams {
  search?: string;
  competency?: string;
  age?: string;
  priceTierId?: string;
  narration?: "all" | "with" | "without";
  sort?: "best_selling" | "rating" | "newest" | "price_asc";
  page?: number;
  limit?: number;
}

/** GET /market/listings → { items, pagination } */
export const getListings = ({ search = "", competency = "all", age = "all", priceTierId = "all", narration = "all", sort = "best_selling", page = 1, limit = 8 }: ListingParams) =>
  respond(() => {
    const q = search.trim().toLowerCase();
    const sorters: Record<string, (a: Listing, b: Listing) => number> = {
      best_selling: (a, b) => b.purchaseCount - a.purchaseCount,
      rating: (a, b) => b.ratingAvg - a.ratingAvg,
      newest: (a, b) => b.id.localeCompare(a.id),
      price_asc: (a, b) => a.priceTier.priceVnd - b.priceTier.priceVnd,
    };
    const all = db.listings
      .filter((l) => !q || [l.title, l.topic?.title, l.seller.displayName].some((t) => t?.toLowerCase().includes(q)))
      .filter((l) => competency === "all" || l.topic?.competency === competency)
      .filter((l) => age === "all" || (l.topic && l.topic.ageMin! <= Number(age) && Number(age) <= l.topic.ageMax!))
      .filter((l) => priceTierId === "all" || l.priceTier.id === priceTierId)
      .filter((l) => narration === "all" || (narration === "with" ? l.hasNarration : !l.hasNarration))
      .sort(sorters[sort]);
    return {
      items: all.slice((page - 1) * limit, page * limit),
      pagination: { page, limit, total: all.length, totalPages: Math.max(1, Math.ceil(all.length / limit)) },
    };
  });

/** GET /market/listings/:id → listing (+ preview: chữ trang đầu, isMine) */
export const getListing = (listingId: string) => respond(() => db.listings.find((l) => l.id === listingId) ?? fail("Không tìm thấy truyện", 404));

/** POST /market/checkout { listingId } → { order, checkoutUrl } (null với truyện miễn phí) */
export const checkoutListing = (listingId: string) =>
  respond(() => {
    const l = db.listings.find((x) => x.id === listingId) ?? fail("Không tìm thấy truyện", 404);
    l.owned = true;
    l.purchaseCount += 1;
    if (l.priceTier.priceVnd > 0) {
      db.orders.unshift({ id: uid("o"), totalVnd: l.priceTier.priceVnd, paidAt: new Date().toISOString(), payosOrderCode: Math.floor(Math.random() * 1e9), items: [{ id: uid("oi"), itemType: "listing", title: l.title, unitPriceVnd: l.priceTier.priceVnd, refundable: true, deadline: new Date(Date.now() + 3 * 86400000).toISOString(), refund: null }] });
    }
    return { order: { id: uid("order"), status: "paid", totalVnd: l.priceTier.priceVnd }, checkoutUrl: null };
  }, 900);

/** Báo cáo truyện đang bán: { category, description? } → { reportId, suspended }. Đã báo cáo → 409. */
export const reportListing = (listingId: string, _body: { category: string; description?: string }) =>
  respond(() => {
    if (db.reportedListings.has(listingId)) fail("Ba mẹ đã báo cáo truyện này rồi", 409);
    db.reportedListings.add(listingId);
    return { reportId: uid("rp"), suspended: false };
  });

/** Đánh giá của truyện → { reviews, distribution, myReview, canReview, isSeller, tags } */
export const getReviews = (listingId: string) =>
  respond((): ReviewsData => {
    const l = db.listings.find((x) => x.id === listingId);
    const reviews = db.reviews[listingId] ?? [];
    const distribution = Object.fromEntries([1, 2, 3, 4, 5].map((n) => [n, reviews.filter((r) => r.rating === n).length]));
    // Mock: đã mua và bé đọc hết (truyện "Thỏ con biết xin lỗi") mới đánh giá được
    const completed = Object.values(db.shelves).some((shelf) => shelf.some((x) => x.storyId === l?.publishedStoryId && x.progress?.isCompleted));
    return { reviews, distribution, myReview: reviews.find((r) => r.mine) ?? null, canReview: !!l?.owned && completed, isSeller: !!l?.isMine, tags: ["child_liked", "age_appropriate", "clear_lesson", "good_narration"] };
  });

export const saveReview = (listingId: string, body: { rating: number; comment?: string; tags: string[] }) =>
  respond(() => {
    const list = (db.reviews[listingId] ??= []);
    const mine = list.find((r) => r.mine);
    const next = { id: mine?.id ?? uid("r"), rating: body.rating, comment: body.comment ?? null, tags: body.tags, author: "Ba mẹ (bạn)", updatedAt: new Date().toISOString(), mine: true, sellerReply: mine?.sellerReply ?? null };
    db.reviews[listingId] = [next, ...list.filter((r) => !r.mine)];
    const l = db.listings.find((x) => x.id === listingId);
    if (l) {
      const all = db.reviews[listingId];
      l.ratingCount = Math.max(l.ratingCount, all.length);
      l.ratingAvg = all.reduce((a, r) => a + r.rating, 0) / all.length;
    }
    return next;
  });

export const replyReview = (reviewId: string, reply: string) =>
  respond(() => {
    for (const list of Object.values(db.reviews)) {
      const r = list.find((x) => x.id === reviewId);
      if (r) r.sellerReply = reply;
    }
    return { ok: true };
  });

export const reportReview = (_reviewId: string, _body: { category: string }) => respond(() => ({ ok: true }));

// ---- Gói dịch vụ ----

/** GET /plans */
export const getPlans = () => respond(() => plans);

/** POST /payments/plans/checkout { planId } → { order, checkoutUrl }. Mock: chuyển gói và cấp credit ngay. */
export const checkoutPlan = (planId: string) =>
  respond(() => {
    const plan = plans.find((p) => p.id === planId) ?? fail("Không tìm thấy gói", 404);
    db.planId = plan.id;
    db.periodEnd = new Date(Date.now() + plan.durationMonths * 30 * 86400000).toISOString();
    db.user = { ...db.user, wallet: { creditBalance: Math.max(db.user.wallet.creditBalance, plan.creditsPerMonth) } };
    if (plan.priceVnd > 0) {
      db.orders.unshift({ id: uid("o"), totalVnd: plan.priceVnd, paidAt: new Date().toISOString(), payosOrderCode: Math.floor(Math.random() * 1e9), items: [{ id: uid("oi"), itemType: "plan", title: plan.name, unitPriceVnd: plan.priceVnd, refundable: true, deadline: new Date(Date.now() + 3 * 86400000).toISOString(), refund: null }] });
    }
    return { order: { id: uid("order"), status: "paid", totalVnd: plan.priceVnd }, checkoutUrl: null, plan };
  }, 900);

/** GET /payments/orders → { refundWindowDays, orders } */
export const getMyOrders = () => respond(() => ({ refundWindowDays: 3, orders: db.orders }));

/** Yêu cầu hoàn tiền một mục đã thanh toán (trong thời hạn) */
export const requestRefund = (itemId: string, _reason: string) =>
  respond(() => {
    for (const o of db.orders) {
      const item = o.items.find((i) => i.id === itemId);
      if (item) {
        item.refund = { status: "pending" };
        item.refundable = false;
      }
    }
    return { ok: true };
  });

// ---- Bán truyện ----

/** → { seller: { status, displayName } | null, planCanSell } */
export const getMySeller = () => respond(() => ({ seller: db.seller, planCanSell: plans.find((p) => p.id === db.planId)!.canSell }));

export const applySeller = (payload: { displayName: string; bio?: string; expertise?: string }) =>
  respond(() => {
    db.seller = { status: "pending" as never, displayName: payload.displayName };
    return { seller: db.seller };
  });

export const getMyListings = () => respond(() => db.myListings);

/** { storyId, title, description?, priceTierId, aliases: [{ token, aliasName }] } → { listing } */
export const createListing = (payload: { storyId: string; title: string; description?: string; priceTierId: string; aliases: { token: string; aliasName: string }[] }) =>
  respond(() => {
    const story = db.stories.find((s) => s.id === payload.storyId) ?? fail("Không tìm thấy truyện", 404);
    const errors = payload.aliases.filter((a) => !a.aliasName.trim()).map((a) => ({ path: `aliases.${a.token}`, message: "Ba mẹ đặt tên chung cho nhân vật này nhé" }));
    const realNames = story.characters.map((c) => c.name).filter(Boolean) as string[];
    payload.aliases.forEach((a) => realNames.includes(a.aliasName.trim()) && errors.push({ path: `aliases.${a.token}`, message: "Tên chung không được trùng tên thật" }));
    if (realNames.some((n) => payload.title.includes(n))) errors.push({ path: "listing.title", message: "Tên truyện còn tên thật của gia đình" });
    if (errors.length) fail(errors[0].message, 422, errors);
    const tier = priceTiers.find((t) => t.id === payload.priceTierId)!;
    const listing: MyListing = {
      id: uid("ml"),
      title: payload.title,
      status: "submitted",
      priceVnd: tier.priceVnd,
      hasNarration: story.useTts,
      narration: story.useTts ? { total: story.pages.length, ready: 0, failed: 0, missing: 0, complete: false } : null,
      lastDecision: null,
      publishedStoryId: uid("pub"),
      cover: story.cover,
    };
    db.myListings.unshift(listing);
    return { listing };
  }, 900);

/** → { sellerStatus, strikeLimit, activeStrikes, strikes } */
export const getMyStrikes = () =>
  respond(() => ({ sellerStatus: db.seller.status, strikeLimit: 3, activeStrikes: db.strikes.filter((s) => s.active).length, strikes: db.strikes }));

export const appealStrike = (strikeId: string, _reason: string) =>
  respond(() => {
    const s = db.strikes.find((x) => x.id === strikeId);
    if (s) s.appeal = { status: "pending" };
    return { ok: true };
  });

export const getEarnings = () => respond(() => db.earnings);

export const saveBank = (body: { bankBin: string; bankName: string; accountNumber: string; accountHolder: string }) =>
  respond(() => {
    db.earnings.bank = body;
    return db.earnings.bank;
  });

export const requestWithdrawal = (amountVnd: number) =>
  respond(() => {
    const e = db.earnings;
    if (amountVnd < e.minWithdrawalVnd) fail(`Số tiền rút tối thiểu ${e.minWithdrawalVnd.toLocaleString()}đ`, 422);
    if (amountVnd > e.balance.availableVnd) fail("Số tiền rút vượt quá số dư rút được", 422);
    e.balance = { ...e.balance, availableVnd: e.balance.availableVnd - amountVnd, lockedVnd: e.balance.lockedVnd + amountVnd };
    e.withdrawals.unshift({ id: uid("w"), amountVnd, status: "requested", createdAt: new Date().toISOString() });
    return { ok: true };
  });

export const cancelWithdrawal = (id: string) =>
  respond(() => {
    const e = db.earnings;
    const w = e.withdrawals.find((x) => x.id === id);
    if (w && w.status === "requested") {
      w.status = "cancelled";
      e.balance = { ...e.balance, availableVnd: e.balance.availableVnd + w.amountVnd, lockedVnd: e.balance.lockedVnd - w.amountVnd };
    }
    return { ok: true };
  });

/** Tạo lại các đoạn giọng đọc lỗi / thiếu của bản đăng bán. */
export const retryListingNarration = (listingId: string) =>
  respond(() => {
    const l = db.myListings.find((x) => x.id === listingId);
    if (l?.narration) l.narration = { ...l.narration, failed: 0, missing: 0 };
    return { ok: true };
  });
