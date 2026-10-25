import { colors } from "@/theme";
import type { MyListing, Strike, Withdrawal } from "@/types/models";

// Nhãn tiếng Việt cho báo cáo / bán truyện (khớp enum rev8 của BE). tone = { bg, fg }.
type Tone = { label: string; bg: string; fg: string };
const t = (label: string, bg: string, fg: string): Tone => ({ label, bg, fg });

export const REPORT_CATEGORIES = {
  scary: "Gây sợ hãi",
  violent: "Bạo lực",
  inappropriate_lesson: "Bài học không phù hợp",
  personal_info: "Lộ thông tin cá nhân",
  technical_error: "Lỗi kỹ thuật",
  other: "Khác",
} as const;

export const STRIKE_SOURCES: Record<Strike["source"], string> = {
  report: "Báo cáo vi phạm",
  rejection: "Bị từ chối khi duyệt",
  takedown: "Truyện bị gỡ",
};

export const APPEAL_STATUS: Record<NonNullable<Strike["appeal"]>["status"], Tone> = {
  pending: t("Đang chờ xét", colors.primaryTint, colors.primaryDark),
  approved: t("Được chấp thuận — đã gỡ cảnh cáo", colors.secondaryTint, colors.secondaryDark),
  rejected: t("Bị từ chối", colors.dangerTint, colors.danger),
  cancelled: t("Đã huỷ", colors.navyTint, colors.navy),
};

export const LISTING_STATUS: Record<MyListing["status"], Tone> = {
  submitted: t("Chờ duyệt", colors.navyTint, colors.navy),
  in_review: t("Đang duyệt", colors.primaryTint, colors.primaryDark),
  changes_requested: t("Cần sửa", colors.dangerTint, colors.danger),
  rejected: t("Bị từ chối", colors.dangerTint, colors.danger),
  published: t("Đang bán", colors.secondaryTint, colors.secondaryDark),
  suspended: t("Tạm gỡ", colors.dangerTint, colors.danger),
  archived: t("Đã gỡ hẳn", colors.navyTint, colors.navy),
};

export const WITHDRAWAL_STATUS: Record<Withdrawal["status"], Tone> = {
  requested: t("Chờ Admin duyệt", colors.navyTint, colors.navy),
  processing: t("Đang chuyển tiền", colors.primaryTint, colors.primaryDark),
  paid: t("Đã chuyển", colors.secondaryTint, colors.secondaryDark),
  rejected: t("Bị từ chối", colors.dangerTint, colors.danger),
  cancelled: t("Đã huỷ", colors.surface, "rgba(30,41,59,0.6)"),
};

export const REFUND_STATUS = {
  pending: t("Đang chờ hoàn tiền", colors.primaryTint, colors.primaryDark),
  approved: t("Đã hoàn tiền", colors.secondaryTint, colors.secondaryDark),
  rejected: t("Không được hoàn", colors.dangerTint, colors.danger),
};

// Ngân hàng nhận tiền rút (mã BIN theo VietQR)
export const BANKS = [
  ["970436", "Vietcombank"],
  ["970415", "VietinBank"],
  ["970418", "BIDV"],
  ["970405", "Agribank"],
  ["970407", "Techcombank"],
  ["970422", "MBBank"],
  ["970416", "ACB"],
  ["970432", "VPBank"],
  ["970423", "TPBank"],
  ["970403", "Sacombank"],
  ["970441", "VIB"],
  ["970443", "SHB"],
  ["970437", "HDBank"],
  ["970448", "OCB"],
  ["970426", "MSB"],
].map(([bin, name]) => ({ bin, name }));

export const FAQS = [
  {
    q: "Bé chưa biết chữ có dùng được không?",
    a: "Được. Truyện có giọng đọc kể truyện tiếng Việt; câu hỏi và các lựa chọn cũng được đọc to, bé chỉ cần chạm để trả lời. Truyện ba mẹ tắt giọng đọc sẽ hiện nhãn “Chỉ có chữ”.",
  },
  {
    q: "AI có biết tên thật của con tôi không?",
    a: "Không. Trước khi gửi cho AI, tên của bé và người thân được thay bằng mã như {NV1}. Tên thật chỉ ghép lại khi hiển thị cho gia đình và khi đọc giọng.",
  },
  {
    q: "Ai kiểm tra nội dung trước khi bé đọc?",
    a: "Truyện của gia đình: ba mẹ đọc lại và bấm hoàn tất. Truyện mua trên Chợ: kiểm duyệt viên đọc 100% số trang theo checklist sư phạm. Phụ huynh có thể báo cáo truyện không phù hợp; đủ nhiều báo cáo, truyện tự tạm gỡ chờ xem lại.",
  },
  {
    q: "Credit là gì, có mất phí không?",
    a: "Credit dùng cho các lần AI viết truyện. Gói Miễn phí cấp credit mỗi tháng; gói Gia đình cấp nhiều hơn và mở tính năng bán truyện. Truyện tự viết không tốn credit. Thanh toán qua payOS (chuyển khoản / VietQR).",
  },
  {
    q: "Điểm EQ của con được tính thế nào?",
    a: "Từ câu trả lời ở lượt đọc đầu tiên của mỗi truyện, theo năng lực CASEL của bài học. Mỗi năng lực cần ít nhất 5 câu trả lời mới hiện điểm, để tránh kết luận vội.",
  },
  {
    q: "Mua truyện rồi không hài lòng thì sao?",
    a: "Ba mẹ gửi yêu cầu hoàn tiền trong 3 ngày kể từ lúc thanh toán, ở mục Lịch sử thanh toán. Quản trị viên xem xét và chuyển trả vào tài khoản đã thanh toán.",
  },
];
