import { StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle2 } from "lucide-react-native";
import { AppText, Button, Card, Screen, ScreenHeader } from "@/components/ui";
import { href, ROUTES } from "@/constants/routes";
import { formatNumber } from "@/utils/format";
import { colors } from "@/theme";

// payOS trả người dùng về đây sau khi thanh toán gói / mua truyện. Bản mock: đơn luôn "paid".
export default function PaymentResultScreen() {
  const router = useRouter();
  const { kind, title, total, listingId } = useLocalSearchParams<{ kind: "plan" | "listing"; title: string; total: string; listingId?: string }>();
  const isPlan = kind === "plan";

  return (
    <Screen header={<ScreenHeader title="Kết quả thanh toán" />}>
      <Card padding={28} style={styles.card}>
        <CheckCircle2 size={48} color={colors.secondary} />
        <AppText variant="h1" align="center">
          {isPlan ? "Thanh toán thành công" : "Mua truyện thành công"}
        </AppText>
        <AppText align="center">{isPlan ? "Gói mới đã được kích hoạt và credit đã được cộng vào ví." : "Truyện đã thuộc về ba mẹ. Đưa lên giá sách để bé đọc nhé."}</AppText>
        <AppText variant="small" align="center">
          {title} • {formatNumber(Number(total ?? 0))}đ
        </AppText>
        <Button
          label={isPlan ? "Về trang Gói dịch vụ" : "Đưa lên giá sách cho bé"}
          fullWidth
          onPress={() => router.replace(href(isPlan ? ROUTES.PARENT.BILLING : ROUTES.PARENT.marketplaceListing(listingId ?? "")))}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", gap: 14, marginTop: 24 },
});
