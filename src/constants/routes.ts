import type { Href } from "expo-router";

// Đường dẫn expo-router. Nhóm (auth) / (parent) / (tabs) không xuất hiện trên URL.
export const ROUTES = {
  LOGIN: "/login",
  REGISTER: "/register",
  PARENT: {
    DASHBOARD: "/",
    LIBRARY: "/library",
    STUDIO: "/studio",
    MARKETPLACE: "/marketplace",
    MORE: "/more",
    CHILDREN: "/children",
    FAMILY_CHARACTERS: "/family-characters",
    EQ_JOURNEY: "/eq-journey",
    BILLING: "/billing",
    SELLING: "/selling",
    SETTINGS: "/settings",
    HELP: "/help",
    STUDIO_NEW: "/story/new",
    studioNewFromTopic: (topicId: string) => `/story/new?topicId=${encodeURIComponent(topicId)}`,
    studioStory: (storyId: string) => `/story/${storyId}`,
    marketplaceListing: (listingId: string) => `/listing/${listingId}`,
    sellingNew: (storyId: string) => `/selling/new?storyId=${storyId}`,
    paymentResult: (kind: "plan" | "listing", title: string, totalVnd: number, listingId?: string) =>
      `/payment-result?kind=${kind}&title=${encodeURIComponent(title)}&total=${totalVnd}${listingId ? `&listingId=${listingId}` : ""}`,
  },
  KID: {
    BOOKSHELF: "/kid",
    story: (storyId: string) => `/kid/story/${storyId}`,
  },
} as const;

/** expo-router chấp nhận chuỗi đường dẫn; ép kiểu một chỗ để không rải `as Href` khắp nơi. */
export const href = (path: string) => path as Href;
