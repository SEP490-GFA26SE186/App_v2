import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/services/marketService";
import { parentKeys, refreshCredit } from "./useParent";

// Chợ truyện + Gói dịch vụ + Bán truyện

export const usePriceTiers = () => useQuery({ queryKey: ["marketplace", "price-tiers"], queryFn: api.getPriceTiers, staleTime: 10 * 60_000 });

export const useListings = (params: api.ListingParams) =>
  useQuery({ queryKey: ["marketplace", "listings", params], queryFn: () => api.getListings(params), placeholderData: keepPreviousData });

export const useListing = (listingId?: string) =>
  useQuery({ queryKey: ["marketplace", "listing", listingId], queryFn: () => api.getListing(listingId!), enabled: !!listingId });

export const useCheckoutListing = () => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: api.checkoutListing, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["marketplace"] }) });
};

export const useReviews = (listingId: string) => useQuery({ queryKey: ["marketplace", "reviews", listingId], queryFn: () => api.getReviews(listingId) });

const useInvalidating = <A, R>(fn: (a: A) => Promise<R>, keys: string[][]) => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey })) });
};

export const useSaveReview = (listingId: string) =>
  useInvalidating((body: Parameters<typeof api.saveReview>[1]) => api.saveReview(listingId, body), [["marketplace"]]);
export const useReplyReview = () => useInvalidating(({ id, reply }: { id: string; reply: string }) => api.replyReview(id, reply), [["marketplace", "reviews"]]);
export const useReportReview = () => useMutation({ mutationFn: ({ id, category }: { id: string; category: string }) => api.reportReview(id, { category }) });
export const useReportListing = (listingId: string) => useMutation({ mutationFn: (body: { category: string; description?: string }) => api.reportListing(listingId, body) });

// ---- Gói dịch vụ ----

export const usePlans = () => useQuery({ queryKey: ["billing", "plans"], queryFn: api.getPlans, staleTime: 5 * 60_000 });

export const useCheckoutPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.checkoutPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parentKeys.subscription });
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      refreshCredit(queryClient);
    },
  });
};

export const useOrders = () => useQuery({ queryKey: ["billing", "orders"], queryFn: api.getMyOrders });
export const useRequestRefund = () => useInvalidating(({ id, reason }: { id: string; reason: string }) => api.requestRefund(id, reason), [["billing", "orders"]]);

// ---- Bán truyện ----

export const useMySeller = () => useQuery({ queryKey: ["selling", "me"], queryFn: api.getMySeller });
export const useApplySeller = () => useInvalidating(api.applySeller, [["selling", "me"]]);
export const useMyListings = (enabled: boolean) => useQuery({ queryKey: ["selling", "listings"], queryFn: api.getMyListings, enabled });
export const useCreateListing = () => useInvalidating(api.createListing, [["selling"]]);
export const useStrikes = () => useQuery({ queryKey: ["selling", "strikes"], queryFn: api.getMyStrikes });
export const useAppealStrike = () => useInvalidating(({ id, reason }: { id: string; reason: string }) => api.appealStrike(id, reason), [["selling", "strikes"]]);
export const useEarnings = () => useQuery({ queryKey: ["selling", "earnings"], queryFn: api.getEarnings });
export const useSaveBank = () => useInvalidating(api.saveBank, [["selling", "earnings"]]);
export const useWithdraw = () => useInvalidating(api.requestWithdrawal, [["selling", "earnings"]]);
export const useCancelWithdrawal = () => useInvalidating(api.cancelWithdrawal, [["selling", "earnings"]]);
export const useRetryListingNarration = () => useInvalidating(api.retryListingNarration, [["selling", "listings"]]);
