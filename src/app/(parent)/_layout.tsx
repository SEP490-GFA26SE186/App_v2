import { Stack } from "expo-router";
import { colors } from "@/theme";

// Cổng phụ huynh: 5 tab chính + các trang con (mở chồng lên tab, có nút quay lại).
export default function ParentLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />;
}
